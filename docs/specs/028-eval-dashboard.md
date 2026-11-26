# 028 — Eval dashboard (optional): a small FastAPI service over the runs

**Status:** postponed · **Depends on:** 026 · **Route(s):** — (separate local service)

## Goal
A local web page and a small JSON API for the eval runs: list runs, open one, compare two, and see accuracy, calibration and cost over time. It makes the history easier to browse than Markdown files. It is optional: 026's `report.md` and 027's PR comment already carry the numbers, so this spec can be dropped without loss.

## Scope
- In:
  - A FastAPI app at `evals/server/` that reads `evals/runs/*/` and `evals/baseline/` (files only, no database).
  - JSON endpoints and a server-rendered dashboard (Jinja templates + the charts 026 already draws, or a small chart library from a CDN).
  - pytest tests with FastAPI's `TestClient` on fixture runs.
  - `uv run fastapi dev evals/server/app.py`, documented in `evals/README.md`.
- Out: hosting it anywhere (local only; see open questions); auth; writing or starting runs from the page; reading CI artifacts from GitHub (download them into `evals/runs/` first).

## Data
- Endpoints:
  - `GET /api/runs`: id, label, time, git sha, models, cost, headline field accuracy per model.
  - `GET /api/runs/{id}`: `run.json` + `metrics.json`.
  - `GET /api/runs/{id}/documents`: per-document outcome, field verdicts and cost (scored values, no raw OCR text).
  - `GET /api/compare?a={id}&b={id}`: the gate table of 027 for any two runs (reuses `gate.py`).
  - `GET /api/trend?metric=fieldAccuracy&model=…`: one value per run, oldest first.
  - `GET /`: runs list; `GET /runs/{id}`: report page; `GET /compare`: picker and diff; trend charts on the list page.
- Python libraries (new, need approval): `fastapi[standard]` (includes uvicorn), `httpx` (TestClient).

## Slices

### [ ] 1. JSON API
- **Build:** `evals/server/app.py` with the five JSON endpoints, pydantic response models, a `RUNS_DIR` setting (default `evals/runs`). An unknown or half-written run returns 404 or a clear error, never a 500. The OpenAPI page (`/docs`) lists every endpoint.
- **Files:** `evals/server/{__init__,app,models,store}.py`, `evals/tests/test_server.py`, `evals/tests/fixtures/runs/*`
- **Model:** sonnet
- **Accept:**
  - [ ] TestClient tests cover every endpoint, including a missing run and a run without `metrics.json`
  - [ ] `/api/compare` gives the same verdicts as `python -m evals.gate` on the same pair

### [ ] 2. Dashboard pages
- **Build:** Jinja pages: runs list with a trend chart of field accuracy, verified precision and cost per document; a run page (headline metrics, per-field table, reliability diagram, slowest and most expensive documents, documents with wrong fields linked to their verdicts); a compare page. Readable at 375 px and 1280 px, light and dark (`prefers-color-scheme`), no console errors.
- **Files:** `evals/server/templates/*.html`, `evals/server/static/*`, `evals/server/app.py`
- **Model:** sonnet
- **Accept:**
  - [ ] with the 026 baseline run present, all three pages render with real numbers that match `report.md`
  - [ ] screenshots at both widths in light and dark recorded in the log; no horizontal scroll

## Backend needs
None.

## Open questions
- **Build it at all?** Recommended: decide after 027. If the PR comment and `report.md` are enough in practice, drop this spec. Its value is mostly the trend over many runs and Python/FastAPI practice.
- **Local or hosted?** (a) local only; (b) on Vercel's Python runtime as a separate project, reading runs from a Supabase Storage bucket the CI uploads to.
  - Recommended: (a). (b) means a new deployment, storage for runs and auth, for a page only the team uses.
- **Python libraries?** `fastapi[standard]`, `httpx`. Recommended: approve if the spec goes ahead.
- **Branch?** `eval-dashboard-028`, after 026 (it can run in parallel with 027).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
