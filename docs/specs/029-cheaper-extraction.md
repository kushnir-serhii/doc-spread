# 029 — Cheaper extraction: same accuracy for a fraction of the cost

**Status:** draft · **Depends on:** 026 · **Route(s):** — (`/documents/:documentId` only if slice 2 changes how table sources are highlighted)

## Goal
A typical document costs **under $0.01** to extract instead of $0.06–0.34 today, with no metric of the extraction evals (026) getting worse beyond their measured noise. Every change in this spec is measured against the 026 baseline before it ships, so the savings are numbers, not hopes.

Why: in the 026 test runs, Opus extraction cost $0.14 for the sample invoice, $0.06 for a receipt and **$0.34** for a scanned 2-page invoice with 24 line items. The last one is almost all output: 12,336 output tokens in the line-items call, because every one of its 192 table cells is answered as `{found, value, confidence, tokenIds}` and Opus output costs $20 per million tokens. Each extract call also re-sends the same file and OCR token list (about 10.6k input tokens) at full price. On the same documents, Haiku was as accurate in that small test, at about 1/40 of the cost.

## Scope
- In:
  - **Prompt caching** of the file and OCR token list across the extract calls of one document.
  - **A leaner table answer**: confidence and source tokens once per row instead of per cell, no `found` flag on cells (an empty value means absent).
  - **Fewer calls** where the leaner schema lets scalars and a table fit one call.
  - **The model choice**, decided from eval numbers: Haiku for extraction, or Haiku first with escalation to Opus for documents Haiku isn't sure about.
  - A new committed baseline once the changes land, and the cost per document in its report.
- Out: changing the classifier (already Haiku, about $0.0001 per document); OCR changes; batching documents (the Batch API halves the price but adds up to 24 h of delay, which breaks the upload-to-review flow); new UI beyond what slice 2's row highlight needs.

## Data
- No new tables or routes. The stored value shape (`FieldValue`, `TableValue` in `apps/web/src/lib/mock/types.ts`) stays the same: with row-level answers, every cell of a row gets the row's confidence, and its `source` is the box around the row's tokens.
- `PRICES_PER_MILLION` in `services/api/src/pipeline/claude.ts` stays the one place prices live. Cache reads and writes are already priced (`CACHE_READ_MULTIPLIER` 0.1, `CACHE_WRITE_MULTIPLIER` 1.25).
- Each slice is measured with `uv run python -m evals.run` + `evals.analyze --compare evals/baseline`.

## Slices

### [ ] 1. Prompt caching across extract calls
- **Build:** in `claude.ts`, mark the file block and the OCR token list as cacheable (`cache_control`) when a document needs more than one extract call. With a single call, caching would cost 25% extra on the write, so it's left off. The system prompt is short and not cached. Same model, same schema, so accuracy should not move.
- **Files:** `services/api/src/pipeline/{claude,extract-core}.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] the second extract call of a document shows `cacheReadTokens` > 0 in `eval-extract` output and the `claude_call` log
  - [ ] a full Haiku eval run: input cost per document down at least 25% on documents with 2+ calls; every gated metric within the 027 tolerance of the baseline
  - [ ] `SMOKE_MODE=direct smoke-pipeline` passes

### [ ] 2. Row-level table answers
- **Build:** in `extract-schema.ts`, a table row becomes `{ cells: { <column>: value }, confidence, tokenIds }`. Cells carry only the value, with an empty value (`""`, or an empty money amount) meaning absent; the `found` flag stays on scalar fields. `extract-map.ts` copies the row's confidence to each cell. The `no-guess` currency rule still applies per money cell: an assumed currency caps that cell's confidence at 0.5. Each cell's `source` is the box around the row's cited tokens on their page. The review screen highlights the row (check `use-review-highlights.ts`; no change if it already works with a shared box).
- **Files:** `services/api/src/pipeline/{extract-schema,extract-map}.ts`, possibly `apps/web/src/features/documents/review/use-review-highlights.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] output tokens of the line-items call on `inv-014` down at least 50% (Opus and Haiku)
  - [ ] full eval run on both models: table cell accuracy and every gated metric within the 027 tolerance of the baseline; any ECE change shown in the report
  - [ ] a table in Review still shows a source highlight for each cell (screenshot at 1280px, light and dark)

