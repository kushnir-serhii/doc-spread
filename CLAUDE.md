# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`doc-spread` is an early-stage pnpm + Turborepo monorepo. Workspaces are declared in `pnpm-workspace.yaml` as `apps/*`, `packages/*` and `services/*`. The product runs on Vercel (web and functions), Supabase (database, auth, storage, queues) and Anthropic. Setup from a fresh clone: `docs/setup.md`.

- `apps/web` — React 19 + Vite 8 SPA (package name `@docspread/web`), plus the Vercel Functions in `apps/web/api/` (thin wrappers). Product and layout: `docs/product.md`.
- `packages/shared` — `@docspread/shared`, code shared across apps.
- `services/api` — `@docspread/api`: the API router and the OCR/extract pipeline. The functions import it by relative path.
- `evals/` — Python (uv) project outside the pnpm workspaces: the golden dataset for extraction evals (`evals/dataset/`, rebuilt with `uv run python -m generator all --seed 1`), truth validator (`uv run python -m evals.truth dataset/`), `uv run pytest`. See `evals/README.md`.
- `supabase/` — migrations, pgTAP tests (`supabase/tests/`), `config.toml`.

## Commands

Use pnpm (pinned via `packageManager: pnpm@10.28.2`). From the repo root, tasks run through Turbo across all workspaces:

```sh
pnpm install
pnpm dev      # turbo run dev   (persistent, uncached)
pnpm build    # turbo run build (dependencies built first via ^build; outputs dist/**)
pnpm lint     # turbo run lint
```

Backend and database (Docker Desktop must be running; full steps in `docs/setup.md`):

```sh
supabase start                                      # local stack (Postgres, Auth, Storage)
supabase db reset                                   # apply migrations + seed to the local DB
supabase test db                                    # pgTAP tests in supabase/tests/
supabase db advisors --local --type security        # must report no issues
pnpm --filter @docspread/api smoke                  # API smoke test, in-process ("direct" mode)
SMOKE_API_URL=https://doc-spread.vercel.app/api pnpm --filter @docspread/api smoke   # same, over HTTP
pnpm --filter @docspread/api smoke-pipeline         # upload -> OCR -> Claude; SMOKE_MODE=direct runs in-process
pnpm --filter @docspread/api check-env              # checks the variables in services/api/.env.local
vercel deploy --prod                                # deploy from apps/web (Claude deploys this way before a merge; Git deploys after)
```

Migrations reach `docspread-dev` through GitHub Actions (`.github/workflows/migrate.yml`) on merge to `main`; the owner can also run `supabase db push --password ...`.

Scope to one workspace with a filter, e.g. `pnpm --filter @docspread/web dev` or `pnpm turbo run build --filter=@docspread/web`.

Inside `apps/web`: `pnpm build` runs `tsc -b && vite build` (type-checking is part of build; `pnpm typecheck` runs `tsc -b` alone), `pnpm preview` serves the build. `pnpm ui-check` runs the Playwright UI check (`e2e/ui-check.spec.ts`; starts Vite on port 5199): `SPEC=005 ROUTES=onboarding,inbox pnpm ui-check` screenshots each route at 375px/1280px in light and dark into `e2e/screenshots/<spec>/` (git-ignored) and fails on console errors or horizontal scroll.

There is no test runner configured yet; the root `test` script is a placeholder that exits with an error.

## Architecture notes

- **Shared package is consumed as raw TypeScript.** `@docspread/shared` has no build step: its `exports` points straight at `./src/index.ts`, and apps depend on it via `workspace:*`. Vite and `tsc` (bundler resolution) compile it as part of the consuming app. Keep it that way unless a non-bundler consumer is added; if you add a `build`/`lint` script to it, Turbo will start running it automatically.
- `packages/shared` currently has no scripts, tsconfig, or ESLint config, so `pnpm lint`/`pnpm build` only exercise `apps/web`.
- `apps/web` TypeScript is strict about unused locals/params and uses `verbatimModuleSyntax` (use `import type` for type-only imports) and `erasableSyntaxOnly` (no enums, namespaces, or parameter properties).
- TypeScript versions differ: root devDependency is `typescript ^7`, while `apps/web` pins `~6.0.3`. Builds in `apps/web` use its local version.
- ESLint (flat config, `apps/web/eslint.config.js`) uses typescript-eslint recommended, react-hooks, and react-refresh (Vite) rules.
- **`services/api` is compiled per file by Vercel.** Use `.js` import specifiers for relative imports (`import { x } from './env.js'`) and no top-level `await` in anything a function imports; read env and build clients on the first request.
- **Functions live in `apps/web/api/`** (`router.ts`, `health.ts`, `pipeline/ocr.ts`, `pipeline/extract.ts`) with their own `tsconfig.api.json`. `apps/web/vercel.json` rewrites `/api/*` to `api/router` (every other non-`/api` path to `index.html`) and sets region and `maxDuration`.
- **Env variables:** `VITE_*` ships to the browser; everything else is a secret in Vercel env or `services/api/.env.local`. Adding one: `docs/setup.md`.
- **Architecture diagrams.** The `/architecture` page in `apps/web` is dev only (with `/design`; under `pnpm dev`, `vercel dev` and the UI check, not in production or preview builds, where it shows the not-found page). It shows ten UML diagrams: system context, structure, domain model, screens, user flow, document lifecycle, document flow, pipeline, deployment and delivery (user flow and document flow arrive with 024 slice 6). Every item has a tooltip from `apps/web/src/features/architecture/diagrams/glossary.ts`, and diagrams pan and zoom. The diagrams are hand-written Mermaid text in `apps/web/src/features/architecture/diagrams/` and must be updated with the code (rule in `docs/conventions.md` → Architecture diagrams).

## Specs and process

All process documents live in `docs/`:

- `docs/product.md`: what the product is, core concepts, screens, design principles, technical frame.
- `docs/roadmap.md`: status of every spec and the build plan (waves, order). The single source of truth for what's next.
- `docs/process.md`: statuses, what a slice is, models and delegation, the loop, Definition of Done.
- `docs/conventions.md`: the rules every slice is checked against.
- `docs/specs/`: one spec per task, split into slices (`_template.md` for new ones).

`/run-implement` (short: `/run-i`) runs one step of the loop in `docs/process.md`. Key rules: before any code the agent reads the main docs, pins down the spec's purpose and aims, and asks all questions for the whole spec once, up front (a `draft` spec is moved to `ready` in that same round, after the user approves); then its slices run one after another without stopping (each verified and committed on the spec's branch) and are reported once at the end; Opus orchestrates, Sonnet implements, Haiku takes mechanical work; the user merges branches into `main` (PRs).
