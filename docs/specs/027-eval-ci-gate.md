# 027 — CI eval gate: a PR that lowers extraction accuracy fails

**Status:** postponed · **Depends on:** 026 · **Route(s):** —

## Goal
When a pull request changes a prompt, the extraction schema, the value mapping or the dataset, GitHub runs the extraction evals (026) and compares the result with the committed baseline. If accuracy, calibration or classification drop beyond the measured noise, the check fails and the PR shows a table of what got worse. Prompt work becomes safe to merge without re-checking everything by hand.

## Scope
- In:
  - `evals/evals/gate.py`: compares a run's `metrics.json` with the baseline and decides pass, warn or fail, with pytest tests on fixture files.
  - A cheap workflow job on every PR that touches `evals/**`: `uv sync`, pytest, dataset validation. No secrets, no API spend.
  - The eval workflow: on PRs that touch the paths below, and by hand (`workflow_dispatch`), it runs the full dataset on the production extraction model, runs the gate, writes the comparison to the job summary and one updated PR comment, and uploads the report as an artifact.
  - Spending limits: a dedicated Anthropic API key with its own monthly limit, the runner's `--max-usd`, one run per PR at a time (`concurrency`, older runs cancelled).
  - How to change the baseline on purpose, and how the owner accepts a known drop.
  - `docs/process.md`: the Definition of Done gains "a spec that changes prompts, schema or mapping passes the eval gate"; `docs/setup.md`: the secret.
- Out: running evals on every PR (only relevant paths); Haiku in CI (the gate checks the model production uses; comparisons stay a local `--models` run); fork PRs (no secrets there; the repo has one owner); nightly runs (can be added with a `schedule:` line later).

## Data
- Paths that start the eval job:
  ```
  services/api/src/pipeline/{claude,extract-core,extract-schema,extract-map,field-types,ocr-*,page-types}.ts
  services/api/scripts/eval-extract.ts
  services/api/package.json            # SDK or OCR library upgrades
  evals/**
  ```
