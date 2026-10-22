# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`doc-spread` is an early-stage pnpm + Turborepo monorepo. Workspaces are declared in `pnpm-workspace.yaml` as `apps/*` and `packages/*`.

- `apps/web` — React 19 + Vite 8 SPA (package name `@docspread/web`). Product and layout: `docs/product.md`.
- `packages/shared` — `@docspread/shared`, code shared across apps.

## Commands

Use pnpm (pinned via `packageManager: pnpm@10.28.2`). From the repo root, tasks run through Turbo across all workspaces:

```sh
pnpm install
pnpm dev      # turbo run dev   (persistent, uncached)
pnpm build    # turbo run build (dependencies built first via ^build; outputs dist/**)
pnpm lint     # turbo run lint
```

Scope to one workspace with a filter, e.g. `pnpm --filter @docspread/web dev` or `pnpm turbo run build --filter=@docspread/web`.

Inside `apps/web`: `pnpm build` runs `tsc -b && vite build` (type-checking is part of build; `pnpm typecheck` runs `tsc -b` alone), `pnpm preview` serves the build.

There is no test runner configured yet; the root `test` script is a placeholder that exits with an error.

## Architecture notes

- **Shared package is consumed as raw TypeScript.** `@docspread/shared` has no build step: its `exports` points straight at `./src/index.ts`, and apps depend on it via `workspace:*`. Vite and `tsc` (bundler resolution) compile it as part of the consuming app. Keep it that way unless a non-bundler consumer is added; if you add a `build`/`lint` script to it, Turbo will start running it automatically.
- `packages/shared` currently has no scripts, tsconfig, or ESLint config, so `pnpm lint`/`pnpm build` only exercise `apps/web`.
- `apps/web` TypeScript is strict about unused locals/params and uses `verbatimModuleSyntax` (use `import type` for type-only imports) and `erasableSyntaxOnly` (no enums, namespaces, or parameter properties).
- TypeScript versions differ: root devDependency is `typescript ^7`, while `apps/web` pins `~6.0.3`. Builds in `apps/web` use its local version.
- ESLint (flat config, `apps/web/eslint.config.js`) uses typescript-eslint recommended, react-hooks, and react-refresh (Vite) rules.

## Specs and process

All process documents live in `docs/`:

- `docs/product.md`: what the product is, core concepts, screens, design principles, technical frame.
- `docs/roadmap.md`: status of every spec and the build plan (waves, order). The single source of truth for what's next.
- `docs/process.md`: statuses, what a slice is, models and delegation, the loop, Definition of Done.
- `docs/conventions.md`: the rules every slice is checked against.
- `docs/specs/`: one spec per task, split into slices (`_template.md` for new ones).

`/run-implement` (short: `/run-i`) runs one step of the loop in `docs/process.md`. Key rules: one slice at a time, stop for approval after each; Opus orchestrates, Sonnet implements, Haiku takes mechanical work; the user makes all commits and branches — never run `git commit` or create branches, suggest the message instead.
