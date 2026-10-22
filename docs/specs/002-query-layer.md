# 002 — Query layer (lib/api)

**Status:** draft · **Depends on:** 012 · **Route(s):** —

## Goal
Screens get data only through typed TanStack Query hooks, so swapping the mocks for the real API later means changing `src/lib/api` and nothing else.

## Scope
- In: query-key factories, query and mutation hooks wrapping every function in `src/lib/mock/api.ts` (as rewritten in 012), invalidation rules.
- Out: the real HTTP client, auth.

## Data
Every function in `src/lib/mock/api.ts` after 012: document types, templates, documents, pages, upload, AI proposals and test extraction, examples, group values, export jobs, company, team.

## Slices

### [ ] 1. Document types + templates
- **Build:** `documentTypeKeys`; `useDocumentTypes()`, `useDocumentType(id)`, `useCreateDocumentType()`, `useUpdateDocumentType()`, `useTemplates()`.
- **Files:** `src/lib/api/document-types.ts`, `src/lib/api/index.ts`
- **Accept:**
  - [ ] no inline query keys; return types are inferred from the mocks (no manual generics)
  - [ ] updating a type invalidates its detail, the list, and document lists of that type

### [ ] 2. Documents
- **Build:** `documentKeys`; `useDocuments(params)`, `useDocument(id)`, `useDocumentPages(id)`, `useUpdateDocumentValues()`, `useApproveDocuments()`, `useRejectDocument()`, `useReassignDocumentType()`, `useUploadDocument()`.
- **Files:** `src/lib/api/documents.ts`
- **Accept:**
  - [ ] approving invalidates every `documentKeys.list(*)` and the type counts
  - [ ] pages are cached with a long `staleTime` (they never change)

### [ ] 3. Builder AI, groups, export, company, team
- **Build:** `useProposeFields(documentId)`, `useTestExtract()`, `useAddFieldExample()`, `useGroupValues(typeId, fieldId)`, plus `exportKeys`, `companyKeys`, `teamKeys`. `useCreateExportJob()` also invalidates documents, because exporting changes their status.
- **Files:** `src/lib/api/{builder,groups,export,company,team}.ts`
- **Accept:**
  - [ ] every mock function has exactly one hook
  - [ ] `grep "@/lib/mock" src --include=*.tsx` only hits type imports and formatters

## Backend needs
Mirrors the comment block at the top of `src/lib/mock/api.ts`.

## Open questions
- Should `formatMoney`/`formatDate` move from `lib/mock` to `lib/format.ts`, since they aren't mocks?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | back to draft: rewritten for the document-type model (012) |
