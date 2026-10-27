# Conventions (apps/web)

Every slice is checked against these rules. If a rule gets in the way, raise it in the spec's open questions instead of breaking it quietly.

## Stack (don't add libraries without asking)
React 19 · TypeScript (strict) · Vite 8 · React Router 8 · TanStack Query 5 · Tailwind 4 (`@tailwindcss/vite`) · shadcn/ui (Radix) · lucide-react · pdfjs-dist (document viewer only, loaded lazily).

## Files and folders
**One rule: every file and folder name is `kebab-case`. Case only changes inside the code.** This matches what the shadcn CLI generates (`components/ui/button.tsx`, `hooks/use-mobile.ts`), so there are no exceptions, and no file is ever renamed by case alone, which breaks on Windows and macOS.

| What | File | Inside |
| --- | --- | --- |
| Component | `auth-layout.tsx` | `export const AuthLayout = () => …` |
| Page | `pages/auth/sign-in-page.tsx` | `const SignInPage = () => …` + `export default SignInPage` |
| Hook | `hooks/use-debounce.ts` | `export const useDebounce = …` |
| Utility / service / types | `format-money.ts`, `field-types.ts` | `formatMoney`, `type FieldType` |
| shadcn primitive | `components/ui/button.tsx` | as the CLI generated it |
| Folder | `not-found/`, `document-types/` | |
| Route path (URL) | `/reset-password` | |

- The file name is the kebab-case form of its main export: `AuthLayout` → `auth-layout.tsx`, `useDebounce` → `use-debounce.ts`.
- One exported component per file. Small private helpers used only by that file (not exported) may live next to it, like `Section` in `design-page.tsx`. Once a helper is needed elsewhere, give it its own file.
- Our own components are arrow functions: `export const DocumentTable = ({ rows }: DocumentTableProps) => { … }`. shadcn files in `components/ui/` keep the `function` declarations the CLI generates; don't restyle them.
- Identifiers: components, types and interfaces `PascalCase`; variables, functions and hooks `camelCase`; constants `UPPER_SNAKE_CASE` (`DOCUMENT_STATUSES`).
- Use named exports only. The one exception is pages: see below.
- `src/pages/<route>/`: route components only. They read params, call query hooks and compose features. Little logic. One page per file, named `<name>-page.tsx`, and the page is the file's **default export** (it keeps `lazy` routes short: `m.default`). Each route gets its own folder (`pages/auth/sign-in-page.tsx`, `pages/onboarding/onboarding-page.tsx`). Layouts and helpers used by pages don't live in `pages/`; they go in `components/layout/` or `features/<domain>/`.
- `src/features/<domain>/`: domain UI and logic (`documents/`, `document-types/`, `groups/`, `export/`).
- `src/components/ui/`: shadcn primitives. Add them with `pnpm dlx shadcn@latest add <name>` inside `apps/web` and don't hand-edit them unless necessary.
- `src/components/`: shared custom components (`layout/`, `domain/`).
- `src/lib/api/`: TanStack Query hooks and query keys. The only place that imports `@/lib/mock` functions.
- `src/hooks/`: generic hooks that aren't tied to a domain.
- Import through the `@/` alias. Don't use deep relative paths (`../../..`).

## TypeScript
- No `any`. Use `unknown` and narrow it. No `as` casts unless there's a comment saying why.
- Use `import type` for type-only imports (`verbatimModuleSyntax`).
- No `enum`, `namespace` or parameter properties (`erasableSyntaxOnly`). Use `as const` arrays plus a derived union, the way `DOCUMENT_STATUSES` → `DocumentStatus` works.
- Domain types come from `@/lib/mock/types`. Don't redeclare them. Derive with `Pick`, `Omit` or `Partial`.
- Model state as discriminated unions, not boolean flags (`{ step: 'idle' } | { step: 'uploading'; progress: number }`).
- Money is in integer minor units (`Money.amount`). Format only through `formatMoney` and always show the currency.
- No country defaults. The fallback currency is `DEFAULT_CURRENCY` (USD, `src/lib/fields/default-currency.ts`), or the company's default once a caller has it. A currency that was assumed instead of read must be flagged to the user (a visible warning, and the value stays unverified) — never silently.
- Dates, numbers and amounts are formatted in the user's locale: the browser's by default (`Intl` with no locale), the company's once it sets one (spec 011). Never hard-code a locale such as `pl-PL`.
- Exhaustive `switch` statements on unions end with a `never` check.
- Props types are named `<Component>Props` and declared next to the component.

## React
- Function components only. Keep them small. If a component goes past about 150 lines or holds two concerns, split it.
- Don't put derived state in `useState`. Compute it during render.
- `useEffect` is only for syncing with something outside React (DOM, timers, subscriptions). Never use it for data fetching or for deriving state.
- `useMemo` and `useCallback` only when a measured problem or a memoized child needs them.
- List keys are stable ids, never array indexes.
- Forms use controlled inputs or native `FormData`. Every input has a `<Label htmlFor>`. Get ids from `useId`.
- Lift state only as far as it needs to go. No global store. Server state lives in TanStack Query, URL state in the router.

## Routing (React Router 8)
- All routes live in `src/app/router.tsx` as route objects. Pages load through `lazy`.
- Filters, search, tabs and selected ids that should survive a reload go in the URL (`useSearchParams`, `useParams`).
- Navigate with `<Link>` / `<NavLink>`. Use `useNavigate` only after an action, such as a successful submit.
- Each path appears once in `router.tsx`. When a page replaces a placeholder, delete the placeholder; after a merge, check for a path listed twice (the first match wins and the page silently disappears).

## Data (TanStack Query 5)
- One hook per operation in `src/lib/api/<domain>.ts`: `useDocuments(params)`, `useDocument(id)`, `useApproveDocuments()`.
- Query keys come from a factory (`documentKeys.list(params)`, `documentKeys.detail(id)`). Never write inline arrays.
- Mutations invalidate or update the affected keys. Use optimistic updates only where the spec asks for them.
- Components never call `@/lib/mock` directly.
- Handle `isPending` (skeleton), `isError` (message plus retry) and empty data explicitly.

## Styling
- Only Tailwind utilities generated from the tokens in `src/styles/index.css`. No raw colors, px values or inline styles.
- New tokens go into `src/styles/index.css` first.
- Compose classes with `cn()` from `@/lib/utils`. Use `cva` for variants.
- Amounts use tabular numbers (`tabular-nums`) and are right-aligned in tables.
- Mobile-first classes. Review is desktop-first. Upload, Inbox and Approve must work at 375px. The type builder is desktop-first.
- Pointer cursor on clickable native controls (buttons, selects, checkboxes, radios, `summary`, their labels) comes from the base layer in `src/styles/index.css`. Don't add `cursor-pointer` to them; add it only to custom clickable elements (a `div` row, a card). A new kind of native control goes into that base rule.
- Action rows at 375px: actions are full width and stacked, the primary action last (thumb zone), navigation (Back/Skip) in its own row above. From `sm` up: one row, navigation left, actions right. DOM order matches visual order.
## Accessibility
- WCAG 2.1 AA contrast. Focus must be visible (don't remove outlines).
- Touch targets are at least 44px. Icon-only buttons have an `aria-label`.
- Async results and errors are announced (`aria-live` / `role="status"` / `role="alert"`).
- Every action works from the keyboard. Shortcuts are documented in the UI.

## States (every screen)
Loading (skeleton) · empty (explanation plus next action) · error (message plus retry) · long values (truncate with a title or wrap) · large data (50+ rows or line items).
