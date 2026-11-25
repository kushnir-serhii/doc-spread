from __future__ import annotations

from pathlib import Path

from evals.score import (
    CORRECT,
    CORRECT_ABSENT,
    HALLUCINATED,
    MISSED,
    WRONG,
    _score_scalar,
    score_result,
    score_run,
    to_minor_units,
)
from evals.truth import Truth, load_type

INVOICE = load_type("invoice")
RECEIPT = load_type("receipt")


def truth(fields, expected="invoice"):
    return Truth(id="t", file="t.pdf", expectedType=expected, source="synthetic", tags=[], seed=None, fields=fields)


def S(value, conf=0.95, type_="text"):
    return {"type": type_, "value": value, "confidence": conf}


def M(amount, cur="USD", conf=0.95):
    return S({"amount": amount, "currency": cur}, conf, "money")


def result(values, outcome="needs_review", typekey="invoice"):
    return {
        "id": "t", "model": "haiku", "repeat": 1, "outcome": outcome,
        "classification": {"typeKey": typekey, "pickedTypeKey": typekey, "confidence": 0.9, "model": "m"},
        "values": values,
    }  # fmt: skip


def one(field, truth_v, pred_entry, type_def=INVOICE, expected="invoice"):
    """The score of a single field; every other field is absent on both sides."""
    vals = {field: pred_entry} if pred_entry is not None else {}
    doc = score_result(result(vals, typekey=expected), truth({field: truth_v}, expected), type_def)
    return next(v for v in doc.values if v.field == field and v.column is None)


# ---- statuses


def test_five_statuses():
    assert one("supplier_name", "Acme", S("Acme")).status == CORRECT
    assert one("supplier_name", "Acme", S("Other")).status == WRONG
    assert one("supplier_name", "Acme", S(None)).status == MISSED
    assert one("supplier_name", "Acme", None).status == MISSED
    assert one("supplier_name", None, S("Acme")).status == HALLUCINATED
    assert one("supplier_name", None, S(None)).status == CORRECT_ABSENT
    assert one("supplier_name", None, None).status == CORRECT_ABSENT


def test_confidence_reported_only_with_prediction():
    assert one("supplier_name", "Acme", S("Acme", 0.8)).confidence == 0.8
    assert one("supplier_name", "Acme", S(None, 0.8)).confidence is None


# ---- text


def test_text_normalization_passes():
    assert one("supplier_name", "Müller & Söhne GmbH", S("  MÜLLER  &  SÖHNE GMBH. ")).status == CORRECT
    assert one("supplier_name", "Ａcme", S("acme")).status == CORRECT  # NFKC full-width


def test_text_near_is_reported_not_correct():
    assert one("supplier_name", "Brightline Software Inc.", S("Brightline Software Inc")).status == CORRECT
    v = one("supplier_name", "Brightline Software", S("Brightlime Software"))
    assert v.status == WRONG and v.near
    v = one("supplier_name", "Brightline", S("Zebra"))
    assert v.status == WRONG and not v.near


# ---- tax id, date, number, select, boolean, email, phone


def test_tax_id():
    assert one("supplier_tax_id", "PL 525-000-12-34", S("pl5250001234", type_="tax_id")).status == CORRECT
    assert one("supplier_tax_id", "PL5250001234", S("PL5250001235", type_="tax_id")).status == WRONG


def test_date_exact():
    assert one("issue_date", "2026-10-14", S("2026-10-14", type_="date")).status == CORRECT
    assert one("issue_date", "2026-10-14", S("2026-10-15", type_="date")).status == WRONG


def test_number_tolerance_and_int_float():
    assert one("payment_term_days", 14, S(14.0, type_="number")).status == CORRECT
    assert one("payment_term_days", 7.5, S(7.5000000001, type_="number")).status == CORRECT
    assert one("payment_term_days", 14, S(15, type_="number")).status == WRONG


def test_select():
    assert one("payment_method", "Card", S("Card", type_="select"), RECEIPT, "receipt").status == CORRECT
    assert one("payment_method", "Card", S("Cash", type_="select"), RECEIPT, "receipt").status == WRONG