### [ ] 3. One call where it fits
- **Build:** with the leaner rows, measure the largest schema the API accepts (scalars + one table) and update `planExtractionCalls` so a type that fits is extracted in one call. The current limit, from 023, is about 13 scalar answers, or one 8-column table alone. Keep the split as the fallback for types that don't fit. Record the measured limit in the comment above `MAX_SCALARS_PER_CALL`.
- **Files:** `services/api/src/pipeline/extract-schema.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] the invoice and receipt types each run in one extract call, or the log says why they can't
  - [ ] full eval run: gated metrics within tolerance; mean cost and p50 latency per document lower than slice 2's run

### [ ] 4. Model choice
- **Build:** run the full dataset on Opus and Haiku (`--repeat 2`) with slices 1–3 in place and decide by these rules, written into this spec before the run:
  - **Haiku only** if Haiku's field accuracy, document exact match and verified precision are each within the 027 tolerance of Opus.
  - Otherwise **Haiku first, Opus on doubt**: re-extract with Opus only when Haiku's overall confidence is below `LOW_CONFIDENCE` (0.9) or a required field is below it. If the eval shows that rule's accuracy within tolerance of Opus, it's the choice. Implemented in `extract-core.ts` behind `ANTHROPIC_MODEL_EXTRACT_ESCALATE` (empty = off), and simulated by the eval with `--models haiku>opus`.
  - Otherwise **stay on Opus** and keep slices 1–3.

  The winning setting goes into Vercel env (an owner step, guided one step at a time) and `docs/setup.md`.
- **Files:** `evals/evals/{run,models,analyze}.py` (the escalation mode), `services/api/src/pipeline/{extract-core,pipeline-env}.ts` (only if escalation wins), `docs/setup.md`, this spec
- **Model:** sonnet
- **Accept:**
  - [ ] the report compares Opus, Haiku and Haiku→Opus side by side: accuracy, calibration, cost per document (mean, p95) and latency
  - [ ] the decision and its numbers are in the Log; the production env matches it

### [ ] 5. New baseline
- **Build:** re-run the baseline with the chosen setup and commit `evals/baseline/` (aggregates only). Log the cost per document before and after.
- **Files:** `evals/baseline/*`, this spec
- **Model:** haiku
- **Accept:**
  - [ ] the baseline is committed; the Log shows mean cost per document before and after, and the target of under $0.01 is met or explained

## Backend needs
No new routes or tables. `/api/pipeline/extract` keeps its behaviour, statuses and stored value shape. Production cost per document drops.

## Open questions
- **Row-level instead of cell-level confidence and source for tables?** A whole row shares one confidence and one highlight box in Review. Recommended: yes, since it's the biggest saving on long tables. If the eval shows calibration on cells getting clearly worse, keep per-cell confidence and move only `tokenIds` to the row.
- **Escalation threshold.** Recommended: the app's own `LOW_CONFIDENCE` (0.9), so "Haiku wasn't sure" means the same thing as "the app would flag it".
- **Eval budget.** One full run costs about $0.40 on Haiku and $5–6 per repeat on Opus (less after slices 1–3). Slices 1–3 measure on Haiku plus one Opus run each, and slice 4 runs both with `--repeat 2`. Recommended cap for the whole spec: **$25**, with `--max-usd` on every run.
- **Order against 027.** 029 depends only on 026's baseline and tools. Recommended: wave 14 next to 027. The gate makes later prompt changes safe, but this spec measures itself with the same `--compare`.
- **Branch?** `cheaper-extraction-029` from `main` after 026 is merged.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
