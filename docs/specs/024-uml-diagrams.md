# 024 — UML diagrams: system, user and document flows (dev only)

**Status:** in-progress · **Depends on:** 021 · **Route(s):** `/architecture` (dev only), `/design` (dev only)

## Goal
In local dev, a developer opens `/architecture` and can see how DocSpread works end to end: which services run where (Vercel, Supabase, GitHub, Anthropic), how a document travels from file to spreadsheet, how a user moves through the product, and how code reaches production. Hovering over or tapping any box in a diagram explains what that item is and what it does in DocSpread. Large diagrams can be zoomed, panned and fitted to the screen. The page no longer ships in production builds.

## Scope
- In:
  - **Dev only.** `/architecture`, `/design` and the **Developer** nav group exist only when `import.meta.env.DEV` is true (`pnpm dev`, `vercel dev`, the UI check). Production and preview builds contain neither the routes nor their chunks (Mermaid included); `/architecture` there shows the not-found page. This replaces 021's decision ("visible in every build until auth is real"): 023 makes auth real.
  - **Four new diagrams** (table below): System context, User flow, Document flow, Delivery (GitHub). The six from 021 stay and are corrected where they've drifted (e.g. the Deployment diagram still labels GitHub Actions "planned", but `.github/workflows/migrate.yml` exists).
  - **Item tooltips on every diagram.** Every node (flowchart and C4-style boxes, states, classes, sequence participants) has an entry that explains it: what the item is, what it does in DocSpread, where it lives in the repo, and a link to the vendor's docs for third-party services. Hover (desktop) or tap/focus (touch, keyboard) opens it. The same items are listed as text under the diagram, which also serves screen readers.
  - **Pan, zoom, fit, fullscreen** for every diagram.
- Out: generating diagrams from code; editing in the UI; export to PNG/SVG; tooltips on edges and sequence messages; a FigJam/Figma copy; clickable nodes that navigate; showing the page in production behind a flag.
- Definition of Done: as in 021. There is no data and no mocks, so the empty state doesn't apply; loading and error states apply to rendering. The UI check runs against Vite dev, so it still covers these routes.

## Data
No mock functions, no query hooks. Additions to `src/features/architecture/diagrams/`:

```ts
// glossary.ts — one entry per thing, reused by every diagram that draws it
export const PROVIDERS = ['vercel', 'supabase', 'github', 'anthropic', 'browser', 'app'] as const
export type Provider = (typeof PROVIDERS)[number]

export interface GlossaryEntry {
  title: string          // "pgmq queue: ocr"
  provider: Provider     // shown as a badge: Vercel / Supabase / GitHub / Anthropic / Browser / App code
  summary: string        // what it is, one sentence, vendor-neutral
  role: string           // what it does in DocSpread, one or two sentences
  where?: string[]       // repo paths (e.g. 'apps/web/api/pipeline/ocr.ts', 'supabase/migrations/…')
  docsUrl?: string       // vendor docs, third-party items only
}
export const GLOSSARY: Record<GlossaryKey, GlossaryEntry>   // GlossaryKey derived from an `as const` key list

// diagram-def.ts — DiagramDef gains
items: Record<string, GlossaryKey>   // Mermaid node id → glossary entry; every node in `code` has one
```

### The diagrams after 024
Tab order, with `context` as the new default tab (a missing or unknown `?tab=` falls back to it):

