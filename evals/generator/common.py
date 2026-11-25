"""Shared pieces: fonts, drawing ops, two renderers (reportlab, Pillow), formatting."""

from __future__ import annotations

import io
import json
import random
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONT_DIR = Path(__file__).resolve().parent / "fonts"
SANS = "DejaVuSans"
BOLD = "DejaVuSans-Bold"
MONO = "DejaVuSansMono"
FONT_FILES = {
    SANS: FONT_DIR / "DejaVuSans.ttf",
    BOLD: FONT_DIR / "DejaVuSans-Bold.ttf",
    MONO: FONT_DIR / "DejaVuSansMono.ttf",
}

PAGE_W, PAGE_H = 595, 842  # A4 in points; in ops y grows downwards

_registered = False


def register_fonts() -> None:
    global _registered
    if _registered:
        return
    for name, path in FONT_FILES.items():
        pdfmetrics.registerFont(TTFont(name, str(path)))
    _registered = True


def text_width(s: str, font: str, size: float) -> float:
    register_fonts()
    return pdfmetrics.stringWidth(s, font, size)


def fit_text(s: str, font: str, size: float, max_w: float) -> str:
    """Drop trailing words until the string fits max_w (then trim trailing punctuation)."""
    words = s.split()
    while len(words) > 1 and text_width(" ".join(words), font, size) > max_w:
        words.pop()
    out = " ".join(words)
    while len(out) > 1 and text_width(out, font, size) > max_w:
        out = out[:-1]
    return out.rstrip(" ,.-&/")


# ---------------------------------------------------------------- drawing ops

Color = tuple[float, float, float]
INK: Color = (0.1, 0.1, 0.1)


@dataclass(frozen=True)
class Text:
    x: float
    y: float  # baseline, from the top of the page
    s: str
    font: str = SANS
    size: float = 9
    align: str = "l"  # l | r | c
    color: Color = INK


@dataclass(frozen=True)
class Line:
    x1: float
    y1: float
    x2: float
    y2: float
    width: float = 0.5
    color: Color = INK


@dataclass(frozen=True)
class Rect:
    x: float
    y: float  # top edge
    w: float
    h: float
    fill: Color | None = None
    stroke: Color | None = None
    width: float = 0.5


Op = Text | Line | Rect
Pages = list[list[Op]]


def _draw_reportlab(c: canvas.Canvas, ops: list[Op]) -> None:
    for op in ops:
        if isinstance(op, Text):
            c.setFont(op.font, op.size)
            c.setFillColorRGB(*op.color)
            y = PAGE_H - op.y
            if op.align == "l":
                c.drawString(op.x, y, op.s)
            elif op.align == "r":
                c.drawRightString(op.x, y, op.s)
            else:
                c.drawCentredString(op.x, y, op.s)
        elif isinstance(op, Line):
            c.setStrokeColorRGB(*op.color)
            c.setLineWidth(op.width)
            c.line(op.x1, PAGE_H - op.y1, op.x2, PAGE_H - op.y2)
        else:
            if op.fill is not None:
                c.setFillColorRGB(*op.fill)
            if op.stroke is not None:
                c.setStrokeColorRGB(*op.stroke)
            c.setLineWidth(op.width)
            c.rect(
                op.x,
                PAGE_H - op.y - op.h,
                op.w,
                op.h,
                stroke=1 if op.stroke is not None else 0,
                fill=1 if op.fill is not None else 0,
            )


def render_text_pdf(pages: Pages, dest: Path | io.BytesIO) -> None:
    """Vector PDF with a text layer. invariant=1 makes the bytes reproducible."""
    register_fonts()
    target = dest if isinstance(dest, io.BytesIO) else str(dest)
    c = canvas.Canvas(target, pagesize=(PAGE_W, PAGE_H), invariant=1)
    for ops in pages:
        _draw_reportlab(c, ops)
        c.showPage()
    c.save()


_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def _pil_font(name: str, px: float) -> ImageFont.FreeTypeFont:
    key = (name, round(px * 10))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(str(FONT_FILES[name]), px)
    return _font_cache[key]


def _gray(color: Color) -> int:
    r, g, b = color
    return round(255 * (0.299 * r + 0.587 * g + 0.114 * b))


