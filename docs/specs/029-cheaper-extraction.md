# 029 — Cheaper extraction and an accuracy choice per type

**Status:** draft · **Depends on:** 026 · **Route(s):** `/types/:typeId`, `/documents/:documentId`, `/settings`

## Goal
A typical document costs **under $0.01** to extract instead of $0.06–0.34 today, with no metric of the extraction evals (026) getting worse beyond their measured noise. Every change in this spec is measured against the 026 baseline before it ships, so the savings are numbers, not hopes.

On top of that, the customer chooses how much accuracy to pay for, per document type: **Standard** (Haiku, the cheapest), **Enhanced** (Sonnet, the middle), **High accuracy** (Opus, the strongest, with a clear price warning) or **Auto** (Standard first, and a stronger tier only for documents it isn't sure about). One type can hold documents that look very different (invoices from many suppliers in one group); Auto spends the extra only on the unusual ones, and a single badly read document can be re-extracted with a stronger tier from Review.

Why: in the 026 test runs, Opus extraction cost $0.14 for the sample invoice, $0.06 for a receipt and **$0.34** for a scanned 2-page invoice with 24 line items. The last one is almost all output: 12,336 output tokens in the line-items call, because every one of its 192 table cells is answered as `{found, value, confidence, tokenIds}` and Opus output costs $20 per million tokens. Each extract call also re-sends the same file and OCR token list (about 10.6k input tokens) at full price. On the same documents, Haiku was as accurate in that small test, at about 1/40 of the cost.

## Scope
- In:
  - **Prompt caching** of the file and OCR token list across the extract calls of one document.
  - **A leaner table answer**: confidence and source tokens once per row instead of per cell, no `found` flag on cells (an empty value means absent).
  - **Fewer calls** where the leaner schema lets scalars and a table fit one call.
  - **The default and the Auto rule**, decided from eval numbers across Haiku, Sonnet and Opus, and escalation from Haiku to Sonnet or Opus for documents Haiku isn't sure about.
  - **Extraction quality per document type** (`auto` | `standard` | `enhanced` | `high`), set in the type builder with a price estimate per option and a warning before a more expensive tier is turned on. The UI never names models: they change over time and the users aren't technical.
  - **Re-extract one document with a stronger tier** (Enhanced or High accuracy) from Review, with the price shown before it runs.
  - **Which tier read a document and what it cost**, stored per document and shown in Review and Settings.
  - A new committed baseline once the changes land, and the cost per document and tier in its report.
- Out: billing for the expensive tiers (quota, credits or surcharge on the plan): a later spec, see Open questions; changing the classifier (already Haiku, about $0.0001 per document); OCR changes; batching documents (the Batch API halves the price but adds up to 24 h of delay, which breaks the upload-to-review flow); a model choice per field.

## Data
- Value shape: no change. The stored value shape (`FieldValue`, `TableValue` in `apps/web/src/lib/mock/types.ts`) stays the same: with row-level answers, every cell of a row gets the row's confidence, and its `source` is the box around the row's tokens.
- `PRICES_PER_MILLION` in `services/api/src/pipeline/claude.ts` stays the one place prices live; slice 4 adds the Sonnet price from Anthropic's pricing page. Cache reads and writes are already priced (`CACHE_READ_MULTIPLIER` 0.1, `CACHE_WRITE_MULTIPLIER` 1.25).
- Tiers and models, server side only: `standard` = `ANTHROPIC_MODEL_EXTRACT` (Haiku), `enhanced` = `ANTHROPIC_MODEL_EXTRACT_ENHANCED` (Sonnet), `high` = `ANTHROPIC_MODEL_EXTRACT_HIGH` (Opus). `auto` = `standard`, escalated to the tier slice 4 picks.
- New columns (migration, RLS unchanged: by company): `document_types.extraction_quality text not null default 'auto'` checked against the four values (a type setting like its name, not versioned); `documents.extraction_tier text null` (`standard` | `enhanced` | `high`, plus `escalated` = Auto re-read it) and `documents.extraction_cost_usd numeric null`.
- `lib/mock/types.ts`: `EXTRACTION_QUALITIES = ['auto', 'standard', 'enhanced', 'high'] as const` → `ExtractionQuality`; `DocumentType.extractionQuality`; `Document.extraction: { tier; costUsd } | null`. Mocks and `lib/real` follow; query hooks for saving the setting (part of the type save) and `useReextractDocument(id)`.
- The extract queue message gains an optional `quality` that overrides the type's setting (re-extract).
- Price estimates in the UI come from one file, `apps/web/src/lib/fields/extraction-cost.ts` (mean and p95 per tier from the latest baseline report, with its date), so warnings stay honest when prices change.
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

### [ ] 4. Default tier and the Auto rule
- **Build:** add `sonnet` to `evals/evals/models.py` and its price to `PRICES_PER_MILLION`. Run the full dataset on Haiku, Sonnet and Opus (`--repeat 2`) with slices 1–3 in place, plus the escalation modes `haiku>sonnet` and `haiku>opus`, and decide by these rules, written into this spec before the run:
  - **Default tier for new types**: `auto` if an escalation mode is within the 027 tolerance of Opus on field accuracy, document exact match and verified precision at under a third of Opus's cost; otherwise `standard`.
  - **Auto escalates to** the cheaper of Sonnet and Opus that meets that tolerance.
  - Escalation: re-extract with the stronger model only when Haiku's overall confidence is below `LOW_CONFIDENCE` (0.9) or a required field is below it. Implemented in `extract-core.ts` (a pure function of the result and the tier), simulated by the eval as `--models haiku>sonnet`.

  The models go into Vercel env (an owner step, guided one step at a time) and `docs/setup.md`.
- **Files:** `evals/evals/{run,models,analyze}.py` (the escalation mode), `services/api/src/pipeline/{extract-core,pipeline-env}.ts` (only if escalation wins), `docs/setup.md`, this spec
- **Model:** sonnet
- **Accept:**
  - [ ] the report compares Haiku, Sonnet, Opus, Haiku→Sonnet and Haiku→Opus side by side: accuracy, calibration, cost per document (mean, p95) and latency
  - [ ] the decision and its numbers are in the Log; the production env matches it

### [ ] 5. Quality setting per type
- **Build:** migration + pgTAP test for the three columns. The pipeline reads the type's `extraction_quality` and the queue message's `quality`: `standard`, `enhanced` and `high` run their model; `auto` runs the slice 4 rule. `extract-core.ts` returns the tier used and the cost; the handler stores them. `eval-extract` gets `--quality`. In the type builder, an "Extraction accuracy" section: four options, each with a one-line explanation and the estimated cost per document from `extraction-cost.ts`. Choosing Enhanced or High accuracy opens a confirmation with the estimate ("about $X per document, $Y per 100 documents, about N× Standard") before it's applied; saved with the type.
- **Files:** `supabase/migrations/*`, `supabase/tests/*`, `services/api/src/pipeline/{extract-core,extract-handler,pipeline-env,queue}.ts`, `services/api/scripts/eval-extract.ts`, `apps/web/src/lib/mock/*`, `apps/web/src/lib/real/*`, `apps/web/src/lib/api/*`, `apps/web/src/lib/fields/extraction-cost.ts`, `apps/web/src/features/document-types/*` (new `extraction-quality-section.tsx`)
- **Model:** sonnet (`designer` for the builder UI)
- **Accept:**
  - [ ] each tier extracts with its model and Auto follows the slice 4 rule (checked with `smoke-pipeline` and `eval-extract --quality`)
  - [ ] the confirmation for Enhanced and High accuracy shows the estimate and can be cancelled; nothing is saved until confirmed
  - [ ] `supabase test db` and `supabase db advisors --local --type security` clean; mock and real mode both work
  - [ ] builder states: loading, error with retry, keyboard, 375px and 1280px, light and dark

### [ ] 6. Re-extract one document with a stronger tier
- **Build:** `POST /api/documents/:id/reextract` (`{ quality: 'enhanced' | 'high' }`): only for the caller's company, only in `needs_review` or `unclassified` with a type; sets `processing` and enqueues extract with that `quality`. Values a person already edited or confirmed are kept (the new extraction fills only the rest), so no human work is lost. In Review, "Re-extract" offers Enhanced and High accuracy, each with its price estimate, in a confirmation; the document shows its processing state and comes back with the new values.
- **Files:** `services/api/src/*` (router, documents route), `services/api/src/pipeline/extract-handler.ts`, `apps/web/src/lib/{api,real,mock}/*`, `apps/web/src/features/documents/review/*`
- **Model:** sonnet (`designer` for the Review UI)
- **Accept:**
  - [ ] re-extract runs the chosen model on that document only, keeps edited and confirmed values, and is refused for other companies and other statuses (API smoke test)
  - [ ] the confirmation shows the estimate; the action is disabled while the document is processing; errors are announced with a retry
  - [ ] Review at 1280px and 375px, light and dark

### [ ] 7. Tier and cost on the document
- **Build:** Review shows how the document was read ("Standard", "Enhanced", "High accuracy", or "Auto: re-read with a stronger tier") and its extraction cost, in a quiet detail line. Settings shows the extraction cost of the last 30 days by tier (summed over the company's documents), so the owner sees what the stronger tiers cost in practice.
- **Files:** `apps/web/src/features/documents/review/*`, `apps/web/src/features/settings/*`, `apps/web/src/lib/{api,real,mock}/*`
- **Model:** designer
- **Accept:**
  - [ ] Review and Settings show tier and cost (mock and real mode); amounts go through the money formatter with USD shown
  - [ ] empty state when there are no documents yet; 375px and 1280px, light and dark

### [ ] 8. New baseline
- **Build:** re-run the baseline with the chosen setup and commit `evals/baseline/` (aggregates only). Log the cost per document before and after, per tier. Update `extraction-cost.ts` from the new report.
- **Files:** `evals/baseline/*`, `apps/web/src/lib/fields/extraction-cost.ts`, this spec
- **Model:** haiku
- **Accept:**
  - [ ] the baseline is committed; the Log shows mean cost per document before and after, and the target of under $0.01 is met or explained

## Backend needs
- Columns `document_types.extraction_quality`, `documents.extraction_tier`, `documents.extraction_cost_usd` (slice 5).
- `POST /api/documents/:id/reextract` (slice 6); the extract queue message's optional `quality`.
- Env `ANTHROPIC_MODEL_EXTRACT_ENHANCED` (Sonnet) and `ANTHROPIC_MODEL_EXTRACT_HIGH` (Opus) in Vercel and `services/api/.env.local`, an owner step guided one step at a time.
- `/api/pipeline/extract` keeps its statuses and stored value shape. Production cost per document drops.

## Open questions
- **Stronger tiers postponed.** **Decided (2026-11-26, owner):** no customer will pay what Opus costs per document today, so slices 4–7 (Enhanced, High accuracy, Auto, re-extract, cost per document) wait until billing exists. Sonnet's price is known without a test run: $2 / $10 per million tokens, half of Opus ($4 / $20) and 20× Haiku ($0.10 / $0.50); on the 026 test documents that is about $0.03 for a receipt, $0.07 for the sample invoice and $0.17 for the 24-row scanned invoice. Slices 1–3 stay useful for Haiku but save little in absolute terms (Haiku is about $0.004 per document); they are not urgent.
- **Model for now.** **Decided (2026-11-26, owner):** extraction runs on Haiku (`ANTHROPIC_MODEL_EXTRACT=claude-haiku-5-5`) from now on; the owner tests it by hand on real documents. Slice 4 confirms or reverses this with eval numbers instead of choosing from scratch.
- **Row-level instead of cell-level confidence and source for tables?** A whole row shares one confidence and one highlight box in Review. Recommended: yes, since it's the biggest saving on long tables. If the eval shows calibration on cells getting clearly worse, keep per-cell confidence and move only `tokenIds` to the row.
- **Escalation threshold.** Recommended: the app's own `LOW_CONFIDENCE` (0.9), so "Haiku wasn't sure" means the same thing as "the app would flag it".
- **Eval budget.** One full run costs about $0.40 on Haiku and $5–6 per repeat on Opus (less after slices 1–3); Sonnet sits between them (its price is added in slice 4). Slices 1–3 measure on Haiku plus one Opus run each, slice 4 runs three models and two escalation modes with `--repeat 2`. Recommended cap for the whole spec: **$35**, with `--max-usd` on every run.
- **Order against 027.** 029 depends only on 026's baseline and tools. Recommended: wave 14 next to 027. The gate makes later prompt changes safe, but this spec measures itself with the same `--compare`.
- **Tiers.** **Decided (2026-11-26, owner):** four options per type: Auto, Standard (Haiku), Enhanced (Sonnet, the middle), High accuracy (Opus).
- **Who pays for the stronger tiers?** They cost several times to 40× Standard, and today the API bill is the owner's. Options: a monthly quota per plan, credits, a surcharge, or no limit for now. Recommended: out of this spec; until billing exists, show the cost honestly (slice 7). A later spec adds the plan rules.
- **Default quality for new and existing types?** Recommended: by the slice 4 rule (`auto` if escalation is worth it, else `standard`).
- **Re-extract and human edits?** Recommended: keep every value a person edited or confirmed, replace only the rest.
- **Branch?** `cheaper-extraction-029` from `main` after 026 is merged.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
