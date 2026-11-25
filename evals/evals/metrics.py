"""Metrics: scored results -> the `metrics.json` dict. Aggregates only, never document values.

Definitions (the report's "How to read" section repeats them):

- Value statuses come from `score.py`: correct, wrong, missed, hallucinated, correct_absent.
  A "value" is a scalar field or one table cell. Distractors contribute no values.
- fieldAccuracy = (correct + correct_absent) / all scored values. Overall, `byField` (table cells
  under `<field>.<column>`), `byType` (expected type) and `byTag` (a value counts under every tag
  of its document).
- documentExactMatch = share of documents with an expected type whose every required scalar value
  is correct or correct_absent (table cells are ignored).
- classificationAccuracy = share of all documents (distractors included) classified correctly.
  classificationConfusion = counts expected type ("none" for a distractor) x predicted type
  ("unclassified" when no type, "error" when the call failed).
- hallucinationRate = hallucinated / values whose truth is null (hallucinated + correct_absent).
  missRate = missed / values whose truth has a value (correct + wrong + missed).
- Calibration works on values that have a prediction (confidence is not None); a value is right
  when its status is `correct`. Bins: 0-0.5, 0.5-0.7, 0.7-0.9, 0.9-0.97, 0.97-1 (lower edge
  included, the last bin includes 1). ece = sum(n_bin / N * |accuracy - mean confidence|).
  verifiedPrecision = correct / predicted values with confidence >= LOW_CONFIDENCE (what the app
  shows as fine). errorCatchRate = (wrong + hallucinated with confidence < LOW_CONFIDENCE) /
  (wrong + hallucinated).
- costUsd: a document's cost is the sum of its calls; mean, p50, p95 and total over documents.
- latencyMs: p50 and p95 of ocr, classify, extract and total; lines that ended in `error` are left
  out of latency (they stay in the counts).
- Percentiles are linear-interpolated. A rate with an empty denominator is null.
- With --repeat, top-level values pool all repeats; `spread` holds min/max/std (sample std)
  across repeats of the gated scalars, and is null for a single repeat.

Rates are fractions 0..1 rounded to 4 decimals; costs to 6.
"""

from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path
from typing import Any

import pandas as pd

from evals.dataset import DEFAULT_DATASET, load_dataset
from evals.score import CORRECT, CORRECT_ABSENT, HALLUCINATED, MISSED, STATUSES, WRONG, score_result
from evals.truth import load_type

# Mirrors LOW_CONFIDENCE in apps/web/src/lib/fields/confidence.ts (the product's single source):
# a value below it is flagged for a human check. Keep the two equal.
LOW_CONFIDENCE = 0.9

BINS = [(0.0, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 0.97), (0.97, 1.0)]
STEPS = ("ocr", "classify", "extract", "total")
# Scalars the CI gate (027) and the comparison look at: name -> getter path in a model's metrics.
GATED = {
    "fieldAccuracy": ("fieldAccuracy", "overall"),
    "documentExactMatch": ("documentExactMatch",),
    "classificationAccuracy": ("classificationAccuracy",),
    "hallucinationRate": ("hallucinationRate",),
    "missRate": ("missRate",),
    "ece": ("calibration", "ece"),
    "verifiedPrecision": ("calibration", "verifiedPrecision"),
    "errorCatchRate": ("calibration", "errorCatchRate"),
    "costUsdMean": ("costUsd", "mean"),
}
TOP_LOSERS = 5


def r4(x: float | None) -> float | None:
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 4)


def r6(x: float | None) -> float | None:
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 6)


def ratio(num: float, den: float) -> float | None:
    return None if den == 0 else num / den


def get_path(d: dict, path: tuple[str, ...]) -> Any:
    for p in path:
        d = d[p]
    return d


# ---------------------------------------------------------------- loading


