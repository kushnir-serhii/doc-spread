#!/usr/bin/env python3
"""Generates the mock sample files and their OCR token JSON (spec 012 slice 2; English and USD since spec 019 slice 4).

Run from anywhere (Python 3 + Pillow, no other dependencies):

    python apps/web/scripts/generate-mock-files.py

Writes:
  apps/web/public/mock/sample-invoice.pdf          3 pages (English, USD), page 2 has /Rotate 90
  apps/web/public/mock/sample-invoice.tokens.json  DocumentPage[] (points, after rotation)
  apps/web/public/mock/sample-long.pdf            30 pages, a fictional English service agreement (spec 013)
  apps/web/public/mock/sample-long.tokens.json    DocumentPage[] (points)
  apps/web/public/mock/sample-receipt.jpg          upright "scan"
  apps/web/public/mock/sample-receipt.tokens.json  DocumentPage[] (pixels)
  apps/web/src/lib/mock/showcase-sources.ts        bboxes of the printed values

All data is fictional. Token bboxes are normalized 0..1, origin top-left,
relative to the page AFTER rotation. The PDF is written by hand (standard
Helvetica fonts, word boxes computed from the Helvetica AFM widths below).
"""

import json
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WEB = Path(__file__).resolve().parent.parent
OUT = WEB / "public" / "mock"
SOURCES_TS = WEB / "src" / "lib" / "mock" / "showcase-sources.ts"

# ---------- Helvetica AFM widths, ASCII 32..126 (1/1000 em) ----------
_REGULAR = (
    [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278]
    + [556] * 10
    + [278, 278, 584, 584, 584, 556, 1015]
    + [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833]
    + [722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]
    + [278, 278, 278, 469, 556, 333]
    + [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833]
    + [556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500]
    + [334, 260, 334, 584]
)
_BOLD = (
    [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278]
    + [556] * 10
    + [333, 333, 584, 584, 584, 611, 975]
    + [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833]
    + [722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]
    + [333, 278, 333, 584, 556, 333]
    + [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889]
    + [611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500]
    + [389, 280, 389, 584]
)
assert len(_REGULAR) == 95 and len(_BOLD) == 95


def text_width(s, size, bold=False):
    table = _BOLD if bold else _REGULAR
    return sum(table[ord(c) - 32] for c in s) * size / 1000


def r5(v):
    return round(v, 5)


class Tok:
    """A word box in the page's unrotated, top-left coordinate space."""

    def __init__(self, text, left, top, w, h):
        self.text, self.left, self.top, self.w, self.h = text, left, top, w, h


def union(boxes):
    l = min(b[0] for b in boxes)
    t = min(b[1] for b in boxes)
    r = max(b[0] + b[2] for b in boxes)
    b_ = max(b[1] + b[3] for b in boxes)
    return (l, t, r - l, b_ - t)


# ---------- PDF ----------
class PdfPage:
    def __init__(self, w=595, h=842, rotate=0):
        self.w, self.h, self.rotate = w, h, rotate
        self.ops, self.toks = [], []

    @property
    def display(self):
        return (self.h, self.w) if self.rotate == 90 else (self.w, self.h)

    def text(self, x, base, s, size=9, bold=False, align="l"):
        """base = baseline distance from the page top. Returns the word tokens."""
        total = text_width(s, size, bold)
        if align == "r":
            x -= total
        elif align == "c":
            x -= total / 2
        esc = s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        font = "F2" if bold else "F1"
        self.ops.append(f"BT /{font} {size} Tf {x:.2f} {self.h - base:.2f} Td ({esc}) Tj ET")
        out = []
        for m in re.finditer(r"\S+", s):
            l = x + text_width(s[: m.start()], size, bold)
            w = text_width(m.group(), size, bold)
            # Helvetica cap height ~0.72 em above the baseline, descender ~0.21 em below
            tok = Tok(m.group(), l, base - 0.72 * size, w, 0.93 * size)
            self.toks.append(tok)
            out.append(tok)
        return out

    def rule(self, x1, y1, x2, y2, width=0.6):
        self.ops.append(f"{width} w {x1:.2f} {self.h - y1:.2f} m {x2:.2f} {self.h - y2:.2f} l S")

    def norm(self, box):
        """(left, top, w, h) unrotated -> normalized, after rotation."""
        l, t, w, h = box
        if self.rotate == 0:
            return (l / self.w, t / self.h, w / self.w, h / self.h)
        if self.rotate == 90:
            # clockwise: the unrotated top-left corner ends up top-right
            dw, dh = self.h, self.w
            return ((self.h - (t + h)) / dw, l / dh, h / dw, w / dh)
        raise ValueError("only rotate 0 and 90")

    def tok_box(self, tok):
        return self.norm((tok.left, tok.top, tok.w, tok.h))

    def json(self, index):
        dw, dh = self.display
        return {
            "index": index,
            "width": dw,
            "height": dh,
            "tokens": [
                {
                    "id": f"p{index}-t{i}",
                    "text": t.text,
                    "bbox": dict(zip("xywh", map(r5, self.tok_box(t)))),
                }
                for i, t in enumerate(self.toks)
            ],
        }


