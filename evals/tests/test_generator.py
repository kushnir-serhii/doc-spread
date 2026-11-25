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
        ccys |= {r["net"]["currency"] for r in f["line_items"]}
        codes = {t.upper() for t in truth["tags"] if t in ("usd", "eur", "gbp", "chf", "jpy", "sek")}
        assert ccys == ({None} if "no-currency" in truth["tags"] else codes), truth["id"]


def test_money_math_adds_up(runs):
    from decimal import Decimal

    _, _, truths = runs
    for truth in truths:
        f = truth["fields"]
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
