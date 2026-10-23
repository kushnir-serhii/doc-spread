# 014 — Document types (builder)

**Status:** in-progress · **Depends on:** 002, 012 · **Route(s):** `/types`, `/types/new`, `/types/:typeId`

## Goal
The user describes which documents they process and which data to collect from each one: they make a type from a template or from scratch, add and arrange fields, and save it without breaking documents already processed.

## Scope
- In: list of types, template gallery, a manual field builder (including table fields), list and grouping settings, save with versioning and an impact warning.
- Out: building from a sample and pointing at documents (015), conditional fields, computed fields, validation rules across fields.

## Data
`DocumentType`, `FieldDef`, `FIELD_TYPES`, `FIELD_TYPE_META`, `DOCUMENT_TEMPLATES`, `useDocumentTypes()`, `useDocumentType(id)`, `useCreateDocumentType()`, `useUpdateDocumentType()`, `useTemplates()`.

Per-type document counts (total and `needs_review`) are computed on the client from `useDocuments()` until the backend provides them (see **Backend needs**).

## Slices

### [x] 1. Types list + create menu
- **Build:** `/types` lists the user's types; `/types/new` and `/types/:typeId` stay placeholders until slices 2–3.
- **Files:** `src/pages/types/`, `src/features/document-types/`
- **Accept:**
  - [x] each row shows the name, field count, document count, documents needing review and when it was last updated; a click opens the builder
  - [x] "New type" offers: from a template / from a sample (links to 015) / blank
  - [x] empty state explains what a type is and offers the same three choices; skeleton and error states

### [ ] 2. Templates
- **Accept:**
  - [ ] a gallery of templates with name, description and the first few field labels
  - [ ] picking one opens `/types/new?template=<id>` prefilled; nothing is saved until the user clicks Save

### [ ] 3. Field list + field editor
- **Build:** the builder page (`/types/new`, `/types/:typeId`) with a header for the type's name and description (the description is what the AI uses to classify documents; helper text says so), then two panes: the field list on the left, the selected field's editor on the right. Editor: label, key (auto slug from the label, editable, unique), type, required, hint for the AI, options (for select).
- **Accept:**
  - [ ] the type's name and description are editable inputs with labels
  - [ ] add, duplicate, delete and reorder fields, with up/down buttons and Alt+↑/↓ (no drag-and-drop library)
  - [ ] changing the type keeps the label and hint, and warns if options would be lost
  - [ ] the hint has helper text with a good example ("The date the invoice was issued, not the sale date")
  - [ ] at 375px the panes stack and the editor opens as a sheet

### [ ] 4. Table fields
- **Accept:**
  - [ ] a `table` field has its own column list using the same editor; table columns can't be tables themselves
  - [ ] the list shows a table field with its columns indented under it

### [ ] 5. List + grouping settings
- **Accept:**
  - [ ] pick the title field (shown as the document's name in lists) and the list columns (up to 6, ordered)
  - [ ] `groupable` toggle for text and tax_id fields, with a line explaining where groups appear

### [ ] 6. Save + versioning
- **Accept:**
  - [ ] validation: a name, at least one field, unique keys, select fields have options; errors are linked to their fields
  - [ ] when documents of this type exist, Save shows an impact dialog: "3 fields added: they will be empty in 120 documents (re-extract them? yes/no)", "1 field removed: it is hidden, the data is kept"; the mock has no re-extract job, so "yes" is only reported in the success message
  - [ ] leaving with unsaved changes asks for confirmation (`useBlocker`); pending, success and error states on save

## Backend needs
Create and update a type with an incremented version; re-extract the added fields for existing documents (as a background job); document counts per type and status.

## Open questions
- Can a type be deleted when it has documents (archive instead)? Not blocking: no slice deletes a type.
- Is a field limit per type needed (cost and quality of extraction)? Not blocking: no limit in the MVP.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-23 | — | ready | checked against the code: added the name/description header to slice 3 (slice 6 validates a name), client-side counts from `useDocuments()`, the mock's missing re-extract job; open questions marked non-blocking |
| 2026-10-23 | 1 | done | `/types` lists types (fields, documents, to review, updated) as keyboard links; "New type" menu and the empty state share `NEW_TYPE_OPTIONS` (template → `/types/new` until slice 2, sample → `/types/new?from=sample`, blank); skeleton, error with retry. Counts from `useDocuments()` on the client. Fixed in review: the shadcn CLI added a bogus `cn` npm dependency and `import { cn } from "cn"` (reverted, `@/lib/utils`). Headless Chrome: 1280 light, 375 dark, no page scroll · `pages/types/types-page.tsx`, `features/document-types/{new-type-options,new-type-menu,type-row,types-empty-state,types-skeleton,types-error}`, `components/ui/skeleton.tsx`, `app/router.tsx` |
