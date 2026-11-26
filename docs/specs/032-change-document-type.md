# 032 — Change a document's type, and work the Unclassified bucket

**Status:** done · **Depends on:** 023, 031 (branched from it) · **Route(s):** `/documents/:documentId`, `/inbox?type=unclassified`

## Goal
With mocks off, a user can fix a document the classifier got wrong (Review → **Change type**) and give a type to a document that landed in **Unclassified** (Inbox bucket and Review → **Choose a type**). The document is then extracted again with the chosen type. Today both controls exist and work on mocks, but with real data they fail with "not available yet", so a wrongly typed document is stuck for real customers.

## Scope
- In:
  - `POST /api/documents/:id/type { typeId }`: checks the caller's company, the document's status and that the type belongs to the company; sets `type_id` and the type's latest `type_version`, clears the values, sets `processing` and enqueues `extract` (OCR pages are already stored, so OCR is not run again).
  - The extract step skips classification when the document already has a `type_id` (the user chose it) and extracts with that type's latest version; classification confidence is left empty.
  - The web app's real `reassignDocumentType` calls that endpoint; Review's Change type and Choose a type, and the Inbox's Unclassified bucket, work with mocks off. API errors get clear messages.
  - At most 3 type changes per document, so re-extraction can't be used to run up the AI bill (031 counts uploads, not extractions).
  - The Unclassified bucket can assign one type to several documents at once.
- Out: picking a type at upload ("Process as"); retrying an `error` document; changing the type of an `exported` document; merging or deleting types.

## Data
- `useReassignDocumentType` (exists, `lib/api/documents.ts`) gets a real implementation in `lib/real/documents.ts` via `apiFetch`.
- Migration: `documents.type_changes smallint not null default 0`, raised by the endpoint; members can't change it from the browser.
- Allowed statuses: `needs_review`, `unclassified`, `approved`, `rejected` (same as the mock). `uploaded`, `processing`, `exported` → `409 wrong_status`.

## Slices

### [x] 1. Change the type through the API
- **Build:** migration (`type_changes`, column kept out of the members' update grant); the endpoint (`404` for another company's document or type, `409 wrong_status`, `409 too_many_changes`); the extract step honors a chosen type; the API smoke test covers a change (the extract call is stubbed or skipped without `ANTHROPIC_API_KEY`), the wrong status and another company's type; the Pipeline and Document lifecycle diagrams show the branch.
- **Files:** `supabase/migrations/*`, `supabase/tests/*`, `services/api/src/handler.ts` (or `services/api/src/documents/change-type.ts`), `services/api/src/pipeline/{extract-handler,extract-core}.ts`, `services/api/scripts/smoke-api.ts`, `apps/web/src/features/architecture/diagrams/{pipeline,lifecycle,document-flow,glossary}.ts`
- **Model:** sonnet
- **Accept:**
  - [x] a change sets `processing`, the new type and version, clears the values and enqueues `extract`; the extract step doesn't call the classifier for it
  - [x] wrong status, foreign document or type, and the change limit are refused with the codes above and change nothing
  - [x] `supabase test db`, advisors and `pnpm --filter @docspread/api smoke` clean on the local stack

### [x] 2. Change type and Choose a type with mocks off
- **Build:** real `reassignDocumentType`; error codes mapped to messages; the document polls while `processing` and comes back as `needs_review` with the new type.
- **Files:** `apps/web/src/lib/real/documents.ts`, `apps/web/src/lib/api/documents.ts`
- **Model:** sonnet
- **Accept:**
  - [x] mocks off against the local stack: Review → Change type and Unclassified → Assign type move the document to `processing` with the new type; errors are shown with `role="alert"`
  - [x] mock mode keeps working

### [x] 3. Assign one type to several unclassified documents
- **Build:** checkboxes in the Unclassified bucket, a bar "Assign N to [type]" (one request per document; per-row result; failures stay selected with the reason).
- **Files:** `apps/web/src/features/documents/{unclassified-view,…}.tsx`
- **Model:** designer
- **Accept:**
  - [x] select several, assign, each leaves the bucket or shows its error; announced in `role="status"`
  - [x] keyboard only, 375px and 1280px, light and dark; 50+ rows

