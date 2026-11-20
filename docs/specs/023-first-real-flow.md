# 023 — First real flow: sign in → type → upload → AI → review → spreadsheet

**Status:** draft · **Depends on:** 022 · **Route(s):** `/sign-in`, `/types`, `/types/new`, `/types/:typeId`, `/upload`, `/inbox`, `/documents/:documentId`, `/export`

## Goal
With `VITE_USE_MOCKS=false` the owner signs in, creates a document type with the fields they need, uploads a real file, watches OCR and Claude fill the fields, reviews and approves the values, and downloads a spreadsheet of the approved documents — all against `docspread-dev`. With mocks on (the public demo) nothing changes. This is one thin path through the real backend; the other screens follow in later specs.

## Scope
- In:
  - A real data layer next to the mock one: `src/lib/real/*` with the same function signatures as the `@/lib/mock` functions the path needs; every hook in `src/lib/api/*` on the path picks mock or real by `USE_MOCKS`. Components don't change.
  - Supabase Auth in the browser: sign in, sign out, session restore, guarded app routes, the caller's company (first active membership, as the API does).
  - Document types: list, read, create, save a new version from the builder (manual fields; versions stay locked, 020).
  - Upload through `/api/uploads` → Storage → `complete`; Inbox and the document page read real rows and poll while anything is `uploaded` or `processing`.
  - Review: the file (signed Storage URL) and OCR pages in the viewer, real values with confidence, edit values, approve, reject.
  - Export: a new API route that builds a spreadsheet of approved documents of one type from the type's export mapping, stores it in the `exports` bucket, marks the documents `exported`, records an `export_jobs` row and returns a signed download URL.
  - With mocks off, screens and actions that have no backend yet show a clear "not available yet" state instead of mock data.
  - Local run: `apps/web/.env.local` with `VITE_USE_MOCKS=false` + `vercel dev` (022).
- Out (later specs): sign-up, password reset and creating a company (the demo login and Demo Company are used); AI features of the type builder (propose fields, suggest table, test extract, type from a sample, field examples); groups; team, plan, settings, templates; reassign type; realtime (polling is enough); email delivery and PDF bundles; production with mocks off (the public demo stays on mocks).

