import filecmp
import json
from collections import Counter
from pathlib import Path

import pytest

from evals.truth import validate
from generator.invoice import (
    SelfCheckError,
    build_invoice,
    extract_text,
    generate_invoices,
    self_check,
)

SEED = 1
COUNT = 24


@pytest.fixture(scope="module")
def runs(tmp_path_factory):
    a, b = tmp_path_factory.mktemp("a"), tmp_path_factory.mktemp("b")
    truths = generate_invoices(a, COUNT, SEED)  # runs the self-check on every document
    generate_invoices(b, COUNT, SEED)
    return a, b, truths


def test_same_seed_gives_identical_files(runs):
    a, b, _ = runs
    names = sorted(p.name for p in a.iterdir())
    assert names == sorted(p.name for p in b.iterdir())
    assert len(names) == COUNT * 2
    # PDFs are byte-identical too: reportlab invariant=1 fixes dates and ids, and
    # the JPEG pages of scanned PDFs come from seeded Pillow operations.
    for name in names:
        assert filecmp.cmp(a / name, b / name, shallow=False), name


def test_accept_counts(runs):
    _, _, truths = runs
    tags = Counter(t for truth in truths for t in truth["tags"])
    assert tags["scanned"] >= 4
    assert tags["multi-page"] >= 4
    assert tags["no-currency"] >= 3
    assert tags["jpy"] >= 2
    non_english = sum(1 for t in truths if "lang-en" not in t["tags"])
    assert non_english >= 4
    assert {"layout-a", "layout-b", "layout-c"} <= set(tags)
    assert len({t for t in tags if t.startswith("date-")}) >= 4
    assert tags["missing-optional"] >= 1 and tags["computed-not-printed"] >= 1


def test_no_currency_means_null_everywhere(runs):
    _, _, truths = runs
    for truth in truths:
        f = truth["fields"]
        ccys = {f[k]["currency"] for k in ("net_total", "gross_total")}
        ccys |= {r["net"]["currency"] for r in f["line_items"] or []}
        codes = {t.upper() for t in truth["tags"] if t in ("usd", "eur", "gbp", "chf", "jpy", "sek")}
        assert ccys == ({None} if "no-currency" in truth["tags"] else codes), truth["id"]


def test_money_math_adds_up(runs):
    from decimal import Decimal

    _, _, truths = runs
    for truth in truths:
        f = truth["fields"]
        if f["line_items"] is None:
            continue
        nets = [Decimal(r["net"]["amount"]) for r in f["line_items"]]
        assert sum(nets) == Decimal(f["net_total"]["amount"]), truth["id"]
        vat = Decimal(f["vat_total"]["amount"]) if f["vat_total"] else Decimal(0)
        assert Decimal(f["net_total"]["amount"]) + vat == Decimal(f["gross_total"]["amount"])


def test_self_check_and_text_layers(runs):
    a, _, truths = runs
    for truth in truths:
        path = a / truth["file"]
        if "scanned" in truth["tags"]:
            assert extract_text(path).strip() == "", truth["id"]  # image only
        else:
            self_check(build_invoice(truth["seed"]), path)


def test_self_check_catches_a_changed_value(runs):
    a, _, truths = runs
    text_doc = next(t for t in truths if "text-pdf" in t["tags"])
    inv = build_invoice(text_doc["seed"])
    inv.invoice_number = "NOT-ON-THE-PAGE-0"
    with pytest.raises(SelfCheckError, match=f"{inv.doc_id}: invoice_number"):
        self_check(inv, a / text_doc["file"])


def test_one_document_rebuilds_alone_from_its_seed(runs, tmp_path):
    from generator.invoice import generate_invoice

    a, _, truths = runs
    truth = truths[6]
    generate_invoice(truth["seed"], tmp_path)
    for name in (truth["file"], f"{truth['id']}.truth.json"):
        assert (tmp_path / name).read_bytes() == (a / name).read_bytes()


def test_truth_files_validate_and_are_canonical(runs):
    a, _, _ = runs
    assert validate(a) == []
    for p in a.glob("*.truth.json"):
        raw = p.read_bytes()
        assert raw.endswith(b"\n") and b"\r" not in raw
        assert raw.decode("utf-8") == json.dumps(
            json.loads(raw), indent=2, ensure_ascii=False) + "\n"


def test_numeric_dates_are_unambiguous(runs):
    _, _, truths = runs
    checked = 0
    for truth in truths:
        if not {"date-dmy", "date-mdy"} & set(truth["tags"]):
            continue
        for key in ("issue_date", "sale_date", "due_date"):
            value = truth["fields"][key]
            if value is not None:
                assert int(value[8:10]) > 12, (truth["id"], key, value)
                checked += 1
        if "date-mdy" in truth["tags"]:
            assert build_invoice(truth["seed"]).supplier_addr[-1] == "United States"
    assert checked > 0


