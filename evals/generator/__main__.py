"""CLI: uv run python -m generator invoices --count 24 --seed 1"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

from .invoice import SEED_SPAN, generate_invoices

DATASET = Path(__file__).resolve().parent.parent / "dataset"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="generator")
    sub = parser.add_subparsers(dest="kind", required=True)
    inv = sub.add_parser("invoices", help="generate synthetic invoices")
    inv.add_argument("--count", type=int, default=24)
    inv.add_argument("--seed", type=int, default=1)
    inv.add_argument("--out", type=Path, default=DATASET / "invoices")
    args = parser.parse_args(argv)

    if args.kind == "invoices":
        if not 0 <= args.seed < 10**6 or not 1 <= args.count < SEED_SPAN:
            parser.error("--seed must be < 1000000 and --count between 1 and 9999")
        truths = generate_invoices(args.out, args.count, args.seed)
        tags = Counter(t for truth in truths for t in truth["tags"])
        print(f"wrote {len(truths)} invoices to {args.out}")
        for tag, n in sorted(tags.items()):
            print(f"  {tag}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
