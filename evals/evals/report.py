"""Render `report.md` from the metrics dict. Nothing is recomputed here, so the report's numbers
are the numbers in `metrics.json` by construction (rates with 4 decimals, costs with 6)."""

from __future__ import annotations

from typing import Any

from evals.metrics import GATED, LOW_CONFIDENCE, STEPS, get_path

NA = "n/a"

HOW_TO_READ = f"""\
- **Values** are scalar fields and table cells, each scored `correct`, `wrong`, `missed` (truth has a value, prediction empty), `hallucinated` (truth empty, prediction has a value) or `correct_absent` (both empty). Distractor documents have no values.
- **Field accuracy** = (correct + correct_absent) / all values. By field, table cells are `<field>.<column>`; by tag, a value counts under every tag of its document.
- **Document exact match** = share of documents with an expected type whose every required scalar field is correct (table cells ignored).
- **Classification accuracy** = share of all documents (distractors included) classified correctly. A distractor is correct when left unclassified.
- **Hallucination rate** = hallucinated / values whose truth is empty. **Miss rate** = missed / values whose truth has a value.
- **Calibration** covers values that have a prediction; a value is right when `correct`. **ECE** = sum over bins of (n bin / N) x |accuracy - mean confidence|; lower is better.
- **Verified precision** = of values at or above {LOW_CONFIDENCE} (`LOW_CONFIDENCE`, which the app shows as fine), the share that is correct.
- **Error-catch rate** = of wrong or hallucinated values, the share the app flags (confidence below {LOW_CONFIDENCE}).
- **Cost** per document = sum of its calls. **Latency** excludes calls that ended in `error`.
- **Rates** are fractions between 0 and 1. A rate with nothing to divide by shows `{NA}`.
- **Difference** (in comparisons) = second minus first; cost ratio = second mean cost / first mean cost."""


def f4(x: float | None) -> str:
    return NA if x is None else f"{x:.4f}"


def f6(x: float | None) -> str:
    return NA if x is None else f"{x:.6f}"


def f1(x: float | None) -> str:
    return NA if x is None else f"{x:.1f}"


