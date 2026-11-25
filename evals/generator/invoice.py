"""Synthetic invoices: record -> layout (shared ops) -> text PDF or scanned PDF + truth.

One seeded `random.Random` per document (seed = base_seed * 10000 + index) draws
everything, so a single document can be rebuilt alone from the seed stored in its
truth file. Variants that the accept counts depend on (scanned, multi-page,
currency, language, layout) are assigned by index, not left to chance.
"""

from __future__ import annotations

import io
import random
import re
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from faker import Faker
from pypdf import PdfReader

from .common import (
    BOLD,
    INK,
    PAGE_W,
    SANS,
    Line,
    Pages,
    Rect,
    Text,
    dec_str,
    fit_text,
    fmt_date,
    fmt_money,
    fmt_number,
    fmt_plain,
    quantize,
    render_scanned_pdf,
    render_text_pdf,
    text_width,
    write_json,
)

SEED_SPAN = 10_000

# ------------------------------------------------------------------ the plan
# (language, currency) per index; None = amounts printed with no currency anywhere.
PLAN: list[tuple[str, str | None]] = [
    ("en", "USD"), ("en", "EUR"), ("de", "EUR"), ("en", "GBP"), ("en", "JPY"), ("fr", "EUR"),
    ("en", None), ("en", "CHF"), ("es", "EUR"), ("sv", "SEK"), ("en", "USD"), ("pl", "EUR"),
    ("en", None), ("de", "CHF"), ("en", "SEK"), ("en", "JPY"), ("en", "GBP"), ("fr", None),
    ("de", "EUR"), ("en", "USD"), ("es", "EUR"), ("en", None), ("sv", "SEK"), ("pl", "EUR"),
]
SCANNED = {4, 9, 14, 19, 22}
MULTI_PAGE = {2, 7, 11, 14, 20, 23}  # long item lists; the page count decides the tag
LAYOUTS = "abc"
LAYOUT_PRINTS_TERM = {"a": True, "b": False, "c": False}
LAYOUT_PRINTS_GROSS = {"a": True, "b": False, "c": True}
DATE_STYLES = {
    "en": ["iso", "mdy", "dmy", "long"],
    "de": ["iso", "dmy", "localized"], "fr": ["iso", "dmy", "localized"],
    "es": ["iso", "dmy", "localized"], "pl": ["iso", "dmy", "localized"],
    "sv": ["iso", "localized", "localized"],
}
DATE_TAG = {"iso": "date-iso", "dmy": "date-dmy", "mdy": "date-mdy",
            "long": "date-long", "localized": "date-localized-month"}
LOCALES = {"en": ["en_US", "en_GB"], "de": ["de_DE"], "fr": ["fr_FR"],
           "es": ["es_ES"], "sv": ["sv_SE"], "pl": ["pl_PL"]}

TERMS = [7, 14, 21, 30, 45, 60]
RATES = {
    "USD": [5, 6, 7, 8.25, 10], "EUR": [19, 20, 21, 7, 10, 5.5, 22],
    "GBP": [20, 5], "CHF": [8.1, 2.6, 3.8, 7.7], "SEK": [25, 12, 6],
    "JPY": [10, 8], None: [19, 20, 21, 10, 25],
}