def write_pdf(pages, path):
    n = len(pages)
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{' '.join(f'{5 + 2 * i} 0 R' for i in range(n))}] /Count {n} >>".encode(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    for i, p in enumerate(pages):
        rot = f" /Rotate {p.rotate}" if p.rotate else ""
        objs.append(
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {p.w} {p.h}]{rot} "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {6 + 2 * i} 0 R >>"
            ).encode()
        )
        body = "\n".join(p.ops).encode("latin-1")
        objs.append(b"<< /Length %d >>\nstream\n" % len(body) + body + b"\nendstream")
    buf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, o in enumerate(objs, start=1):
        offsets.append(len(buf))
        buf += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    xref = len(buf)
    buf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for off in offsets:
        buf += b"%010d 00000 n \n" % off
    buf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
    path.write_bytes(bytes(buf))


# ---------- sources registry ----------
class Sources:
    def __init__(self):
        self.data = {}

    def put(self, container, key, page_index, page, toks):
        box = union([page.tok_box(t) for t in toks])
        container[key] = {"page": page_index, "bbox": dict(zip("xywh", map(r5, box)))}


# ---------- invoice ----------
# English, USD, 8% sales tax printed per line ("Tax 8%"); the amounts are what
# showcaseInvoiceValues in src/lib/mock/documents-seed.ts stores (keep them in sync).
INV_LINES = [
    ("Implementation consulting - phase 1", "10", "hrs", "150.00", "8", "1,500.00", "120.00", "1,620.00"),
    ("Demo Suite license - 5 users", "5", "pcs", "200.00", "8", "1,000.00", "80.00", "1,080.00"),
    ("Online team training", "1", "svc", "800.00", "8", "800.00", "64.00", "864.00"),
    ("Hosting - monthly subscription", "3", "mo", "49.00", "8", "147.00", "11.76", "158.76"),
]
INV_COLS = ["description", "quantity", "unit", "unit_net", "vat_rate", "net", "vat", "gross"]


