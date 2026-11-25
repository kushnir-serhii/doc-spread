from __future__ import annotations

import json
import re
import statistics
from pathlib import Path

import pytest

from evals import metrics as M
from evals.analyze import main as analyze_main
from evals.metrics import compute_metrics
from evals.report import render_compare

REPO = Path(__file__).resolve().parents[2]


def S(value, conf, type_="text"):
    return {"type": type_, "value": value, "confidence": conf}


def D(value, conf):
    return S(value, conf, "date")


def write_dataset(root: Path) -> Path:
    ds = root / "dataset"
    ds.mkdir()
    docs = {
        "d1": ("invoice", ["scanned", "usd"], {"supplier_name": "Acme Secret Ltd", "invoice_number": "INV-1", "issue_date": "2026-01-01"}),
        "d2": ("invoice", ["usd"], {"supplier_name": "Beta Corp", "invoice_number": "INV-9", "issue_date": "2026-02-02"}),
        "x1": (None, ["contract"], {}),
    }
    for i, (exp, tags, fields) in docs.items():
        (ds / f"{i}.truth.json").write_text(json.dumps({
            "id": i, "file": f"{i}.pdf", "expectedType": exp, "source": "synthetic",
            "tags": tags, "seed": None, "fields": fields,
        }), encoding="utf-8")  # fmt: skip
    return ds


def line(id_, model, repeat, *, values=None, outcome="needs_review", typekey="invoice", cost=0.01, total=1000, error=False):
    if error:
        return {"id": id_, "model": model, "modelId": f"id-{model}", "repeat": repeat, "outcome": "error", "error": "boom",
                "classification": None, "values": {}, "calls": [], "ms": None, "costUsd": 0.0}  # fmt: skip
    return {
        "id": id_, "model": model, "modelId": f"id-{model}", "repeat": repeat, "outcome": outcome,
        "classification": {"typeKey": typekey, "pickedTypeKey": typekey, "confidence": 0.9, "model": "c"},
        "values": values or {},
        "calls": [{"step": "classify", "costUsd": cost / 2, "ms": 100}, {"step": "extract", "costUsd": cost / 2, "ms": total - 100}],
        "ms": {"ocr": 10, "classify": 100, "extract": total - 100, "total": total}, "costUsd": cost,
    }  # fmt: skip


D1_BAD = {  # 2 correct, 1 wrong (uncaught), 1 hallucinated (caught)
    "supplier_name": S("Acme Secret Ltd", 0.95), "invoice_number": S("INV-2", 0.95),
    "issue_date": D("2026-01-01", 0.6), "sale_date": D("2026-01-02", 0.5),
}  # fmt: skip
D1_GOOD = {"supplier_name": S("Acme Secret Ltd", 0.99), "invoice_number": S("INV-1", 0.99), "issue_date": D("2026-01-01", 0.99)}
D2_GOOD = {"supplier_name": S("Beta Corp", 0.99), "invoice_number": S("INV-9", 0.99), "issue_date": D("2026-02-02", 0.99)}


def make_run(root: Path, lines: list[dict], models=("m1", "m2"), repeat=1) -> Path:
    ds = write_dataset(root)
    run = root / "run"
    run.mkdir()
    (run / "results.jsonl").write_text("".join(json.dumps(x) + "\n" for x in lines), encoding="utf-8")
    (run / "run.json").write_text(json.dumps({
        "label": "t", "models": {m: f"id-{m}" for m in models}, "repeat": repeat,
        "dataset": {"path": str(ds), "hash": "abc"}, "gitSha": "deadbeef", "dirty": False,
    }), encoding="utf-8")  # fmt: skip
    return run


def two_model_lines():
    return [
        line("d1", "m1", 1, values=D1_BAD, cost=0.03, total=3000),
        line("d2", "m1", 1, values=D2_GOOD, cost=0.01, total=1000),
        line("x1", "m1", 1, outcome="unclassified", typekey=None, cost=0.001, total=500),
        line("d1", "m2", 1, error=True),
        line("d2", "m2", 1, values=D2_GOOD, cost=0.002, total=2000),
        line("x1", "m2", 1, outcome="unclassified", typekey=None, cost=0.0005, total=400),
    ]


@pytest.fixture
def run_dir(tmp_path):
    return make_run(tmp_path, two_model_lines())