def table(headers: list[str], rows: list[list[Any]]) -> str:
    def cell(c: Any) -> str:
        return str(c).replace("|", "\\|")

    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    out += ["| " + " | ".join(cell(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def fmt_metric(name: str, v: float | None) -> str:
    return f6(v) if name == "costUsdMean" else f4(v)


def _by(models: dict, getter, key_label: str, keys: list[str], fmt=f4) -> str:
    names = list(models)
    return table([key_label, *names], [[k, *[fmt(getter(models[m]).get(k)) for m in names]] for k in keys])


def _keys(models: dict, getter) -> list[str]:
    seen: dict[str, None] = {}
    for m in models.values():
        seen.update(dict.fromkeys(getter(m)))
    return sorted(seen)


def render(metrics: dict[str, Any], charts: list[tuple[str, str]]) -> str:
    """charts: (chart key, relative path), keys: reliability, accuracy_by_field, cost_vs_accuracy."""
    models: dict[str, dict] = metrics["models"]
    names = list(models)
    run = metrics["run"]
    chart = dict(charts)
    L: list[str] = []
    L.append(f"# Extraction eval report: {run.get('label') or 'run'}\n")
    L.append(
        f"Documents: {run['documents']}, repeats: {run['repeat']}, started: {run.get('started') or NA}, "
        f"git: {(run.get('gitSha') or NA)[:10]}{' (dirty)' if run.get('dirty') else ''}, "
        f"dataset hash: {(run.get('datasetHash') or NA)[:12]}, prompt hash: {(run.get('promptHash') or NA)[:12]}\n"
    )

    L.append("## Summary\n")
    rows = [[n, *[fmt_metric(n, get_path(models[m], p)) for m in names]] for n, p in GATED.items()]
    rows.insert(0, ["documents", *[models[m]["documents"] for m in names]])
    rows.insert(1, ["model id", *[models[m]["modelId"] or NA for m in names]])
    rows.append(["costUsd total", *[f6(models[m]["costUsd"]["total"]) for m in names]])
    L.append(table(["metric", *names], rows) + "\n")

    L.append("## How to read\n")
    L.append(HOW_TO_READ + "\n")

    L.append("## Field accuracy\n")
    L.append(table(["model", "overall", "correct", "wrong", "missed", "hallucinated", "correct_absent"], [
        [m, f4(models[m]["fieldAccuracy"]["overall"]), *[models[m]["values"][s] for s in
         ("correct", "wrong", "missed", "hallucinated", "correct_absent")]] for m in names
    ]) + "\n")  # fmt: skip
    L.append("### By field\n")
    L.append(_by(models, lambda m: m["fieldAccuracy"]["byField"], "field", _keys(models, lambda m: m["fieldAccuracy"]["byField"])) + "\n")
    if "accuracy_by_field" in chart:
        L.append(f"![Accuracy by field]({chart['accuracy_by_field']})\n")
    L.append("### By document type\n")
    L.append(_by(models, lambda m: m["fieldAccuracy"]["byType"], "type", _keys(models, lambda m: m["fieldAccuracy"]["byType"])) + "\n")
    L.append("### By tag\n")
    L.append(_by(models, lambda m: m["fieldAccuracy"]["byTag"], "tag", _keys(models, lambda m: m["fieldAccuracy"]["byTag"])) + "\n")

    L.append("## Document exact match\n")
    L.append(table(["model", "documentExactMatch"], [[m, f4(models[m]["documentExactMatch"])] for m in names]) + "\n")

    L.append("## Classification\n")
    L.append(table(["model", "classificationAccuracy"], [[m, f4(models[m]["classificationAccuracy"])] for m in names]) + "\n")
    for m in names:
        conf = models[m]["classificationConfusion"]
        preds = sorted({p for row in conf.values() for p in row})
        L.append(f"### Confusion: {m} (rows expected, columns predicted)\n")
        L.append(table(["expected", *preds], [[e, *[conf[e].get(p, 0) for p in preds]] for e in conf]) + "\n")

    L.append("## Hallucination and miss rates\n")
    L.append(table(["model", "hallucinationRate", "missRate"], [
        [m, f4(models[m]["hallucinationRate"]), f4(models[m]["missRate"])] for m in names
    ]) + "\n")  # fmt: skip

    L.append("## Calibration\n")
    L.append(table(["model", "ece", "verifiedPrecision", "errorCatchRate"], [
        [m, *[f4(models[m]["calibration"][k]) for k in ("ece", "verifiedPrecision", "errorCatchRate")]] for m in names
    ]) + "\n")  # fmt: skip
    for m in names:
        L.append(f"### Reliability: {m}\n")
        L.append(table(["confidence bin", "count", "mean confidence", "accuracy"], [
            [f"{b['lo']:g} to {b['hi']:g}", b["count"], f4(b["meanConfidence"]), f4(b["accuracy"])]
            for b in models[m]["calibration"]["bins"]
        ]) + "\n")  # fmt: skip
    if "reliability" in chart:
        L.append(f"![Reliability diagram]({chart['reliability']})\n")

    L.append("## Cost and latency\n")
    L.append(table(["model", "mean", "p50", "p95", "total"], [
        [m, *[f6(models[m]["costUsd"][k]) for k in ("mean", "p50", "p95", "total")]] for m in names
    ]) + "\n")  # fmt: skip
    L.append("Latency in ms (p50 / p95):\n")
    L.append(table(["model", *STEPS], [
        [m, *[f"{f1(models[m]['latencyMs'][s]['p50'])} / {f1(models[m]['latencyMs'][s]['p95'])}" for s in STEPS]]
        for m in names
    ]) + "\n")  # fmt: skip
    if "cost_vs_accuracy" in chart:
        L.append(f"![Cost vs accuracy]({chart['cost_vs_accuracy']})\n")

    L.append("## Opus vs Haiku\n")
    comp = metrics.get("comparison")
    if not comp:
        L.append("Needs exactly two models (or opus and haiku); this run has " + ", ".join(names) + ".\n")
    else:
        pair, c = next(iter(comp.items()))
        a, b = pair.split("_vs_")
        L.append(f"{b} against {a}.\n")
        rows = []
        for n, p in GATED.items():
            d = c[n]
            rows.append([n, fmt_metric(n, get_path(models[a], p)), fmt_metric(n, get_path(models[b], p)), fmt_metric(n, d)])
        L.append(table(["metric", a, b, f"difference ({b} - {a})"], rows) + "\n")
        L.append(f"Cost ratio ({b} mean cost / {a} mean cost): {f4(c['costRatio'])}\n")
        L.append(f"### Fields where {b} loses most\n")
        if c["fieldsWhereLosesMost"]:
            L.append(table(["field", a, b, "difference"], [
                [r["field"], f4(r["a"]), f4(r["b"]), f4(r["diff"])] for r in c["fieldsWhereLosesMost"]
            ]) + "\n")  # fmt: skip
        else:
            L.append(f"{b} loses on no field.\n")

    L.append("## Spread across repeats\n")
    if run["repeat"] <= 1:
        L.append("Single repeat: no spread.\n")
    else:
        for m in names:
            sp = models[m]["spread"]
            L.append(f"### {m}\n")
            L.append(table(["metric", "min", "max", "std"], [
                [n, *[fmt_metric(n, sp[n].get(k)) if sp and sp.get(n) else NA for k in ("min", "max", "std")]]
                for n in GATED
            ]) + "\n")  # fmt: skip
    return "\n".join(L)


def render_compare(a_label: str, b_label: str, a: dict, b: dict) -> str:
    """Diff table between two runs (b - a) for each model present in both."""
    shared = [m for m in a["models"] if m in b["models"]]
    if not shared:
        return "No model is present in both runs."
    out = []
    for m in shared:
        rows = []
        for n, p in GATED.items():
            x, y = get_path(a["models"][m], p), get_path(b["models"][m], p)
            d = None if x is None or y is None else y - x
            rows.append([n, fmt_metric(n, x), fmt_metric(n, y), (NA if d is None else (f"{d:+.6f}" if n == "costUsdMean" else f"{d:+.4f}"))])
        out.append(f"Model {m}\n" + table(["metric", a_label, b_label, "difference"], rows))
    return "\n\n".join(out)