def build_invoice(sources):
    inv = {}
    p1 = PdfPage()
    M, R = 40, 555
    sup = p1.text(M, 60, "Brightline Software Inc.", 14, True)
    p1.text(M, 76, "120 Example Street, Austin, TX 78701", 9)
    ein = p1.text(M, 90, "EIN: 84-1234567", 9)
    p1.text(R, 60, "INVOICE", 18, True, "r")
    sources.put(inv, "supplier_name", 0, p1, sup)
    sources.put(inv, "supplier_tax_id", 0, p1, ein[1:])

    rows = [("Invoice number:", "INV-2026-0042", "invoice_number"),
            ("Issue date:", "2026-10-14", "issue_date"),
            ("Sale date:", "2026-10-14", "sale_date"),
            ("Due date:", "2026-10-28", "due_date")]
    for i, (label, value, key) in enumerate(rows):
        base = 112 + i * 14
        p1.text(380, base, label, 9)
        sources.put(inv, key, 0, p1, p1.text(R, base, value, 9, True, "r"))

    p1.text(M, 130, "Bill to:", 9, True)
    p1.text(M, 144, "Northwind Studio Ltd", 9)
    p1.text(M, 158, "Tax ID: TX-4821-0937", 9)

    # table
    right = {"quantity": 255, "unit_net": 345, "vat_rate": 385, "net": 435, "vat": 490, "gross": R}
    p1.rule(M, 196, R, 196, 0.8)
    p1.text(M, 208, "Item or service", 8, True)
    for key, head in [("quantity", "Qty"), ("unit_net", "Unit price"), ("vat_rate", "Tax %"),
                      ("net", "Net"), ("vat", "Tax"), ("gross", "Gross")]:
        p1.text(right[key], 208, head, 8, True, "r")
    p1.text(262, 208, "Unit", 8, True)
    p1.rule(M, 214, R, 214, 0.8)
    inv["line_items"] = []
    for i, line in enumerate(INV_LINES):
        base = 230 + i * 20
        row = {}
        for key, cell in zip(INV_COLS, line):
            if key == "description":
                toks = p1.text(M, base, cell, 8)
            elif key == "unit":
                toks = p1.text(262, base, cell, 8)
            else:
                toks = p1.text(right[key], base, cell, 8, False, "r")
            sources.put(row, key, 0, p1, toks)
        inv["line_items"].append(row)
        p1.rule(M, base + 7, R, base + 7, 0.3)
    p1.text(M, 330, "Paid by bank transfer to the account shown on page 3.", 8)
    p1.text(300, 810, "Page 1/3", 8, False, "c")

    # page 2: scanned sideways, /Rotate 90 (content is drawn upright in the MediaBox)
    p2 = PdfPage(rotate=90)
    p2.text(M, 70, "ATTACHMENT NO. 1", 16, True)
    p2.text(M, 90, "Acceptance report for services under invoice INV-2026-0042", 10)
    p2.rule(M, 100, R, 100, 0.8)
    for i, s in enumerate([
        "1. The Contractor declares that the services listed in the invoice were performed properly.",
        "2. The Client confirms receipt of the consulting and training services.",
        "3. The Demo Suite license was delivered in electronic form.",
        "4. The parties raise no objections to the quality or timeliness of delivery.",
    ]):
        p2.text(M, 130 + i * 22, s, 9)
    p2.text(M, 300, "Date of acceptance: 2026-10-14", 9)
    p2.rule(M, 420, 230, 420, 0.6)
    p2.text(M, 434, "Contractor signature", 8)
    p2.rule(330, 420, R, 420, 0.6)
    p2.text(330, 434, "Client signature", 8)
    p2.text(300, 810, "Page 2/3", 8, False, "c")

    # page 3: totals
    p3 = PdfPage()
    p3.text(M, 60, "INVOICE SUMMARY", 14, True)
    p3.text(M, 76, "INV-2026-0042", 9)
    p3.rule(M, 90, R, 90, 0.8)
    p3.text(M, 108, "Tax 8%", 9)
    totals = [("Total net:", "3,447.00", "net_total", False, 140),
              ("Total tax:", "275.76", "vat_total", False, 158),
              ("Total gross:", "3,722.76", "gross_total", True, 178)]
    for label, amount, key, bold, base in totals:
        p3.text(380, base, label, 10, bold)
        amt = p3.text(R - 30, base, amount, 10, bold, "r")
        cur = p3.text(R, base, "USD", 10, bold, "r")
        sources.put(inv, key, 2, p3, amt + cur)
    p3.rule(380, 186, R, 186, 0.6)
    p3.text(380, 204, "Amount due:", 11, True)
    p3.text(R, 204, "3,722.76 USD", 11, True, "r")
    p3.text(M, 260, "Payment details", 10, True)
    p3.text(M, 276, "Bank: Demo Bank N.A.", 9)
    p3.text(M, 290, "Routing / account no: 021000021 / 000123456789", 9)
    p3.text(M, 304, "Reference: INV-2026-0042", 9)
    p3.text(M, 380, "Issued by: Jane Sample", 8)
    p3.text(300, 810, "Page 3/3", 8, False, "c")

    pages = [p1, p2, p3]
    write_pdf(pages, OUT / "sample-invoice.pdf")
    (OUT / "sample-invoice.tokens.json").write_text(
        json.dumps([p.json(i) for i, p in enumerate(pages)], indent=1) + "\n", encoding="utf-8"
    )
    return inv, pages