LABELS: dict[str, dict[str, str]] = {
    "en": dict(invoice="INVOICE", number="Invoice no.", issue="Issue date", sale="Sale date",
               due="Due date", terms="Payment terms", days="{n} days", tax="Tax ID",
               bill="Bill to", ship="Ship to", frm="From", page="Page {i} of {n}",
               cont="Invoice {no} (continued)", description="Description", qty="Qty",
               unit="Unit", unit_net="Unit net", vat_rate="VAT %", net="Net", vat="VAT",
               gross="Gross", net_total="Net total", vat_total="VAT", gross_total="Gross total"),
    "de": dict(invoice="RECHNUNG", number="Rechnungsnr.", issue="Rechnungsdatum",
               sale="Leistungsdatum", due="Fällig am", terms="Zahlungsziel", days="{n} Tage",
               tax="USt-IdNr.", bill="Rechnung an", ship="Lieferadresse", frm="Von",
               page="Seite {i} von {n}", cont="Rechnung {no} (Fortsetzung)",
               description="Beschreibung", qty="Menge", unit="Einh.", unit_net="Preis netto",
               vat_rate="MwSt %", net="Netto", vat="MwSt", gross="Brutto",
               net_total="Nettosumme", vat_total="MwSt.", gross_total="Gesamtbetrag"),
    "fr": dict(invoice="FACTURE", number="N° de facture", issue="Date d'émission",
               sale="Date de livraison", due="Échéance", terms="Délai de paiement",
               days="{n} jours", tax="N° TVA", bill="Facturé à", ship="Livraison", frm="De",
               page="Page {i} sur {n}", cont="Facture {no} (suite)", description="Désignation",
               qty="Qté", unit="Unité", unit_net="PU HT", vat_rate="TVA %", net="HT",
               vat="TVA", gross="TTC", net_total="Total HT", vat_total="TVA",
               gross_total="Total TTC"),
    "es": dict(invoice="FACTURA", number="N.º de factura", issue="Fecha de emisión",
               sale="Fecha de operación", due="Vencimiento", terms="Plazo de pago",
               days="{n} días", tax="NIF", bill="Facturar a", ship="Enviar a", frm="De",
               page="Página {i} de {n}", cont="Factura {no} (continuación)",
               description="Descripción", qty="Cant.", unit="Ud.", unit_net="Precio",
               vat_rate="IVA %", net="Neto", vat="IVA", gross="Total", net_total="Base imponible",
               vat_total="IVA", gross_total="Total factura"),
    "sv": dict(invoice="FAKTURA", number="Fakturanr", issue="Fakturadatum",
               sale="Leveransdatum", due="Förfallodatum", terms="Betalningsvillkor",
               days="{n} dagar", tax="Momsreg.nr", bill="Faktureras till", ship="Leverans till",
               frm="Från", page="Sida {i} av {n}", cont="Faktura {no} (fortsättning)",
               description="Beskrivning", qty="Antal", unit="Enhet", unit_net="À-pris",
               vat_rate="Moms %", net="Netto", vat="Moms", gross="Brutto",
               net_total="Summa exkl. moms", vat_total="Moms", gross_total="Att betala"),
    "pl": dict(invoice="FAKTURA", number="Nr faktury", issue="Data wystawienia",
               sale="Data sprzedaży", due="Termin zapłaty", terms="Warunki płatności",
               days="{n} dni", tax="NIP", bill="Nabywca", ship="Odbiorca", frm="Sprzedawca",
               page="Strona {i} z {n}", cont="Faktura {no} (ciąg dalszy)", description="Opis",
               qty="Ilość", unit="J.m.", unit_net="Cena netto", vat_rate="VAT %",
               net="Netto", vat="VAT", gross="Brutto", net_total="Razem netto",
               vat_total="VAT", gross_total="Do zapłaty"),
}

VOCAB: dict[str, list[str]] = {
    "en": ["Consulting services", "Design review", "Software license", "Cloud hosting",
           "Support plan", "Printed manuals", "Cable set", "Maintenance visit",
           "Training session", "Data migration"],
    "de": ["Beratungsleistung", "Designprüfung", "Softwarelizenz", "Cloud-Hosting",
           "Supportvertrag", "Gedruckte Handbücher", "Kabelsatz", "Wartungseinsatz",
           "Schulung vor Ort", "Datenmigration"],
    "fr": ["Prestation de conseil", "Revue de conception", "Licence logicielle",
           "Hébergement cloud", "Contrat de support", "Manuels imprimés", "Jeu de câbles",
           "Visite de maintenance", "Séance de formation", "Migration de données"],
    "es": ["Servicios de consultoría", "Revisión de diseño", "Licencia de software",
           "Alojamiento en la nube", "Plan de soporte", "Manuales impresos", "Juego de cables",
           "Visita de mantenimiento", "Sesión de formación", "Migración de datos"],
    "sv": ["Konsulttjänster", "Designgranskning", "Programvarulicens", "Molnhotell",
           "Supportavtal", "Tryckta manualer", "Kabelsats", "Servicebesök",
           "Utbildningstillfälle", "Datamigrering"],
    "pl": ["Usługi doradcze", "Przegląd projektu", "Licencja na oprogramowanie",
           "Hosting w chmurze", "Pakiet wsparcia", "Drukowane instrukcje", "Zestaw kabli",
           "Wizyta serwisowa", "Szkolenie", "Migracja danych"],
}
UNITS: dict[str, list[str]] = {
    "en": ["pcs", "hrs", "mo", "svc"], "de": ["Stk", "Std", "Mon", "Psch"],
    "fr": ["pce", "h", "mois", "prest"], "es": ["ud", "h", "mes", "srv"],
    "sv": ["st", "tim", "mån", "tjl"], "pl": ["szt", "godz", "mies", "usł"],
}
QUANTITIES = [1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 0.5, 1.5, 2.5]
SUFFIXES = ["", "", " - Pro", " - Plus", " - A", " - B", " - XL"]

