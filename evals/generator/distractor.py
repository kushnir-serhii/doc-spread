"""Four distractors: documents that match no type (expectedType null, fields {})."""

from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from .common import (
    BOLD,
    PAGE_W,
    SANS,
    Line,
    Op,
    Rect,
    Text,
    fit_text,
    fmt_date,
    fmt_number,
    rasterize_page,
    render_text_pdf,
    scan_effects,
    text_width,
    write_json,
)
from .invoice import SEED_SPAN, _address, _faker

GREY = (0.38, 0.38, 0.38)
LEFT, RIGHT = 56, PAGE_W - 56


def _wrap(text: str, font: str, size: float, width: float) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if text_width(trial, font, size) > width and cur:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    return lines + ([cur] if cur else [])


def _paragraphs(ops: list[Op], y: float, paras: list[str], size=9.5, step=13.5, gap=9) -> float:
    for para in paras:
        for line in _wrap(para, SANS, size, RIGHT - LEFT):
            ops.append(Text(LEFT, y, line, SANS, size))
            y += step
        y += gap
    return y


def contract(rng: random.Random) -> tuple[list[Op], dict[str, Any]]:
    fake = _faker("en_GB")
    fake.seed_instance(rng.randrange(2**32))
    a, b = fake.company(), fake.company()
    when = fmt_date(date(2026, 1, 1) + timedelta(days=rng.randrange(300)), "long", "en")
    ops: list[Op] = [Text(PAGE_W / 2, 80, "MUTUAL NON-DISCLOSURE AGREEMENT", BOLD, 14, "c")]
    y = _paragraphs(ops, 120, [
        f"This Agreement is made on {when} between {a} (the \"Disclosing Party\") and {b} "
        "(the \"Receiving Party\"), together the \"Parties\".",
        "1. Confidential Information. \"Confidential Information\" means all technical, "
        "commercial and financial information disclosed by one Party to the other, in any "
        "form, that is marked confidential or would reasonably be understood to be so.",
        "2. Obligations. The Receiving Party shall keep the Confidential Information secret, "
        "use it only to evaluate the proposed cooperation, and disclose it only to employees "
        "who need to know it and are bound by equivalent duties.",
        "3. Exclusions. These obligations do not apply to information that is public through "
        "no fault of the Receiving Party, was already known to it, or is independently developed.",
        "4. Term. This Agreement lasts for three (3) years from the date above. The duties of "
        "confidentiality survive for two (2) years after it ends.",
        "5. Liability. Neither Party is liable for indirect or consequential loss. Nothing here "
        "limits liability that cannot be limited by law.",
        "6. Governing law. This Agreement is governed by the law of England and Wales.",
    ])
    y += 30
    for x, name in ((LEFT, a), (PAGE_W / 2 + 10, b)):
        ops.append(Line(x, y, x + 190, y, 0.6))
        ops.append(Text(x, y + 12, fit_text(name, SANS, 8.5, 190), SANS, 8.5, color=GREY))
        ops.append(Text(x, y + 24, "Signature and date", SANS, 7.5, color=GREY))
    return ops, {"tags": ["text-pdf", "contract", "lang-en"], "ext": "pdf"}