## Backend needs
- `POST /api/documents/:id/type`; `documents.type_changes`.

## Open questions
- **Cost guard for re-extraction?** **Decided (2026-11-26):** at most **3 type changes per document** (`documents.type_changes`); the 4th gets `409 too_many_changes`. Changes don't count against the monthly limit.
- **Bulk assign in Unclassified?** **Decided:** yes, slice 3.
- **`error` documents?** **Decided:** out of scope (a retry spec later).
- **Branch?** **Decided:** `change-type-032` from `usage-limits-031` (031 isn't merged yet; its PR goes first).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-26 | 1 | done on the local stack: migration `20261126130000_type_changes.sql` (`documents.type_changes`, default 0, >= 0; trigger `private.forbid_type_changes_update` refuses changes from `authenticated`/`anon` with `42501`); `POST /api/documents/:id/type` (`documents/change-type.ts`): `400 invalid_body`, `404 not_found` / `type_not_found`, `409 wrong_status` / `too_many_changes` / `same_type` (doesn't use a change) / `conflict`; a conditional claim sets the type and latest version, empty values, `overall_confidence` 0 (the column is not null), `processing`, counter + 1, then enqueues `extract` (rolled back if the enqueue fails); the extract step skips the classifier when a `processing` document has a `type_id`, and a type deleted in the meantime ends `unclassified`. `supabase test db` 95 tests (6 new), advisors clean, the new smoke checks pass (the 8 older local `42P10` storage failures are unchanged). Diagrams: pipeline, lifecycle, document flow, glossary. Note: the first two smoke runs went to `docspread-dev` because `services/api/.env.local` points there (only the older self-cleaning checks ran; the new ones skipped without the migration). | `supabase/migrations/20261126130000_type_changes.sql`, `supabase/tests/change_type.test.sql`, `services/api/src/{handler,documents/change-type}.ts`, `services/api/src/pipeline/{extract-core,extract-handler}.ts`, `services/api/scripts/smoke-api.ts`, `apps/web/src/features/architecture/diagrams/{pipeline,lifecycle,document-flow,glossary}.ts` |
| 2026-11-26 | 2 | done: real `reassignDocumentType` (`apiFetch` to `POST /api/documents/:id/type`, then the fresh document; API codes mapped to messages: too many changes, wrong status, type gone, same type, conflict, not found); the mock follows the same rules (allowed statuses, same type refused, 3 changes per document). Lifecycle diagram: `error --> processing` removed (error documents can't be retyped). No UI changes needed. Checked: typecheck, lint, build; **real mode against the local stack** (Playwright, throwaway company, process env only): Review → Change type and Unclassified → Assign type set `processing`, the new type and `type_changes = 1`; at 3 changes the dialog shows the message in `role="alert"`. Not seen locally: the document coming back as `needs_review` (no cron or Anthropic call locally). | `apps/web/src/lib/real/documents.ts`, `apps/web/src/lib/api/documents.ts`, `apps/web/src/lib/mock/api.ts`, `apps/web/src/features/architecture/diagrams/{lifecycle,glossary}.ts` |
| 2026-11-26 | 3 | done: checkboxes and select-all in the Unclassified bucket (the existing `DocumentList` selection), `UnclassifiedBulkBar` ("N selected", Type, "Assign N", Clear; sticky at 375px), `useBulkAssign` (one request after another, a failure doesn't stop the rest); successes leave the bucket and are deselected, failures stay selected with the reason on the row and in a `role="alert"` list; summary in the page's `role="status"`. Rows' single assign is disabled while a bulk run is in progress (no double assign). Checked in mock mode with Playwright: 3 assigned; a forced failure (temporary mock change, reverted); keyboard only; 54 rows (temporary seed, reverted) without horizontal scroll; 375/1280, light/dark. | `apps/web/src/features/documents/{unclassified-view,unclassified-bulk-bar,assign-type-cell}.tsx`, `apps/web/src/features/documents/{use-bulk-assign,use-selection}.ts` |