def rasterize_ops(ops: list[Op], w_pt: float, h_pt: float, dpi: int) -> Image.Image:
    """Draw ops with Pillow (grayscale) onto a canvas of w_pt x h_pt points."""
    k = dpi / 72
    img = Image.new("L", (round(w_pt * k), round(h_pt * k)), 255)
    d = ImageDraw.Draw(img)
    for op in ops:
        if isinstance(op, Text):
            anchor = {"l": "ls", "r": "rs", "c": "ms"}[op.align]
            d.text((op.x * k, op.y * k), op.s, font=_pil_font(op.font, op.size * k),
                   fill=_gray(op.color), anchor=anchor)
        elif isinstance(op, Line):
            d.line((op.x1 * k, op.y1 * k, op.x2 * k, op.y2 * k),
                   fill=_gray(op.color), width=max(1, round(op.width * k)))
        else:
            d.rectangle(
                (op.x * k, op.y * k, (op.x + op.w) * k, (op.y + op.h) * k),
                fill=None if op.fill is None else _gray(op.fill),
                outline=None if op.stroke is None else _gray(op.stroke),
                width=max(1, round(op.width * k)),
            )
    return img


def rasterize_page(ops: list[Op], dpi: int) -> Image.Image:
    return rasterize_ops(ops, PAGE_W, PAGE_H, dpi)


def scan_effects(img: Image.Image, rng: random.Random) -> Image.Image:
    """Slight rotation, softness and seeded paper noise."""
    angle = rng.choice([-1, 1]) * rng.uniform(0.4, 1.4)
    img = img.rotate(angle, resample=Image.Resampling.BICUBIC, fillcolor=255)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    noise = Image.frombytes("L", img.size, rng.randbytes(img.size[0] * img.size[1]))
    return Image.blend(img, noise, 0.07)


def render_scanned_pdf(pages: Pages, dest: Path, rng: random.Random,
                       dpi: int = 150, quality: int = 75) -> None:
    """Image-only PDF (no text layer): each page a grayscale JPEG."""
    c = canvas.Canvas(str(dest), pagesize=(PAGE_W, PAGE_H), invariant=1)
    for ops in pages:
        img = scan_effects(rasterize_page(ops, dpi), rng)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=quality, optimize=True)
        buf.seek(0)
        c.drawImage(ImageReader(buf), 0, 0, PAGE_W, PAGE_H)
        c.showPage()
    c.save()


# ---------------------------------------------------------------- money, dates

def quantize(d: Decimal, ccy: str | None) -> Decimal:
    return d.quantize(Decimal(1) if ccy == "JPY" else Decimal("0.01"), rounding=ROUND_HALF_UP)


def dec_str(d: Decimal) -> str:
    return format(d, "f")


NUM_STYLE = {  # thousands sign, decimal sign
    "en": (",", "."), "de": (".", ","), "fr": (" ", ","),
    "es": (".", ","), "sv": (" ", ","), "pl": (" ", ","),
}


def fmt_number(d: Decimal, lang: str, ccy: str | None) -> str:
    thou, dec = ("'", ".") if ccy == "CHF" else NUM_STYLE[lang]
    places = 0 if ccy == "JPY" else 2
    s = f"{d:,.{places}f}"
    return s.replace(",", "\0").replace(".", dec).replace("\0", thou)


def fmt_money(d: Decimal, lang: str, ccy: str | None) -> str:
    n = fmt_number(d, lang, ccy)
    if ccy is None:
        return n
    if ccy == "CHF":
        return f"CHF {n}"
    if lang == "en":
        return {"USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥"}.get(ccy, f"{ccy} ") + n
    return {"EUR": f"{n} €", "SEK": f"{n} kr"}.get(ccy, f"{n} {ccy}")


def fmt_plain(x: Decimal | int | float, lang: str) -> str:
    """Quantity or rate with the language's decimal sign."""
    s = format(Decimal(str(x)).normalize(), "f")
    return s.replace(".", NUM_STYLE[lang][1])


MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August",
           "September", "October", "November", "December"],
    "de": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
           "September", "Oktober", "November", "Dezember"],
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
           "septembre", "octobre", "novembre", "décembre"],
    "es": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
           "septiembre", "octubre", "noviembre", "diciembre"],
    "sv": ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti",
           "september", "oktober", "november", "december"],
    "pl": ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia",
           "września", "października", "listopada", "grudnia"],
}


def fmt_date(d, style: str, lang: str) -> str:
    if style == "iso":
        return d.isoformat()
    if style == "mdy":
        return f"{d.month:02d}/{d.day:02d}/{d.year}"
    if style == "dmy":
        sep = "." if lang in ("de", "pl") else "/"
        return f"{d.day:02d}{sep}{d.month:02d}{sep}{d.year}"
    month = MONTHS[lang][d.month - 1]
    if style == "long":
        return f"{d.day} {month} {d.year}"
    # localized month name
    return {
        "de": f"{d.day}. {month} {d.year}",
        "es": f"{d.day} de {month} de {d.year}",
    }.get(lang, f"{d.day} {month} {d.year}")


def write_json(path: Path, data: Any) -> None:
    text = json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False) + "\n"
    path.write_bytes(text.encode("utf-8"))