def delivery_note(rng: random.Random) -> tuple[list[Op], dict[str, Any]]:
    fake = _faker("de_DE")
    fake.seed_instance(rng.randrange(2**32))
    sender, buyer = fake.company(), fake.company()
    day = date(2026, 1, 1) + timedelta(days=rng.randrange(300))
    ops: list[Op] = [Text(LEFT, 70, fit_text(sender, BOLD, 14, 300), BOLD, 14),
                     Text(RIGHT, 70, "LIEFERSCHEIN", BOLD, 18, "r", (0.12, 0.31, 0.38))]
    y = 88.0
    for line in _address(fake):
        ops.append(Text(LEFT, y, line, SANS, 8.5, color=GREY))
        y += 11
    for i, (label, value) in enumerate((
            ("Lieferschein-Nr.", f"LS-{rng.randint(1000, 9999)}"),
            ("Lieferdatum", fmt_date(day, "localized", "de")),
            ("Bestellnummer", f"B-{rng.randint(10000, 99999)}"))):
        ops.append(Text(350, 96 + i * 13, label, SANS, 8.5, color=GREY))
        ops.append(Text(RIGHT, 96 + i * 13, value, BOLD, 8.5, "r"))
    ops.append(Text(LEFT, 190, "Empfänger", BOLD, 8, color=GREY))
    ops.append(Text(LEFT, 204, buyer, BOLD, 9.5))
    y = 216.0
    for line in _address(fake):
        ops.append(Text(LEFT, y, line, SANS, 8.5, color=GREY))
        y += 11
    y = 290.0
    ops.append(Rect(LEFT, y, RIGHT - LEFT, 20, fill=(0.9, 0.9, 0.9), stroke=GREY))
    for x, s, al in ((LEFT + 6, "Pos.", "l"), (LEFT + 40, "Artikel", "l"),
                     (RIGHT - 90, "Menge", "r"), (RIGHT - 6, "Einheit", "r")):
        ops.append(Text(x, y + 13.5, s, BOLD, 8, al))
    goods = ["Schrauben M6 (Karton)", "Dichtungsring 40 mm", "Kabelbinder 200 mm", "Werkzeugkoffer",
             "Sicherungsautomat B16", "Schutzhandschuhe Gr. 9"]
    for n, name in enumerate(rng.sample(goods, k=5), 1):
        y += 22
        ops.append(Text(LEFT + 6, y + 13.5, str(n), SANS, 8.5))
        ops.append(Text(LEFT + 40, y + 13.5, name, SANS, 8.5))
        ops.append(Text(RIGHT - 90, y + 13.5, str(rng.choice([1, 2, 5, 10, 24, 100])), SANS, 8.5, "r"))
        ops.append(Text(RIGHT - 6, y + 13.5, rng.choice(["Stk", "Pkg", "Satz"]), SANS, 8.5, "r"))
        ops.append(Line(LEFT, y + 20, RIGHT, y + 20, 0.3, GREY))
    ops.append(Text(LEFT, y + 60, "Ware ohne Preisangabe. Bitte bei Erhalt auf Vollständigkeit prüfen.",
                    SANS, 8.5, color=GREY))
    ops.append(Line(LEFT, y + 120, LEFT + 190, y + 120, 0.6))
    ops.append(Text(LEFT, y + 132, "Empfangsbestätigung (Datum, Unterschrift)", SANS, 7.5, color=GREY))
    return ops, {"tags": ["text-pdf", "delivery-note", "no-prices", "lang-de"], "ext": "pdf"}


def bank_statement(rng: random.Random) -> tuple[list[Op], dict[str, Any]]:
    fake = _faker("en_GB")
    fake.seed_instance(rng.randrange(2**32))
    ops: list[Op] = [Text(LEFT, 70, "ACCOUNT STATEMENT", BOLD, 16),
                     Text(LEFT, 90, fake.name(), SANS, 9.5),
                     Text(RIGHT, 70, "Currency: EUR", SANS, 9, "r", GREY),
                     Text(RIGHT, 84, "IBAN " + fake.iban(), SANS, 8.5, "r", GREY)]
    start = date(2026, 3, 1) + timedelta(days=rng.randrange(200))
    ops.append(Text(LEFT, 112, f"Period: {fmt_date(start, 'iso', 'en')} to "
                    f"{fmt_date(start + timedelta(days=30), 'iso', 'en')}", SANS, 9, color=GREY))
    y = 140.0
    ops.append(Rect(LEFT, y, RIGHT - LEFT, 20, fill=(0.9, 0.9, 0.9), stroke=GREY))
    for x, s, al in ((LEFT + 6, "Date", "l"), (LEFT + 80, "Description", "l"),
                     (RIGHT - 120, "Amount", "r"), (RIGHT - 6, "Balance", "r")):
        ops.append(Text(x, y + 13.5, s, BOLD, 8.5, al))
    balance = Decimal(rng.randint(100000, 400000)) / 100
    names = ["Card payment", "Transfer in", "Direct debit", "Cash withdrawal", "Salary", "Standing order"]
    for n in range(14):
        y += 22
        amount = Decimal(rng.randint(-45000, 60000)) / 100
        balance += amount
        ops.append(Text(LEFT + 6, y + 13.5, fmt_date(start + timedelta(days=n * 2), "iso", "en"), SANS, 8.5))
        ops.append(Text(LEFT + 80, y + 13.5, f"{rng.choice(names)} {rng.randint(1000, 9999)}", SANS, 8.5))
        ops.append(Text(RIGHT - 120, y + 13.5, fmt_number(amount, "en", "EUR"), SANS, 8.5, "r"))
        ops.append(Text(RIGHT - 6, y + 13.5, fmt_number(balance, "en", "EUR"), SANS, 8.5, "r"))
        ops.append(Line(LEFT, y + 20, RIGHT, y + 20, 0.3, GREY))
    return ops, {"tags": ["scanned", "jpg", "bank-statement", "lang-en"], "ext": "jpg"}


