# 021 — Architecture page: UML diagrams of the project

**Status:** in-progress · **Depends on:** — · **Route(s):** `/architecture`

## Goal
A developer opens one page and sees how the project is built: one tab per UML diagram (workspaces and layers, domain model, screens, document lifecycle, processing pipeline, deployment). It replaces reading 470 source files to get the picture, and it's the map for the backend work that starts with 020.

## Scope
- In: an `/architecture` page under the **Developer** nav group (next to `/design`); tabs with the selected tab in the URL; six diagrams written as Mermaid text and rendered in the browser; light and dark theme; the diagram source shown as text under each diagram.
- Out: generating diagrams from the code; editing diagrams in the UI; pan and zoom; export to PNG/SVG/PDF; diagrams for a single feature's internals (the action expression tree, the viewer); hiding the page in production builds (it stays visible like `/design` until auth is real).
- Definition of Done differs in one point: there is no data and no mocks, so "empty state" doesn't apply. Loading and error states apply to diagram rendering.

## Data
None: no mock functions and no query hooks. Each diagram is a constant in `src/features/architecture/diagrams/`:

```ts
interface DiagramDef {
  id: DiagramId            // also the `?tab=` value
  label: string            // tab label
  kind: string             // UML diagram type shown under the title, e.g. "Class diagram"
  description: string      // one or two sentences: what it shows and where the truth lives
  sources: string[]        // repo paths the diagram was drawn from
  code: string             // Mermaid definition
}
```

`DIAGRAM_IDS` is an `as const` array and `DiagramId` its derived union, per [conventions.md](../conventions.md).

### The diagrams
| # | Tab (`?tab=`) | UML type (Mermaid) | Shows | Drawn from |
| --- | --- | --- | --- | --- |
| 1 | Structure (`structure`) | Package diagram (`flowchart` with subgraphs) | Workspaces `apps/web` and `packages/shared`; inside `apps/web/src`: `app`, `pages`, `features`, `components/{ui,layout,domain}`, `lib/{api,mock,fields,theme,format-locale}`, `hooks`; arrows are the allowed import directions (pages → features → components and `lib/api`; only `lib/api` → `lib/mock`) | `pnpm-workspace.yaml`, `conventions.md`, `apps/web/src/` |
| 2 | Domain model (`domain`) | Class diagram (`classDiagram`) | `Company`, `TeamMember`, `DocumentType`, `FieldDef`, `ColumnDef`, `FieldAction` and its four kinds, `Document`, `DocumentPage`, `Token`, `FieldValue` (`ExtractedValue`, `TableValue`), `ExportJob`, `ExportMapping`, `Plan`; key attributes only, with multiplicities | `src/lib/mock/types.ts` |
| 3 | Screens (`screens`) | Navigation diagram (`flowchart`) | Every route in the router, grouped as public / auth / app shell, with the links between screens (Inbox → Review, Types → Type → Train, Groups → Group, Review → Export) | `src/app/router.tsx`, `product.md` |
| 4 | Document lifecycle (`lifecycle`) | State diagram (`stateDiagram-v2`) | Every value of `DOCUMENT_STATUSES` and the transitions between them, each labelled with what causes it (pipeline step or user action) | `src/lib/mock/types.ts`, `src/lib/mock/api.ts`, specs 006–009 |
| 5 | Pipeline (`pipeline`) | Sequence diagram (`sequenceDiagram`) | One document from upload to review: browser, API, S3, SQS, Textract, SNS, Claude, Postgres, and the browser polling. Marked **planned** | spec 020 |
| 6 | Deployment (`deployment`) | Deployment diagram (`flowchart` with subgraphs) | Browser, CloudFront + S3 (web), API on Lambda, S3 buckets, SQS, Textract, SES, Supabase (Postgres, auth), Anthropic API; what runs where. Marked **planned** | spec 020, `product.md` |

Diagrams 5 and 6 describe what 020 will build, not what exists. Each carries a visible "Planned (spec 020)" note until 020 is `done`.

## Slices

