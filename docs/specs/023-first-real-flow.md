# 023 — First real flow: sign in → type → upload → AI → review → spreadsheet

**Status:** in-progress · **Depends on:** 022 · **Route(s):** `/sign-up`, `/sign-in`, `/types`, `/types/new`, `/types/:typeId`, `/upload`, `/inbox`, `/documents/:documentId`, `/export`

## Goal
With `VITE_USE_MOCKS=false` a user signs up with a new company (or signs in), creates a document type with the fields they need, uploads a real file, watches OCR and Claude fill the fields, reviews and approves the values, and downloads a spreadsheet of the approved documents — all against `docspread-dev`. With mocks on (the public demo) nothing changes. This is one thin path through the real backend; the other screens follow in later specs.

## Scope
- In:
  - A real data layer next to the mock one: `src/lib/real/*` with the same function signatures as the `@/lib/mock` functions the path needs; every hook in `src/lib/api/*` on the path picks mock or real by `USE_MOCKS`. Components don't change.
  - Simple sign-up: company name + email + password. A new API route refuses a company name that already exists (case and spaces ignored) and creates nothing; otherwise it creates the user with the email already confirmed (no email service), the company (currency USD) and the owner membership. The browser then signs in.
  - Supabase Auth in the browser: sign in, sign out, session restore, guarded app routes, the caller's company (first active membership, as the API does).
  - Document types: list, read, create, save a new version from the builder (manual fields; versions stay locked, 020).
  - Upload through `/api/uploads` → Storage → `complete`; Inbox and the document page read real rows and poll while anything is `uploaded` or `processing`.
  - Review: the file (signed Storage URL) and OCR pages in the viewer, real values with confidence, edit values, approve, reject.
  - Export: a new API route that builds a spreadsheet of approved documents of one type from the type's export mapping, stores it in the `exports` bucket, marks the documents `exported`, records an `export_jobs` row and returns a signed download URL.
  - With mocks off, screens and actions that have no backend yet show a clear "not available yet" state instead of mock data.
  - Local run: `apps/web/.env.local` with `VITE_USE_MOCKS=false` + `vercel dev` (022).
- Out (later specs): password reset, invites and any email (no email service yet); full name and onboarding steps beyond the company name; AI features of the type builder (propose fields, suggest table, test extract, type from a sample, field examples); groups; team, plan, settings, templates; reassign type; realtime (polling is enough); email delivery and PDF bundles; production with mocks off (the public demo stays on mocks).

