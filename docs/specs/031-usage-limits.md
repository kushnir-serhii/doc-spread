# 031 — Usage limits: no company can run up the AI bill

**Status:** draft · **Depends on:** 023 · **Route(s):** `/upload`, `/settings`

## Goal
Every company has a monthly document allowance that the server enforces, so real customers can use the app without any one of them (or a bot that signs up) spending the owner's Anthropic budget. Users see how much they have used before they hit the limit, and an upload over the limit is refused with a clear message instead of failing later in the pipeline.

Why now: extraction costs about $0.004 per document on Haiku, but nothing stops 10,000 uploads, and the only backstop today is the account-wide Anthropic limit, which, when reached, stops the pipeline for **every** company at once (as it did on 2026-11-25).

## Scope
- In:
  - A monthly document limit per company (calendar month, UTC), stored on the company, enforced in `POST /api/uploads` before a signed upload URL is issued.
  - The existing hard limits stay and are shown to the user: file size (`UPLOAD_MAX_BYTES`) and pages (`MAX_PAGES` 50, `ocr-pdf.ts`).
  - Usage in the app: Upload shows "N of M documents this month" and a clear message at the limit; Settings → plan shows the real usage (today the plan screen is mock-only).
  - A short "Operations" note in `docs/setup.md`: the Anthropic Console spend limit stays as the account-wide backstop, set above the sum of the company limits.
- Out: paid plans, Stripe, raising a limit by paying (billing spec, later); limits on users or types; per-minute rate limiting (the monthly cap and the file limits are enough for launch).

## Data
- Migration: `companies.monthly_document_limit integer not null default 100` (a check `> 0`). The owner raises it for a company with SQL until billing exists. Usage = count of `documents` rows of the company created since the start of the month (an index on `(company_id, created_at)` if one doesn't exist).
- `POST /api/uploads` returns `409 { code: 'limit_reached', limit, used, resetsAt }` when the company is at its limit. Each file of a multi-file upload counts.
- `PlanUsage` (from `@/lib/mock/types`) gets a real implementation: `documentsThisMonth`, the limit, `periodStart`; the plan name is "Free" until billing.

## Slices

### [ ] 1. Limit enforced on upload
- **Build:** migration + pgTAP test; `uploads` route counts the month's documents and refuses with `limit_reached`; the API smoke test covers under and at the limit (set the limit to 1 on a test company).
- **Files:** `supabase/migrations/*`, `supabase/tests/*`, `services/api/src/{upload-rules,handler}.ts` (or the uploads route), `services/api/scripts/smoke-api.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] an upload at the limit gets `409 limit_reached` and nothing is stored or enqueued
  - [ ] `supabase test db` and `supabase db advisors --local --type security` clean; `pnpm --filter @docspread/api smoke` passes
  - [ ] the limit can't be changed by a company member through the browser (RLS: read only)

### [ ] 2. Usage in Upload and Settings
- **Build:** a real `getPlanUsage`; Upload shows the usage line, warns from 80%, and at the limit disables the drop zone with the message and the reset date; a `limit_reached` answer during an upload is shown per file. Settings → plan shows the real numbers.
- **Files:** `apps/web/src/lib/{real,api}/*`, `apps/web/src/features/upload/*`, `apps/web/src/features/settings/*`
- **Model:** designer
- **Accept:**
  - [ ] mocks off: usage matches the database; at the limit the drop zone is disabled with the reset date
  - [ ] the message is announced (`role="status"`/`alert`); 375px and 1280px, light and dark
  - [ ] mock mode keeps working

## Backend needs
- `companies.monthly_document_limit`; `POST /api/uploads` → `409 limit_reached`.
- Reading usage: a count the browser can read under RLS (or a small `GET /api/usage`).

## Open questions
- **Default limit?** Recommended: **100 documents per month** per company (about $0.40 of Haiku), raised by hand for real customers until billing exists.
- **Count rejected or failed documents?** Recommended: yes, every upload counts (the AI cost was spent); a document deleted later still counts for that month.
- **Branch?** `usage-limits-031` from `main`.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