def resolve_dataset(run_dir: Path, dataset: str | Path | None) -> Path:
    if dataset:
        return Path(dataset)
    meta = read_run_json(run_dir)
    p = (meta.get("dataset") or {}).get("path")
    if p:
        path = Path(p)
        if not path.is_absolute():
            path = DEFAULT_DATASET.parent / path
        if path.is_dir():
            return path
    return DEFAULT_DATASET


def read_run_json(run_dir: Path) -> dict:
    p = run_dir / "run.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else {}


def load_frames(run_dir: str | Path, dataset: str | Path | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """(values, docs): one row per scored value and one row per result line."""
    run_dir = Path(run_dir)
    docs_truth = {d.id: d for d in load_dataset(resolve_dataset(run_dir, dataset))}
    types: dict[str, dict] = {}
    doc_rows: list[dict] = []
    value_rows: list[dict] = []
    for line in (run_dir / "results.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        res = json.loads(line)
        d = docs_truth.get(res["id"])
        if d is None:
            raise KeyError(f"result {res['id']!r} has no truth file")
        exp = d.truth.expectedType
        if exp is not None and exp not in types:
            types[exp] = load_type(exp)
        sc = score_result(res, d.truth, types.get(exp) if exp else None)
        calls = [c for c in res.get("calls") or [] if isinstance(c, dict)]
        cost = sum(float(c.get("costUsd") or 0) for c in calls) if calls else float(res.get("costUsd") or 0)
        ms = res.get("ms") if isinstance(res.get("ms"), dict) else {}
        key = {"model": res["model"], "repeat": res["repeat"], "id": res["id"]}
        required_ok = all(
            v.status in (CORRECT, CORRECT_ABSENT) for v in sc.values if v.required and v.fieldType != "table"
        )
        doc_rows.append({
            **key, "expectedType": exp, "modelId": res.get("modelId"), "outcome": sc.outcome,
            "predictedType": sc.predictedType, "classificationCorrect": sc.classificationCorrect,
            "exact": (required_ok if exp is not None else None), "costUsd": cost,
            **{f"ms_{s}": (ms.get(s) if sc.outcome != "error" else None) for s in STEPS},
        })  # fmt: skip
        for v in sc.values:
            fkey = v.field if v.column is None else f"{v.field}.{v.column}"
            value_rows.append({
                **key, "expectedType": exp, "tags": d.tags, "field": fkey, "required": v.required,
                "fieldType": v.fieldType, "status": v.status, "confidence": v.confidence,
            })  # fmt: skip
    values = pd.DataFrame(
        value_rows,
        columns=["model", "repeat", "id", "expectedType", "tags", "field", "required", "fieldType", "status", "confidence"],
    )
    docs = pd.DataFrame(doc_rows)
    return values, docs


# ---------------------------------------------------------------- one slice of the frames


def _accuracy(df: pd.DataFrame) -> float | None:
    if df.empty:
        return None
    return float(df["status"].isin([CORRECT, CORRECT_ABSENT]).mean())


def _grouped(df: pd.DataFrame, by: str) -> dict[str, float | None]:
    return {str(k): r4(_accuracy(g)) for k, g in sorted(df.groupby(by), key=lambda kv: str(kv[0]))}


def _by_tag(df: pd.DataFrame) -> dict[str, float | None]:
    if df.empty:
        return {}
    ex = df[["tags", "status"]].explode("tags").dropna(subset=["tags"])
    return {str(k): r4(_accuracy(g)) for k, g in sorted(ex.groupby("tags"), key=lambda kv: str(kv[0]))}


def _calibration(df: pd.DataFrame) -> dict[str, Any]:
    p = df[df["confidence"].notna()]
    n = len(p)
    right = p["status"] == CORRECT
    bins = []
    ece = 0.0
    for i, (lo, hi) in enumerate(BINS):
        last = i == len(BINS) - 1
        m = (p["confidence"] >= lo) & ((p["confidence"] <= hi) if last else (p["confidence"] < hi))
        b = p[m]
        cnt = len(b)
        acc = float(right[m].mean()) if cnt else None
        conf = float(b["confidence"].mean()) if cnt else None
        if cnt:
            ece += cnt / n * abs(acc - conf)
        bins.append({"lo": lo, "hi": hi, "count": cnt, "meanConfidence": r4(conf), "accuracy": r4(acc)})
    high = p["confidence"] >= LOW_CONFIDENCE
    err = p["status"].isin([WRONG, HALLUCINATED])
    return {
        "ece": r4(ece) if n else None,
        "bins": bins,
        "verifiedPrecision": r4(ratio(int((right & high).sum()), int(high.sum()))),
        "errorCatchRate": r4(ratio(int((err & ~high).sum()), int(err.sum()))),
    }


def _pct(s: pd.Series, q: float) -> float | None:
    s = s.dropna()
    return None if s.empty else float(s.quantile(q))


def _scalars(values: pd.DataFrame, docs: pd.DataFrame) -> dict[str, Any]:
    """The metrics that can be recomputed per repeat."""
    st = values["status"]
    truth_null = int(st.isin([HALLUCINATED, CORRECT_ABSENT]).sum())
    truth_has = int(st.isin([CORRECT, WRONG, MISSED]).sum())
    typed = docs[docs["expectedType"].notna()]
    cal = _calibration(values)
    return {
        "fieldAccuracy": _accuracy(values),
        "documentExactMatch": None if typed.empty else float(typed["exact"].astype(bool).mean()),
        "classificationAccuracy": None if docs.empty else float(docs["classificationCorrect"].mean()),
        "hallucinationRate": ratio(int((st == HALLUCINATED).sum()), truth_null),
        "missRate": ratio(int((st == MISSED).sum()), truth_has),
        "ece": cal["ece"],
        "verifiedPrecision": cal["verifiedPrecision"],
        "errorCatchRate": cal["errorCatchRate"],
        "costUsdMean": None if docs.empty else float(docs["costUsd"].mean()),
    }


def _confusion(docs: pd.DataFrame) -> dict[str, dict[str, int]]:
    out: dict[str, Counter] = {}
    for _, r in docs.iterrows():
        exp = r["expectedType"] if isinstance(r["expectedType"], str) else "none"
        if r["outcome"] == "error":
            pred = "error"
        else:
            pred = r["predictedType"] if isinstance(r["predictedType"], str) else "unclassified"
        out.setdefault(exp, Counter())[pred] += 1
    return {e: dict(sorted(c.items())) for e, c in sorted(out.items())}


def model_metrics(values: pd.DataFrame, docs: pd.DataFrame, model_id: str | None) -> dict[str, Any]:
    st = values["status"]
    sc = _scalars(values, docs)
    cal = _calibration(values)
    cost = docs.groupby(["id", "repeat"])["costUsd"].sum()
    live = docs[docs["outcome"] != "error"]
    spread = None
    repeats = sorted(docs["repeat"].unique())
    if len(repeats) > 1:
        per = [
            _scalars(values[values["repeat"] == k], docs[docs["repeat"] == k]) for k in repeats
        ]
        spread = {}
        for name in GATED:
            xs = [p[name] for p in per if p[name] is not None]
            spread[name] = (
                None
                if not xs
                else {
                    "min": r6(min(xs)) if name == "costUsdMean" else r4(min(xs)),
                    "max": r6(max(xs)) if name == "costUsdMean" else r4(max(xs)),
                    "std": (r6 if name == "costUsdMean" else r4)(float(pd.Series(xs).std(ddof=1))) if len(xs) > 1 else None,
                }
            )  # fmt: skip
    return {
        "modelId": model_id,
        "documents": int(docs["id"].nunique()),
        "outcomes": dict(sorted(Counter(docs["outcome"]).items())),
        "fieldAccuracy": {
            "overall": r4(sc["fieldAccuracy"]),
            "byField": _grouped(values, "field"),
            "byType": _grouped(values, "expectedType"),
            "byTag": _by_tag(values),
        },
        "documentExactMatch": r4(sc["documentExactMatch"]),
        "classificationAccuracy": r4(sc["classificationAccuracy"]),
        "classificationConfusion": _confusion(docs),
        "hallucinationRate": r4(sc["hallucinationRate"]),
        "missRate": r4(sc["missRate"]),
        "values": {s: int((st == s).sum()) for s in STATUSES},
        "calibration": cal,
        "costUsd": {
            "mean": r6(float(cost.mean())) if len(cost) else None,
            "p50": r6(_pct(cost, 0.5)),
            "p95": r6(_pct(cost, 0.95)),
            "total": r6(float(cost.sum())),
        },
        "latencyMs": {
            s: {"p50": _round1(_pct(live[f"ms_{s}"], 0.5)), "p95": _round1(_pct(live[f"ms_{s}"], 0.95))}
            for s in STEPS
        },
        "spread": spread,
    }


def _round1(x: float | None) -> float | None:
    return None if x is None else round(x, 1)


# ---------------------------------------------------------------- comparison


def compare_models(a: dict, b: dict) -> dict[str, Any]:
    """Differences b - a for the gated metrics, cost ratio b / a and the fields where b loses most."""
    out: dict[str, Any] = {}
    for name, path in GATED.items():
        x, y = get_path(a, path), get_path(b, path)
        digits = 6 if name == "costUsdMean" else 4
        out[name] = None if x is None or y is None else round(y - x, digits)
    ca, cb = a["costUsd"]["mean"], b["costUsd"]["mean"]
    out["costRatio"] = None if not ca or cb is None else round(cb / ca, 4)
    fa, fb = a["fieldAccuracy"]["byField"], b["fieldAccuracy"]["byField"]
    rows = [
        {"field": f, "a": fa[f], "b": fb[f], "diff": round(fb[f] - fa[f], 4)}
        for f in fa
        if f in fb and fa[f] is not None and fb[f] is not None and fb[f] < fa[f]
    ]
    rows.sort(key=lambda r: (r["diff"], r["field"]))
    out["fieldsWhereLosesMost"] = rows[:TOP_LOSERS]
    return out


def pick_pair(models: list[str]) -> tuple[str, str] | None:
    if "opus" in models and "haiku" in models:
        return "opus", "haiku"
    return (models[0], models[1]) if len(models) == 2 else None


# ---------------------------------------------------------------- whole run


def compute_metrics(run_dir: str | Path, dataset: str | Path | None = None) -> dict[str, Any]:
    run_dir = Path(run_dir)
    meta = read_run_json(run_dir)
    values, docs = load_frames(run_dir, dataset)
    ids = {m: i for m, i in zip(docs["model"], docs["modelId"])}
    aliases = list(meta.get("models") or dict.fromkeys(docs["model"]))
    aliases += [m for m in dict.fromkeys(docs["model"]) if m not in aliases]
    models = {
        m: model_metrics(values[values["model"] == m], docs[docs["model"] == m], (meta.get("models") or {}).get(m) or ids.get(m))
        for m in aliases
        if m in set(docs["model"])
    }
    pair = pick_pair(list(models))
    comparison = {f"{pair[0]}_vs_{pair[1]}": compare_models(models[pair[0]], models[pair[1]])} if pair else None
    return {
        "schema": 1,
        "run": {
            "label": meta.get("label"),
            "gitSha": meta.get("gitSha"),
            "dirty": meta.get("dirty"),
            "datasetHash": (meta.get("dataset") or {}).get("hash"),
            "promptHash": meta.get("promptHash"),
            "started": meta.get("started"),
            "finished": meta.get("finished"),
            "documents": int(docs["id"].nunique()),
            "repeat": int(docs["repeat"].nunique()),
        },
        "models": models,
        "comparison": comparison,
    }