## Architecture
- Browser → Supabase directly (supabase-js with the publishable key and the user's session) for everything RLS already protects: types, versions, documents, values, pages, export jobs, signed read URLs of the company's files.
- Browser → `/api/*` (Vercel Functions) for what needs the secret key or server logic: sign-up (new `POST /api/signup`), upload (`/api/uploads`, `complete`, 022) and export (new `POST /api/exports`).
- ids are uuid strings in the database and plain strings in the app; `src/lib/real/map-*.ts` converts rows to the types in `@/lib/mock/types` (snake_case → camelCase, jsonb as is).

## Data
- Tables (020): `companies`, `team_members`, `document_types` (+ `export_mapping`), `document_type_versions` (`fields`, `actions`, `title_field_id`, `list_column_ids`), `documents` (`values` jsonb in `FieldValueMap` shape, `version` for optimistic locking), `document_pages` (`tokens`), `export_jobs`. Storage buckets `documents`, `exports` (022).
- Hooks switched to mock-or-real: `useSignIn`, (new) `useSignOut`, (new) `useSession`, `useCompany`, `useDocumentTypes`, `useDocumentType`, `useCreateDocumentType`, `useUpdateDocumentType`, `useUploadDocument`, `useDocuments`, `useDocument`, `useDocumentsByIds`, `useDocumentPages`, `useUpdateDocumentValues`, `useApproveDocuments`, `useRejectDocument`, `useExportMapping`, `useExportJobs`, `useCreateExportJob`.
- New env: none for the web (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` exist).

## Slices

### [x] 1. Real client, sign-up and sign-in
- **Build:** `POST /api/signup` in `services/api` (`{ companyName, email, password }`, no token): validates (company name 2–100 chars after trim, email, password ≥ 8), refuses `company_taken` (409) when a company with the same normalized name (trim, collapse spaces, lowercase) exists, `email_taken` (409) when the email is registered; otherwise creates the user through the Auth admin API with `email_confirm: true`, the company (default currency USD, no locale) and an active owner membership, rolling back what it created if a later step fails. A migration adds a unique index on the normalized company name so two parallel sign-ups can't both win. The sign-up form gets a Company name field (mocks off) and drops Full name; after success the browser signs in and goes to `/types` (onboarding is skipped with mocks off). Then add `@supabase/supabase-js` to `apps/web`; `src/lib/real/client.ts` (one client from `readBackendEnv()`, session persisted by supabase-js); `src/lib/real/auth.ts` (sign in → `invalid_credentials` / `rate_limited` codes like the mock, sign out, session, company of the user); `useSignIn`, `useSignOut`, `useSession`, `useCompany` switch on `USE_MOCKS`; app routes redirect to `/sign-in` without a session when mocks are off; a sign-out action in the user menu. A small `src/lib/real/api-fetch.ts` that calls `VITE_API_BASE_URL` with the session's access token. `conventions.md`: `src/lib/real/` is, like `@/lib/mock`, imported only by `src/lib/api/`.
- **Files:** `services/api/src/{handler,signup}.ts`, `services/api/scripts/smoke-api.ts`, `supabase/migrations/*`, `supabase/tests/*`, `apps/web/package.json`, `src/lib/real/{client,auth,api-fetch}.ts`, `src/lib/api/{auth,company}.ts`, `src/features/auth/sign-up-form.tsx`, `src/app/router.tsx` (guard), user menu component, `docs/conventions.md`
- **Model:** sonnet
- **Accept:**
  - [x] with mocks on, the app behaves exactly as before (UI check of `/sign-in` and `/inbox` unchanged)
  - [x] with mocks off, signing up with a new company name creates the user, the company and the owner and lands signed in; the same company name again (any case or spacing) is refused with "Company already exists" and nothing is created; a used email is refused
  - [x] with mocks off, the demo login signs in, a reload keeps the session, sign-out returns to `/sign-in`, a wrong password shows the existing error
  - [x] without a session, `/inbox` redirects to `/sign-in`
  - [x] typecheck, lint, build green

### [x] 2. Document types from the database
- **Build:** `src/lib/real/document-types.ts` + `map-document-type.ts`: list (current version of each type), read one (any version), create (type row + version 1), save (new version = `current_version + 1`, insert into `document_type_versions`, bump `current_version`), export mapping read/write on `document_types`. Hooks in `lib/api/document-types.ts` switch. Builder AI buttons (propose, suggest, test extract, examples) are disabled with "not available yet" when mocks are off.
- **Files:** `src/lib/real/{document-types,map-document-type}.ts`, `src/lib/api/{document-types,builder}.ts`, builder components that render the AI actions
- **Model:** sonnet
- **Accept:**
  - [x] with mocks off, `/types` lists the Demo Company's Invoice type; a new type with a few fields saves and appears; editing it saves version 2 and version 1 stays readable
  - [x] a member of another company can't see the type (RLS; checked with a second test user or the pgTAP tests from 020)
  - [x] the pipeline classifies a new upload against the new type (its name and description reach classification)

### [x] 3. Upload and Inbox
- **Build:** `src/lib/real/upload.ts`: `POST /api/uploads` → upload to the signed URL (supabase-js `uploadToSignedUrl`) with progress if the existing upload UI shows it → `POST /api/uploads/:id/complete`. `src/lib/real/documents.ts` + `map-document.ts`: list with the Inbox filters the mock supports (type, status, text search on file name), one document, documents by ids. `useDocuments` / `useDocument` poll every 3 s while a shown document is `uploaded` or `processing`.
- **Files:** `src/lib/real/{upload,documents,map-document}.ts`, `src/lib/api/documents.ts`
- **Model:** sonnet
- **Accept:**
  - [x] with mocks off, a PDF uploaded on `/upload` appears in `/inbox` as processing and changes to needs review (or unclassified) without a reload
  - [x] a disallowed or oversized file shows the existing error, and nothing is stored
  - [x] a broken PDF ends in the error state with its message

### [x] 4. Review and approve
- **Build:** `useDocumentPages` real: page rows (`width`, `height`, `tokens`) plus a signed URL of the file from the `documents` bucket (RLS allows the member to read it, 022) in the shape the viewer already takes. `useUpdateDocumentValues` real: update `values` and `overall_confidence` with the optimistic `version` check (conflict → the existing conflict state), edited values get confidence 1. `useApproveDocuments` and `useRejectDocument` real (status transitions as the mock enforces).
- **Files:** `src/lib/real/{documents,pages}.ts`, `src/lib/api/documents.ts`
- **Model:** sonnet
- **Accept:**
  - [x] with mocks off, `/documents/:id` shows the real file with highlight boxes on the extracted values
  - [x] editing a value saves it, a reload shows it with confidence 1; a stale edit (changed elsewhere) shows the conflict message
  - [x] approve moves the document to approved; reject asks for a reason and stores it

### [ ] 5. Spreadsheet export
- **Build:** `POST /api/exports` in `services/api` (`{ typeId, documentIds?, format: 'xlsx' | 'csv' }`): checks the token and company, loads approved documents of the type (or the given ids, which must be approved), builds rows from the type's export mapping (or the type's fields in order when there is none; tables follow 018), writes the file to `exports/<company>/<job>.<ext>`, inserts `export_jobs` (`completed`), sets the documents `exported`, returns `{ jobId, url }` (signed, 10 min). Money as major-unit numbers with a currency column, dates as dates, per [conventions.md](../conventions.md) (no country defaults). Real `useExportMapping`, `useExportJobs`, `useCreateExportJob`; the Export page downloads the file.
- **Files:** `services/api/src/{handler,export/*}.ts`, `services/api/package.json`, `src/lib/real/export.ts`, `src/lib/api/export.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] with mocks off, exporting the approved invoices of a type downloads an `.xlsx` that opens in Excel/LibreOffice with one row per document and the mapped columns; `.csv` works too
  - [ ] the documents become exported and the job is listed
  - [ ] another company's type or a non-approved document is refused; smoke-api covers the route

### [ ] 6. Mocks-off polish, diagrams and checks
- **Build:** with mocks off, Groups, Settings (team, plan), templates in the builder and any action without a backend show a "not available yet" empty state (no mock data mixed in). Diagrams: `structure.ts` (`lib/real`), `pipeline.ts` (browser reads and the export call), `deployment.ts`. `docs/setup.md`: running the real flow locally. UI check of the spec's routes with mocks on (unchanged) and screenshots reviewed.
- **Files:** pages and features that show mock-only data, `apps/web/src/features/architecture/diagrams/*`, `docs/setup.md`
- **Model:** sonnet
- **Accept:**
  - [ ] with mocks off no screen shows mock data; every unavailable feature says so
  - [ ] the whole flow (sign in → new type → upload → review → approve → export) works locally with `vercel dev` and is written down in `setup.md`
  - [ ] UI check passes; diagrams updated

## Backend needs
New routes: `POST /api/signup` (slice 1) and `POST /api/exports` (slice 5), plus a unique index on the normalized company name. Everything else uses tables and RLS from 020 and the upload API from 022.

## Open questions
All answered by the owner on 2026-11-20: every recommendation accepted, except sign-up (changed below).
- **How does the browser reach the data?** (a) supabase-js directly with RLS for reads and simple writes, our API only for upload and export; (b) everything through our API.
  - Recommended: (a) — RLS from 020 already isolates companies, it's much less code, and the API keeps what needs the secret key.
- **New packages?** `@supabase/supabase-js` in `apps/web` (020 kept it out of the web on purpose); a spreadsheet writer in `services/api` (`exceljs`), CSV without a library.
  - Recommended: approve both.
- **Spreadsheet format?** (a) XLSX and CSV; (b) CSV only (no new library).
  - Recommended: (a).
- **Who signs in?**
  - **Decided (owner):** a simple sign-up now: company name + email + password; an existing company name is refused and nothing is added. No email service is needed (the user is created already confirmed). The demo login keeps working.
- **Currencies:** the backend stores any ISO 4217 code the model reads, the web `Money` type lists 5 (020 open question). Recommended: widen the web type to any 3-letter ISO code, keep the 5 as the picker's shortlist.
- **Mock/real switch per hook or per module?** Recommended: per hook (`queryFn: USE_MOCKS ? mock.x : real.x`), so a screen can go real one hook at a time and the demo build tree-shakes nothing it needs.
- **Polling interval?** Recommended: 3 s while anything shown is `uploaded`/`processing`, off otherwise.
- **Production?** Recommended: Vercel keeps `VITE_USE_MOCKS=true`; this spec is verified locally (and optionally on a Preview with mocks off). Turning the demo real is a later decision.
- **Branch?** `first-real-flow-023`, stacked on `vercel-supabase-022`.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-20 | — | draft | written after the owner asked to test the whole flow locally with mocks off |
| 2026-11-20 | — | ready | owner approved every recommendation; changed sign-up: company name + email + password, existing company refused; going ahead while 022 waits only for its post-merge workflow run |
| 2026-11-20 | 1 | done (sonnet) | `POST /api/signup` (`signup.ts`: validation, normalized-name check, admin `createUser` with `email_confirm`, company USD + owner membership, rollback) and migration `company_name_unique` (+ pgTAP); web: `@supabase/supabase-js`, `lib/real/{client,api-fetch,auth}.ts`, per-hook switch in `lib/api/{auth,company}.ts`, `useSignOut` / `useSession`, `RequireSession` guard with `returnTo`, Company name on sign-up (mocks off), real Sign out. Checks: typecheck, lint, build; `supabase test db` 6 files pass, advisors clean; smoke ALL PASS direct and over local HTTP (sign-up 400 / 201 / 409 cases); Playwright run with mocks off (sign up, reload, sign out, guard, duplicate company, used email, wrong password, demo login, returnTo); UI check with mocks on 12/12, sign-up unchanged. Migration not yet on dev (owner push). Found: `vercel dev` serves Vite module requests through the SPA rewrite (blank page) and Git Bash rewrites `/api` env values — fixed in slice 2. |
| 2026-11-20 | 2 | done (sonnet) | `lib/real/{document-types,map-document-type,company-id,not-available}.ts`: list, read any version, create (type + version 1, rollback), save (conditional `current_version` bump, then the new version, revert on failure), export mapping read/write (hooks switch in slice 5); hooks in `lib/api/document-types.ts` switch; templates empty and the AI builder (template, sample, train, propose, suggest, test extract, examples) shows "Not available yet" with mocks off (`NotAvailableYet`). `vercel.json` SPA rewrite skips `@`, `src/`, `node_modules/` and file paths, so `vercel dev` renders the app; production checked after deploy (deep links, assets, API). `setup.md` command with `MSYS_NO_PATHCONV=1` and a PowerShell variant. Checks on `docspread-dev` with mocks off: Invoice listed; a type created in the builder, saved as v2, v1 readable and locked; a throwaway company sees none of it; test data removed. Classification reads the company types (id, name, description) and the latest version. UI check mocks on 12/12. Unique company-name index pushed by the owner and verified (duplicate refused, 23505). |
| 2026-11-20 | 3 | done (sonnet) | `lib/real/{upload,documents,map-document}.ts`: `/uploads` → XHR PUT to the signed URL (progress) → `complete`; API error codes mapped to the upload list messages; list (type, status, file-name search, newest first), one, by ids; hooks switch, polling 3 s while anything is `uploaded`/`processing`; slice-4 hooks return "not available yet" with mocks off (no mock data mixed in); type counts on `/types` now real. Checked with mocks off on `docspread-dev`: invoice uploaded on `/upload` turned from Processing to Needs review (97 %) in the Inbox without a reload (91 s, pipeline on production via cron); `.txt` refused in the browser, `.txt`/`.exe`/30 MB refused by the API with no row; broken PDF ends in `error` with its message. UI check mocks on 8/8. Kept for slice 4: document `1ca2f69a-bd05-4c74-9790-be62a5ff4e81` (Invoice, `needs_review`). Open: the upload Type selector is ignored with mocks off (the API always classifies); search covers file names only; a document can stay `uploaded` if the user leaves mid-upload. |
| 2026-11-20 | 4 | done (sonnet) | `lib/real/{pages,file-url}.ts` (OCR pages + signed file URL, cached per path; a missing file no longer breaks the page), `documents.ts` (`updateDocumentValues` with the remembered row `version` and `.eq(version)`, edits confirmed at 1; `approveDocuments`, `rejectDocument` with the mock transitions), hooks switch. Currency: `CurrencyCode` is any 3-letter code, pickers offer the shortlist plus the document code, `getCompany` keeps the company code. Checked with mocks off on the kept invoice: real PDF with highlight boxes; edit saved and shown at 100 % after reload; a stale edit refused ("changed elsewhere"), DB unchanged; reject needs a reason and stores it; approve works; the invoice is left `approved` for slice 5. UI check mocks on 8/8. To fix in slice 6: `lib/real/documents.ts` imports pure helpers from `lib/mock` (move them to `lib/fields`). Open: old dev rows without files; a brief zoom label glitch ("44600%") after load; no approve control on a rejected document in the UI; pointed text parses only shortlist currencies. |
