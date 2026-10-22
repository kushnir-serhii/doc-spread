# 014 — Document types (builder)

**Status:** draft · **Depends on:** 002, 012 · **Route(s):** `/types`, `/types/new`, `/types/:typeId`

## Goal
The user describes which documents they process and which data to collect from each one: they make a type from a template or from scratch, add and arrange fields, and save it without breaking documents already processed.

## Scope
- In: list of types, template gallery, a manual field builder (including table fields), list and grouping settings, save with versioning and an impact warning.
- Out: building from a sample and pointing at documents (015), conditional fields, computed fields, validation rules across fields.

## Data
`DocumentType`, `FieldDef`, `FIELD_TYPES`, `FIELD_TYPE_META`, `DOCUMENT_TEMPLATES`, `useDocumentTypes()`, `useDocumentType(id)`, `useCreateDocumentType()`, `useUpdateDocumentType()`, `useTemplates()`.

## Slices

### [ ] 1. Types list + create menu
- **Files:** `src/pages/types/`, `src/features/document-types/`
- **Accept:**
  - [ ] each row shows the name, field count, document count, documents needing review and when it was last updated; a click opens the builder
  - [ ] "New type" offers: from a template / from a sample (links to 015) / blank
  - [ ] empty state explains what a type is and offers the same three choices; skeleton and error states

### [ ] 2. Templates
- **Accept:**
  - [ ] a gallery of templates with name, description and the first few field labels
  - [ ] picking one opens `/types/new?template=<id>` prefilled; nothing is saved until the user clicks Save

### [ ] 3. Field list + field editor
- **Build:** two panes: the field list on the left, the selected field's editor on the right. Editor: label, key (auto slug from the label, editable, unique), type, required, hint for the AI, options (for select).
- **Accept:**
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
  - [ ] when documents of this type exist, Save shows an impact dialog: "3 fields added: they will be empty in 120 documents (re-extract them? yes/no)", "1 field removed: it is hidden, the data is kept"
  - [ ] leaving with unsaved changes asks for confirmation (`useBlocker`); pending, success and error states on save

## Backend needs
Create and update a type with an incremented version; re-extract the added fields for existing documents (as a background job); document counts per type and status.

## Open questions
- Can a type be deleted when it has documents (archive instead)?
- Is a field limit per type needed (cost and quality of extraction)?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
