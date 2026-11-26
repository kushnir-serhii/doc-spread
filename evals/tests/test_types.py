"""Drift tests: the eval types in evals/types/ are frozen copies of the product templates."""

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TYPES = REPO / "evals" / "types"
INVOICE_SRC = REPO / "services" / "api" / "scripts" / "invoice-template.json"
TEMPLATES_TS = REPO / "apps" / "web" / "src" / "lib" / "fields" / "templates.ts"

HOW_TO_FIX = (
    "The eval types are pinned on purpose. If the product template changed, update "
    "evals/types/*.json deliberately (and re-check the truth files)."
)

_STR = r"'((?:[^'\\]|\\.)*)'"
_F_RE = re.compile(
    rf"\bf\(\s*{_STR},\s*{_STR},\s*{_STR},\s*{_STR}(?:,\s*\{{(.*?)\}})?\s*\)", re.DOTALL
)
_C_RE = re.compile(rf"\bc\(\s*{_STR},\s*{_STR},\s*{_STR},\s*{_STR}\s*\)", re.DOTALL)
_TABLE_RE = re.compile(rf"\bmakeTable\(\s*t,\s*{_STR},\s*{_STR},\s*{_STR}", re.DOTALL)


def _unescape(s: str) -> str:
    return re.sub(r"\\(.)", r"\1", s)


def _parse_receipt_block() -> list[dict]:
    src = TEMPLATES_TS.read_text(encoding="utf-8")
    start = src.index("const receipt = ")
    block = src[start : src.index("const contract = ", start)]

    columns = [
        {"key": k, "label": _unescape(lb), "type": t, "hint": _unescape(h)}
        for k, lb, t, h in _C_RE.findall(block)
    ]
    table = _TABLE_RE.search(block)
    assert table, "could not find makeTable(...) in the Receipt block"
    # Scalar fields are the f(...) calls that precede makeTable; cut the block there.
    scalars_block = block[: table.start()]
    fields = []
    for k, lb, t, h, opts in _F_RE.findall(scalars_block):
        opts = opts or ""
        options_m = re.search(r"options:\s*\[(.*?)\]", opts, re.DOTALL)
        fields.append(
            {
                "key": k,
                "label": _unescape(lb),
                "type": t,
                "hint": _unescape(h),
                "required": bool(re.search(r"required:\s*true", opts)),
                "options": re.findall(_STR, options_m.group(1)) if options_m else None,
                "groupable": bool(re.search(r"groupable:\s*true", opts)),
            }
        )
    fields.append(
        {
            "key": table.group(1),
            "label": _unescape(table.group(2)),
            "type": "table",
            "hint": _unescape(table.group(3)),
            "required": False,
            "options": None,
            "groupable": False,
            "columns": columns,
        }
    )
    return fields


def test_invoice_matches_source_template():
    src = json.loads(INVOICE_SRC.read_text(encoding="utf-8"))
    copy = json.loads((TYPES / "invoice.json").read_text(encoding="utf-8"))
    assert copy == src, f"evals/types/invoice.json differs from {INVOICE_SRC.name}. {HOW_TO_FIX}"


def test_receipt_matches_source_template():
    parsed = _parse_receipt_block()
    assert len(parsed) == 7, f"parsed {len(parsed)} receipt fields from templates.ts, expected 7"
    copy = json.loads((TYPES / "receipt.json").read_text(encoding="utf-8"))

    def norm(f: dict) -> dict:
        out = {
            "key": f["key"],
            "label": f["label"],
            "type": f["type"],
            "hint": f["hint"],
            "required": f["required"],
            "options": f.get("options"),
            "groupable": bool(f.get("groupable", False)),
        }
        if "columns" in f:
            out["columns"] = [
                {k: c[k] for k in ("key", "label", "type", "hint")} for c in f["columns"]
            ]
        return out

    got = [norm(f) for f in copy["fields"]]
    assert got == parsed, f"evals/types/receipt.json differs from the Receipt template. {HOW_TO_FIX}"
