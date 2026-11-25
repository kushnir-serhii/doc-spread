# 026 — Extraction evals: runner, scoring and analysis

**Status:** ready · **Depends on:** 025 · **Route(s):** —

## Goal
One command runs every document of the golden dataset (025) through the real OCR → classify → extract code and writes a report: accuracy per field and per document type, whether the confidence the model reports can be trusted, cost and latency per document, and Opus against Haiku side by side. After this, a change to a prompt, schema or model comes with numbers instead of a guess. The report's `metrics.json` is what the CI gate (027) compares.

## Scope
- In:
  - A TypeScript entry point `pnpm --filter @docspread/api eval-extract` that runs the pipeline's own code on one local file **in-process, with no database, Storage or queue**, and prints one JSON result. To make that possible, the classify + extract logic moves out of `extract-handler.ts` into a pure function that the handler and the eval both call, so production behaviour doesn't change.
  - Model overrides per run (`--classify-model`, `--extract-model`), so Haiku and Opus can be compared without touching env or code.
  - A Python runner that runs the dataset (or a subset) through `eval-extract` with limited concurrency, a spending cap and resume, and stores every result.
  - Scoring rules per field type, with pytest tests.
  - A pandas analysis that writes `metrics.json`, `report.md` and a few charts.
  - A first baseline for Opus and Haiku, committed, with run-to-run noise measured (027 sets its tolerance from it).
- Out: going through the deployed API and queues (smoke-pipeline already covers that path; a `--via api` mode could come later); CI (027); a dashboard (028); prompt changes made because of the findings (later specs, each measured with this tool).

## Architecture
```
uv run python -m evals.run --models opus,haiku
  └─ per document, N at a time:
       pnpm --filter @docspread/api eval-extract --file <path> --types evals/types/invoice.json,evals/types/receipt.json --extract-model <m>
         └─ readPages (OCR, as ocr-handler) → classifyAndExtract (as extract-handler) → JSON on stdout
  └─ evals/runs/<utc-time>-<label>/results.jsonl + run.json
uv run python -m evals.analyze evals/runs/<run>  → metrics.json, report.md, charts/*.png
```
- `eval-extract` reads `ANTHROPIC_API_KEY` from `services/api/.env.local` (or the environment in CI). It needs no Supabase variables.
- Both types are offered to the classifier, as a company with an Invoice and a Receipt type would. Classification is scored as well.
- The company currency the pipeline falls back to is `USD` (`FALLBACK_CURRENCY`), as for a company with no default currency.

## Data
- `eval-extract` output (one JSON object):
  ```jsonc
  {
    "file": "inv-007.pdf",
    "outcome": "needs_review",            // "needs_review" | "unclassified" | "refused" | "error"
    "error": null,
    "classification": { "typeKey": "invoice", "confidence": 0.97, "model": "claude-haiku-5-5" },
    "values": { "supplier_name": { "type": "text", "value": "…", "confidence": 0.98, "source": {…} }, … },  // keyed by field key, StoredValue shape
    "overallConfidence": 0.93,
    "calls": [ { "step": "classify", "requestedModel": "…", "model": "…", "inputTokens": 0, "outputTokens": 0,
                 "cacheWriteTokens": 0, "cacheReadTokens": 0, "costUsd": 0.0004, "ms": 820, "stopReason": "end_turn" } ],
    "ms": { "ocr": 4100, "classify": 820, "extract": 9300, "total": 14220 },
    "promptHash": "sha256 of the system prompts and the extraction schemas used"
  }
  ```
- `results.jsonl`: one line per (document, model, repeat): the output above plus `id`, `model`, `repeat`.
- `run.json`: git sha, dirty flag, label, models, dataset hash, prompt hash, start/end, total cost.
- `metrics.json` (stable keys, read by 027): per model: `fieldAccuracy` overall and by field, type and tag; `documentExactMatch`; `classificationAccuracy`; `hallucinationRate`; `missRate`; calibration (`ece`, `bins`, `verifiedPrecision`, `errorCatchRate`); `costUsd` (mean, p50, p95, total); `latencyMs` (p50, p95 per step).
- Python libraries (new, need approval): `pandas`, `matplotlib`, `rapidfuzz` (near-match on names, reported only), `jinja2` (pandas HTML tables).

## Slices