### [x] 1. Page shell with tabs
- **Build:** add the shadcn `tabs` primitive. New `/architecture` route (lazy) inside the app shell and a `DEV_NAV` entry "Architecture". The page has a `PageHeader`, a tab list with the six tabs, and for the selected tab: title, UML type, description and the list of source paths. The selected tab is `?tab=<id>`; a missing or unknown value falls back to `structure`. The diagram area is a placeholder in this slice. At 375px the tab list scrolls sideways inside its own container.
- **Files:** `src/components/ui/tabs.tsx`, `src/app/router.tsx`, `src/components/layout/nav-items.ts`, `src/pages/architecture/architecture-page.tsx`, `src/features/architecture/diagram-tabs.tsx`, `src/features/architecture/diagram-panel.tsx`, `src/features/architecture/diagrams/index.ts`, `src/features/architecture/diagrams/diagram-def.ts`
- **Accept:**
  - [x] `/architecture` opens from the Developer group in the sidebar and in the mobile nav
  - [x] choosing a tab changes `?tab=`; a reload and the Back button restore the tab; `?tab=nope` shows Structure
  - [x] tabs work from the keyboard (arrow keys, Home/End) and each tab is at least 44px high
  - [x] no horizontal page scroll at 375px

### [x] 2. Mermaid renderer and the Structure diagram
- **Build:** add `mermaid` (see **Open questions**) and load it with a dynamic `import()` from the diagram component only, so it's a separate chunk. `MermaidDiagram` renders a definition to SVG with `securityLevel: 'strict'` and the `base` theme, with `themeVariables` read from the design tokens in `src/styles/index.css`; it renders again when the theme changes. States: skeleton while the library loads and renders; an error message with **Retry** and the raw source when rendering fails. The diagram sits in a focusable container that scrolls in both directions when the diagram is wider than the page; it has `role="img"` and an `aria-label` from the diagram's label and description. Below it, a collapsed "Diagram source" (`details`) with the Mermaid text and a **Copy** button. Write the Structure diagram.
- **Files:** `apps/web/package.json`, `src/features/architecture/mermaid-diagram.tsx`, `src/features/architecture/use-mermaid.ts`, `src/features/architecture/mermaid-theme.ts`, `src/features/architecture/diagram-source.tsx`, `src/features/architecture/diagram-panel.tsx`, `src/features/architecture/diagrams/structure.ts`
- **Accept:**
  - [x] the Structure tab shows both workspaces, every folder listed in the table above, and the import arrows match [conventions.md](../conventions.md)
  - [x] the build shows Mermaid in its own chunk(s); the main chunk and the other pages' chunks don't grow
  - [x] switching light / dark redraws the diagram with token colors, and text meets AA contrast in both
  - [x] a broken definition shows the error state with Retry and the source, and the rest of the page still works
  - [x] at 375px the diagram scrolls inside its container and the page doesn't scroll sideways; the container is reachable and scrollable by keyboard
  - [x] Copy puts the definition on the clipboard and announces it (`role="status"`)

### [ ] 3. Domain model, Screens and Document lifecycle
- **Build:** write diagrams 2, 3 and 4 from the code. Every class, route and status in a diagram must exist in the source named in its `sources`. The domain diagram shows relations and key attributes, not every field.
- **Files:** `src/features/architecture/diagrams/domain.ts`, `src/features/architecture/diagrams/screens.ts`, `src/features/architecture/diagrams/lifecycle.ts`, `src/features/architecture/diagrams/index.ts`
- **Accept:**
  - [ ] every type named in the Domain row of the table is in the class diagram, with multiplicities on `Company`–`Document`, `DocumentType`–`FieldDef`, `Document`–`DocumentType` (id + version) and `Document`–`DocumentPage`–`Token`
  - [ ] every path in `router.tsx` except `*` and the `/app` redirect is in the Screens diagram, and no path is in it that isn't in the router
  - [ ] the lifecycle shows every value of `DOCUMENT_STATUSES` and no other state, and each transition has a label
  - [ ] all three render with no error in light and dark

### [ ] 4. Pipeline and Deployment (planned)
- **Build:** write diagrams 5 and 6 from spec 020's **Architecture** table and pipeline line. Add an optional `planned?: { spec: string }` to `DiagramDef`; the panel shows a "Planned (spec 020): not built yet" note above such a diagram.
- **Files:** `src/features/architecture/diagrams/pipeline.ts`, `src/features/architecture/diagrams/deployment.ts`, `src/features/architecture/diagrams/diagram-def.ts`, `src/features/architecture/diagram-panel.tsx`, `src/features/architecture/diagrams/index.ts`
- **Accept:**
  - [ ] the sequence follows 020: upload to S3 → SQS → Textract → SNS → SQS → Claude (classify, extract) → Postgres, with the browser polling
  - [ ] every service in 020's **Architecture** table is in the Deployment diagram
  - [ ] both tabs show the planned note; the other four don't
  - [ ] no secret, account id or project ref from 020 appears in a diagram