def test_low_confidence_is_the_one_constant():
    ts = (REPO / "apps/web/src/lib/fields/confidence.ts").read_text(encoding="utf-8")
    assert f"LOW_CONFIDENCE = {M.LOW_CONFIDENCE}" in ts
    pkg = Path(M.__file__).parent
    src = (pkg / "metrics.py").read_text(encoding="utf-8")
    assert "apps/web/src/lib/fields/confidence.ts" in src
    assert len(re.findall(r"^LOW_CONFIDENCE\s*=", src, re.M)) == 1
    for other in ("report.py", "analyze.py"):  # nobody else defines it
        assert not re.search(r"^LOW_CONFIDENCE\s*=", (pkg / other).read_text(encoding="utf-8"), re.M)


def test_hand_computed_metrics(run_dir):
    m = compute_metrics(run_dir)["models"]["m1"]
    assert m["documents"] == 3
    assert m["values"] == {"correct": 5, "wrong": 1, "missed": 0, "hallucinated": 1, "correct_absent": 15}
    assert m["fieldAccuracy"]["overall"] == round(20 / 22, 4)
    assert m["fieldAccuracy"]["byType"] == {"invoice": round(20 / 22, 4)}
    assert m["fieldAccuracy"]["byField"]["invoice_number"] == 0.5
    assert m["fieldAccuracy"]["byTag"]["scanned"] == round(9 / 11, 4)  # d1 only
    assert m["fieldAccuracy"]["byTag"]["usd"] == round(20 / 22, 4)  # both documents
    assert "contract" not in m["fieldAccuracy"]["byTag"]  # distractors carry no values
    assert m["documentExactMatch"] == 0.5
    assert m["classificationAccuracy"] == 1.0
    assert m["classificationConfusion"] == {"invoice": {"invoice": 2}, "none": {"unclassified": 1}}
    assert m["hallucinationRate"] == round(1 / 16, 4)
    assert m["missRate"] == 0.0
    cal = m["calibration"]
    assert [b["count"] for b in cal["bins"]] == [0, 2, 0, 2, 3]
    assert cal["bins"][1]["accuracy"] == 0.5 and cal["bins"][1]["meanConfidence"] == 0.55
    assert cal["ece"] == round(2 / 7 * 0.05 + 2 / 7 * 0.45 + 3 / 7 * 0.01, 4)
    assert cal["verifiedPrecision"] == 0.8
    assert cal["errorCatchRate"] == 0.5
    assert m["costUsd"]["total"] == 0.041
    assert m["costUsd"]["mean"] == round(0.041 / 3, 6)
    assert m["costUsd"]["p50"] == 0.01
    assert m["latencyMs"]["total"]["p50"] == 1000.0
    assert m["spread"] is None


def test_error_line_counts_but_has_no_latency(run_dir):
    m = compute_metrics(run_dir)["models"]["m2"]
    assert m["outcomes"] == {"error": 1, "needs_review": 1, "unclassified": 1}
    assert m["classificationConfusion"]["invoice"] == {"error": 1, "invoice": 1}
    assert m["classificationAccuracy"] == round(2 / 3, 4)
    assert m["latencyMs"]["total"]["p50"] == 1200.0  # 2000 and 400; the error line is out
    assert m["documentExactMatch"] == 0.5
    assert m["values"]["missed"] == 3  # d1's three truth values
    assert m["missRate"] == 0.5  # 3 missed of 6 values that have a truth value


def test_empty_denominators_are_null(tmp_path):
    run = make_run(tmp_path, [line("d2", "m1", 1, values=D2_GOOD)], models=("m1",))
    res = compute_metrics(run)
    assert res["models"]["m1"]["calibration"]["errorCatchRate"] is None  # nothing wrong
    assert res["models"]["m1"]["hallucinationRate"] == 0.0
    assert res["comparison"] is None  # one model


def test_comparison_two_models(run_dir):
    res = compute_metrics(run_dir)
    c, m = res["comparison"]["m1_vs_m2"], res["models"]
    assert c["fieldAccuracy"] == round(m["m2"]["fieldAccuracy"]["overall"] - m["m1"]["fieldAccuracy"]["overall"], 4)
    assert c["costRatio"] == round(m["m2"]["costUsd"]["mean"] / m["m1"]["costUsd"]["mean"], 4)
    lose = c["fieldsWhereLosesMost"]
    assert 0 < len(lose) <= 5
    assert all(r["diff"] < 0 for r in lose) and lose == sorted(lose, key=lambda r: (r["diff"], r["field"]))
    assert "supplier_name" in {r["field"] for r in lose}