def blank_form(rng: random.Random) -> tuple[list[Op], dict[str, Any]]:
    ops: list[Op] = [Text(LEFT, 80, "EXPENSE CLAIM FORM", BOLD, 16),
                     Text(LEFT, 98, "Please complete in block capitals and attach receipts.",
                          SANS, 9, color=GREY)]
    y = 140.0
    for label in ("Employee name", "Employee number", "Department", "Period from", "Period to",
                  "Cost centre", "Approved by"):
        ops.append(Text(LEFT, y, label, SANS, 9))
        ops.append(Rect(LEFT + 130, y - 12, 300, 18, stroke=GREY))
        y += 30
    y += 14
    ops.append(Rect(LEFT, y, RIGHT - LEFT, 20, fill=(0.9, 0.9, 0.9), stroke=GREY))
    for x, s in ((LEFT + 6, "Date"), (LEFT + 90, "Description"), (RIGHT - 110, "Category"),
                 (RIGHT - 50, "Amount")):
        ops.append(Text(x, y + 13.5, s, BOLD, 8.5))
    for _ in range(8):
        y += 24
        ops.append(Rect(LEFT, y, RIGHT - LEFT, 24, stroke=GREY))
    ops.append(Text(LEFT, y + 60, "Signature", SANS, 9))
    ops.append(Line(LEFT + 60, y + 60, LEFT + 260, y + 60, 0.6))
    return ops, {"tags": ["text-pdf", "blank-form", "lang-en"], "ext": "pdf"}


MAKERS = [contract, delivery_note, bank_statement, blank_form]


def generate_distractor(doc_seed: int, out_dir: Path) -> dict[str, Any]:
    _, index = divmod(doc_seed, SEED_SPAN)
    rng = random.Random(doc_seed)
    ops, meta = MAKERS[(index - 1) % len(MAKERS)](rng)
    doc_id = f"dst-{index:03d}"
    file = f"{doc_id}.{meta['ext']}"
    if meta["ext"] == "pdf":
        render_text_pdf([ops], out_dir / file)
    else:
        img = scan_effects(rasterize_page(ops, 120), random.Random(doc_seed ^ 0x5CA77ED))
        img.save(out_dir / file, "JPEG", quality=70, optimize=True)
    truth = {"id": doc_id, "file": file, "expectedType": None, "source": "synthetic",
             "tags": meta["tags"], "seed": doc_seed, "fields": {}}
    write_json(out_dir / f"{doc_id}.truth.json", truth)
    return truth


def generate_distractors(out_dir: Path, seed: int) -> list[dict[str, Any]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("dst-[0-9]*"):
        old.unlink()
    return [generate_distractor(seed * SEED_SPAN + i, out_dir) for i in range(1, len(MAKERS) + 1)]