### [ ] 1. Pure pipeline core and `eval-extract`
- **Build:** move classify + extract out of `processDocument` in `extract-handler.ts` into `pipeline/extract-core.ts`: `classifyAndExtract({ pages, file, types, companyCurrency, claude, models, minConfidence })` returns the outcome, the chosen type and version, the mapped values, the overall confidence and the per-call usage. The handler keeps the database reads and writes and calls the core, and its behaviour stays the same. `ClaudeClient` results gain `usage`, `model`, `stopReason` and `ms` (`costUsd` exists); log lines don't change. `services/api/scripts/eval-extract.ts` (+ `eval-extract` script in `package.json`): reads a file and type JSONs, runs `readPages` (exported from `ocr-handler.ts`) and the core, prints the JSON above, and exits non-zero only when it can't run at all (a pipeline `error` is a result, not a crash). Values are keyed by field key in the output.
- **Files:** `services/api/src/pipeline/{extract-core,extract-handler,claude,ocr-handler}.ts`, `services/api/scripts/eval-extract.ts`, `services/api/package.json`
- **Model:** sonnet
- **Accept:**
  - [ ] `SMOKE_MODE=direct pnpm --filter @docspread/api smoke-pipeline` passes as before (production path unchanged)
  - [ ] `pnpm --filter @docspread/api eval-extract --file apps/web/public/mock/sample-invoice.pdf --types evals/types/invoice.json,evals/types/receipt.json` prints valid JSON with outcome `needs_review`, values for every invoice field, and calls with cost and ms; `--extract-model claude-haiku-5-5` runs extraction on Haiku
  - [ ] it needs only `ANTHROPIC_API_KEY` (no Supabase variables); a missing key gives one clear line naming the variable
  - [ ] the `claude_call` log lines are unchanged; `pnpm --filter @docspread/api typecheck` green

### [ ] 2. Runner
- **Build:** `evals/evals/run.py`: loads the dataset (`--dataset`, default `dataset/`; `--subset` by id glob or tag), runs `eval-extract` for each document × model (`--models opus,haiku`, aliases mapped to model ids in one place) × `--repeat k`, `--concurrency` (default 4), writes `results.jsonl` line by line and `run.json` at the end. `--resume <run>` skips finished lines. `--max-usd` (default 10) stops starting new documents once the summed cost passes it, and says so. A crashed call is retried once, then recorded as `error`. Stdout prints progress and the running cost, never document values.
- **Files:** `evals/evals/{run,models,dataset}.py`, `evals/tests/test_run.py` (uses a fake `eval-extract`)
- **Model:** sonnet
- **Accept:**
  - [ ] `uv run python -m evals.run --subset 'inv-00*' --models haiku` finishes and writes one line per document
  - [ ] killing it halfway and running `--resume` finishes without redoing finished documents
  - [ ] a cap of `--max-usd 0.01` stops early with a clear message; the tests pass without spending money

### [ ] 3. Scoring
- **Build:** `evals/evals/score.py`: compares one result with its truth and returns, per field (and per table cell), one of `correct`, `wrong`, `missed` (truth has a value, prediction null), `hallucinated` (truth null, prediction has a value), `correct_absent` (both null), plus the predicted confidence. Rules: text — NFKC, casefold, collapsed whitespace, trimmed punctuation at the ends, then exact (a `near` flag from rapidfuzz ≥ 90 is reported, never counted as correct); tax ID — letters and digits only, uppercase; date — exact ISO; number — equal within 1e-6; select and boolean — exact; money — amount in minor units equal **and** currency equal; when the truth says the currency isn't stated, the amount must match and the confidence must be ≤ 0.5 (flagged, the no-guess rule), and any currency value is accepted. Tables: predicted rows matched to truth rows greedily by description similarity and amount, then cells scored; unmatched truth rows count as missed cells, extra rows as hallucinated cells. Classification: the predicted type key against `expectedType` (`null` must give `unclassified`). Documents ending in `error` or `refused` score every field as missed.
- **Files:** `evals/evals/score.py`, `evals/tests/test_score.py`
- **Model:** sonnet
- **Accept:**
  - [ ] pytest covers each rule with a passing and a failing case, including JPY (0 decimals), the not-stated-currency rule and table row matching with reordered and extra rows
  - [ ] scoring the three mock-sample results from slice 1 gives numbers a person can check by hand (noted in the log)