def test_opus_haiku_pairing():
    assert M.pick_pair(["haiku", "opus"]) == ("opus", "haiku")
    assert M.pick_pair(["a"]) is None
    assert M.pick_pair(["a", "b", "c"]) is None


def test_spread_across_repeats(tmp_path):
    lines = [
        line("d1", "m1", 1, values=D1_BAD), line("d1", "m1", 2, values=D1_GOOD),
        line("d2", "m1", 1, values=D2_GOOD), line("d2", "m1", 2, values=D2_GOOD),
    ]  # fmt: skip
    run = make_run(tmp_path, lines, models=("m1",), repeat=2)
    res = compute_metrics(run)
    assert res["run"]["repeat"] == 2
    m = res["models"]["m1"]
    r1 = 1 - 2 / 22  # repeat 1: 2 of its 22 values are not right
    sp = m["spread"]["fieldAccuracy"]
    assert sp["max"] == 1.0 and sp["min"] == round(r1, 4)
    assert sp["std"] == round(statistics.stdev([r1, 1.0]), 4)
    assert m["spread"]["documentExactMatch"]["min"] == 0.5 and m["spread"]["documentExactMatch"]["max"] == 1.0
    assert m["fieldAccuracy"]["overall"] == round((20 + 22) / 44, 4)  # pooled
    assert set(m["spread"]) == set(M.GATED)


def test_report_numbers_match_metrics_and_privacy(run_dir, tmp_path):
    out = tmp_path / "out"
    assert analyze_main([str(run_dir), "--out", str(out)]) == 0
    metrics = json.loads((out / "metrics.json").read_text(encoding="utf-8"))
    report = (out / "report.md").read_text(encoding="utf-8")
    assert not (run_dir / "metrics.json").exists()  # --out leaves the run dir alone
    for png in ("reliability", "accuracy_by_field", "cost_vs_accuracy"):
        assert (out / "charts" / f"{png}.png").stat().st_size > 0
        assert f"charts/{png}.png" in report
    for section in ("Summary", "How to read", "Field accuracy", "By field", "By document type", "By tag",
                    "Document exact match", "Classification", "Hallucination and miss rates", "Calibration",
                    "Cost and latency", "Opus vs Haiku", "Spread across repeats"):
        assert f"## {section}" in report or f"### {section}" in report
    for mm in metrics["models"].values():
        for name, path in M.GATED.items():
            v = M.get_path(mm, path)
            if v is not None:
                assert (f"{v:.6f}" if name == "costUsdMean" else f"{v:.4f}") in report
        for b in mm["calibration"]["bins"]:
            if b["accuracy"] is not None:
                assert f"| {b['count']} | {b['meanConfidence']:.4f} | {b['accuracy']:.4f} |" in report
        for f, v in mm["fieldAccuracy"]["byField"].items():
            assert re.search(rf"\| {re.escape(f)} \|.*{v:.4f}", report)
    # aggregates only: no truth value appears anywhere
    for secret in ("Acme Secret", "Beta Corp", "INV-1", "INV-9", "2026-01-01"):
        assert secret not in report and secret not in json.dumps(metrics)
    assert set(metrics) == {"schema", "run", "models", "comparison"}
    assert set(metrics["models"]["m1"]) >= {
        "modelId", "documents", "outcomes", "fieldAccuracy", "documentExactMatch", "classificationAccuracy",
        "classificationConfusion", "hallucinationRate", "missRate", "calibration", "costUsd", "latencyMs", "spread",
    }


def test_compare_prints_diff_table(run_dir, tmp_path, capsys):
    b = tmp_path / "b"
    b.mkdir()
    other = make_run(b, [line("d1", "m1", 1, values=D1_GOOD), line("d2", "m1", 1, values=D2_GOOD),
                         line("x1", "m1", 1, outcome="unclassified", typekey=None)], models=("m1",))  # fmt: skip
    assert analyze_main([str(run_dir), "--compare", str(other), "--out", str(tmp_path / "o")]) == 0
    text = capsys.readouterr().out
    assert "Model m1" in text and "Model m2" not in text  # only models in both runs
    assert re.search(r"\| fieldAccuracy \| 0\.9091 \| 1\.0000 \| \+0\.0909 \|", text)
    assert re.search(r"\| hallucinationRate \| 0\.0625 \| 0\.0000 \| -0\.0625 \|", text)


def test_render_compare_no_shared_model():
    a = {"models": {"x": {}}}
    b = {"models": {"y": {}}}
    assert "No model" in render_compare("a", "b", a, b)