_fakers: dict[str, Faker] = {}


def _faker(locale: str) -> Faker:
    if locale not in _fakers:
        _fakers[locale] = Faker(locale)
    return _fakers[locale]


# ------------------------------------------------------------------ the record

@dataclass
class Row:
    description: str
    quantity: Decimal
    unit: str
    unit_net: Decimal
    vat_rate: Decimal | None
    net: Decimal
    vat: Decimal | None
    gross: Decimal | None


@dataclass
class Invoice:
    doc_seed: int
    index: int
    lang: str
    ccy: str | None
    layout: str
    scanned: bool
    date_style: str
    supplier_name: str
    supplier_addr: list[str]
    supplier_tax_id: str | None
    buyer_name: str
    buyer_addr: list[str]
    ship_addr: list[str]
    invoice_number: str
    issue: date
    sale: date | None
    due: date | None
    term_days: int | None
    rows: list[Row]
    net_total: Decimal
    vat_total: Decimal | None
    gross_total: Decimal

    @property
    def doc_id(self) -> str:
        return f"inv-{self.index:03d}"

    @property
    def has_vat(self) -> bool:
        return self.vat_total is not None

    @property
    def show_term(self) -> bool:
        return LAYOUT_PRINTS_TERM[self.layout] and self.term_days is not None

    @property
    def show_gross(self) -> bool:
        return LAYOUT_PRINTS_GROSS[self.layout] and self.has_vat


def _address(fake: Faker) -> list[str]:
    street = fake.street_address().replace("\n", ", ")
    return [street, f"{fake.postcode()} {fake.city()}".replace("\n", " "), fake.current_country()]


def _tax_id(fake: Faker, rng: random.Random) -> str:
    try:
        return str(fake.vat_id())
    except Exception:  # noqa: BLE001 - locale without a VAT provider
        return f"{rng.randint(10, 99)}-{rng.randint(1000000, 9999999)}"


def split_seed(doc_seed: int) -> tuple[int, int]:
    return divmod(doc_seed, SEED_SPAN)