## Architecture
- Browser → Supabase directly (supabase-js with the publishable key and the user's session) for everything RLS already protects: types, versions, documents, values, pages, export jobs, signed read URLs of the company's files.
- Browser → `/api/*` (Vercel Functions) for what needs the secret key or server logic: upload (`/api/uploads`, `complete`, 022) and export (new `POST /api/exports`).
- ids are uuid strings in the database and plain strings in the app; `src/lib/real/map-*.ts` converts rows to the types in `@/lib/mock/types` (snake_case → camelCase, jsonb as is).

## Data
- Tables (020): `companies`, `team_members`, `document_types` (+ `export_mapping`), `document_type_versions` (`fields`, `actions`, `title_field_id`, `list_column_ids`), `documents` (`values` jsonb in `FieldValueMap` shape, `version` for optimistic locking), `document_pages` (`tokens`), `export_jobs`. Storage buckets `documents`, `exports` (022).
- Hooks switched to mock-or-real: `useSignIn`, (new) `useSignOut`, (new) `useSession`, `useCompany`, `useDocumentTypes`, `useDocumentType`, `useCreateDocumentType`, `useUpdateDocumentType`, `useUploadDocument`, `useDocuments`, `useDocument`, `useDocumentsByIds`, `useDocumentPages`, `useUpdateDocumentValues`, `useApproveDocuments`, `useRejectDocument`, `useExportMapping`, `useExportJobs`, `useCreateExportJob`.
- New env: none for the web (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` exist).

## Slices

### [ ] 1. Real client and sign-in
- **Build:** add `@supabase/supabase-js` to `apps/web`; `src/lib/real/client.ts` (one client from `readBackendEnv()`, session persisted by supabase-js); `src/lib/real/auth.ts` (sign in → `invalid_credentials` / `rate_limited` codes like the mock, sign out, session, company of the user); `useSignIn`, `useSignOut`, `useSession`, `useCompany` switch on `USE_MOCKS`; app routes redirect to `/sign-in` without a session when mocks are off; a sign-out action in the user menu. A small `src/lib/real/api-fetch.ts` that calls `VITE_API_BASE_URL` with the session's access token. `conventions.md`: `src/lib/real/` is, like `@/lib/mock`, imported only by `src/lib/api/`.
- **Files:** `apps/web/package.json`, `src/lib/real/{client,auth,api-fetch}.ts`, `src/lib/api/{auth,company}.ts`, `src/app/router.tsx` (guard), user menu component, `docs/conventions.md`
- **Model:** sonnet
- **Accept:**
  - [ ] with mocks on, the app behaves exactly as before (UI check of `/sign-in` and `/inbox` unchanged)
  - [ ] with mocks off, the demo login signs in, a reload keeps the session, sign-out returns to `/sign-in`, a wrong password shows the existing error
  - [ ] without a session, `/inbox` redirects to `/sign-in`
  - [ ] typecheck, lint, build green

### [ ] 2. Document types from the database
- **Build:** `src/lib/real/document-types.ts` + `map-document-type.ts`: list (current version of each type), read one (any version), create (type row + version 1), save (new version = `current_version + 1`, insert into `document_type_versions`, bump `current_version`), export mapping read/write on `document_types`. Hooks in `lib/api/document-types.ts` switch. Builder AI buttons (propose, suggest, test extract, examples) are disabled with "not available yet" when mocks are off.
- **Files:** `src/lib/real/{document-types,map-document-type}.ts`, `src/lib/api/{document-types,builder}.ts`, builder components that render the AI actions
- **Model:** sonnet
- **Accept:**
  - [ ] with mocks off, `/types` lists the Demo Company's Invoice type; a new type with a few fields saves and appears; editing it saves version 2 and version 1 stays readable
  - [ ] a member of another company can't see the type (RLS; checked with a second test user or the pgTAP tests from 020)
  - [ ] the pipeline classifies a new upload against the new type (its name and description reach classification)

### [ ] 3. Upload and Inbox
- **Build:** `src/lib/real/upload.ts`: `POST /api/uploads` → upload to the signed URL (supabase-js `uploadToSignedUrl`) with progress if the existing upload UI shows it → `POST /api/uploads/:id/complete`. `src/lib/real/documents.ts` + `map-document.ts`: list with the Inbox filters the mock supports (type, status, text search on file name), one document, documents by ids. `useDocuments` / `useDocument` poll every 3 s while a shown document is `uploaded` or `processing`.
- **Files:** `src/lib/real/{upload,documents,map-document}.ts`, `src/lib/api/documents.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] with mocks off, a PDF uploaded on `/upload` appears in `/inbox` as processing and changes to needs review (or unclassified) without a reload
  - [ ] a disallowed or oversized file shows the existing error, and nothing is stored
  - [ ] a broken PDF ends in the error state with its message

### [ ] 4. Review and approve
- **Build:** `useDocumentPages` real: page rows (`width`, `height`, `tokens`) plus a signed URL of the file from the `documents` bucket (RLS allows the member to read it, 022) in the shape the viewer already takes. `useUpdateDocumentValues` real: update `values` and `overall_confidence` with the optimistic `version` check (conflict → the existing conflict state), edited values get confidence 1. `useApproveDocuments` and `useRejectDocument` real (status transitions as the mock enforces).
- **Files:** `src/lib/real/{documents,pages}.ts`, `src/lib/api/documents.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] with mocks off, `/documents/:id` shows the real file with highlight boxes on the extracted values
  - [ ] editing a value saves it, a reload shows it with confidence 1; a stale edit (changed elsewhere) shows the conflict message
  - [ ] approve moves the document to approved; reject asks for a reason and stores it

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
Only the export route is new (slice 5). Everything else uses tables and RLS from 020 and the upload API from 022.

## Open questions
- **How does the browser reach the data?** (a) supabase-js directly with RLS for reads and simple writes, our API only for upload and export; (b) everything through our API.
  - Recommended: (a) — RLS from 020 already isolates companies, it's much less code, and the API keeps what needs the secret key.
- **New packages?** `@supabase/supabase-js` in `apps/web` (020 kept it out of the web on purpose); a spreadsheet writer in `services/api` (`exceljs`), CSV without a library.
  - Recommended: approve both.
- **Spreadsheet format?** (a) XLSX and CSV; (b) CSV only (no new library).
  - Recommended: (a).
- **Who signs in?** (a) the demo login from `seed-demo` (Demo Company, Invoice type); (b) also sign-up and company creation now.
  - Recommended: (a); sign-up and onboarding get their own spec.
- **Currencies:** the backend stores any ISO 4217 code the model reads, the web `Money` type lists 5 (020 open question). Recommended: widen the web type to any 3-letter ISO code, keep the 5 as the picker's shortlist.
- **Mock/real switch per hook or per module?** Recommended: per hook (`queryFn: USE_MOCKS ? mock.x : real.x`), so a screen can go real one hook at a time and the demo build tree-shakes nothing it needs.
- **Polling interval?** Recommended: 3 s while anything shown is `uploaded`/`processing`, off otherwise.
- **Production?** Recommended: Vercel keeps `VITE_USE_MOCKS=true`; this spec is verified locally (and optionally on a Preview with mocks off). Turning the demo real is a later decision.
- **Branch?** `first-real-flow-023`, stacked on `vercel-supabase-022`.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-20 | — | draft | written after the owner asked to test the whole flow locally with mocks off |