### [ ] 4. Analysis and report
- **Build:** `evals/evals/analyze.py`: loads `results.jsonl` + truth into a pandas frame (one row per scored value), writes `metrics.json` (keys above), `report.md` and `charts/`. The report covers: field accuracy per model, by field, by document type and by tag (scanned, photo, multi-page, currency, language); document exact match (all required fields correct); classification accuracy and confusion; hallucination and miss rates; confidence calibration as a reliability table and diagram (bins 0–0.5, 0.5–0.7, 0.7–0.9, 0.9–0.97, 0.97–1) with ECE, plus the two numbers the product relies on: **verified precision** (of values at or above `LOW_CONFIDENCE` 0.9, which the app shows as fine, the share that is correct) and **error-catch rate** (of wrong values, the share the app flags below 0.9); cost per document (mean, p50, p95, total) and latency per step (p50, p95); Opus vs Haiku: every metric side by side with the difference, cost ratio and the fields where Haiku loses most. Charts: reliability diagram per model, accuracy by field, cost vs accuracy. Repeated runs (`--repeat`) report the spread of each metric. `uv run python -m evals.analyze <run> [--compare <other run>]`.
- **Files:** `evals/evals/{analyze,metrics,report}.py`, `evals/tests/test_analyze.py`
- **Model:** sonnet
- **Accept:**
  - [ ] on a two-model run the report shows every section above, and the numbers in `report.md` match `metrics.json`
  - [ ] `--compare` prints a diff table between two runs
  - [ ] `LOW_CONFIDENCE` is read from one Python constant whose comment points at `apps/web/src/lib/fields/confidence.ts`

### [ ] 5. Baseline, noise and docs
- **Build:** run the full dataset with `--models opus,haiku --repeat 2`. Commit `evals/baseline/metrics.json` and `evals/baseline/report.md` (no per-document values, only aggregates). Write the findings in this spec's log: accuracy, the weakest fields, calibration, cost per document, Opus vs Haiku, and the run-to-run spread of each gated metric, which becomes 027's tolerance. `evals/README.md`: how to run, read and update the baseline. `docs/setup.md`: a short "Run the extraction evals" section. Diagrams: `structure.ts` gets `evals/` and `eval-extract`; `pipeline.ts` shows the core shared by the handler and the eval ([conventions](../conventions.md) → Architecture diagrams).
- **Files:** `evals/baseline/*`, `evals/README.md`, `docs/setup.md`, `apps/web/src/features/architecture/diagrams/{structure,pipeline}.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] the baseline is committed and reproducible from the README's command
  - [ ] the log records the total cost of the baseline run and a recommended CI tolerance per gated metric
  - [ ] `/architecture` shows the eval path; typecheck, lint and build green

## Backend needs
No new routes or tables. The refactor in slice 1 must leave `/api/pipeline/extract` behaving exactly as before.

## Open questions
- **How do the evals reach the pipeline?** **Decided (2026-11-25):** (a) a local entry point running the same code in-process, no database (`eval-extract`). It's fast and cheap, CI needs only the Anthropic key, model overrides are a flag, nothing pollutes `docspread-dev`, and latency is measured per step without queue waits. What it skips (upload, queue, cron) is covered by smoke-pipeline; `--via api` can come later.
- **Refactor `extract-handler.ts`?** **Decided:** yes, a pure `classifyAndExtract` used by both the handler and the eval, checked by smoke-pipeline.
- **What does "Haiku vs Opus" compare?** **Decided:** the extraction model; classification stays on Haiku as in production. `--classify-model` exists for an extra run if Haiku's classification turns out weak.
- **Repeats?** **Decided:** `--repeat 2` for the baseline (to measure noise), 1 for normal runs.
- **Python libraries?** **Decided:** approved: `pandas`, `matplotlib`, `rapidfuzz`, `jinja2`.
- **Branch?** **Decided:** `extraction-evals-026` from `main`, only after the 025 PR (`evals-dataset-025`) is merged. 026 doesn't start before that.
- **Output keys.** **Decided:** the pipeline stores values by field **id** (table cells by column id); `eval-extract` re-keys them to field and column **keys**, so they line up with the truth files.
- **`eval-extract` defaults.** **Decided:** models and the minimum classify confidence come from the environment or `services/api/.env.local` (`ANTHROPIC_MODEL_CLASSIFY`, `ANTHROPIC_MODEL_EXTRACT`, `CLASSIFY_MIN_CONFIDENCE`), falling back to `claude-haiku-5-5`, `claude-opus-5-5` and `0.7`; only `ANTHROPIC_API_KEY` is required. Flags override.
- **UI check.** **Decided:** at the end of the spec, the Playwright UI check runs on `architecture` (slice 5 changes the diagrams).
- **Spending (open, to settle before slice 1).** A check that the tool works costs cents: a few documents on Haiku are about $0.01 in total, one document on Opus about $0.10–0.20, so a **$1 cap covers every check in slices 1–4**. Only the full baseline in slice 5 (43 documents × Opus and Haiku × 2 repeats, about 172 extractions) needs about $10–18 (up to $25 with margin), and only that baseline gives 027 its numbers and tolerance. Recommended: development checks capped at $1; the baseline run waits for a separate go-ahead, with its estimate shown first.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
