"""Analysis: a run's results.jsonl + truth -> metrics.json, report.md and charts/*.png.

    uv run python -m evals.analyze evals/runs/<run> [--compare <other run>] [--out <dir>] [--dataset <dir>]

Outputs go to the run dir unless --out says otherwise. They hold aggregates only, no document values.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from evals.metrics import compute_metrics  # noqa: E402
from evals.report import render, render_compare  # noqa: E402
from evals.run import find_run_dir  # noqa: E402

COLORS = ["#2a6fb0", "#d9822b", "#3f8f5c", "#8e5ba8", "#b04a4a"]  # colour-blind friendly enough, one per model


def make_charts(metrics: dict[str, Any], out_dir: Path) -> list[tuple[str, str]]:
    models = metrics["models"]
    names = list(models)
    color = {m: COLORS[i % len(COLORS)] for i, m in enumerate(names)}
    charts_dir = out_dir / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    made = []

    # reliability: accuracy against mean confidence per bin, with the ideal diagonal
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot([0, 1], [0, 1], "--", color="#888", label="perfectly calibrated")
    for m in names:
        pts = [(b["meanConfidence"], b["accuracy"]) for b in models[m]["calibration"]["bins"] if b["count"]]
        if pts:
            ax.plot(*zip(*pts), marker="o", color=color[m], label=m)
    ax.axvline(0.9, color="#bbb", lw=0.8)
    ax.set_xlabel("mean confidence")
    ax.set_ylabel("accuracy")
    ax.set_xlim(0, 1.02)
    ax.set_ylim(0, 1.02)
    ax.set_title("Reliability")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(charts_dir / "reliability.png", dpi=120)
    plt.close(fig)
    made.append(("reliability", "charts/reliability.png"))

    # accuracy by field
    fields = sorted({f for m in names for f in models[m]["fieldAccuracy"]["byField"]})
    if fields:
        fig, ax = plt.subplots(figsize=(7, max(3, 0.28 * len(fields) * len(names) + 1)))
        h = 0.8 / len(names)
        for i, m in enumerate(names):
            ys = [j + i * h for j in range(len(fields))]
            xs = [models[m]["fieldAccuracy"]["byField"].get(f) or 0 for f in fields]
            ax.barh(ys, xs, height=h, color=color[m], label=m)
        ax.set_yticks([j + 0.4 - h / 2 for j in range(len(fields))], fields, fontsize=7)
        ax.invert_yaxis()
        ax.set_xlim(0, 1)
        ax.set_xlabel("field accuracy")
        ax.legend()
        fig.tight_layout()
        fig.savefig(charts_dir / "accuracy_by_field.png", dpi=120)
        plt.close(fig)
        made.append(("accuracy_by_field", "charts/accuracy_by_field.png"))

    # cost vs accuracy
    fig, ax = plt.subplots(figsize=(5, 4))
    for m in names:
        c, a = models[m]["costUsd"]["mean"], models[m]["fieldAccuracy"]["overall"]
        if c is not None and a is not None:
            ax.scatter([c], [a], s=70, color=color[m], label=m)
    ax.set_xlabel("mean cost per document (USD)")
    ax.set_ylabel("field accuracy")
    ax.set_ylim(0, 1.02)
    ax.legend()
    fig.tight_layout()
    fig.savefig(charts_dir / "cost_vs_accuracy.png", dpi=120)
    plt.close(fig)
    made.append(("cost_vs_accuracy", "charts/cost_vs_accuracy.png"))
    return made


def write_outputs(metrics: dict[str, Any], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    charts = make_charts(metrics, out_dir)
    (out_dir / "report.md").write_text(render(metrics, charts) + "\n", encoding="utf-8")


def _load_other(path: str, dataset: str | None) -> tuple[Path, dict[str, Any]]:
    d = find_run_dir(path)
    if d is None:
        raise SystemExit(f"No run found at {path}")
    mj = d / "metrics.json"
    if mj.is_file():
        return d, json.loads(mj.read_text(encoding="utf-8"))
    return d, compute_metrics(d, dataset)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m evals.analyze", description=__doc__.split("\n")[0])
    ap.add_argument("run")
    ap.add_argument("--compare", help="another run dir: print a diff table (this run vs the other)")
    ap.add_argument("--out", help="output dir (default: the run dir)")
    ap.add_argument("--dataset", help="dataset dir (default: the one in run.json)")
    a = ap.parse_args(argv)
    run_dir = find_run_dir(a.run)
    if run_dir is None:
        print(f"No run.json in {a.run}", file=sys.stderr)
        return 2
    metrics = compute_metrics(run_dir, a.dataset)
    out_dir = Path(a.out) if a.out else run_dir
    write_outputs(metrics, out_dir)
    print(f"Wrote metrics.json, report.md and charts/ to {out_dir}")
    if a.compare:
        other_dir, other = _load_other(a.compare, a.dataset)
        print()
        print(render_compare(run_dir.name, other_dir.name, metrics, other))
    return 0


if __name__ == "__main__":
    sys.exit(main())
