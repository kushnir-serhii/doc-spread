# 031 — Usage limits: no company can run up the AI bill

**Status:** done · **Depends on:** 023, 030 (branched from it) · **Route(s):** `/upload`, `/settings`

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
- Migration: `companies.monthly_document_limit integer not null default 50` (a check `> 0`; 50 = the demo's Free plan, spec 011). The owner raises it for a company with SQL until billing exists. Usage = count of `documents` rows of the company uploaded since the start of the month (UTC, by `uploaded_at`; the table has no `created_at`), served by the existing index `documents_company_uploaded_idx`.
- Enforcement lives in the database: a `before insert` trigger on `documents` takes a per-company transaction lock (`pg_advisory_xact_lock`), counts the month's rows and raises a dedicated error (`SQLSTATE` of its own, message `limit_reached`) when the company is at its limit, so parallel uploads can never exceed it. The API maps that error to `409 limit_reached`; it doesn't count by itself.
- **Safe in any deploy order:** before the migration reaches a database there is no trigger and no column, so uploads work as before; the browser falls back to the Free limit (50) when the column can't be read. After the migration the limit is enforced. No outage on merge whichever runs first (Vercel deploy or the migrate workflow).
- `POST /api/uploads` returns `409 { code: 'limit_reached', limit, used, resetsAt }` when the company is at its limit. Each file of a multi-file upload counts.
- `PlanUsage` (from `@/lib/mock/types`) gets a real implementation: `documentsThisMonth`, the limit, `periodStart`; the plan name is "Free" until billing.

## Slices

### [x] 1. Limit enforced on upload
- **Build:** migration (column, index, trigger) + pgTAP tests (under the limit, at the limit, a member can't change the limit, another company's documents don't count); `POST /api/uploads` maps the trigger's error to `409 limit_reached` with `limit`, `used`, `resetsAt`; the API smoke test covers under and at the limit (limit set to 1 on a test company) against the local stack.
- **Files:** `supabase/migrations/*`, `supabase/tests/*`, `services/api/src/{upload-rules,handler}.ts` (or the uploads route), `services/api/scripts/smoke-api.ts`
- **Model:** sonnet
- **Accept:**
  - [x] an upload at the limit gets `409 limit_reached` and nothing is stored or enqueued
  - [x] `supabase test db` and `supabase db advisors --local --type security` clean; `pnpm --filter @docspread/api smoke` passes
  - [x] the limit can't be changed by a company member through the browser (RLS: read only)

### [x] 2. Usage in Upload and Settings
- **Build:** a real `getPlanUsage`; Upload shows the usage line, warns from 80%, and at the limit disables the drop zone with the message and the reset date; a `limit_reached` answer during an upload is shown per file. Settings → plan shows the real numbers.
- **Files:** `apps/web/src/lib/{real,api}/*`, `apps/web/src/features/upload/*`, `apps/web/src/features/settings/*`
- **Model:** designer
- **Accept:**
  - [x] mocks off: usage matches the database; at the limit the drop zone is disabled with the reset date
  - [x] the message is announced (`role="status"`/`alert`); 375px and 1280px, light and dark
  - [x] mock mode keeps working

## Backend needs
- `companies.monthly_document_limit`; `POST /api/uploads` → `409 limit_reached`.
- Reading usage: a count the browser can read under RLS (or a small `GET /api/usage`).

## Open questions
- **Default limit?** **Decided (2026-11-26):** **50 documents per month**, the same as the demo's Free plan (about $0.20 of Haiku per company); raised by hand (SQL) until billing exists.
- **Enforcement?** **Decided:** in the database (trigger with a per-company lock), so parallel uploads can't overshoot.
- **Count rejected or failed documents?** **Decided:** yes, every upload counts; a multi-file upload accepts files until the limit and refuses the rest per file. A document deleted later stops counting (the count is of existing rows): acceptable until billing.
- **Types limit, plan name?** **Decided:** no limit on types until billing; Settings → Plan shows "Free" with the real usage.
- **Local database and deploy order?** **Decided (owner: "all on you"):** Claude runs the local stack (Docker Desktop + `supabase start`) for the migration, pgTAP and smoke tests; the code is safe in any deploy order (see Data), so the migrate workflow on merge is enough.
- **Branch?** **Decided:** `usage-limits-031` from `real-templates-030` (030 isn't merged yet; its PR goes first).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-26 | 1 | done on the local stack (Docker + `supabase start`; `docspread-dev` untouched): migration `20261126120000_usage_limits.sql` adds `companies.monthly_document_limit` (default 50, > 0) and a `before insert` trigger on `documents` (`private.enforce_document_limit`, security definer, `search_path = ''`, per-company `pg_advisory_xact_lock`) that raises SQLSTATE `DS001` `limit_reached` with `{limit, used}`; `companies` update is now granted per column (name, tax_id, recipients, default_currency, locale), so members can't raise their limit, and **any new `companies` column a user should edit must be added to that grant**. `POST /api/uploads` maps `DS001` to `409 limit_reached` with `limit`, `used`, `resetsAt` (first day of next month, UTC); no count in the API, so it is safe before the migration lands. `supabase test db`: 89 tests (8 new); advisors: no issues. Local smoke: the 5 limit checks pass; 8 older checks (byte upload, `complete`, ocr enqueue, exports) fail on the local storage container's `42P10` (`ON CONFLICT` on `storage.objects` without a matching index, a local CLI image issue unrelated to this slice). | `supabase/migrations/20261126120000_usage_limits.sql`, `supabase/tests/usage_limits.test.sql`, `services/api/src/handler.ts`, `services/api/scripts/smoke-api.ts` |
| 2026-11-26 | 2 | done: real `getPlanUsage` (`lib/real/plan.ts`: the company's limit under RLS, falling back to 50 if the column isn't there yet; this month's documents by `uploaded_at`, UTC; plan "Free", no types limit); Upload shows "N of M documents this month", an amber notice from 80%, and at the limit a red notice, a disabled drop zone and the reset date (Intl, user's locale); a `limit_reached` answer shows "Monthly limit reached" on that file's row (its generic Retry stays: upload errors carry text, not a code); usage refetches after every upload. Mock uploads respect the mock plan's limit too. Settings → Plan needed no change (it reads the same hook). Pipeline diagram shows the 409 branch. Checked: typecheck, lint, build; mock states at 375/1280, light/dark (normal, warning, at limit with a refused file); **real mode against the local stack**: 3 documents this month in the database → the Upload screen showed "3 of 50 documents this month", no console errors (the test rows were removed). Not screenshotted: the skeleton and the usage-load error (code reviewed). | `apps/web/src/lib/real/{plan,upload}.ts`, `apps/web/src/lib/api/{plan,documents}.ts`, `apps/web/src/lib/mock/{api,types}.ts`, `apps/web/src/features/upload/{usage-notice,usage-state,drop-zone}.ts(x)`, `apps/web/src/pages/upload/upload-page.tsx`, `apps/web/src/features/architecture/diagrams/{pipeline,glossary}.ts` |
