# 002 — Query layer (lib/api)

**Status:** done · **Depends on:** 012 · **Route(s):** —

## Goal
Screens get data only through typed TanStack Query hooks, so swapping the mocks for the real API later means changing `src/lib/api` and nothing else.

## Scope
- In: query-key factories, query and mutation hooks wrapping every function in `src/lib/mock/api.ts` (as rewritten in 012), invalidation rules.
- Out: the real HTTP client, auth.

## Data
Every function in `src/lib/mock/api.ts` after 012: document types, templates, documents, pages, upload, AI proposals and test extraction, examples, group values, export jobs, company, team.

## Slices

### [x] 1. Document types + templates
- **Build:** `documentTypeKeys`, `templateKeys`; `useDocumentTypes()`, `useDocumentType(id, version?)` (no version = current; a document is read with the version it was extracted with), `useCreateDocumentType()`, `useUpdateDocumentType()`, `useTemplates()`.
- **Files:** `src/lib/api/document-types.ts`, `src/lib/api/index.ts`
- **Accept:**
  - [x] no inline query keys; return types are inferred from the mocks (no manual generics)
  - [x] creating a type invalidates the list; updating one invalidates the list and that type's current detail (pinned versions never change, so they stay cached). Documents keep their `typeVersion`, so no document keys are touched

### [x] 2. Documents
- **Build:** `documentKeys`; `useDocuments(params)`, `useDocument(id)`, `useDocumentPages(id)`, `useUpdateDocumentValues()`, `useApproveDocuments()`, `useRejectDocument()`, `useReassignDocumentType()`, `useUploadDocument()`.
- **Files:** `src/lib/api/documents.ts`
- **Accept:**
  - [x] every mutation invalidates the affected document detail(s), every `documentKeys.list(*)` and the group values; upload invalidates the lists
  - [x] `useDocuments` and `useDocument` poll (about every 1.5 s) while a returned document is `uploaded` or `processing`, and stop when none is
  - [x] pages are cached with a long `staleTime` (they never change)

### [x] 3. Builder AI, groups, export, company, team
- **Build:** `useProposeFields(documentId)`, `useTestExtract()` (mutation: saves nothing), `useAddFieldExample()` (invalidates that type's list and current detail, not documents), `useGroupValues(typeId, fieldId)` with `groupKeys`, plus `exportKeys` + `useExportJobs()` + `useCreateExportJob()`, `companyKeys` + `useCompany()` + `useUpdateCompany()`, `teamKeys` + `useTeam()`. `useCreateExportJob()` also invalidates documents and group values, because exporting changes their status.
- **Files:** `src/lib/api/{builder,groups,export,company,team}.ts`
- **Accept:**
  - [x] every mock function has exactly one hook
  - [x] `grep "@/lib/mock" src --include=*.tsx` only hits type imports and formatters

## Backend needs
Mirrors the comment block at the top of `src/lib/mock/api.ts`.

## Open questions
- `useDocumentType(id)` has no `enabled` guard; a page with an optional id (e.g. a document still `unclassified`) needs one. Add it when the first consumer lands?
- Polling refreshes documents but not group values: when a pipeline finishes, group counts stay stale until their own `staleTime` runs out. Invalidate groups when a polled document leaves `processing`, or accept it?
- Should `formatMoney`/`formatDate` move from `lib/mock` to `lib/format.ts`, since they aren't mocks?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | back to draft: rewritten for the document-type model (012) |
| 2026-10-22 | — | ready | checked against `lib/mock/api.ts` after 012: versioned type detail, no type-counts endpoint (dropped), polling for the upload pipeline, group-value invalidation, explicit export/company/team hooks |
| 2026-10-22 | 1 | done | `documentTypeKeys` (current detail keyed `'current'`, pinned versions by number, so updates invalidate only the current one), `templateKeys`, 5 hooks · `lib/api/document-types.ts`, `lib/api/index.ts` |
| 2026-10-22 | 2 | done | `documentKeys` (pages on their own branch, `staleTime: Infinity`), 8 hooks, polling at 1.5 s while any document is `uploaded`/`processing`, one helper invalidates lists + groups + touched details · `lib/api/documents.ts`, `lib/api/groups.ts` (keys only), `lib/api/index.ts` |
| 2026-10-22 | 3 | done | 22 mock functions ↔ 22 hooks; `builderKeys` (proposals `staleTime: Infinity`), `useGroupValues`, `exportKeys` (create also invalidates documents + groups), `companyKeys` (update seeds the cache), `teamKeys`. Spec done · `lib/api/{builder,groups,export,company,team,index}.ts` |
