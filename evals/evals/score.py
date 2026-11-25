"""Scoring: compare one `eval-extract` result with its truth file.

Every field (and every table cell) gets one status: correct, wrong, missed,
hallucinated or correct_absent. The output is flat and plain so that
`analyze.py` can build a pandas frame from it.

CLI: `uv run python -m evals.score <run dir> [--dataset <dir>]`
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from rapidfuzz import fuzz

from evals.dataset import DEFAULT_DATASET, load_dataset
from evals.truth import Truth, load_type

CORRECT = "correct"
WRONG = "wrong"
MISSED = "missed"
HALLUCINATED = "hallucinated"
CORRECT_ABSENT = "correct_absent"
STATUSES = (CORRECT, WRONG, MISSED, HALLUCINATED, CORRECT_ABSENT)

# services/api/src/pipeline/extract-map.ts: ASSUMED_CURRENCY_CONFIDENCE. An amount whose currency
# was not read is capped at this confidence; the no-guess rule checks for it.
ASSUMED_CURRENCY_CONFIDENCE = 0.5
NEAR_RATIO = 90  # rapidfuzz ratio (0-100) from which a wrong text is flagged `near`
ROW_MATCH_MIN_SIMILARITY = 0.5

# extract-map.ts takes the decimals from Intl (`maximumFractionDigits`); this is the same
# data for the currencies that don't have 2. Everything else has 2.
_ZERO_DECIMAL = {
    "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF",
    "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF",
}  # fmt: skip
_THREE_DECIMAL = {"BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"}


def minor_digits(currency: str | None) -> int:
    if currency in _ZERO_DECIMAL:
        return 0
    if currency in _THREE_DECIMAL:
        return 3
    return 2


def to_minor_units(decimal: str, currency: str | None) -> int | None:
    """Port of `toMinorUnits` in extract-map.ts: "1234.50" -> 123450, string math, half up."""
    m = re.fullmatch(r"(-?)(\d+)(?:\.(\d+))?", decimal.strip())
    if not m:
        return None
    digits = minor_digits(currency)
    fraction = m.group(3) or ""
    minor = int(m.group(2) + fraction.ljust(digits, "0")[:digits])
    if len(fraction) > digits and int(fraction[digits]) >= 5:
        minor += 1
    return -minor if m.group(1) == "-" else minor


@dataclass
class ValueScore:
    field: str
    column: str | None
    row: int | None  # truth row index; None for extra rows' cells and row-less table scores
    fieldType: str
    required: bool
    status: str
    confidence: float | None
    near: bool = False
    noGuess: bool | None = None
    truth: str | None = None
    predicted: str | None = None


@dataclass
class DocScore:
    id: str
    model: str | None
    repeat: int | None
    outcome: str
    expectedType: str | None
    predictedType: str | None
    pickedType: str | None
    classificationCorrect: bool
    classConfidence: float | None
    values: list[ValueScore] = field(default_factory=list)

    def counts(self) -> dict[str, int]:
        c = Counter(v.status for v in self.values)
        return {s: c.get(s, 0) for s in STATUSES}


# ---------------------------------------------------------------- normalization


def norm_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).casefold()
    s = " ".join(s.split())
    start, end = 0, len(s)
    while start < end and (s[start].isspace() or unicodedata.category(s[start]).startswith("P")):
        start += 1
    while end > start and (s[end - 1].isspace() or unicodedata.category(s[end - 1]).startswith("P")):
        end -= 1
    return s[start:end]


def norm_tax_id(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKC", s) if c.isalnum()).upper()


def norm_phone(s: str) -> str:
    s = s.strip()
    return ("+" if s.startswith("+") else "") + "".join(c for c in s if c.isdigit())


def _normalize(ftype: str, v: Any) -> Any:
    if ftype == "text":
        return norm_text(str(v))
    if ftype == "tax_id":
        return norm_tax_id(str(v))
    if ftype == "email":
        return str(v).strip().casefold()
    if ftype == "phone":
        return norm_phone(str(v))
    if ftype == "select":
        return str(v).strip()
    return v


# ---------------------------------------------------------------- scalar scoring


@dataclass
class _Result:
    status: str
    near: bool = False
    noGuess: bool | None = None
    truth: str | None = None
    predicted: str | None = None


def _money_display(minor: int | None, currency: str | None) -> str:
    return f"{minor} {currency or '?'}"


def _score_money(truth: dict, pred: dict, confidence: float | None) -> _Result:
    t_cur = truth.get("currency")
    p_cur = pred.get("currency")
    # with no stated currency, the decimals are those of the predicted currency (2 if none)
    t_minor = to_minor_units(str(truth["amount"]), t_cur or p_cur)
    p_amount = pred.get("amount")
    amount_ok = t_minor is not None and p_amount == t_minor
    disp_t = _money_display(t_minor, t_cur)
    disp_p = _money_display(p_amount, p_cur)
    if t_cur is None:
        no_guess = confidence is not None and confidence <= ASSUMED_CURRENCY_CONFIDENCE
        return _Result(CORRECT if amount_ok and no_guess else WRONG, noGuess=no_guess, truth=disp_t, predicted=disp_p)
    return _Result(CORRECT if amount_ok and p_cur == t_cur else WRONG, truth=disp_t, predicted=disp_p)


def _score_scalar(ftype: str, truth_v: Any, pred_v: Any, confidence: float | None) -> _Result:
    """Both values are present (not None)."""
    if ftype == "money":
        return _score_money(truth_v, pred_v, confidence)
    if ftype == "number":
        ok = (
            isinstance(pred_v, (int, float))
            and not isinstance(pred_v, bool)
            and abs(float(pred_v) - float(truth_v)) <= 1e-6
        )
        return _Result(CORRECT if ok else WRONG, truth=str(truth_v), predicted=str(pred_v))
    if ftype == "boolean":
        return _Result(CORRECT if pred_v is truth_v else WRONG, truth=str(truth_v), predicted=str(pred_v))
    if ftype == "date":
        return _Result(CORRECT if pred_v == truth_v else WRONG, truth=str(truth_v), predicted=str(pred_v))
    t, p = _normalize(ftype, truth_v), _normalize(ftype, pred_v)
    if t == p:
        return _Result(CORRECT, truth=str(t), predicted=str(p))
    near = ftype == "text" and fuzz.ratio(t, p) >= NEAR_RATIO
    return _Result(WRONG, near=near, truth=str(t), predicted=str(p))


def _pred_value(entry: Any) -> tuple[Any, float | None]:
    """(value, confidence) of a predicted scalar entry; (None, None) when there is no value."""
    if not isinstance(entry, dict) or entry.get("value") is None:
        return None, None
    conf = entry.get("confidence")
    return entry["value"], (float(conf) if isinstance(conf, (int, float)) else None)


def _score_one(
    ftype: str, truth_v: Any, entry: Any, *, field_key: str, column: str | None, row: int | None, required: bool
) -> ValueScore:
    pred_v, conf = _pred_value(entry)
    base = dict(field=field_key, column=column, row=row, fieldType=ftype, required=required, confidence=conf)
    if truth_v is None and pred_v is None:
        return ValueScore(status=CORRECT_ABSENT, **base)
    if truth_v is None:
        return ValueScore(status=HALLUCINATED, predicted=_display(ftype, pred_v), **base)
    if pred_v is None:
        return ValueScore(status=MISSED, truth=_display(ftype, truth_v), **base)
    r = _score_scalar(ftype, truth_v, pred_v, conf)
    return ValueScore(status=r.status, near=r.near, noGuess=r.noGuess, truth=r.truth, predicted=r.predicted, **base)


def _display(ftype: str, v: Any) -> str:
    if ftype == "money" and isinstance(v, dict):
        if isinstance(v.get("amount"), str):
            return _money_display(to_minor_units(v["amount"], v.get("currency")), v.get("currency"))
        return _money_display(v.get("amount"), v.get("currency"))
    return str(_normalize(ftype, v))


# ---------------------------------------------------------------- tables


def _match_rows(
    truth_rows: list[dict], pred_rows: list[dict], columns: list[dict]
) -> dict[int, int]:
    """Greedy truth row index -> predicted row index. A pair is a candidate when the descriptions are
    at least 0.5 similar or the first money column's amount matches; its score is the similarity
    plus 1.0 for an amount match."""
    desc = next((c["key"] for c in columns if c["type"] == "text"), None)
    money = next((c["key"] for c in columns if c["type"] == "money"), None)
    pairs: list[tuple[float, int, int]] = []
    for i, tr in enumerate(truth_rows):
        for j, pr in enumerate(pred_rows):
            sim = 0.0
            if desc is not None:
                td = tr.get(desc)
                pd, _ = _pred_value(pr.get("cells", {}).get(desc))
                if td is not None and pd is not None:
                    sim = fuzz.ratio(norm_text(str(td)), norm_text(str(pd))) / 100
            amount = False
            if money is not None and isinstance(tr.get(money), dict):
                pm, _ = _pred_value(pr.get("cells", {}).get(money))
                if isinstance(pm, dict):
                    t_minor = to_minor_units(str(tr[money]["amount"]), tr[money].get("currency") or pm.get("currency"))
                    amount = t_minor is not None and pm.get("amount") == t_minor
            if sim >= ROW_MATCH_MIN_SIMILARITY or amount:
                pairs.append((sim + (1.0 if amount else 0.0), i, j))
    pairs.sort(key=lambda p: (-p[0], p[1], p[2]))
    matched: dict[int, int] = {}
    used: set[int] = set()
    for _, i, j in pairs:
        if i in matched or j in used:
            continue
        matched[i] = j
        used.add(j)
    return matched


def _score_table(fdef: dict, truth_rows: list[dict] | None, pred_entry: Any) -> list[ValueScore]:
    key, required = fdef["key"], bool(fdef.get("required"))
    columns = fdef["columns"]
    ctype = {c["key"]: c["type"] for c in columns}
    truth_rows = truth_rows or []
    pred_rows = pred_entry.get("rows", []) if isinstance(pred_entry, dict) else []
    out: list[ValueScore] = []

    def cell(col: str, truth_v: Any, entry: Any, row: int | None) -> ValueScore:
        return _score_one(ctype[col], truth_v, entry, field_key=key, column=col, row=row, required=required)

    if not truth_rows and not pred_rows:
        return [ValueScore(key, None, None, "table", required, CORRECT_ABSENT, None)]
    matched = _match_rows(truth_rows, pred_rows, columns)
    for i, tr in enumerate(truth_rows):
        j = matched.get(i)
        for c in columns:
            col = c["key"]
            tv = tr.get(col)
            if j is None:
                if tv is not None:  # unmatched truth row: only its values count, as missed
                    out.append(cell(col, tv, None, i))
            else:
                out.append(cell(col, tv, pred_rows[j].get("cells", {}).get(col), i))
    matched_pred = set(matched.values())
    for j, pr in enumerate(pred_rows):
        if j in matched_pred:
            continue
        for c in columns:  # extra row: only the cells that hold a value count, as hallucinated
            entry = pr.get("cells", {}).get(c["key"])
            if _pred_value(entry)[0] is not None:
                out.append(cell(c["key"], None, entry, None))
    return out


# ---------------------------------------------------------------- documents


def score_result(result: dict, truth: Truth, type_def: dict | None) -> DocScore:
    outcome = result.get("outcome") or "error"
    cls = result.get("classification") or None
    predicted = cls.get("typeKey") if cls else None
    expected = truth.expectedType
    if expected is None:
        class_ok = outcome == "unclassified"
    else:
        class_ok = outcome != "error" and predicted == expected
    doc = DocScore(
        id=result.get("id") or truth.id,
        model=result.get("model"),
        repeat=result.get("repeat"),
        outcome=outcome,
        expectedType=expected,
        predictedType=predicted,
        pickedType=cls.get("pickedTypeKey") if cls else None,
        classificationCorrect=class_ok,
        classConfidence=cls.get("confidence") if cls else None,
    )
    if expected is None or type_def is None:
        return doc  # a distractor: classification only
    # values count only when the right type was extracted; otherwise every truth value is missed
    usable = outcome == "needs_review" and predicted == expected
    values = result.get("values") or {} if usable else {}
    for fdef in type_def["fields"]:
        key = fdef["key"]
        truth_v = truth.fields.get(key)
        if fdef["type"] == "table":
            doc.values.extend(_score_table(fdef, truth_v, values.get(key)))
        else:
            doc.values.append(
                _score_one(
                    fdef["type"], truth_v, values.get(key),
                    field_key=key, column=None, row=None, required=bool(fdef.get("required")),
                )
            )  # fmt: skip
    return doc


def score_run(run_dir: str | Path, dataset_dir: str | Path = DEFAULT_DATASET) -> list[DocScore]:
    docs = {d.id: d for d in load_dataset(dataset_dir)}
    types: dict[str, dict] = {}
    scores = []
    lines = (Path(run_dir) / "results.jsonl").read_text(encoding="utf-8").splitlines()
    for line in lines:
        if not line.strip():
            continue
        result = json.loads(line)
        doc = docs.get(result["id"])
        if doc is None:
            raise KeyError(f"result {result['id']!r} has no truth file in {dataset_dir}")
        expected = doc.truth.expectedType
        if expected is not None and expected not in types:
            types[expected] = load_type(expected)
        scores.append(score_result(result, doc.truth, types.get(expected) if expected else None))
    return scores


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="python -m evals.score")
    ap.add_argument("run_dir")
    ap.add_argument("--dataset", default=str(DEFAULT_DATASET))
    args = ap.parse_args(argv)
    for s in score_run(args.run_dir, args.dataset):
        counts = " ".join(f"{k}={v}" for k, v in s.counts().items())
        print(f"{s.id} model={s.model} outcome={s.outcome} class_ok={s.classificationCorrect} {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