### [ ] 5. Keeping the diagrams true
- **Build:** add a "keep diagrams current" rule: a slice that adds a route, a domain type, a document status, a `src/` folder or a service updates the matching diagram in the same slice. Mention the page in `CLAUDE.md`.
- **Files:** `docs/conventions.md`, `docs/process.md`, `CLAUDE.md`
- **Model:** haiku
- **Accept:**
  - [ ] [conventions.md](../conventions.md) names which change updates which diagram
  - [ ] `CLAUDE.md` points to `/architecture` and the `diagrams/` folder

## Backend needs
None.

## Open questions
- **New library: `mermaid`?**
  - **Decided (2026-11-12):** yes, approved. Loaded with a dynamic `import()` on this page only.
- **Hand-written or generated?**
  - **Decided (2026-11-12):** hand-written, kept true by the rule in slice 5. Generating from `types.ts` or `router.tsx` is a later spec if the diagrams drift.
- **Which diagrams?**
  - **Decided (2026-11-12):** the six in the table. Left out: a component tree per screen, the action expression model (016/017), the export mapping model (018).
- **Planned diagrams (5, 6) now or after 020?**
  - **Decided (2026-11-12):** now, with the "Planned (spec 020)" note.
- **Route name and visibility?**
  - **Decided (2026-11-12):** `/architecture`, in the Developer nav group, visible in every build like `/design`.
- **Pan and zoom?**
  - **Decided (2026-11-12):** out. The diagram scrolls inside its container.
- **UI check routes?**
  - **Decided (2026-11-12):** all six tabs: `architecture`, `architecture?tab=domain`, `…screens`, `…lifecycle`, `…pipeline`, `…deployment`.
- **Found in slice 2: the code breaks "only `lib/api` imports `@/lib/mock`".** Many `features` and `components/domain` files import runtime helpers from `@/lib/mock/format` (`formatDate`, `formatMoney`, `confidenceLevel`) and types from `@/lib/mock/templates`. The Structure diagram shows the rule, not the drift. To decide: move the formatters out of `lib/mock` (a small spec), or amend the rule.
- **Found in slice 2:** `@docspread/shared` is a workspace dependency of the web app but nothing in `src` imports it yet. The diagram labels the arrow "workspace dependency".
- **Found in slice 2:** the Structure diagram is 1556px wide, so it scrolls sideways even at 1280px. Zoom / fit-to-width was decided out; revisit if scrolling proves annoying.
- **Found in slice 2:** Vite's 500 kB chunk warning is back, for two of Mermaid's own lazy chunks. They load only on `/architecture`. To silence it, raise `build.chunkSizeWarningLimit` or split with `manualChunks`.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-12 | — | draft | written from the request "a page with tabs for UML diagrams, to see the structure of the project" |
| 2026-11-12 | — | ready | questions answered up front; all recommendations accepted |
| 2026-11-12 | 1 | done (sonnet, designer) | shadcn `tabs` primitive (the CLI wrote a wrong `cn` import and a bogus `cn` dependency; both fixed, no new dependency). Lazy `/architecture` route, `DEV_NAV` entry, `pages/architecture/architecture-page.tsx`, `features/architecture/{diagram-tabs,diagram-panel}.tsx`, `diagrams/{diagram-def,index}.ts` with metadata for all six diagrams and `code: ''`. Tab in `?tab=` via `setSearchParams` (pushes history); unknown value → Structure. Typecheck, lint, build green; ui-check on `architecture` and `architecture?tab=nope` passed. |
| 2026-11-12 | 2 | done (sonnet, designer) | `mermaid` ^12.3.0, loaded only through `await import('mermaid')` in `use-mermaid.ts`: main chunk 436.9 kB (was 438.4), `mermaid` absent from it; Mermaid ships as ~180 lazy chunks and Vite warns about two of them over 500 kB (`elk`, one shared chunk). `mermaid-theme.ts` converts the oklch tokens to hex on a canvas and feeds the `base` theme; redraws on theme change. `mermaid-diagram.tsx` (skeleton, error + Retry + source, `role="img"` scroll container), `diagram-source.tsx` (`details`, Copy, `role="status"`), `diagrams/structure.ts`. Checked: broken definition → alert + Retry + source; 375px diagram scrolls in its container by keyboard; Copy fills the clipboard. Not checked: Retry after an error succeeding, the clipboard failure message. Typecheck, lint, build green; ui-check on `architecture` passed, screenshots reviewed. |
