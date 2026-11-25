# evals

Python project (outside the pnpm workspaces) for the golden dataset and, later, the extraction evals. Spec: `docs/specs/025-golden-dataset.md`.

```sh
uv sync                                  # create .venv from uv.lock
uv run pytest                            # tests (truth validator, type drift)
uv run python -m evals.truth dataset/    # validate every *.truth.json
uv run python -m generator all --seed 1                   # rebuild everything below, then COVERAGE.md
uv run python -m generator invoices --count 24 --seed 1   # dataset/invoices/inv-001..024 (+ truth)
uv run python -m generator receipts --count 12 --seed 1   # dataset/receipts/rcp-001..012 (+ truth)
uv run python -m generator distractors --seed 1           # dataset/distractors/dst-001..004 (+ truth)
uv run python -m generator coverage                       # dataset/COVERAGE.md from the truth files
```

## What the dataset is

A fixed yardstick for the extraction evals (026) and the CI gate (027): 43 documents, each next to a `<id>.truth.json` with the correct field values.

- `invoices/`: 24 synthetic invoices (text PDFs in 3 layouts, scanned image-only PDFs, multi-page ones; several currencies including 0-decimal JPY and amounts with no stated currency; several languages and date formats; missing optional fields) plus `inv-mock`.
- `receipts/`: 12 synthetic till slips as "photos" (rotation, perspective, blur, noise, uneven light; JPG and PNG) plus `rcp-mock`.
- `distractors/`: 4 documents that match no type (an NDA, a German delivery note without prices, a bank statement image, a blank form; `expectedType: null`) plus `dst-mock`.
- `COVERAGE.md`: generated; how many documents carry each tag and field.

Everything except the three `*-mock` samples is rebuilt from a seed, so the answers are correct by construction. Rebuilding with the same seed gives byte-identical files (bundled DejaVu fonts, `invariant=1` PDFs, seeded Pillow noise). The tests regenerate seed 1 and compare it with the committed files, so after changing a generator run `uv run python -m generator all --seed 1` and commit the result. No document assumes a country, currency or language as default.

## Layout

- `types/invoice.json`, `types/receipt.json`: frozen copies of the product templates. A test fails when the source changes; update the copies deliberately.
- `dataset/`: documents (`invoices/`, `receipts/`, `distractors/`), each with a `<id>.truth.json` next to it.
- `evals/truth.py`: truth model and validator.
- `generator/`: `invoice.py`, `receipt.py`, `distractor.py`, `coverage.py`; `common.py` has fonts, the two renderers (reportlab and Pillow draw the same ops) and formatting. DejaVu fonts live in `generator/fonts/`. A document's seed is `base_seed * 10000 + index` and is stored in its truth file, so one document can be rebuilt alone (`generate_invoice(seed, dir)`, `generate_receipt(seed, dir)`). Generating runs a self-check: every truth value must appear in the PDF text (invoices) or in the drawn slip strings (receipts). Numeric `dd/mm` and `mm/dd` dates are only generated with day > 12, and `mm/dd` only for US suppliers.

## Truth format

```jsonc
{
  "id": "inv-mock",                 // must equal the file name stem
  "file": "inv-mock.pdf",           // document next to this file
  "expectedType": "invoice",        // "invoice" | "receipt" | null (distractor, fields: {})
  "source": "synthetic",            // "synthetic" | "real-anonymized"
  "tags": ["text-pdf", "usd"],
  "seed": null,
  "fields": {                       // keyed by field key of the type
    "issue_date": "2026-10-14",     // dates are YYYY-MM-DD
    "sale_date": null,              // null = the document does not have it
    "gross_total": { "amount": "3722.76", "currency": "USD" },  // decimal string; currency null = not stated
    "line_items": [ { "description": "...", "quantity": 1 } ]   // table = rows keyed by column key
  }
}
```

Computed fields hold the correct value whenever it can be derived: `payment_term_days` = days from issue to due date; row `gross` = net + vat.

## Tags

`text-pdf` | `scanned` (invoices, distractors); `multi-page`; `photo`, `photo-light|medium|hard`, `jpg|png` (receipts); currency as lowercase ISO code (`usd`, `eur`, `jpy`...) or `no-currency`; `date-iso|date-dmy|date-mdy|date-long|date-localized-month`; `lang-en|de|fr|es|sv|pl`; `layout-a|b|c`; `computed-not-printed` (the truth holds `payment_term_days` or a row `gross` the layout does not print); `missing-optional` (an optional field is null); `mock-sample`; distractor kinds (`contract`, `delivery-note`, `bank-statement`, `blank-form`).


## Adding a private document

Real documents must never be committed. Put the file and its truth file in `dataset-private/` (git-ignored), in the same layout as `dataset/` (for example `dataset-private/invoices/acme-001.pdf` and `acme-001.truth.json`, with `"source": "real-anonymized"` or `"synthetic"`). The truth `id` equals the file stem and `file` names the document next to it. Validate with `uv run python -m evals.truth dataset-private/`.
