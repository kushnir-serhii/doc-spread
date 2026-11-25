"""Synthetic receipts: a till slip drawn with Pillow (DejaVu Sans Mono), then a seeded photo pass.

Same seeding as invoices: seed = base_seed * 10000 + index, stored in the truth file.
Prices are line totals including tax, and total = sum of the item prices.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageFilter

from .common import (
    MONO,
    Line,
    Op,
    Text,
    dec_str,
    fit_text,
    fmt_date,
    fmt_money,
    fmt_number,
    quantize,
    rasterize_ops,
    text_width,
    write_json,
)
from .invoice import (
    _CURRENCY_MARK,
    DATE_STYLES,
    DATE_TAG,
    LOCALES,
    RATES,
    SEED_SPAN,
    SelfCheckError,
    _address,
    _faker,
    _tax_id,
)

# (language, currency); None = no currency printed anywhere
PLAN: list[tuple[str, str | None]] = [
    ("en", "USD"), ("de", "EUR"), ("en", None), ("en", "GBP"), ("fr", "EUR"), ("en", "JPY"),
    ("es", "EUR"), ("de", None), ("sv", "SEK"), ("pl", "EUR"), ("en", None), ("en", "CHF"),
]
PAYMENTS = ["Other", "Card", "Cash", "Transfer"]  # by index % 4
STRENGTHS = ["light", "medium", "hard"]  # by (index - 1) % 3
PNG = {4, 10}
NO_ITEMS = {8}  # a receipt that prints only the total (items null)
NO_PAYMENT = {5, 11}
NO_TAX_TOTAL = {5, 10}
SLIP_W = 220  # points (about 78 mm)
SIDE = 12
DPI = 190

LABELS = {
    "en": dict(total="TOTAL", tax="incl. tax", tax_id="Tax ID", Card="Card", Cash="Cash",
               Transfer="Transfer", Other="Gift card"),
    "de": dict(total="SUMME", tax="inkl. MwSt", tax_id="USt-IdNr.", Card="Karte", Cash="Bar",
               Transfer="Überweisung", Other="Gutschein"),
    "fr": dict(total="TOTAL", tax="dont TVA", tax_id="N° TVA", Card="Carte bancaire",
               Cash="Espèces", Transfer="Virement", Other="Bon cadeau"),
    "es": dict(total="TOTAL", tax="IVA incl.", tax_id="NIF", Card="Tarjeta", Cash="Efectivo",
               Transfer="Transferencia", Other="Cheque regalo"),
    "sv": dict(total="SUMMA", tax="varav moms", tax_id="Momsreg.nr", Card="Kort", Cash="Kontant",
               Transfer="Överföring", Other="Presentkort"),
    "pl": dict(total="SUMA", tax="w tym VAT", tax_id="NIP", Card="Karta", Cash="Gotówka",
               Transfer="Przelew", Other="Bon podarunkowy"),
}
VOCAB = {
    "en": ["Latte", "Blueberry muffin", "Sandwich", "Mineral water", "Notebook A5", "USB cable",
           "Batteries AA", "Bread", "Milk 1L", "Paper bags"],
    "de": ["Milchkaffee", "Brezel", "Mineralwasser", "Notizbuch A5", "USB-Kabel", "Batterien AA",
           "Brot", "Milch 1L", "Tüten", "Apfelschorle"],
    "fr": ["Café crème", "Croissant", "Eau minérale", "Cahier A5", "Câble USB", "Piles AA",
           "Baguette", "Lait 1L", "Sacs papier", "Jus d'orange"],
    "es": ["Café con leche", "Tostada", "Agua mineral", "Cuaderno A5", "Cable USB", "Pilas AA",
           "Pan", "Leche 1L", "Bolsas", "Zumo de naranja"],
    "sv": ["Kaffe latte", "Kanelbulle", "Mineralvatten", "Anteckningsbok A5", "USB-kabel",
           "Batterier AA", "Bröd", "Mjölk 1L", "Papperspåsar", "Apelsinjuice"],
    "pl": ["Kawa latte", "Drożdżówka", "Woda mineralna", "Zeszyt A5", "Kabel USB", "Baterie AA",
           "Chleb", "Mleko 1L", "Torby papierowe", "Sok pomarańczowy"],
}


@dataclass
class Item:
    description: str
    quantity: int | None  # None = not printed
    price: Decimal  # line total incl. tax
    rate: Decimal | None


@dataclass
class Receipt:
    doc_seed: int
    index: int
    lang: str
    ccy: str | None
    date_style: str
    strength: str
    png: bool
    merchant: str
    address: list[str]
    tax_id: str | None
    day: date
    time: str
    items: list[Item] | None
    total: Decimal
    tax_groups: list[tuple[Decimal, Decimal]] | None  # (rate, tax); None = no tax lines
    payment: str | None

    @property
    def doc_id(self) -> str:
        return f"rcp-{self.index:03d}"

    @property
    def tax_total(self) -> Decimal | None:
        return None if self.tax_groups is None else sum((t for _, t in self.tax_groups), Decimal(0))

    @property
    def file(self) -> str:
        return f"{self.doc_id}.{'png' if self.png else 'jpg'}"


def build_receipt(doc_seed: int) -> Receipt:
    _, index = divmod(doc_seed, SEED_SPAN)
    rng = random.Random(doc_seed)
    lang, ccy = PLAN[(index - 1) % len(PLAN)]
    styles = DATE_STYLES[lang]
    style = styles[index % len(styles)] if lang == "en" else styles[(index // 2 + 2) % len(styles)]
    if style == "mdy" and ccy not in ("USD", None):
        style = "long"
    locale = rng.choice(LOCALES[lang])
    if style == "mdy":
        locale = "en_US"
    fake = _faker(locale)
    fake.seed_instance(rng.randrange(2**32))
    merchant = fake.company()
    if index % 2 == 0:
        merchant = merchant.upper()
    merchant = fit_text(merchant, MONO, 10, SLIP_W - 2 * SIDE)
    address = _address(fake)[:2]
    tax_id = _tax_id(fake, rng) if index % 4 != 0 else None

    day = date(2025, 1, 1) + timedelta(days=rng.randrange(700))
    if style in ("dmy", "mdy"):
        while day.day <= 12:
            day += timedelta(days=1)
    time = f"{rng.randint(7, 21):02d}:{rng.randint(0, 59):02d}"

    rates = [Decimal(str(r)) for r in RATES[ccy]]
    main_rate = rng.choice(rates)
    n_items = rng.randint(1, 10)
    has_qty = index % 3 != 0
    vocab = rng.sample(VOCAB[lang], k=min(n_items, len(VOCAB[lang])))
    items: list[Item] = []
    for i in range(n_items):
        qty = rng.choice([1, 1, 1, 2, 3, 4]) if has_qty else 1
        unit = (Decimal(rng.randint(10, 300) * 10) if ccy == "JPY"
                else Decimal(rng.randint(80, 4500)) / 100)
        rate = main_rate if rng.random() < 0.8 else rng.choice(rates)
        items.append(Item(vocab[i % len(vocab)], qty if has_qty else None,
                          quantize(qty * quantize(unit, ccy), ccy), rate))

    with_tax = index not in NO_TAX_TOTAL
    if index in NO_ITEMS:
        total = quantize(Decimal(rng.randint(1500, 12000)) / 100, ccy)
        groups = [(main_rate, quantize(total * main_rate / (100 + main_rate), ccy))]
        items_out = None
    else:
        total = sum((it.price for it in items), Decimal(0))
        by_rate: dict[Decimal, Decimal] = {}
        for it in items:
            by_rate[it.rate] = by_rate.get(it.rate, Decimal(0)) + it.price
        groups = [(r, quantize(g * r / (100 + r), ccy)) for r, g in sorted(by_rate.items())]
        items_out = items
    # description width depends on the widest price
    if items_out:
        price_w = max(text_width(fmt_number(it.price, lang, ccy), MONO, 8) for it in items_out)
        for it in items_out:
            avail = SLIP_W - 2 * SIDE - 22 - price_w - 8
            it.description = fit_text(it.description, MONO, 8, avail)
    return Receipt(
        doc_seed=doc_seed, index=index, lang=lang, ccy=ccy, date_style=style,
        strength=STRENGTHS[(index - 1) % 3], png=index in PNG, merchant=merchant,
        address=address, tax_id=tax_id, day=day, time=time, items=items_out, total=total,
        tax_groups=groups if with_tax else None,
        payment=None if index in NO_PAYMENT else PAYMENTS[index % 4],
    )


# ------------------------------------------------------------------ the till slip

def draw_slip(r: Receipt) -> tuple[list[Op], float]:
    """Return draw ops (points, y down) and the slip height."""
    L = LABELS[r.lang]
    ops: list[Op] = []
    cx, right = SLIP_W / 2, SLIP_W - SIDE
    y = 24.0

    def center(s, size=8):
        nonlocal y
        ops.append(Text(cx, y, s, MONO, size, "c"))
        y += size + 4

    def sep():
        nonlocal y
        ops.append(Line(SIDE, y - 3, right, y - 3, 0.6))
        y += 6

    center(r.merchant, 10)
    y += 2
    for line in r.address:
        center(fit_text(line, MONO, 7.5, SLIP_W - 2 * SIDE), 7.5)
    if r.tax_id:
        center(f"{L['tax_id']}: {r.tax_id}", 7.5)
    y += 4
    ops.append(Text(SIDE, y, fmt_date(r.day, r.date_style, r.lang), MONO, 8))
    ops.append(Text(right, y, r.time, MONO, 8, "r"))
    y += 12
    sep()
    if r.items:
        for it in r.items:
            if it.quantity is not None:
                ops.append(Text(SIDE, y, f"{it.quantity}x", MONO, 8))
            price_s = fmt_number(it.price, r.lang, r.ccy)
            ops.append(Text(SIDE + 22, y, it.description, MONO, 8))
            # dot leader so the eye can follow a row across a tilted photo
            start = SIDE + 22 + text_width(it.description, MONO, 8) + 4
            end = right - text_width(price_s, MONO, 8) - 4
            n_dots = int((end - start) / text_width(".", MONO, 8))
            if n_dots > 2:
                ops.append(Text(start, y, "." * n_dots, MONO, 8, color=(0.55, 0.55, 0.55)))
            ops.append(Text(right, y, price_s, MONO, 8, "r"))
            y += 11.5
        sep()
    if r.tax_groups is not None:
        for rate, tax in r.tax_groups:
            ops.append(Text(SIDE, y, f"{L['tax']} {fmt_number(rate, r.lang, None).rstrip('0').rstrip(',.')}%",
                            MONO, 8))
            ops.append(Text(right, y, fmt_number(tax, r.lang, r.ccy), MONO, 8, "r"))
            y += 11.5
        if len(r.tax_groups) > 1:
            ops.append(Text(SIDE, y, L["tax"], MONO, 8))
            ops.append(Text(right, y, fmt_number(r.tax_total, r.lang, r.ccy), MONO, 8, "r"))
            y += 11.5
        y += 2
    ops.append(Text(SIDE, y + 3, L["total"], MONO, 11))
    ops.append(Text(right, y + 3, fmt_money(r.total, r.lang, r.ccy), MONO, 11, "r"))
    y += 18
    sep()
    if r.payment:
        ops.append(Text(SIDE, y, L[r.payment], MONO, 8))
        y += 12
    y += 6
    center("* * * * * * *", 8)
    return ops, y + 14


def draw_texts(r: Receipt) -> list[str]:
    return [op.s for op in draw_slip(r)[0] if isinstance(op, Text)]


# ------------------------------------------------------------------ truth + self-check

def _money(r: Receipt, d: Decimal | None) -> dict[str, Any] | None:
    return None if d is None else {"amount": dec_str(d), "currency": r.ccy}


def to_truth(r: Receipt) -> dict[str, Any]:
    items = None if r.items is None else [
        {"description": it.description, "quantity": it.quantity, "price": _money(r, it.price)}
        for it in r.items
    ]
    fields = {
        "merchant": r.merchant,
        "merchant_tax_id": r.tax_id,
        "receipt_date": r.day.isoformat(),
        "total": _money(r, r.total),
        "tax_total": _money(r, r.tax_total),
        "payment_method": r.payment,
        "items": items,
    }
    tags = ["photo", f"photo-{r.strength}", "png" if r.png else "jpg",
            r.ccy.lower() if r.ccy else "no-currency", DATE_TAG[r.date_style], f"lang-{r.lang}"]
    optional = ("merchant_tax_id", "tax_total", "payment_method", "items")
    if any(fields[k] is None for k in optional):
        tags.append("missing-optional")
    return {"id": r.doc_id, "file": r.file, "expectedType": "receipt", "source": "synthetic",
            "tags": tags, "seed": r.doc_seed, "fields": fields}


def self_check(r: Receipt) -> None:
    """Every truth value, in its printed form, must be among the drawn strings."""
    drawn = draw_texts(r)
    blob = "\n".join(drawn)
    L = LABELS[r.lang]
    needles = [("merchant", r.merchant), ("receipt_date", fmt_date(r.day, r.date_style, r.lang)),
               ("total", fmt_money(r.total, r.lang, r.ccy))]
    if r.tax_id:
        needles.append(("merchant_tax_id", r.tax_id))
    if r.tax_total is not None:
        needles.append(("tax_total", fmt_number(r.tax_total, r.lang, r.ccy)))
    if r.payment:
        needles.append(("payment_method", L[r.payment]))
    for i, it in enumerate(r.items or []):
        needles.append((f"items[{i}].description", it.description))
        needles.append((f"items[{i}].price", fmt_number(it.price, r.lang, r.ccy)))
        if it.quantity is not None:
            needles.append((f"items[{i}].quantity", f"{it.quantity}x"))
    for field, needle in needles:
        if needle not in drawn and needle not in blob:
            raise SelfCheckError(f"{r.doc_id}: {field}: {needle!r} not drawn on the slip")
    if r.items is not None and sum((it.price for it in r.items), Decimal(0)) != r.total:
        raise SelfCheckError(f"{r.doc_id}: total is not the sum of the item prices")
    if r.ccy is None and _CURRENCY_MARK.search(blob):
        raise SelfCheckError(f"{r.doc_id}: no-currency receipt prints a currency mark")


# ------------------------------------------------------------------ the photo pass

PHOTO = {  # rotation deg, perspective frac, blur, noise, light falloff, jpeg quality
    "light": dict(rot=1.5, persp=0.008, blur=0.4, noise=0.03, light=0.12, q=88),
    "medium": dict(rot=4.0, persp=0.02, blur=0.8, noise=0.06, light=0.28, q=75),
    "hard": dict(rot=8.0, persp=0.04, blur=1.2, noise=0.10, light=0.45, q=62),
}


def _perspective_coeffs(dst: list[tuple[float, float]], src: list[tuple[float, float]]):
    """Solve the 8 coefficients Pillow wants (output point -> input point)."""
    a = []
    b = []
    for (x, y), (X, Y) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -x * X, -y * X])
        a.append([0, 0, 0, x, y, 1, -x * Y, -y * Y])
        b += [X, Y]
    n = 8
    m = [row + [v] for row, v in zip(a, b)]
    for c in range(n):
        piv = max(range(c, n), key=lambda i: abs(m[i][c]))
        m[c], m[piv] = m[piv], m[c]
        for i in range(n):
            if i != c:
                f = m[i][c] / m[c][c]
                m[i] = [vi - f * vc for vi, vc in zip(m[i], m[c])]
    return [m[i][n] / m[i][i] for i in range(n)]


def photo_pass(slip: Image.Image, rng: random.Random, strength: str) -> Image.Image:
    p = PHOTO[strength]
    margin = 60
    bg = rng.randint(70, 150)
    w, h = slip.width + 2 * margin, slip.height + 2 * margin
    img = Image.new("L", (w, h), bg)
    img.paste(slip, (margin, margin))
    j = p["persp"]
    quad = [(0, 0), (w, 0), (w, h), (0, h)]
    dst = [(x + rng.uniform(-j, j) * w, y + rng.uniform(-j, j) * h) for x, y in quad]
    img = img.transform((w, h), Image.Transform.PERSPECTIVE,
                        _perspective_coeffs(dst, quad), Image.Resampling.BICUBIC, fillcolor=bg)
    angle = rng.choice([-1, 1]) * rng.uniform(0.5, 1.0) * p["rot"]
    img = img.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=bg)
    grad = Image.linear_gradient("L").rotate(rng.uniform(0, 360), resample=Image.Resampling.BICUBIC)
    grad = grad.resize(img.size, Image.Resampling.BILINEAR)
    shade = grad.point(lambda v: round(255 * (1 - p["light"] * v / 255)))
    img = ImageChops.multiply(img, shade)
    img = img.filter(ImageFilter.GaussianBlur(p["blur"]))
    noise = Image.frombytes("L", img.size, rng.randbytes(img.width * img.height))
    return Image.blend(img, noise, p["noise"])


def generate_receipt(doc_seed: int, out_dir: Path) -> dict[str, Any]:
    r = build_receipt(doc_seed)
    self_check(r)
    ops, height = draw_slip(r)
    slip = rasterize_ops(ops, SLIP_W, height, DPI)
    img = photo_pass(slip, random.Random(doc_seed ^ 0x9E3779B1), r.strength)
    path = out_dir / r.file
    if r.png:
        img.point(lambda v: (v >> 3) << 3).save(path, "PNG", optimize=True)  # 32 gray levels keep it small
    else:
        img.save(path, "JPEG", quality=PHOTO[r.strength]["q"], optimize=True)
    truth = to_truth(r)
    write_json(out_dir / f"{r.doc_id}.truth.json", truth)
    return truth


def generate_receipts(out_dir: Path, count: int, seed: int) -> list[dict[str, Any]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("rcp-[0-9]*"):
        old.unlink()
    return [generate_receipt(seed * SEED_SPAN + i, out_dir) for i in range(1, count + 1)]


