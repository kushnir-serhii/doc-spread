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

## Run the evals

Spec: `docs/specs/026-extraction-evals.md`. Needs `ANTHROPIC_API_KEY` in `services/api/.env.local`; real runs cost money.

```sh
uv run python -m evals.run --subset 'inv-00*' --models haiku        # 9 invoices on Haiku, about $0.04
uv run python -m evals.run --models opus,haiku --repeat 2 --max-usd 20
uv run python -m evals.run --resume runs/<run> --max-usd 20         # continue a killed or capped run
```

`--subset` takes comma-separated id globs or tags; `--concurrency` defaults to 4, `--max-usd` to 10 (the run stops starting documents past the cap and exits with code 2). Each run writes `runs/<utc>-<label>/results.jsonl` (one line per document, model and repeat) and `run.json`; `runs/` is git-ignored. Model aliases live in `evals/models.py`. Tests use a fake `eval-extract` (`EVAL_EXTRACT_CMD`), so `uv run pytest` costs nothing.

## Analyze a run

```sh
uv run python -m evals.analyze runs/<run>                       # metrics.json, report.md, charts/ in the run dir
uv run python -m evals.analyze runs/<run> --compare runs/<other> # also prints a diff table against another run
uv run python -m evals.analyze runs/<run> --out <dir>           # write the outputs elsewhere
```

Scores every result against its truth file (no API calls). `metrics.json` and `report.md` hold aggregates only, and the report is rendered from `metrics.json`. Metric definitions are in the report's "How to read" section and in `evals/metrics.py`; `LOW_CONFIDENCE` is the constant there, mirroring `apps/web/src/lib/fields/confidence.ts`.

## Extraction evals

What they measure: how well the real OCR, classify and extract code reads the golden dataset. Per field and document type (accuracy, hallucinated and missed values), whether the confidence the model reports can be trusted, cost and latency per document, and Opus against Haiku. A change to a prompt, schema or model comes with these numbers. Spec: `docs/specs/026-extraction-evals.md`.

Run (needs `ANTHROPIC_API_KEY` in `services/api/.env.local`; real runs cost money):

```sh
uv run python -m evals.run --models opus,haiku [--subset 'inv-00*,scanned'] [--repeat k] [--max-usd 10]
uv run python -m evals.run --resume runs/<run> [--max-usd 20]   # continue a killed, capped or stopped run
```

- `--subset` takes comma-separated id globs or tags. `--repeat k` runs each document k times per model, which measures run-to-run noise. `--max-usd` (default 10) stops starting documents past the cap (exit 2).
- If 3 documents in a row fail with the same error and no model call (a rejected key or an exhausted usage limit), the run stops with a one-line message and exit 2. `--resume` runs those documents again.
- A run dir `runs/<utc>-<label>/` (git-ignored) holds `results.jsonl` (one line per document, model and repeat, with the extracted values; never commit it) and `run.json` (git sha, dirty flag, models, dataset and prompt hash, cost, outcomes).

Analyze and compare (no API calls):

```sh
uv run python -m evals.analyze runs/<run>                          # metrics.json, report.md, charts/ in the run dir
uv run python -m evals.analyze runs/<run> --compare runs/<other>   # also prints a diff table
```

Reading the report: start with its "How to read" section, which defines every metric. The two numbers the product relies on: **verified precision** is the share of values at or above `LOW_CONFIDENCE` (0.9, shown as fine in the app) that are correct; **error-catch rate** is the share of wrong values that the app flags below 0.9.

Cost: Opus about $0.12 per document on average (up to $0.34 for a scanned 2-page invoice), Haiku about $0.004; the full baseline (`--models opus,haiku --repeat 2`, 43 documents) about $11 to $13.

### Update the baseline

The first baseline is pending. To make or refresh it:

```sh
uv run python -m evals.run --models opus,haiku --repeat 2 --label baseline --max-usd 20
uv run python -m evals.analyze runs/<run> --out baseline
```

Commit `evals/baseline/metrics.json` and `evals/baseline/report.md`, and `evals/baseline/charts/` too when the PNGs are small (a few hundred KB in all); otherwise leave the charts out and keep `metrics.json` and `report.md`. Aggregates only: never commit `results.jsonl` or anything else from `runs/`. The CI gate (027) compares a new run's `metrics.json` with the committed one.

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
