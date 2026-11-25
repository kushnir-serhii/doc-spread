import json
import shutil
from pathlib import Path

import pytest

from evals.truth import validate, validate_file

DATASET = Path(__file__).resolve().parents[1] / "dataset"
SAMPLES = [
    DATASET / "invoices" / "inv-mock.truth.json",
    DATASET / "receipts" / "rcp-mock.truth.json",
    DATASET / "distractors" / "dst-mock.truth.json",
]


def test_dataset_validates():
    assert validate(DATASET) == []


@pytest.mark.parametrize("path", SAMPLES, ids=lambda p: p.stem)
def test_each_sample_validates(path):
    assert validate_file(path) == []


def _broken_copy(tmp_path: Path, src: Path, mutate) -> Path:
    shutil.copy(src.parent / json.loads(src.read_text(encoding="utf-8"))["file"], tmp_path)
    data = json.loads(src.read_text(encoding="utf-8"))
    mutate(data)
    dst = tmp_path / src.name
    dst.write_text(json.dumps(data), encoding="utf-8")
    return dst


def _errors(tmp_path, src, mutate):
    return validate_file(_broken_copy(tmp_path, src, mutate))


INVOICE, RECEIPT, DISTRACTOR = SAMPLES


def _set(path: list, value):
    def mutate(data):
        node = data["fields"]
        for p in path[:-1]:
            node = node[p]
        node[path[-1]] = value

    return mutate


CASES = [
    # (source, mutation, expected field path in the message)
    (INVOICE, _set(["bogus_key"], "x"), "fields.bogus_key"),
    (RECEIPT, _set(["bogus_key"], "x"), "fields.bogus_key"),
    (INVOICE, _set(["issue_date"], "2026-13-01"), "fields.issue_date"),
    (RECEIPT, _set(["receipt_date"], "14/10/2026"), "fields.receipt_date"),
    (INVOICE, _set(["gross_total", "currency"], "EURO"), "fields.gross_total"),
    (RECEIPT, _set(["total", "currency"], "usd"), "fields.total"),
    (INVOICE, _set(["line_items", 0, "bogus"], "x"), "fields.line_items[0].bogus"),
    (RECEIPT, _set(["items", 1, "bogus"], "x"), "fields.items[1].bogus"),
    (RECEIPT, _set(["payment_method"], "Bitcoin"), "fields.payment_method"),
    (INVOICE, _set(["line_items", 0, "net", "amount"], 1500), "fields.line_items[0].net"),
]


@pytest.mark.parametrize("src,mutate,field_path", CASES)
def test_broken_copy_is_rejected(tmp_path, src, mutate, field_path):
    errors = _errors(tmp_path, src, mutate)
    assert errors, "expected a validation error"
    assert any(src.name in e and field_path in e for e in errors), errors


def test_distractor_with_fields_is_rejected(tmp_path):
    errors = _errors(tmp_path, DISTRACTOR, lambda d: d["fields"].update({"x": 1}))
    assert any("dst-mock.truth.json" in e and "fields" in e for e in errors)


def test_missing_file_and_id_mismatch(tmp_path):
    def mutate(d):
        d["file"] = "missing.pdf"
        d["id"] = "other"

    errors = _errors(tmp_path, INVOICE, mutate)
    assert any("file:" in e for e in errors)
    assert any("id:" in e for e in errors)


def test_unknown_expected_type_is_rejected(tmp_path):
    errors = _errors(tmp_path, INVOICE, lambda d: d.update(expectedType="contract"))
    assert errors

