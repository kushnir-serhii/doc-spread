"""Truth file model and validator for the golden dataset.

A truth file (`*.truth.json`) sits next to a document and holds the correct
field values, keyed by field key of the document type in `evals/types/`.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, ValidationError

TYPES_DIR = Path(__file__).resolve().parent.parent / "types"

_AMOUNT_RE = re.compile(r"^-?\d+(\.\d+)?$")
_CURRENCY_RE = re.compile(r"^[A-Z]{3}$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_STRING_TYPES = {"text", "tax_id", "email", "phone"}


class Truth(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    file: str
    expectedType: Literal["invoice", "receipt"] | None
    source: Literal["synthetic", "real-anonymized"]
    tags: list[str]
    seed: int | None
    fields: dict[str, Any]


def load_type(name: str) -> dict[str, Any]:
    return json.loads((TYPES_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _check_value(ftype: str, field: dict[str, Any], value: Any) -> str | None:
    """Return an error string (without location) or None if the value fits."""
    if value is None:
        return None
    if ftype in _STRING_TYPES:
        return None if isinstance(value, str) else f"expected string, got {value!r}"
    if ftype == "number":
        ok = isinstance(value, (int, float)) and not isinstance(value, bool)
        return None if ok else f"expected number, got {value!r}"
    if ftype == "boolean":
        return None if isinstance(value, bool) else f"expected boolean, got {value!r}"
    if ftype == "date":
        if not isinstance(value, str) or not _DATE_RE.match(value):
            return f"bad date {value!r}"
        try:
            date.fromisoformat(value)
        except ValueError:
            return f"bad date {value!r}"
        return None
    if ftype == "money":
        if not isinstance(value, dict) or set(value) != {"amount", "currency"}:
            return f"bad money {value!r} (need exactly amount and currency)"
        amount, currency = value["amount"], value["currency"]
        if not isinstance(amount, str) or not _AMOUNT_RE.match(amount):
            return f"bad amount {amount!r} (decimal string expected)"
        if currency is not None and (
            not isinstance(currency, str) or not _CURRENCY_RE.match(currency)
        ):
            return f"bad currency {currency!r} (3 uppercase letters or null)"
        return None
    if ftype == "select":
        options = field.get("options") or []
        return None if value in options else f"{value!r} not in options {options}"
    return f"unsupported field type {ftype!r}"


def _validate_table(field: dict[str, Any], value: Any, path: str) -> list[str]:
    if not isinstance(value, list):
        return [f"{path}: expected list of rows, got {value!r}"]
    columns = {c["key"]: c for c in field.get("columns", [])}
    errors: list[str] = []
    for i, row in enumerate(value):
        if not isinstance(row, dict):
            errors.append(f"{path}[{i}]: expected object, got {row!r}")
            continue
        for ckey, cval in row.items():
            cpath = f"{path}[{i}].{ckey}"
            col = columns.get(ckey)
            if col is None:
                errors.append(f"{cpath}: unknown column")
                continue
            err = _check_value(col["type"], col, cval)
            if err:
                errors.append(f"{cpath}: {err}")
    return errors


def validate_file(path: str | Path) -> list[str]:
    path = Path(path)
    label = f"{path.parent.name}/{path.name}"
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return [f"{label}: cannot read JSON: {e}"]
    try:
        truth = Truth.model_validate(raw)
    except ValidationError as e:
        return [
            f"{label}: {'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
            for err in e.errors()
        ]

    errors: list[str] = []
    stem = path.name.removesuffix(".truth.json")
    if truth.id != stem:
        errors.append(f"{label}: id: {truth.id!r} does not match file name {stem!r}")
    if not (path.parent / truth.file).is_file():
        errors.append(f"{label}: file: {truth.file!r} not found next to the truth file")

    if truth.expectedType is None:
        if truth.fields:
            errors.append(f"{label}: fields: must be empty when expectedType is null")
        return errors

    type_path = TYPES_DIR / f"{truth.expectedType}.json"
    if not type_path.is_file():
        return errors + [f"{label}: expectedType: no type file {type_path.name}"]
    fields = {f["key"]: f for f in load_type(truth.expectedType)["fields"]}
    for key, value in truth.fields.items():
        fpath = f"fields.{key}"
        field = fields.get(key)
        if field is None:
            errors.append(f"{label}: {fpath}: unknown field key for type {truth.expectedType}")
            continue
        if field["type"] == "table":
            if value is not None:
                errors.extend(f"{label}: {e}" for e in _validate_table(field, value, fpath))
            continue
        err = _check_value(field["type"], field, value)
        if err:
            errors.append(f"{label}: {fpath}: {err}")
    return errors


def validate(dataset_dir: str | Path) -> list[str]:
    errors: list[str] = []
    for path in sorted(Path(dataset_dir).glob("**/*.truth.json")):
        errors.extend(validate_file(path))
    return errors


def count_truth_files(dataset_dir: str | Path) -> int:
    return len(list(Path(dataset_dir).glob("**/*.truth.json")))


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("usage: python -m evals.truth <dataset-dir>", file=sys.stderr)
        return 2
    errors = validate(argv[0])
    if errors:
        print("\n".join(errors))
        return 1
    print(f"{count_truth_files(argv[0])} truth files OK")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
