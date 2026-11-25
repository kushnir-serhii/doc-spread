"""Stand-in for `pnpm eval-extract` in the runner tests. No network, no money.

Reads --file and --extract-model, prints canned JSON with a fixed cost.
Env: FAKE_COST (default 0.004), FAKE_LOG (append one line per call),
FAKE_CRASH (substring of the file name that always exits 1),
FAKE_GARBAGE (substring that prints non-JSON), FAKE_FAIL_ONCE_DIR (a call per
file fails the first time only; marker files go in this dir).
"""

import json
import os
import sys
from pathlib import Path

args = sys.argv[1:]
file = Path(args[args.index("--file") + 1])
model = args[args.index("--extract-model") + 1] if "--extract-model" in args else "default"
name = file.name

if os.environ.get("FAKE_LOG"):
    with open(os.environ["FAKE_LOG"], "a", encoding="utf-8") as f:
        f.write(f"{name} {model}\n")

crash = os.environ.get("FAKE_CRASH")
if crash and crash in name:
    print("boom: something broke\nsecond line of stderr", file=sys.stderr)
    sys.exit(1)
garbage = os.environ.get("FAKE_GARBAGE")
if garbage and garbage in name:
    print("this is not json")
    sys.exit(0)
once = os.environ.get("FAKE_FAIL_ONCE_DIR")
if once:
    marker = Path(once) / f"{name}.{model}"
    if not marker.exists():
        marker.write_text("x")
        print("flaky", file=sys.stderr)
        sys.exit(1)

cost = float(os.environ.get("FAKE_COST", "0.004"))
print("fake log line", file=sys.stderr)
print(json.dumps({
    "file": name,
    "outcome": "needs_review",
    "error": None,
    "classification": {"typeKey": "invoice", "pickedTypeKey": "invoice", "confidence": 0.98, "model": "fake"},
    "values": {"supplier_name": {"type": "text", "value": "SECRET VALUE", "confidence": 0.98, "source": None}},
    "overallConfidence": 0.98,
    "calls": [
        {"step": "classify", "requestedModel": "x", "model": "x", "costUsd": cost / 4, "ms": 10},
        {"step": "extract", "requestedModel": model, "model": model, "costUsd": cost * 3 / 4, "ms": 20},
    ],
    "ms": {"ocr": 1, "classify": 10, "extract": 20, "total": 31},
    "promptHash": "abc123",
}))
