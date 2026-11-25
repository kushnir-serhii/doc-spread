# evals

Python project (outside the pnpm workspaces) for the golden dataset and, later, the extraction evals. Spec: `docs/specs/025-golden-dataset.md`.

```sh
uv sync                                  # create .venv from uv.lock
uv run pytest                            # tests (truth validator, type drift)
uv run python -m evals.truth dataset/    # validate every *.truth.json
uv run python -m generator invoices --count 24 --seed 1   # rebuild dataset/invoices/inv-001..024 (+ truth)
```

## Layout

- `types/invoice.json`, `types/receipt.json`: frozen copies of the product templates. A test fails when the source changes; update the copies deliberately.
- `dataset/`: documents (`invoices/`, `receipts/`, `distractors/`), each with a `<id>.truth.json` next to it.
- `evals/truth.py`: truth model and validator.
- `generator/`: seeded generator (`invoice.py` for invoices; `common.py` for fonts, renderers, formatting). Bundled DejaVu fonts in `generator/fonts/` keep the bytes identical across OSes. Each document's seed is `base_seed * 10000 + index` and is stored in its truth file, so one document can be rebuilt alone (`generate_invoice(seed, out_dir)`). Generating also runs a self-check: every truth value must appear in the text of the PDF.

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

## Private documents

Real documents that must never be committed go in `dataset-private/` (git-ignored), in the same format. Validate with `uv run python -m evals.truth dataset-private/`.