def build_invoice(doc_seed: int) -> Invoice:
    base, index = split_seed(doc_seed)
    rng = random.Random(doc_seed)
    lang, ccy = PLAN[(index - 1) % len(PLAN)]
    layout = LAYOUTS[(index - 1) % 3]
    styles = DATE_STYLES[lang]
    date_style = styles[index % len(styles)] if lang == "en" else styles[(index // 2 + 2) % len(styles)]

    locale = rng.choice(LOCALES[lang])
    if date_style == "mdy":
        locale = "en_US"  # month-first dates only for a US supplier
    fake = _faker(locale)
    fake.seed_instance(rng.randrange(2**32))
    supplier_name = fit_text(fake.company(), BOLD, 15, 300)
    supplier_addr = _address(fake)
    tax_id = _tax_id(fake, rng)
    buyer_name = fit_text(fake.company(), BOLD, 9, 150)
    buyer_addr = _address(fake)
    ship_addr = _address(fake)
    prefix = rng.choice(["INV", "RE", "FA", "F", "FV", "R"])
    invoice_number = f"{prefix}-{rng.choice([2025, 2026])}-{rng.randint(1, 9999):04d}"

    issue = date(2025, 1, 1) + timedelta(days=rng.randrange(700))
    sale_back = rng.randint(0, 6)
    term = rng.choice(TERMS)

    n_rows = (25 if index % 2 else 24) if index in MULTI_PAGE else rng.randint(1, 14)
    has_vat = index % 8 != 3
    rates = [Decimal(str(r)) for r in RATES[ccy]]
    main_rate = rng.choice(rates)
    rows: list[Row] = []
    for _ in range(n_rows):
        qty = Decimal(str(rng.choice(QUANTITIES)))
        price = (Decimal(rng.randint(30, 5000) * 10) if ccy == "JPY"
                 else Decimal(rng.randint(500, 150000)) / 100)
        price = quantize(price, ccy)
        rate = main_rate if rng.random() < 0.75 else rng.choice(rates)
        desc = fit_text(rng.choice(VOCAB[lang]) + rng.choice(SUFFIXES), SANS, 8, 140)
        net = quantize(qty * price, ccy)
        vat = quantize(net * rate / 100, ccy) if has_vat else None
        rows.append(Row(desc, qty, rng.choice(UNITS[lang]), price,
                        rate if has_vat else None, net, vat,
                        net + vat if vat is not None else None))
    net_total = sum((r.net for r in rows), Decimal(0))
    vat_total = sum((r.vat for r in rows if r.vat is not None), Decimal(0)) if has_vat else None
    gross_total = net_total + (vat_total or Decimal(0))

    has_sale = index % 4 != 2
    has_due = index % 6 != 5
    if date_style in ("dmy", "mdy"):
        # numeric dates are ambiguous when day and month are both <= 12: move the
        # issue date (and with it sale and due, so the term stays) until every
        # printed date has day > 12.
        while not all(
            d.day > 12 for d in (issue, issue - timedelta(days=sale_back) if has_sale else issue,
                                 issue + timedelta(days=term) if has_due else issue)
        ):
            issue += timedelta(days=1)
    sale = issue - timedelta(days=sale_back) if has_sale else None
    return Invoice(
        doc_seed=doc_seed, index=index, lang=lang, ccy=ccy, layout=layout,
        scanned=index in SCANNED, date_style=date_style,
        supplier_name=supplier_name, supplier_addr=supplier_addr,
        supplier_tax_id=tax_id if index % 4 != 0 else None,
        buyer_name=buyer_name, buyer_addr=buyer_addr, ship_addr=ship_addr,
        invoice_number=invoice_number, issue=issue, sale=sale,
        due=issue + timedelta(days=term) if has_due else None,
        term_days=term if has_due else None,
        rows=rows, net_total=net_total, vat_total=vat_total, gross_total=gross_total,
    )


# ------------------------------------------------------------------ layouts

LEFT, RIGHT, BOTTOM = 40, 555, 792
GREY = (0.38, 0.38, 0.38)
LIGHT = (0.9, 0.9, 0.9)
ACCENT = (0.12, 0.31, 0.38)
WHITE = (1.0, 1.0, 1.0)


@dataclass(frozen=True)
class Style:
    size: float
    row_h: float


STYLES = {"a": Style(8, 22), "b": Style(8, 22), "c": Style(7.5, 20)}


def _date(inv: Invoice, d: date) -> str:
    return fmt_date(d, inv.date_style, inv.lang)


def _facts(inv: Invoice) -> list[tuple[str, str]]:
    L = LABELS[inv.lang]
    facts = [(L["number"], inv.invoice_number), (L["issue"], _date(inv, inv.issue))]
    if inv.sale:
        facts.append((L["sale"], _date(inv, inv.sale)))
    if inv.due:
        facts.append((L["due"], _date(inv, inv.due)))
    if inv.show_term:
        facts.append((L["terms"], L["days"].format(n=inv.term_days)))
    return facts


def _addr_lines(ops, x, y, lines, step, size=8.5, max_w=None, color=GREY):
    for line in lines:
        s = fit_text(line, SANS, size, max_w) if max_w else line
        ops.append(Text(x, y, s, SANS, size, color=color))
        y += step
    return y


def _tax_line(inv: Invoice) -> str | None:
    if inv.supplier_tax_id is None:
        return None
    return f"{LABELS[inv.lang]['tax']}: {inv.supplier_tax_id}"


def _supplier_lines(inv: Invoice) -> list[str]:
    tax = _tax_line(inv)
    return inv.supplier_addr + ([tax] if tax else [])


def _money(inv: Invoice, d: Decimal) -> str:
    return fmt_money(d, inv.lang, inv.ccy)


def _totals_rows(inv: Invoice) -> list[tuple[str, str, bool]]:
    L = LABELS[inv.lang]
    rows = [(L["net_total"], _money(inv, inv.net_total), False)]
    if inv.vat_total is not None:
        rows.append((L["vat_total"], _money(inv, inv.vat_total), False))
    rows.append((L["gross_total"], _money(inv, inv.gross_total), True))
    return rows


def header_a(ops: list, inv: Invoice) -> float:
    L = LABELS[inv.lang]
    ops.append(Text(LEFT, 56, inv.supplier_name, BOLD, 15))
    _addr_lines(ops, LEFT, 72, _supplier_lines(inv), 11)
    ops.append(Text(RIGHT, 56, L["invoice"], BOLD, 20, "r", ACCENT))
    y = 82
    for label, value in _facts(inv):
        ops.append(Text(350, y, label, SANS, 8.5, color=GREY))
        ops.append(Text(RIGHT, y, value, BOLD, 8.5, "r"))
        y += 13
    for x, title, name, addr in ((LEFT, L["bill"], inv.buyer_name, inv.buyer_addr),
                                 (300, L["ship"], inv.buyer_name, inv.ship_addr)):
        ops.append(Text(x, 168, title, BOLD, 8, color=ACCENT))
        ops.append(Line(x, 172, x + 215, 172, 0.6, ACCENT))
        ops.append(Text(x, 187, name, BOLD, 9))
        _addr_lines(ops, x, 199, addr, 11, max_w=215)
    return 260


def header_b(ops: list, inv: Invoice) -> float:
    L = LABELS[inv.lang]
    ops.append(Rect(0, 0, PAGE_W, 78, fill=ACCENT))
    ops.append(Text(LEFT, 46, inv.supplier_name, BOLD, 15, color=WHITE))
    ops.append(Text(RIGHT, 46, L["invoice"], BOLD, 18, "r", WHITE))
    ops.append(Text(LEFT, 108, L["bill"], BOLD, 8, color=ACCENT))
    ops.append(Text(LEFT, 122, inv.buyer_name, BOLD, 9))
    _addr_lines(ops, LEFT, 134, inv.buyer_addr, 12, max_w=150)
    ops.append(Text(205, 108, L["frm"], BOLD, 8, color=ACCENT))
    _addr_lines(ops, 205, 122, _supplier_lines(inv), 12, max_w=150)
    # totals box at the top
    ops.append(Rect(370, 96, 185, 112, fill=(0.94, 0.96, 0.97), stroke=ACCENT))
    gross_label, gross_value, _ = _totals_rows(inv)[-1]
    ops.append(Text(382, 116, gross_label, SANS, 8, color=GREY))
    ops.append(Text(545, 138, gross_value, BOLD, 14, "r", ACCENT))
    ops.append(Line(382, 150, 545, 150, 0.5, ACCENT))
    y = 168
    for label, value, _ in _totals_rows(inv)[:-1]:
        ops.append(Text(382, y, label, SANS, 8.5, color=GREY))
        ops.append(Text(545, y, value, SANS, 8.5, "r"))
        y += 16
    # facts strip, wraps to a second row when it does not fit
    x, y = LEFT, 236
    for label, value in _facts(inv):
        w = max(text_width(label, SANS, 7.5), text_width(value, BOLD, 8.5)) + 22
        if x + w > RIGHT + 22:
            x, y = LEFT, y + 30
        ops.append(Text(x, y, label, SANS, 7.5, color=GREY))
        ops.append(Text(x, y + 13, value, BOLD, 8.5))
        x += w
    return y + 40


def header_c(ops: list, inv: Invoice) -> float:
    L = LABELS[inv.lang]
    ops.append(Text(LEFT, 56, inv.supplier_name, BOLD, 13))
    _addr_lines(ops, LEFT, 72, _supplier_lines(inv), 13, size=8)
    ops.append(Line(LEFT, 134, RIGHT, 134, 0.6, INK))
    ops.append(Text(LEFT, 150, f"{L['invoice'].capitalize()} {inv.invoice_number}", BOLD, 11))
    y = 170
    for label, value in _facts(inv)[1:]:
        ops.append(Text(LEFT, y, label, SANS, 8, color=GREY))
        ops.append(Text(160, y, value, SANS, 8))
        y += 14
    y = max(y, 226) + 22
    ops.append(Text(LEFT, y, L["bill"], BOLD, 8, color=GREY))
    ops.append(Text(LEFT, y + 14, inv.buyer_name, BOLD, 9))
    _addr_lines(ops, LEFT, y + 27, inv.buyer_addr, 13, size=8)
    return y + 70


def cont_header(ops: list, inv: Invoice, page_no: int) -> float:
    L = LABELS[inv.lang]
    ops.append(Text(LEFT, 46, inv.supplier_name, BOLD, 11))
    ops.append(Text(RIGHT, 46, L["cont"].format(no=inv.invoice_number), SANS, 8.5, "r", GREY))
    ops.append(Line(LEFT, 54, RIGHT, 54, 0.6, GREY))
    return 80


def _columns(inv: Invoice) -> list[tuple[str, float, str]]:
    cols = [("qty", 42, "r"), ("unit", 40, "l"), ("unit_net", 66, "r")]
    if inv.has_vat:
        cols.append(("vat_rate", 42, "r"))
    cols.append(("net", 60, "r"))
    if inv.has_vat:
        cols.append(("vat", 52, "r"))
    if inv.show_gross:
        cols.append(("gross", 60, "r"))
    fixed = sum(w for _, w, _ in cols)
    return [("description", RIGHT - LEFT - fixed, "l")] + cols


def _cell(inv: Invoice, row: Row, key: str) -> str:
    if key == "description":
        return row.description
    if key == "quantity" or key == "qty":
        return fmt_plain(row.quantity, inv.lang)
    if key == "unit":
        return row.unit
    if key == "vat_rate":
        return fmt_plain(row.vat_rate, inv.lang) + "%"
    value = {"unit_net": row.unit_net, "net": row.net, "vat": row.vat, "gross": row.gross}[key]
    return fmt_number(value, inv.lang, inv.ccy)


def _table_header(ops: list, inv: Invoice, y: float) -> float:
    L, st = LABELS[inv.lang], STYLES[inv.layout]
    cols = _columns(inv)
    if inv.layout == "a":
        ops.append(Rect(LEFT, y, RIGHT - LEFT, st.row_h, fill=LIGHT, stroke=GREY))
    base = y + st.row_h / 2 + 3
    color = ACCENT if inv.layout == "b" else INK
    x = LEFT
    for key, w, align in cols:
        label = L[key]
        assert text_width(label, BOLD, 7.5) <= w - 6, f"header {label!r} too wide"
        ops.append(Text(x + 4 if align == "l" else x + w - 4, base, label, BOLD, 7.5, align, color))
        x += w
    if inv.layout in ("b", "c"):
        ops.append(Line(LEFT, y + st.row_h, RIGHT, y + st.row_h, 0.8, color))
    return y + st.row_h


def _table_row(ops: list, inv: Invoice, row: Row, y: float, n: int) -> None:
    st = STYLES[inv.layout]
    base = y + st.row_h / 2 + 3
    if inv.layout == "b" and n % 2:
        ops.append(Rect(LEFT, y, RIGHT - LEFT, st.row_h, fill=(0.95, 0.97, 0.98)))
    x = LEFT
    for key, w, align in _columns(inv):
        s = _cell(inv, row, key)
        assert text_width(s, SANS, st.size) <= w - 8, f"{inv.doc_id}: {key} {s!r} too wide"
        ops.append(Text(x + 4 if align == "l" else x + w - 4, base, s, SANS, st.size, align))
        x += w
    if inv.layout == "a":
        ops.append(Line(LEFT, y + st.row_h, RIGHT, y + st.row_h, 0.3, GREY))


def _totals_block(ops: list, inv: Invoice, y: float) -> None:
    y += 12
    if inv.layout == "a":
        ops.append(Line(350, y - 16, RIGHT, y - 16, 0.6, GREY))
    for label, value, strong in _totals_rows(inv):
        if strong:
            ops.append(Line(350, y - 12, RIGHT, y - 12, 0.8, INK))
            y += 4
        ops.append(Text(350, y, label, BOLD if strong else SANS, 11 if strong else 9,
                        color=INK if strong else GREY))
        ops.append(Text(RIGHT, y, value, BOLD if strong else SANS, 11 if strong else 9, "r"))
        y += 18


def build_pages(inv: Invoice) -> Pages:
    st = STYLES[inv.layout]
    pages: Pages = [[]]
    y = {"a": header_a, "b": header_b, "c": header_c}[inv.layout](pages[0], inv)
    y = _table_header(pages[0], inv, y)
    for n, row in enumerate(inv.rows):
        if y + st.row_h > BOTTOM:
            pages.append([])
            y = _table_header(pages[-1], inv, cont_header(pages[-1], inv, len(pages)))
        _table_row(pages[-1], inv, row, y, n)
        y += st.row_h
    if inv.layout != "b":
        if y + 90 > BOTTOM:
            pages.append([])
            y = cont_header(pages[-1], inv, len(pages)) - 20
        _totals_block(pages[-1], inv, y + 6)
    L = LABELS[inv.lang]
    for i, ops in enumerate(pages, 1):
        ops.append(Text(PAGE_W / 2, 820, L["page"].format(i=i, n=len(pages)), SANS, 7.5, "c", GREY))
    return pages


# ------------------------------------------------------------------ truth

def _money_truth(inv: Invoice, d: Decimal | None) -> dict[str, Any] | None:
    return None if d is None else {"amount": dec_str(d), "currency": inv.ccy}


def _number(d: Decimal) -> int | float:
    return int(d) if d == d.to_integral_value() else float(d)


def to_truth(inv: Invoice, n_pages: int) -> dict[str, Any]:
    rows = [{
        "description": r.description,
        "quantity": _number(r.quantity),
        "unit": r.unit,
        "unit_net": _money_truth(inv, r.unit_net),
        "vat_rate": None if r.vat_rate is None else _number(r.vat_rate),
        "net": _money_truth(inv, r.net),
        "vat": _money_truth(inv, r.vat),
        "gross": _money_truth(inv, r.gross),
    } for r in inv.rows]
    fields: dict[str, Any] = {
        "supplier_name": inv.supplier_name,
        "supplier_tax_id": inv.supplier_tax_id,
        "invoice_number": inv.invoice_number,
        "issue_date": inv.issue.isoformat(),
        "sale_date": inv.sale.isoformat() if inv.sale else None,
        "due_date": inv.due.isoformat() if inv.due else None,
        "payment_term_days": inv.term_days,
        "net_total": _money_truth(inv, inv.net_total),
        "vat_total": _money_truth(inv, inv.vat_total),
        "gross_total": _money_truth(inv, inv.gross_total),
        "line_items": rows,
    }
    tags = ["scanned" if inv.scanned else "text-pdf"]
    if n_pages > 1:
        tags.append("multi-page")
    tags.append(inv.ccy.lower() if inv.ccy else "no-currency")
    tags.append(DATE_TAG[inv.date_style])
    tags += [f"lang-{inv.lang}", f"layout-{inv.layout}"]
    gross_in_truth = inv.has_vat
    if (inv.term_days is not None and not inv.show_term) or (gross_in_truth and not inv.show_gross):
        tags.append("computed-not-printed")
    optional = ("supplier_tax_id", "sale_date", "due_date", "payment_term_days", "vat_total")
    if any(fields[k] is None for k in optional):
        tags.append("missing-optional")
    return {
        "id": inv.doc_id,
        "file": f"{inv.doc_id}.pdf",
        "expectedType": "invoice",
        "source": "synthetic",
        "tags": tags,
        "seed": inv.doc_seed,
        "fields": fields,
    }


# ------------------------------------------------------------------ self-check

class SelfCheckError(AssertionError):
    pass


def _expected(inv: Invoice) -> list[tuple[str, str]]:
    L = LABELS[inv.lang]
    out = [("supplier_name", inv.supplier_name), ("invoice_number", inv.invoice_number),
           ("issue_date", _date(inv, inv.issue))]
    if inv.supplier_tax_id:
        out.append(("supplier_tax_id", inv.supplier_tax_id))
    if inv.sale:
        out.append(("sale_date", _date(inv, inv.sale)))
    if inv.due:
        out.append(("due_date", _date(inv, inv.due)))
    if inv.show_term:
        out.append(("payment_term_days", L["days"].format(n=inv.term_days)))
    out.append(("net_total", _money(inv, inv.net_total)))
    if inv.vat_total is not None:
        out.append(("vat_total", _money(inv, inv.vat_total)))
    out.append(("gross_total", _money(inv, inv.gross_total)))
    for i, r in enumerate(inv.rows):
        for key in ("description", "quantity", "unit", "unit_net", "net"):
            out.append((f"line_items[{i}].{key}", _cell(inv, r, key)))
        if inv.has_vat:
            out.append((f"line_items[{i}].vat_rate", _cell(inv, r, "vat_rate")))
            out.append((f"line_items[{i}].vat", _cell(inv, r, "vat")))
        if inv.show_gross:
            out.append((f"line_items[{i}].gross", _cell(inv, r, "gross")))
    return out


_SQUASH = re.compile(r"\s+")
_CURRENCY_MARK = re.compile(r"[$€£¥]|(?<![A-Za-z])(USD|EUR|GBP|CHF|JPY|SEK|kr)(?![A-Za-z])")


def extract_text(source: Path | io.BytesIO) -> str:
    reader = PdfReader(source)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def self_check(inv: Invoice, source: Path | io.BytesIO) -> None:
    """Every truth string and printed amount must be found in the extracted text."""
    text = _SQUASH.sub("", extract_text(source))
    for field, needle in _expected(inv):
        if _SQUASH.sub("", needle) not in text:
            raise SelfCheckError(f"{inv.doc_id}: {field}: {needle!r} not found in the PDF text")
    if inv.ccy is None:
        m = _CURRENCY_MARK.search(extract_text(source))
        if m:
            raise SelfCheckError(
                f"{inv.doc_id}: no-currency invoice prints a currency mark {m.group(0)!r}")


# ------------------------------------------------------------------ generate

def generate_invoice(doc_seed: int, out_dir: Path) -> dict[str, Any]:
    inv = build_invoice(doc_seed)
    pages = build_pages(inv)
    truth = to_truth(inv, len(pages))
    pdf_path = out_dir / truth["file"]
    if inv.scanned:
        buf = io.BytesIO()
        render_text_pdf(pages, buf)
        buf.seek(0)
        self_check(inv, buf)  # same ops as the raster pages
        render_scanned_pdf(pages, pdf_path, random.Random(doc_seed ^ 0x5CA77ED))
    else:
        render_text_pdf(pages, pdf_path)
        self_check(inv, pdf_path)
    write_json(out_dir / f"{inv.doc_id}.truth.json", truth)
    return truth


def generate_invoices(out_dir: Path, count: int, seed: int) -> list[dict[str, Any]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("inv-[0-9]*"):
        old.unlink()
    return [generate_invoice(seed * SEED_SPAN + i, out_dir) for i in range(1, count + 1)]
