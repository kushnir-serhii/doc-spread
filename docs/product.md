# Product

## What DocSpread is
Turn any document into structured data. The user defines a **document type** — the fields to collect — from a template, from scratch, or by showing a sample and pointing at the values. Uploaded files are classified into a type automatically, AI extracts that type's fields, a person reviews and approves, then exports a spreadsheet.

The product is horizontal from the start: invoices are just one template next to receipts, contracts, HR forms, delivery notes and whatever the user builds.

## Users
Non-technical office staff and small-business owners. They want speed, certainty, zero surprises.

## Core concepts

| Concept | Meaning | Spec |
| --- | --- | --- |
| Document type | A user-defined schema: name, description, fields, list columns, actions. Versioned on save. | [012](specs/012-document-model.md), [014](specs/014-document-types.md) |
| Field | Text, number, money, date, boolean, select, email, phone, tax ID, or table (one level of columns). Has a key, label, required flag and a **hint** for the AI. | [012](specs/012-document-model.md) |
| Example | A place on a sample document the user pointed at for a field. A semantic hint for the AI, not fixed coordinates. | [015](specs/015-type-from-sample.md) |
| Document | An uploaded file classified into a type, with an extracted value and confidence per field. | [012](specs/012-document-model.md) |
| Action | A check across fields (Gross = Net + VAT) or a computed field, built from a registry of functions. | [016](specs/016-field-actions.md) |
| Group | Documents grouped by a field marked groupable (supplier, client, employee), with counts and totals. | [010](specs/010-groups.md) |

## Flow
1. **Describe** a type: template, blank, or from a sample (AI proposes fields; the user points at words or regions to add or fix them; a test run on more samples).
2. **Upload** files; each one is classified into a type, or lands in **Unclassified**.
3. **Review**: the document on the left with source boxes, a form generated from the type on the right; fix by typing or pointing; corrections can become examples for the type.
4. **Export** one type at a time with a column mapping (CSV / XLSX / PDF bundle), download or email.

Document statuses: Uploaded → Processing → Needs review | Unclassified → Approved → Exported (+ Rejected, Error).

## Screens (MVP)

| Screen | Route | Spec |
| --- | --- | --- |
| Landing — what it does, how it works (3 steps), CTA to sign up | `/` | [003](specs/003-landing.md) |
| Auth — sign in, sign up, reset password | `/sign-in`, `/sign-up`, `/reset-password` | [004](specs/004-auth.md) |
| Onboarding — company, default currency, first document types | `/onboarding` | [005](specs/005-onboarding.md) |
| Document types — list + builder | `/types`, `/types/:typeId` | [014](specs/014-document-types.md) |
| Type from a sample — AI proposals, pointing, test run | `/types/new?from=sample` | [015](specs/015-type-from-sample.md) |
| Inbox — documents of all types, type switcher, unclassified bucket, bulk actions | `/inbox` | [006](specs/006-inbox.md) |
| Upload — drag & drop, per-file progress, auto-classified type | `/upload` | [007](specs/007-upload.md) |
| Review — the core screen | `/documents/:documentId` | [008](specs/008-review.md) |
| Export — per type, column mapping, history | `/export` | [009](specs/009-export.md) |
| Groups — documents by a groupable field | `/groups` | [010](specs/010-groups.md) |
| Settings — company, export recipients, team, plan | `/settings` | [011](specs/011-settings.md) |

Build order and status: [roadmap.md](roadmap.md).

## Design principles
1. Clarity over decoration; calm, professional, trustworthy.
2. Neutral palette + one accent; light and dark mode.
3. Tabular numbers for amounts; always show currency.
4. Every state designed: empty, loading (skeletons), error, long values, 50+ rows.
5. WCAG 2.1 AA contrast, visible focus, labels on all inputs, 44px touch targets.
6. Desktop-first for Review and the type builder; Upload, Inbox and Approve must work at 375px.

## Technical frame
- Monorepo: pnpm workspaces + Turborepo. The web app lives in `apps/web`.
- Vite + React + TypeScript SPA, static build deployed to S3 + CloudFront (no SSR or server code). CloudFront must serve `index.html` for unknown paths; routes are lazy-loaded.
- React Router, TanStack Query, Tailwind CSS + shadcn/ui, lucide-react, `pdfjs-dist` for the document viewer.
- Backend later (Supabase planned). Until then every screen runs on typed mocks in `apps/web/src/lib/mock/` behind query hooks in `src/lib/api/`, so mocks can be swapped without redesign. Each spec lists what the backend must provide under **Backend needs**.

Folder layout (`apps/web/src`):
```
main.tsx            # entry: providers + router
app/                # router.tsx, providers.tsx, layouts
pages/              # one folder per route
features/           # domain logic + UI: documents/, document-types/, groups/, export/
components/ui/      # shadcn components (generated)
components/         # shared custom components (layout/, domain/)
hooks/
lib/                # utils.ts, mock/, api/ (query hooks), fields/
styles/index.css    # Tailwind + design tokens (CSS variables)
```
Detailed rules: [conventions.md](conventions.md).
