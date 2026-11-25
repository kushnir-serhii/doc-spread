# 025 — Golden dataset: invoices and receipts with known answers

**Status:** ready · **Depends on:** 023 · **Route(s):** —

## Goal
A folder of 40 invoice and receipt files, each paired with a JSON of the correct field values, that anyone can rebuild from a seed. It is the fixed yardstick for the extraction evals (026) and the CI gate (027): without known answers there is no way to tell whether a prompt, schema or model change made extraction better or worse.

## Scope
- In:
  - A Python project at `evals/` (outside the pnpm workspaces, so Turbo and pnpm ignore it), managed with `uv`, Python 3.12+.
  - Frozen copies of the two document types the evals use: `evals/types/invoice.json` (from `services/api/scripts/invoice-template.json`) and `evals/types/receipt.json` (from the Receipt template in `apps/web/src/lib/mock/templates.ts`), in the `fields` shape the pipeline parses (`parseFieldDefs`).
  - A truth format (`*.truth.json`) with a pydantic model and a validator that checks every truth file against its type.
  - A seeded generator that writes synthetic documents together with their truth from the same data, so the answers are correct by construction:
    - invoices as text PDFs (3 layouts), as image-only "scanned" PDFs (exercises the OCR path), and multi-page ones (line items that run onto page 2);
    - receipts as JPG/PNG "photos" (narrow till-slip layout, then rotation, blur, noise, uneven light);
    - a few distractors (a contract page, a delivery note) whose truth is "no matching type";
    - variety on purpose: several currencies, including 0-decimal JPY and amounts with no stated currency; date formats (ISO, `03/04/2026`, `4 March 2026`, `März`); some non-English documents; missing optional fields; 1–25 line items. No country defaults ([conventions](../conventions.md), memory rule): nothing assumes one country, language or currency.
  - `evals/dataset/COVERAGE.md`, generated: how many documents carry each tag and field.
  - Room for a private dataset: `evals/dataset-private/` (git-ignored, same format) for real documents that must never be committed.
- Out: the runner and scoring (026); CI (027); real customer documents in git; a third document type (the evals start with the two types the product demos).

## Data
- Layout:
  ```
  evals/
    pyproject.toml, uv.lock, README.md
    types/invoice.json, types/receipt.json
    dataset/
      invoices/inv-001.pdf + inv-001.truth.json …
      receipts/rcp-001.jpg + rcp-001.truth.json …
      distractors/dst-001.pdf + dst-001.truth.json …
      COVERAGE.md
    generator/            # the generator package
    evals/truth.py        # pydantic models + validator
  ```
- Truth file (keyed by field **key**, as the extraction schema is; comments only for this illustration):
  ```jsonc
  {
    "id": "inv-007",
    "file": "inv-007.pdf",
    "expectedType": "invoice",            // "invoice" | "receipt" | null (distractor)
    "source": "synthetic",                // "synthetic" | "real-anonymized"
    "tags": ["text-pdf", "multi-page", "eur", "date-dmy"],
    "seed": 7,
    "fields": {
      "supplier_name": "Nordlicht Werkzeuge GmbH",
      "issue_date": "2026-03-04",
      "sale_date": null,                  // null = the document does not have it
      "gross_total": { "amount": "1234.50", "currency": "EUR" },
      "net_total": { "amount": "1000.00", "currency": null },   // currency not stated on the document
      "line_items": [ { "description": "…", "quantity": 2, "unit_price": { … } } ]
    }
  }
  ```
  Money keeps the amount as a decimal string (scoring converts to minor units the way `toMinorUnits` does); `currency: null` means the document doesn't state it, so the pipeline must flag the amount (confidence ≤ 0.5), not guess.
- Python libraries (new, need approval): `pydantic`, `pillow` (already used by `apps/web/scripts/generate-mock-files.py`), `reportlab` (PDFs), `pypdf` (text check), `faker` (fictional names and addresses in several locales), `pytest`.

## Slices