def test_boolean_email_phone():
    assert _score_scalar("boolean", True, True, 1).status == CORRECT
    assert _score_scalar("boolean", True, False, 1).status == WRONG
    assert _score_scalar("email", "A@B.com", " a@b.COM ", 1).status == CORRECT
    assert _score_scalar("email", "a@b.com", "a@c.com", 1).status == WRONG
    assert _score_scalar("phone", "+48 (22) 123-45-67", "+48221234567", 1).status == CORRECT
    assert _score_scalar("phone", "+48221234567", "48221234567", 1).status == WRONG


# ---- money


def test_minor_units():
    assert to_minor_units("42.74", "USD") == 4274
    assert to_minor_units("1500", "JPY") == 1500
    assert to_minor_units("1500", "KRW") == 1500
    assert to_minor_units("1.005", "USD") == 101  # rounds half up on the next digit, as extract-map.ts
    assert to_minor_units("12.5", "JPY") == 13
    assert to_minor_units("-3.20", "EUR") == -320
    assert to_minor_units("1.234", "KWD") == 1234
    assert to_minor_units("12", None) == 1200


def test_money_amount_and_currency():
    t = {"amount": "42.74", "currency": "USD"}
    assert one("gross_total", t, M(4274)).status == CORRECT
    assert one("gross_total", t, M(4273)).status == WRONG
    assert one("gross_total", t, M(4274, "EUR")).status == WRONG  # right amount, wrong currency


def test_money_jpy_zero_decimals():
    t = {"amount": "1500", "currency": "JPY"}
    assert one("gross_total", t, M(1500, "JPY")).status == CORRECT
    assert one("gross_total", t, M(150000, "JPY")).status == WRONG  # read as 2 decimals


def test_money_currency_not_stated_no_guess():
    t = {"amount": "42.74", "currency": None}
    ok = one("gross_total", t, M(4274, "USD", conf=0.5))
    assert ok.status == CORRECT and ok.noGuess is True
    guess = one("gross_total", t, M(4274, "USD", conf=0.97))
    assert guess.status == WRONG and guess.noGuess is False
    assert one("gross_total", t, M(4274, "EUR", conf=0.4)).status == CORRECT  # any currency accepted
    assert one("gross_total", t, M(999, "USD", conf=0.5)).status == WRONG
    assert one("gross_total", {"amount": "42.74", "currency": "USD"}, M(4274)).noGuess is None


def test_money_not_stated_uses_predicted_decimals():
    t = {"amount": "1500", "currency": None}
    assert one("gross_total", t, M(1500, "JPY", conf=0.5)).status == CORRECT
    assert one("gross_total", t, M(150000, "USD", conf=0.5)).status == CORRECT  # 2 decimals for USD
    assert one("gross_total", t, M(1500, "USD", conf=0.5)).status == WRONG


# ---- tables


def prow(desc, qty, price, cur="USD"):
    return {"cells": {"description": S(desc), "quantity": S(qty, type_="number"), "price": M(price, cur)}}


def trow(desc, qty, price, cur="USD"):
    return {"description": desc, "quantity": qty, "price": {"amount": price, "currency": cur}}


def table(truth_rows, pred_rows):
    vals = {"items": {"type": "table", "rows": pred_rows}} if pred_rows is not None else {}
    doc = score_result(result(vals, typekey="receipt"), truth({"items": truth_rows}, "receipt"), RECEIPT)
    return [v for v in doc.values if v.field == "items"]


def test_table_all_correct_reordered():
    t = [trow("Latte", 2, "9.00"), trow("Blueberry muffin", 1, "3.25")]
    p = [prow("Blueberry muffin", 1, 325), prow("Latte", 2, 900)]
    scores = table(t, p)
    assert len(scores) == 6 and all(v.status == CORRECT for v in scores)
    assert {v.row for v in scores} == {0, 1}