def test_committed_dataset_is_what_seed_1_writes(runs):
    """dataset/invoices/inv-0NN.* match a fresh run byte for byte."""
    a, _, _ = runs
    dataset = Path(__file__).resolve().parents[1] / "dataset" / "invoices"
    fresh = sorted(p.name for p in a.iterdir())
    committed = sorted(p.name for p in dataset.glob("inv-[0-9]*"))
    assert committed == fresh
    for name in fresh:
        assert (dataset / name).read_bytes() == (a / name).read_bytes(), name


# ---------------------------------------------------------------- receipts, distractors, coverage

from generator.coverage import field_stats, render  # noqa: E402
from generator.distractor import generate_distractors  # noqa: E402
from generator.receipt import build_receipt, generate_receipts  # noqa: E402
from generator.receipt import self_check as receipt_self_check  # noqa: E402

DATASET = Path(__file__).resolve().parents[1] / "dataset"


@pytest.fixture(scope="module")
def rruns(tmp_path_factory):
    a, b = tmp_path_factory.mktemp("ra"), tmp_path_factory.mktemp("rb")
    truths = generate_receipts(a, 12, SEED)
    generate_receipts(b, 12, SEED)
    return a, b, truths


@pytest.fixture(scope="module")
def druns(tmp_path_factory):
    a, b = tmp_path_factory.mktemp("da"), tmp_path_factory.mktemp("db")
    truths = generate_distractors(a, SEED)
    generate_distractors(b, SEED)
    return a, b, truths


def _same_files(a: Path, b: Path):
    names = sorted(p.name for p in a.iterdir())
    assert names == sorted(p.name for p in b.iterdir())
    for name in names:
        assert (a / name).read_bytes() == (b / name).read_bytes(), name
    return names


def test_receipts_are_byte_identical_across_runs(rruns):
    a, b, _ = rruns
    assert len(_same_files(a, b)) == 24


def test_distractors_are_byte_identical_across_runs(druns):
    a, b, _ = druns
    assert len(_same_files(a, b)) == 8


def test_receipt_accept_counts(rruns):
    a, _, truths = rruns
    tags = Counter(t for truth in truths for t in truth["tags"])
    assert tags["photo"] == 12 and tags["no-currency"] >= 3
    assert tags["photo-light"] and tags["photo-medium"] and tags["photo-hard"]
    assert tags["jpg"] and tags["png"]
    assert tags["jpy"] >= 1
    assert sum(1 for t in truths if "lang-en" not in t["tags"]) >= 3
    assert {t["fields"]["payment_method"] for t in truths} >= {"Card", "Cash", "Transfer", "Other"}
    assert validate(a) == []
    for p in a.glob("rcp-*.*"):
        if p.suffix in (".jpg", ".png"):
            assert p.stat().st_size <= 200_000, p.name


def test_receipt_math_dates_and_self_check(rruns):
    from decimal import Decimal

    _, _, truths = rruns
    for truth in truths:
        receipt_self_check(build_receipt(truth["seed"]))
        f = truth["fields"]
        if f["items"] is not None:
            assert sum(Decimal(i["price"]["amount"]) for i in f["items"]) == Decimal(f["total"]["amount"])
        if {"date-dmy", "date-mdy"} & set(truth["tags"]):
            assert int(f["receipt_date"][8:10]) > 12, truth["id"]


def test_distractors_have_no_type(druns):
    a, _, truths = druns
    assert len(truths) == 4
    assert all(t["expectedType"] is None and t["fields"] == {} for t in truths)
    assert validate(a) == []


def test_committed_receipts_and_distractors_match_seed_1(rruns, druns):
    for fresh, folder, prefix in ((rruns[0], "receipts", "rcp"), (druns[0], "distractors", "dst")):
        committed = DATASET / folder
        names = sorted(p.name for p in fresh.iterdir())
        assert names == sorted(p.name for p in committed.glob(f"{prefix}-[0-9]*"))
        for name in names:
            assert (committed / name).read_bytes() == (fresh / name).read_bytes(), name


def test_whole_dataset_validates_and_is_small():
    assert validate(DATASET) == []
    assert len(list(DATASET.glob("**/*.truth.json"))) == 43
    assert sum(p.stat().st_size for p in DATASET.rglob("*") if p.is_file()) < 20 * 1024 * 1024


@pytest.mark.parametrize("type_name", ["invoice", "receipt"])
def test_field_coverage(type_name):
    truths = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(DATASET.glob("**/*.truth.json"))]
    for name, ftype, required, present, null in field_stats(truths, type_name):
        if "(rows)" in name:
            continue
        assert present >= 3, (type_name, name, present)
        if required:
            assert null == 0, (type_name, name)
        else:
            assert null >= 1, (type_name, name)


def test_coverage_md_is_up_to_date():
    assert (DATASET / "COVERAGE.md").read_bytes() == render(DATASET).encode("utf-8")