### [ ] 1. Project, types and truth format
- **Build:** `evals/pyproject.toml` (uv, Python 3.12, dev group with pytest), `.gitignore` entries (`evals/.venv/`, `evals/runs/`, `evals/dataset-private/`). `types/invoice.json` and `types/receipt.json` copied from the sources above, plus a test that fails when a source template changes and the copy doesn't (the eval types are pinned on purpose; the test makes the drift visible). `evals/truth.py`: pydantic models for the truth file and `validate(dataset_dir)`, which checks that every field key exists in the type, every value fits its field type (date `YYYY-MM-DD`, money with a decimal string and a 3-letter code or null, select within its options, table rows with known columns), and that every `file` exists. `uv run python -m evals.truth dataset/` validates. The three existing mock samples copied in as `invoices/inv-mock.pdf` (from `apps/web/public/mock/sample-invoice.pdf`), `receipts/rcp-mock.jpg` (`sample-receipt.jpg`) and `distractors/dst-mock.pdf` (`sample-long.pdf`, a service agreement), each with a hand-made truth file (tag `mock-sample`), so the format is tried on real layouts first.
- **Files:** `evals/{pyproject.toml,README.md}`, `evals/types/*.json`, `evals/evals/truth.py`, `evals/tests/test_truth.py`, `.gitignore`, `evals/dataset/**` (3 files + 3 truth files)
- **Model:** sonnet
- **Accept:**
  - [ ] `uv sync` then `uv run pytest` pass from `evals/`
  - [ ] the validator accepts the three truth files and rejects a broken copy of each (unknown key, bad date, bad currency, unknown column) with a message naming the file and field
  - [ ] `pnpm build` and `pnpm lint` from the root are unaffected (evals/ isn't a workspace)

### [ ] 2. Invoice generator
- **Build:** `evals/generator/`: a seeded `random.Random` drives fictional suppliers and buyers (faker, several locales), currencies (USD, EUR, GBP, CHF, JPY, SEK and a "not stated" case), date formats, tax rates, 1–25 line items. Three invoice layouts drawn with reportlab (`invariant=1`, bundled DejaVu fonts; some layouts print the payment term and row gross, others don't); a "scanned" variant rasterizes the page (Pillow: slight rotation, noise) and wraps it in an image-only PDF; long item lists flow to a second page. The generator writes the file and its truth from the same record, then re-reads text PDFs with pypdf and asserts every truth string and amount appears in the page text (catches clipped or wrapped values). `uv run python -m generator invoices --count 24 --seed 1`.
- **Files:** `evals/generator/{__init__,__main__,common,invoice}.py`, `evals/generator/fonts/` (DejaVu Sans, DejaVu Sans Mono + licence), `evals/tests/test_generator.py`, `evals/dataset/invoices/*`
- **Model:** sonnet
- **Accept:**
  - [ ] 24 invoices: at least 4 scanned, 4 multi-page, 3 with no stated currency, 2 in JPY, 4 non-English
  - [ ] running the generator twice with the same seed produces byte-identical truth files (and identical PDFs, or the test documents why a timestamp differs)
  - [ ] the self-check passes for every text PDF; all truth files validate
  - [ ] five random invoices opened by eye look like plausible invoices (ids and findings in the Log)

### [ ] 3. Receipts, distractors and coverage
- **Build:** a receipt generator: a narrow till-slip layout drawn with Pillow (bundled DejaVu Sans Mono), merchant, tax ID, date, items, tax, total, payment method; then a "photo" pass (rotation up to ±8°, perspective, blur, noise, uneven light, JPG quality 60–90, some PNG). Four distractors (a contract page, a delivery note without prices, a bank statement extract, a blank form) with `expectedType: null`. `COVERAGE.md` generated from the truth files: counts per type, tag and field (how often each field is present or null). `evals/README.md`: what the dataset is, how to rebuild it, how to add a private document.
- **Files:** `evals/generator/{receipt,distractor,coverage}.py`, `evals/dataset/{receipts,distractors}/*`, `evals/dataset/COVERAGE.md`, `evals/README.md`
- **Model:** sonnet
- **Accept:**
  - [ ] 12 receipts (varied photo quality, 3 with no stated currency, all four payment methods) and 4 distractors; 43 documents in total with the 3 from slice 1
  - [ ] every truth file validates; `COVERAGE.md` shows each invoice and receipt field present in at least 3 documents and absent in at least 1 (where the field is optional)
  - [ ] the dataset is under 20 MB in git
  - [ ] five random receipts checked by eye; the hardest still readable by a person

## Backend needs
None. The pipeline is untouched; 026 adds the entry point the evals call.

## Open questions
- **Synthetic or real documents?** **Decided (2026-11-25):** synthetic only in git; real documents only in the git-ignored `evals/dataset-private/`. Synthetic answers are exact by construction, the dataset can be regenerated, and nothing private is ever committed.
- **How many documents?** **Decided:** 40 generated + 3 from the mock samples (24 invoices, 12 receipts, 4 distractors).
- **Python libraries?** **Decided:** approved: `uv`, `pydantic`, `pillow`, `reportlab`, `pypdf`, `faker`, `pytest`.
- **Where does the Python live?** **Decided:** `evals/` at the root, not `services/evals` (`services/*` is a pnpm workspace glob).
- **Branch?** **Decided:** `evals-dataset-025` from `main`; its first commit carries the 025–028 spec drafts and their roadmap rows.
- **Fonts?** **Decided:** bundle DejaVu Sans and DejaVu Sans Mono (free licence) in `evals/generator/fonts/` and use them for reportlab and Pillow, so the same seed gives the same bytes on Windows and Linux. Non-English documents are German, French, Spanish, Swedish and Polish; no CJK text (JPY invoices are in English).
- **Computed fields?** The pipeline runs no actions, so the model extracts `payment_term_days` and the line-item `gross` itself. **Decided:** the truth holds the correct value whenever it can be derived: `payment_term_days` = days from issue to due date when both exist (else null); row `gross` = net + vat whenever both exist. Some layouts print them, others don't (tag `computed-not-printed`).
- **Mock samples and checks by eye?** **Decided:** the three mock files are copied into `evals/dataset/` as `invoices/inv-mock.pdf`, `receipts/rcp-mock.jpg`, `distractors/dst-mock.pdf` (tag `mock-sample`). Checks by eye are done by reading the files directly; the Log lists the ids checked and what was seen. No screenshot files are committed.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