# ---------- long contract (30 pages, spec 013) ----------
LONG_PAGES = 30
LONG_CLAUSES = [
    "The Contractor agrees to provide the services described in Attachment No. 1.",
    "The Client agrees to pay the fee set out in this agreement on time.",
    "The parties shall keep confidential any information obtained in connection with this agreement.",
    "Either party may terminate this agreement with one month of written notice.",
    "Any amendment to this agreement must be made in writing to be valid.",
    "Matters not covered by this agreement are governed by the applicable law.",
]


def build_long():
    pages = []
    for n in range(LONG_PAGES):
        p = PdfPage()
        M, R = 50, 545
        p.text(M, 50, "SERVICE AGREEMENT - SAMPLE", 9, True)
        p.text(R, 50, f"AGR/2026/{n + 1:03d}", 9, False, "r")
        p.rule(M, 58, R, 58, 0.5)
        p.text(M, 100, f"Chapter {n // 3 + 1}. Provisions part {n % 3 + 1}", 14, True)
        base = 130
        for k in range(14):
            num = n * 14 + k + 1
            clause = LONG_CLAUSES[(n + k) % len(LONG_CLAUSES)]
            p.text(M, base, f"{num}. {clause}", 9)
            base += 22 if k % 4 == 3 else 16
        p.text(300, 810, f"Page {n + 1}/{LONG_PAGES}", 8, False, "c")
        pages.append(p)
    write_pdf(pages, OUT / "sample-long.pdf")
    (OUT / "sample-long.tokens.json").write_text(
        json.dumps([p.json(i) for i, p in enumerate(pages)], indent=1) + "\n", encoding="utf-8"
    )


# ---------- receipt ----------
# Line prices include 8% tax (tax-inclusive): 42.74 total, tax 42.74 * 8 / 108 = 3.17.
RCP_ITEMS = [
    ("Latte", "2", "9.00"),
    ("Blueberry muffin", "1", "3.25"),
    ("Turkey sandwich", "1", "9.50"),
    ("Iced tea", "2", "6.00"),
    ("Coffee beans 12oz", "1", "14.99"),
]


class ImgDoc:
    def __init__(self, w, h, font):
        self.w, self.h, self.font = w, h, font
        self.img = Image.new("RGB", (w, h), (246, 243, 233))
        self.d = ImageDraw.Draw(self.img)
        self.toks = []

    def text(self, x, base, s, align="l", font=None):
        font = font or self.font
        top_off = font.getbbox("H", anchor="ls")[1]
        bot_off = font.getbbox("g", anchor="ls")[3]
        total = font.getlength(s)
        if align == "r":
            x -= total
        elif align == "c":
            x -= total / 2
        self.d.text((x, base), s, font=font, fill=(28, 28, 30), anchor="ls")
        out = []
        for m in re.finditer(r"\S+", s):
            l = x + font.getlength(s[: m.start()])
            w = font.getlength(m.group())
            tok = Tok(m.group(), l, base + top_off, w, bot_off - top_off)
            self.toks.append(tok)
            out.append(tok)
        return out

    def box(self, tok):
        return (tok.left / self.w, tok.top / self.h, tok.w / self.w, tok.h / self.h)

    # same interface as PdfPage for Sources.put
    tok_box = box