def test_table_extra_row_hallucinated_and_missing_row_missed():
    t = [trow("Latte", 2, "9.00"), trow("Muffin", 1, "3.25")]
    p = [prow("Latte", 2, 900), prow("Sparkling water", 1, 450)]
    scores = table(t, p)
    by = {(v.row, v.column): v.status for v in scores}
    assert all(by[(0, c)] == CORRECT for c in ("description", "quantity", "price"))
    assert [by[(1, c)] for c in ("description", "quantity", "price")] == [MISSED] * 3
    extra = [v for v in scores if v.row is None]
    assert len(extra) == 3 and all(v.status == HALLUCINATED for v in extra)


def test_table_match_by_amount_when_description_differs():
    by = {v.column: v.status for v in table([trow("Cappuccino large", 1, "4.50")], [prow("Coffee", 1, 450)])}
    assert by == {"description": WRONG, "quantity": CORRECT, "price": CORRECT}


def test_table_wrong_cell_in_matched_row():
    by = {v.column: v.status for v in table([trow("Latte", 2, "9.00")], [prow("Latte", 3, 900)])}
    assert by == {"description": CORRECT, "quantity": WRONG, "price": CORRECT}


def test_table_absent_missing_and_hallucinated():
    assert [v.status for v in table(None, [])] == [CORRECT_ABSENT]
    assert [v.status for v in table(None, None)] == [CORRECT_ABSENT]
    hall = table(None, [prow("Latte", 2, 900)])
    assert len(hall) == 3 and all(v.status == HALLUCINATED for v in hall)
    miss = table([trow("Latte", 2, "9.00")], None)
    assert len(miss) == 3 and all(v.status == MISSED for v in miss)


def test_table_cell_has_column_type_and_table_required_flag():
    doc = score_result(result({}), truth({"line_items": [{"description": "x"}]}), INVOICE)
    cell = next(v for v in doc.values if v.field == "line_items")
    assert cell.column == "description" and cell.fieldType == "text" and cell.required is False


# ---- documents and classification

FULL_TRUTH = {
    "supplier_name": "Acme",
    "gross_total": {"amount": "10.00", "currency": "USD"},
    "supplier_tax_id": None,
}


def test_error_and_refused_miss_every_truth_value():
    for outcome in ("error", "refused"):
        r = {"id": "t", "model": "haiku", "repeat": 1, "outcome": outcome, "classification": None, "values": {}}
        doc = score_result(r, truth(FULL_TRUTH), INVOICE)
        by = {v.field: v.status for v in doc.values}
        assert by["supplier_name"] == MISSED and by["gross_total"] == MISSED
        assert by["supplier_tax_id"] == CORRECT_ABSENT
        assert doc.classificationCorrect is False and doc.predictedType is None


def test_wrong_type_misses_values():
    doc = score_result(result({"supplier_name": S("Acme")}, typekey="receipt"), truth(FULL_TRUTH), INVOICE)
    assert not doc.classificationCorrect and doc.predictedType == "receipt"
    assert {v.field: v.status for v in doc.values}["supplier_name"] == MISSED


def test_distractor_classification_only():
    t = truth({}, None)
    cls = {"typeKey": None, "pickedTypeKey": None, "confidence": 0.9}
    doc = score_result({"id": "t", "outcome": "unclassified", "classification": cls, "values": {}}, t, None)
    assert doc.classificationCorrect and doc.values == []
    assert not score_result(result({}, typekey="invoice"), t, None).classificationCorrect
    assert not score_result({"id": "t", "outcome": "error", "classification": None}, t, None).classificationCorrect


def test_classification_correct_and_flat_fields():
    doc = score_result(result({"supplier_name": S("Acme")}), truth(FULL_TRUTH), INVOICE)
    assert doc.classificationCorrect and doc.classConfidence == 0.9 and doc.pickedType == "invoice"
    assert doc.model == "haiku" and doc.repeat == 1
    assert sum(doc.counts().values()) == len(doc.values)


def test_score_run_on_mock_results():
    runs = sorted((Path(__file__).resolve().parent.parent / "runs").glob("*-mocks"))
    if not runs:
        return  # runs/ is git-ignored; nothing to check on a fresh clone
    scores = {s.id: s for s in score_run(runs[0])}
    assert scores["dst-mock"].classificationCorrect and scores["dst-mock"].values == []
    assert scores["inv-mock"].counts()["correct"] == 42
    assert scores["rcp-mock"].counts()["correct"] == 21
