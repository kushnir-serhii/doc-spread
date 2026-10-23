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

### [x] 2. Templates
- **Build:** "From a template" goes to `/types/new?from=template`, a gallery. `/types/new` becomes the builder page holding an unsaved draft: from `?template=<id>` (a copy of the template's fields) or blank. In this slice it shows the draft's name, description and field list read-only; slice 3 makes them editable.
- **Files:** `src/pages/types/`, `src/features/document-types/`
- **Accept:**
  - [x] a gallery of templates with name, description and the first few field labels
  - [x] picking one opens `/types/new?template=<id>` prefilled; nothing is saved until the user clicks Save

### [x] 3. Field list + field editor
- **Build:** the builder page (`/types/new`, `/types/:typeId`) with a header for the type's name and description (the description is what the AI uses to classify documents; helper text says so), then two panes: the field list on the left, the selected field's editor on the right. Editor: label, key (auto slug from the label, editable, unique), type, required, hint for the AI, options (for select).
- **Accept:**
  - [x] the type's name and description are editable inputs with labels
  - [x] add, duplicate, delete and reorder fields, with up/down buttons and Alt+↑/↓ (no drag-and-drop library)
  - [x] changing the type keeps the label and hint, and warns if options would be lost
  - [x] the hint has helper text with a good example ("The date the invoice was issued, not the sale date")
  - [x] at 375px the panes stack and the editor opens as a sheet

### [x] 4. Table fields
- **Accept:**
  - [x] a `table` field has its own column list using the same editor; table columns can't be tables themselves
  - [x] the list shows a table field with its columns indented under it

### [x] 5. List + grouping settings
- **Accept:**
  - [x] pick the title field (shown as the document's name in lists) and the list columns (up to 6, ordered)
  - [x] `groupable` toggle for text and tax_id fields, with a line explaining where groups appear

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
- An unknown `/types/:typeId` shows the error-with-retry state: the mock throws a plain `Error`, so not-found is indistinguishable. Backend: a 404 the client can tell apart.
- `FIELD_TYPE_META.groupable` (field-meta) also marks select/email/phone as groupable; the builder follows this spec (text, tax_id only). Align field-meta?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-23 | — | ready | checked against the code: added the name/description header to slice 3 (slice 6 validates a name), client-side counts from `useDocuments()`, the mock's missing re-extract job; open questions marked non-blocking |
| 2026-10-23 | 1 | done | `/types` lists types (fields, documents, to review, updated) as keyboard links; "New type" menu and the empty state share `NEW_TYPE_OPTIONS` (template → `/types/new` until slice 2, sample → `/types/new?from=sample`, blank); skeleton, error with retry. Counts from `useDocuments()` on the client. Fixed in review: the shadcn CLI added a bogus `cn` npm dependency and `import { cn } from "cn"` (reverted, `@/lib/utils`). Headless Chrome: 1280 light, 375 dark, no page scroll · `pages/types/types-page.tsx`, `features/document-types/{new-type-options,new-type-menu,type-row,types-empty-state,types-skeleton,types-error}`, `components/ui/skeleton.tsx`, `app/router.tsx` |
| 2026-10-23 | — | rescoped | slice 2 also creates the `/types/new` builder page with a read-only draft (the prefilled template needs somewhere to open before slice 3); gallery at `?from=template` |
| 2026-10-23 | 2 | done | Gallery at `?from=template` (cards: name, clamped description, first 4 field labels + "+N more", "Start blank"; skeleton, error with retry, empty). `/types/new` = builder with an unsaved draft: `draftFromTemplate` copies fields with fresh ids and remaps title/list columns/table columns, `blankDraft`; `TemplateBuilder` mounts `TypeBuilder` keyed by template once loaded (no effect sync); read-only header + `FieldList` (table columns indented); unknown template → not found; `?from=sample` → "coming with 015". `TypesError` takes a `title`. Fixed in review: `TemplateBuilder` moved out of `pages/`. Headless Chrome (CDP): gallery 1280 light/375 dark, builder 375 light/1280 dark, no page scroll · `pages/types/new-type-page.tsx`, `features/document-types/{type-draft,field-list,type-builder,template-builder,template-card,template-gallery,new-type-options,types-error}`, `app/router.tsx` |
| 2026-10-23 | 3 | done | Builder: `TypeMetaForm` (name, description with the classification helper), `builderReducer` (pure; add/duplicate/delete/move/label/key/type/patch; delete clears title + list columns; "key touched" per field, saved/template keys never follow the label), `FieldList` with up/down buttons + Alt+↑/↓ (focus kept, shortcut shown), `FieldEditor` (label, key with diacritic-folding slug + empty/duplicate errors, type select with an inline "N options will be removed" confirm, required, hint with the example, options editor). ≥lg two panes with a sticky editor, below lg the editor opens in a `Sheet` (`useMediaQuery`). `/types/:typeId` loads `useDocumentType` → `draftFromType` (same ids). Hand-written shadcn-style `Textarea`. Fixed in review: name/description placeholders read like values ("e.g. …"). Headless Chrome (CDP): saved Invoice with Order number selected at 1280, template field in the sheet at 375 dark, blank builder 1280 dark · `features/document-types/{type-draft-reducer,field-key,field-row,field-summary,field-editor,field-editor-panel,field-key-input,field-type-select,field-options-editor,type-meta-form,type-not-found,saved-type-builder-skeleton,type-builder,field-list,template-builder,type-draft}`, `pages/types/{type-page,new-type-page}`, `hooks/use-media-query.ts`, `components/ui/textarea.tsx`, `app/router.tsx` |
| 2026-10-23 | 4 | done | Selection is a union (`field` / `column` of a table / none), `resolveSelection`; one `{ type: column, fieldId, op }` action handled by `columnsReducer` (add, duplicate, delete, move, label, key, update, retype; key-touched covers columns). `FieldEditor` is shared: for a column the type list is `FIELD_TYPES.filter(isScalarFieldType)` (no table), keys unique among sibling columns, header "Column of <table>", no groupable; a table field shows "Columns (n)" + Add column. `ColumnList`: indented selectable rows with their own up/down + Alt+↑/↓ inside the table, "Add column" row, "No columns yet". Deleting a column selects its table. Headless Chrome (CDP): Invoice → Quantity column editor ("Column of Line items", 9 types, no Table), Line items with 8 indented columns at 1280 · `features/document-types/{type-draft-columns,editor-target,selected-editor,table-columns-section,column-list,type-draft,type-draft-reducer,field-key,field-type-select,field-editor,field-editor-panel,field-row,field-list,type-builder}` |
| 2026-10-23 | 5 | done | "List settings" section above the fields: title select (text-like top-level fields + "File name (default)", helper), list-column checkboxes with a live "N of 6" counter (7th disabled, "Limit reached") and an ordered list with Move left/right; "Already shown as the title" hint. Groupable toggle in the field editor for top-level text/tax_id with the Groups helper. Reducer: `setTitleField`, `toggleListColumn`, `moveListColumn`, `setGroupable`; retyping clears an ineligible title and `groupable` (`canGroupBy`, `canBeTitle` in `list-settings.ts`). Row badges Title / Column N / Grouped. Fixed in review: column checkboxes in a 2–3 column grid. Headless Chrome (CDP): Invoice → title Invoice number, 3 of 6 (Supplier, Issue date, Gross total) at 1280; 375 dark, no page scroll · `features/document-types/{list-settings,list-settings-section,title-field-select,list-columns-picker,list-column-order,group-by-toggle,type-draft-reducer,type-builder,selected-editor,field-list,field-row}` |