def build_receipt(sources):
    rc = {}
    W, H = 640, 1040
    font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 24)
    doc = ImgDoc(W, H, font)
    L, R = 40, 600
    sources.put(rc, "merchant", 0, doc, doc.text(W / 2, 80, "MAPLE CORNER CAFE LLC", "c"))
    doc.text(W / 2, 112, "45 Sample Ave, Portland, OR 97201", "c")
    nip = doc.text(W / 2, 144, "Tax ID: 47-1234567", "c")
    sources.put(rc, "merchant_tax_id", 0, doc, nip[2:])
    doc.text(L, 190, "-" * 40)
    doc.text(L, 226, "SALES RECEIPT")
    date = doc.text(L, 262, "Date: 2026-10-14")
    sources.put(rc, "receipt_date", 0, doc, date[1:])
    doc.text(R, 262, "Time: 17:42", "r")
    doc.text(L, 298, "-" * 40)
    doc.text(L, 334, "Item")
    doc.text(420, 334, "Qty", "r")
    doc.text(R, 334, "Price", "r")
    rc["items"] = []
    for i, (name, qty, price) in enumerate(RCP_ITEMS):
        base = 374 + i * 36
        row = {}
        sources.put(row, "description", 0, doc, doc.text(L, base, name))
        sources.put(row, "quantity", 0, doc, doc.text(420, base, qty, "r"))
        sources.put(row, "price", 0, doc, doc.text(R, base, price, "r"))
        rc["items"].append(row)
    doc.text(L, 574, "-" * 40)
    doc.text(L, 618, "Tax 8%")
    sources.put(rc, "tax_total", 0, doc, doc.text(R - 90, 618, "3.17", "r") + doc.text(R, 618, "USD", "r"))
    big = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 30)
    doc.text(L, 676, "TOTAL", font=big)
    total = doc.text(R - 90, 676, "42.74", "r", big) + doc.text(R, 676, "USD", "r", big)
    sources.put(rc, "total", 0, doc, total)
    doc.text(L, 730, "-" * 40)
    pay = doc.text(L, 774, "CARD PAYMENT")
    sources.put(rc, "payment_method", 0, doc, pay[:1])
    doc.text(R, 774, "42.74", "r")
    doc.text(L, 838, "Transaction no: 004271", )
    doc.text(W / 2, 920, "THANK YOU FOR YOUR VISIT", "c")
    doc.text(W / 2, 954, "See you again!", "c")

    # scan look: faint noise + very slight blur (geometry untouched)
    rng = random.Random(42)
    noise = Image.effect_noise((W, H), 14).convert("RGB")
    img = Image.blend(doc.img, noise, 0.06).filter(ImageFilter.GaussianBlur(0.5))
    px = img.load()
    for _ in range(900):  # a few specks
        x, y = rng.randrange(W), rng.randrange(H)
        px[x, y] = tuple(max(0, c - rng.randrange(40, 90)) for c in px[x, y])
    img.save(OUT / "sample-receipt.jpg", quality=82)

    page = {
        "index": 0,
        "width": W,
        "height": H,
        "imageUrl": "/mock/sample-receipt.jpg",
        "tokens": [
            {
                "id": f"p0-t{i}",
                "text": t.text,
                "bbox": dict(zip("xywh", map(r5, doc.box(t)))),
            }
            for i, t in enumerate(doc.toks)
        ],
    }
    (OUT / "sample-receipt.tokens.json").write_text(json.dumps([page], indent=1) + "\n", encoding="utf-8")
    return rc, img, doc


def emit_sources(inv, rc):
    body = (
        "// Generated by scripts/generate-mock-files.py - do not edit by hand.\n"
        "// Bounding boxes (normalized, after rotation) of the values printed on the sample files.\n\n"
        f"export const INVOICE_SOURCES = {json.dumps(inv, indent=2)}\n\n"
        f"export const RECEIPT_SOURCES = {json.dumps(rc, indent=2)}\n"
    )
    SOURCES_TS.write_text(body, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    s = Sources()
    inv, _ = build_invoice(s)
    rc, _, _ = build_receipt(s)
    build_long()
    emit_sources(inv, rc)
    print("wrote", OUT, "and", SOURCES_TS)


if __name__ == "__main__":
    main()