- Gate rules (the numbers come from 026's measured noise; the values below are placeholders until then):

  | Metric (production model) | Fail when | Warn when |
  | --- | --- | --- |
  | Field accuracy, overall | drops more than **2 pp** | drops more than 1 pp |
  | Field accuracy, any required field | drops more than **10 pp** | drops more than 5 pp |
  | Verified precision (values ≥ 0.9 that are correct) | drops more than **2 pp** or falls below **95 %** | drops more than 1 pp |
  | Error-catch rate | drops more than **5 pp** | — |
  | Classification accuracy | any drop beyond one document | — |
  | Hallucination rate | rises more than **1 pp** | — |
  | Cost per document (mean) | — | rises more than 25 % |
  | Latency p95 | — | rises more than 50 % |
  | Documents ending in `error` | more than the baseline | — |
- The baseline is `evals/baseline/metrics.json` **from the PR's base branch** (read with `git show origin/<base>:…`), so a PR can't pass by lowering its own baseline.
- Thresholds live in `evals/gate.toml`, next to the baseline, so changing them is a visible diff.
- GitHub: environment `evals` with secret `ANTHROPIC_API_KEY` (a separate key, monthly limit set in the Anthropic console) and variable `EVAL_EXTRACT_MODEL` (same value as Vercel's `ANTHROPIC_MODEL_EXTRACT`).

## Slices

### [ ] 1. Gate logic and the free checks
- **Build:** `evals/evals/gate.py` + `evals/gate.toml`: `uv run python -m evals.gate --baseline <file> --run <metrics.json>` prints a Markdown table (metric, baseline, this PR, difference, verdict) and exits 1 on any fail. Missing metrics in either file are a fail with a clear message (catches a renamed key). `.github/workflows/evals.yml` with a first job `evals-unit` on PRs touching `evals/**`: `astral-sh/setup-uv`, `uv sync --frozen`, `uv run pytest`, dataset validation.
- **Files:** `evals/evals/gate.py`, `evals/gate.toml`, `evals/tests/test_gate.py`, `evals/tests/fixtures/*.json`, `.github/workflows/evals.yml`
- **Model:** sonnet
- **Accept:**
  - [ ] fixtures for pass, warn-only, each fail rule, and a missing key give the expected verdicts and exit codes
  - [ ] the `evals-unit` job runs green on this PR without any secret

### [ ] 2. The eval job (owner adds the key)
- **Build:** job `evals-run` (needs `evals-unit`), `environment: evals`, path filter above, `workflow_dispatch` with an optional `model` input. Steps: checkout with `fetch-depth: 0`, pnpm + Node from `packageManager`, `pnpm install --frozen-lockfile --filter @docspread/api...`, cache the tesseract language data, uv; `uv run python -m evals.run --models "$EVAL_EXTRACT_MODEL" --max-usd 15 --label pr-<n>`; analyze; gate against the base branch's baseline; append the table to `$GITHUB_STEP_SUMMARY`; upload `report.md`, `metrics.json` and `charts/` as an artifact (14 days, no per-document values). `concurrency: evals-${{ github.ref }}` with `cancel-in-progress: true`; `timeout-minutes: 30`; `permissions: contents: read`. Owner job, one step at a time: create the Anthropic key with a monthly limit, add the `evals` environment, secret and variable.
- **Files:** `.github/workflows/evals.yml`, `docs/setup.md`
- **Model:** sonnet
- **Accept:**
  - [ ] a PR that only touches `docs/` runs no eval job; a PR touching `extract-schema.ts` runs it
  - [ ] the job summary shows the gate table; the artifact holds the report
  - [ ] the key never appears in logs (masked); a missing secret fails with one clear line, not a stack trace
  - [ ] the run's cost and duration are recorded in the log

### [ ] 3. PR comment, accepted drops, baseline updates and proof
- **Build:** one PR comment updated in place (found by a hidden marker; `pull-requests: write` for that step only) with the gate table and a link to the artifact. A label `eval-drop-accepted`, added by the owner, turns fails into warnings for that PR (the comment says so). Updating the baseline on purpose: the PR commits the new `evals/baseline/metrics.json` + `report.md` from its own run (artifact) and the gate still compares against the base branch, so the improvement or the accepted drop is visible in review. `docs/process.md`: Definition of Done line; `evals/README.md`: when and how to update the baseline. Proof: on a throwaway branch, weaken `EXTRACT_SYSTEM` (for example drop "never invent values") and check that the gate fails; revert and check that it passes.
- **Files:** `.github/workflows/evals.yml`, `docs/process.md`, `evals/README.md`
- **Model:** sonnet
- **Accept:**
  - [ ] the weakened-prompt branch fails the check with the failing metrics named in the comment; the revert passes (both run links in the log)
  - [ ] a second push to the same PR updates the comment instead of adding one
  - [ ] with the label, a failing run shows as accepted and the check passes

## Backend needs
None.

## Open questions
- **Which model does CI run?** Recommended: only the production extraction model (Opus today), read from a repo variable. Running Haiku too would double the work in CI for little value; the comparison stays a local `--models opus,haiku` run.
- **What does the gate compare against?** (a) the baseline on the base branch; (b) the baseline in the PR.
  - Recommended: (a). With (b) a PR could lower its own baseline and pass.
- **How strict?** Recommended: thresholds from 026's measured noise (placeholders above); verified precision gets an absolute floor (95 %) because it is what users trust without checking.
- **Cost?** Roughly $3–6 per run at today's Opus prices (026 measures the real figure), only on PRs touching the listed paths. Recommended: a separate key with a monthly limit (for example $50) plus `--max-usd 15` per run.
- **Who can accept a drop?** Recommended: the owner, with the `eval-drop-accepted` label; the comment records it.
- **Branch?** `eval-gate-027`, after 026 is merged.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
