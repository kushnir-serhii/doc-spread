"""CLI: uv run python -m generator invoices --count 24 --seed 1 (see README)."""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from .coverage import write_coverage
from .distractor import generate_distractors
from .invoice import SEED_SPAN, generate_invoices
from .receipt import generate_receipts

DATASET = Path(__file__).resolve().parent.parent / "dataset"


def _report(kind: str, truths: list[dict], out: Path) -> None:
    tags = Counter(t for truth in truths for t in truth["tags"])
    print(f"wrote {len(truths)} {kind} to {out}")
    for tag, n in sorted(tags.items()):
        print(f"  {tag}: {n}")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="generator")
    sub = parser.add_subparsers(dest="kind", required=True)
    inv = sub.add_parser("invoices", help="generate synthetic invoices")
    inv.add_argument("--count", type=int, default=24)
    inv.add_argument("--seed", type=int, default=1)
    inv.add_argument("--out", type=Path, default=DATASET / "invoices")
    rcp = sub.add_parser("receipts", help="generate synthetic receipt photos")
    rcp.add_argument("--count", type=int, default=12)
    rcp.add_argument("--seed", type=int, default=1)
    rcp.add_argument("--out", type=Path, default=DATASET / "receipts")
    dst = sub.add_parser("distractors", help="generate the four distractor documents")
    dst.add_argument("--seed", type=int, default=1)
    dst.add_argument("--out", type=Path, default=DATASET / "distractors")
    cov = sub.add_parser("coverage", help="write dataset/COVERAGE.md")
    cov.add_argument("--dataset", type=Path, default=DATASET)
    everything = sub.add_parser("all", help="invoices 24, receipts 12, distractors 4, coverage")
    everything.add_argument("--seed", type=int, default=1)
    args = parser.parse_args(argv)

    if args.kind in ("invoices", "receipts", "all") and not 0 <= args.seed < 10**6:
        parser.error("--seed must be below 1000000")
    if args.kind in ("invoices", "receipts") and not 1 <= args.count < SEED_SPAN:
        parser.error("--count must be between 1 and 9999")

    if args.kind == "invoices":
        _report("invoices", generate_invoices(args.out, args.count, args.seed), args.out)
    elif args.kind == "receipts":
        _report("receipts", generate_receipts(args.out, args.count, args.seed), args.out)
    elif args.kind == "distractors":
        _report("distractors", generate_distractors(args.out, args.seed), args.out)
    elif args.kind == "coverage":
        print(f"wrote {write_coverage(args.dataset)}")
    else:
        _report("invoices", generate_invoices(DATASET / "invoices", 24, args.seed), DATASET / "invoices")
        _report("receipts", generate_receipts(DATASET / "receipts", 12, args.seed), DATASET / "receipts")
        _report("distractors", generate_distractors(DATASET / "distractors", args.seed),
                DATASET / "distractors")
        print(f"wrote {write_coverage(DATASET)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