| # | Tab (`?tab=`) | Type (Mermaid) | Shows | Drawn from | New |
| --- | --- | --- | --- | --- | --- |
| 1 | System context (`context`) | C4 context, drawn as a `flowchart` in C4 style (Mermaid's `C4Context` is experimental) | The user, DocSpread (web app + API), and the outside systems with one labelled arrow each: Vercel (hosting, functions), Supabase (auth, Postgres, storage, queues, cron), Anthropic (Claude), GitHub (code, Actions) | `CLAUDE.md`, `docs/product.md`, `apps/web/vercel.json`, `.github/workflows/` | ✓ |
| 2 | Structure (`structure`) | Package diagram | as 021, plus `services/api`, `supabase/`, `apps/web/api/`, `src/lib/real` (once 023 adds it) | as 021 | |
| 3 | Domain model (`domain`) | Class diagram | as 021 | as 021 | |
| 4 | Screens (`screens`) | Navigation diagram | as 021, without the dev-only routes in production terms (they're labelled "dev only") | as 021 | |
| 5 | User flow (`user-flow`) | Activity diagram (`flowchart` with swimlanes User / Web app / Backend) | Sign up with a company (or sign in) → create a document type → upload → wait for processing → review, edit, approve or reject → export a spreadsheet. Branches: company or email taken, wrong password, file refused, unclassified (assign a type), error, reject. A note marks which steps use the real backend with mocks off and which are mock-only | `src/app/router.tsx`, `docs/product.md`, specs 005–009, 023 | ✓ |
| 6 | Document lifecycle (`lifecycle`) | State diagram | as 021 | as 021 | |
| 7 | Document flow (`document-flow`) | Activity diagram (`flowchart` with swimlanes Browser / Vercel Functions / Supabase / Anthropic) | One file from end to end: `/api/uploads` → signed upload to Storage `documents` → `complete` → pgmq `ocr` → pg_cron + pg_net call `pipeline/ocr` → pages and tokens in Postgres → pgmq `extract` → `pipeline/extract` → Claude classify + extract → values in Postgres (`needs_review` / `unclassified` / `error`) → browser polls → review → `/api/exports` → spreadsheet in Storage `exports` → signed download. Each step is labelled with the document status it sets | `services/api/src/`, `apps/web/api/`, `supabase/migrations/`, specs 022, 023 | ✓ |
| 8 | Pipeline (`pipeline`) | Sequence diagram | as 021/022 | as 022 | |
| 9 | Deployment (`deployment`) | Deployment diagram | as 022, with GitHub Actions no longer "planned" | as 022 | |
| 10 | Delivery (`delivery`) | Activity diagram (`flowchart` with swimlanes Developer / GitHub / Vercel / Supabase) | Branch per spec → commits → `vercel deploy --prod` before a merge (by Claude) → PR → Vercel preview deployment → merge to `main` → Vercel Git deploy to production; in parallel, `migrate.yml` runs `supabase db push` to `docspread-dev` when `supabase/migrations/**` changed; the owner's manual `supabase db push --password` path; secrets in the GitHub environment `dev` and Vercel env | `.github/workflows/migrate.yml`, `CLAUDE.md`, `docs/setup.md`, `docs/process.md` | ✓ |

No secret, account id, project ref or key appears in a diagram or a glossary entry; names like `docspread-dev` and the region are fine.

## Slices

### [x] 1. Dev-only routes and nav
- **Build:** in `router.tsx`, add the `/design` and `/architecture` route objects only when `import.meta.env.DEV` is true, so Vite drops their lazy imports from the production build. `DEV_NAV` is empty in production, and the sidebar and mobile nav hide the Developer group when it is empty. Update `CLAUDE.md` (the page is dev only) and note in this spec's log that 021's visibility decision is replaced.
- **Files:** `src/app/router.tsx`, `src/components/layout/nav-items.ts`, the sidebar and mobile nav components that render `DEV_NAV`, `CLAUDE.md`
- **Model:** sonnet
- **Accept:**
  - [x] `pnpm dev`: both pages open from the Developer group in the sidebar and the mobile nav, as before
  - [x] `pnpm build`: `dist/` has no architecture, design or Mermaid chunk (checked by grepping `dist/assets` for `mermaid` and `architecture-page`); the main chunk doesn't grow
  - [x] `pnpm preview`: `/architecture` and `/design` show the not-found page; no Developer group in either nav
  - [x] typecheck, lint, build green; the UI check of `architecture` still passes

### [ ] 2. Pan, zoom, fit and fullscreen
- **Build:** add `react-zoom-pan-pinch` (see **Open questions**) inside the lazy architecture chunk only. Wrap the rendered SVG: a toolbar with Zoom in, Zoom out, Fit, 100% and Fullscreen (icon buttons with labels, ≥ 44px); drag to pan, wheel or trackpad pinch to zoom on desktop, two-finger pinch on touch; keyboard `+`, `-`, `0` (fit) while the diagram has focus. A diagram opens fitted to the container width, or at 100% if it's narrower. Zoom range 25%–400%; the current zoom is shown. Fullscreen opens the same diagram in a full-screen `Dialog` with the same controls; Esc closes it. Fit runs again when the container resizes or the theme redraws the SVG. Replaces 021's scroll container.
- **Files:** `apps/web/package.json`, `src/features/architecture/mermaid-diagram.tsx`, new `src/features/architecture/diagram-viewport.tsx`, `diagram-toolbar.tsx`
- **Model:** sonnet (designer)
- **Accept:**
  - [ ] the 1556px-wide Structure diagram opens fully visible at 1280px and 375px; zoom and pan work by mouse, touch and keyboard
  - [ ] at 375px the toolbar fits without page scroll; the page itself never scrolls sideways
  - [ ] fullscreen opens and closes (button and Esc) and returns focus to the Fullscreen button
  - [ ] the library is absent from the main chunk; build output compared before and after

### [ ] 3. Item tooltips and the glossary
- **Build:** `glossary.ts` and `items` on `DiagramDef`, as in **Data**. After Mermaid renders, a resolver per diagram type finds each node in the SVG by its Mermaid id (flowchart and state `g.node`, class `g.node`, sequence actor boxes), makes it focusable (`tabindex="0"`, `role="button"`, `aria-label` = entry title) and attaches handlers. The tooltip is a Radix `Popover` (from `radix-ui`, already installed; see **Open questions**) anchored to the node with a virtual anchor: hover opens after 300 ms and closes on leave, click or tap pins it open, Enter/Space opens it from the keyboard, Esc or a click outside closes it. Content: title, provider badge, "What it is" (`summary`), "In DocSpread" (`role`), `where` paths in mono, and "Docs ↗" (`docsUrl`, opens in a new tab with `rel="noopener noreferrer"`). It follows the node while zooming and panning, or closes when the node scrolls out of view. Under the diagram, a collapsed "Items in this diagram" `details` lists the same entries grouped by provider. In dev, a node without an entry, or an entry whose node isn't found, logs `console.warn` with the diagram and node id. Write glossary entries and `items` for the six existing diagrams.
- **Files:** `src/features/architecture/diagrams/{glossary,diagram-def,index,structure,domain,screens,lifecycle,pipeline,deployment}.ts`, new `src/features/architecture/{diagram-items.ts,node-tooltip.tsx,diagram-items-list.tsx}`, `mermaid-diagram.tsx`, `diagram-panel.tsx`
- **Model:** sonnet (designer)
- **Accept:**
  - [ ] every node of the six diagrams opens a tooltip; no `console.warn` from the resolver on any tab
  - [ ] it works by hover, tap (375px) and keyboard (Tab to a node, Enter, Esc); focus is visible on the SVG node
  - [ ] the tooltip stays inside the viewport at 375px and reads correctly in light and dark (AA contrast)
  - [ ] it works at any zoom level from slice 2
  - [ ] "Items in this diagram" lists every entry with the same text

### [ ] 4. System context and Delivery (GitHub)
- **Build:** write diagrams 1 and 10 with their `items` and glossary entries (Vercel project, Vercel Functions, preview vs production deployment, Vercel Git integration, GitHub repository, pull request, GitHub Actions `migrate.yml`, GitHub environment `dev`, Supabase CLI, `docspread-dev`, Anthropic Claude API, …). Fix the Deployment diagram's GitHub nodes (Actions exists, migrations on merge to `main` when `supabase/migrations/**` changes). `context` becomes the default tab.
- **Files:** `src/features/architecture/diagrams/{context,delivery,deployment,glossary,diagram-def,index}.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] the context diagram has Vercel, Supabase, Anthropic and GitHub, each with a labelled arrow that matches the code (`vercel.json`, `services/api`, `migrate.yml`)
  - [ ] the delivery diagram matches `migrate.yml` (trigger, paths filter, environment, `supabase db push`) and the deploy rules in `CLAUDE.md`
  - [ ] `/architecture` with no `?tab=` shows System context; `?tab=nope` too
  - [ ] every node opens a tooltip; no secrets or project refs in code or glossary

### [ ] 5. Keeping the diagrams true
- **Build:** extend the rule in `conventions.md` → Architecture diagrams: a route change updates Screens and User flow; a status, storage, queue or pipeline change updates Lifecycle, Document flow and Pipeline; a workflow, deploy or env-platform change updates Delivery, Deployment and System context; a new service updates System context and Deployment; every new node gets a glossary entry in the same slice. Add the four new tabs to the UI-check list in `process.md` if one is named there.
- **Files:** `docs/conventions.md`, `docs/process.md`, `CLAUDE.md`
- **Model:** haiku
- **Accept:**
  - [ ] `conventions.md` maps each kind of change to the diagrams it updates, including the glossary rule
  - [ ] `CLAUDE.md` describes the page as dev only with ten diagrams and tooltips

### [ ] 6. User flow and Document flow (after 023)
- **Waits for:** 023 to be `done` (merged), so both flows are drawn once against the real sign-up, upload, review and export. Slices 1–5 don't wait.
- **Build:** write diagrams 5 and 7 with their `items` and glossary entries, from the code after 023. The document flow labels each step with the status it sets, using only values from `DOCUMENT_STATUSES`; the user flow names only routes that exist in `router.tsx`.
- **Files:** `src/features/architecture/diagrams/{user-flow,document-flow,glossary,diagram-def,index}.ts`
- **Model:** sonnet
- **Accept:**
  - [ ] every route in the user flow exists in `router.tsx`; every status in the document flow is in `DOCUMENT_STATUSES`
  - [ ] the document flow names both Storage buckets, both pgmq queues, pg_cron/pg_net, both pipeline functions and both Claude calls, consistent with the Pipeline tab
  - [ ] both render without error in light and dark, at 375px and 1280px; every node opens a tooltip

## Backend needs
None.

## Open questions
- **Tooltip library?**
  - **Decided (2026-11-20):** Radix `Popover` from `radix-ui` (already a dependency), anchored to the SVG node with a virtual anchor. No new dependency.
- **Pan and zoom library?**
  - **Decided (2026-11-20):** `react-zoom-pan-pinch`, approved as a new dependency, loaded only in the architecture chunk.
- **Default tab?**
  - **Decided (2026-11-20):** System context (`context`), the big-picture map. Structure stays a tab.
- **Order with 023?**
  - **Decided (2026-11-20):** build slices 1–5 now (dev-only pages, libraries, tooltips, the existing six diagrams, System context, Delivery, the conventions rule). Slice 6 (User flow, Document flow) waits until 023 is done. Both specs touch `diagrams/*`, so a small merge is expected; whichever merges second rebases.
- **Branch:**
  - **Decided (2026-11-20):** `uml-diagrams-024` from `main`, in its own worktree (`../doc-spread-024`) so the 023 working tree stays untouched.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-20 | — | draft | Written from the owner's request: dev-only route; diagrams covering Vercel, Supabase and GitHub; document flow; user flow; tooltips on every item using a popular stable library; pan/zoom/fit. Builds on 021's page and renderer. |
| 2026-11-20 | — | ready | Owner decisions: Radix Popover, react-zoom-pan-pinch, default tab System context, slices 1–5 now and slice 6 after 023. Slices renumbered: conventions rule is 5, the two flows are 6. |
| 2026-11-20 | 1 | done (sonnet) | `/design` and `/architecture` routes and `DEV_NAV` behind `import.meta.env.DEV`; Developer group hidden when empty; `CLAUDE.md` updated. Replaces 021's "visible in every build". Production build: 79 assets (was 179), no Mermaid/architecture/design chunk, main chunk 339.34 kB (was 436.87). `pnpm preview` not-found checked from the built bundle, not in a browser. UI check `architecture` 4/4. |
