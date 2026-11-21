# 022 — Off AWS: Vercel and Supabase only

**Status:** in-progress · **Depends on:** 020 · **Route(s):** — (all routes are served from Vercel)

## Goal
The whole product runs on two platforms, Vercel (web app and backend functions) and Supabase (database, auth, files, queues), with no AWS. Everything 020 delivered keeps working: an upload goes through OCR and Claude into the database. The web app gets a public URL today instead of waiting for CloudFront verification, and the stack drops the free plan's limits (one region, no Textract, 512 MB Lambdas, no GitHub OIDC provider).

## Scope
- In: Vercel hosting for `apps/web` with SPA deep links; the API and both pipeline steps as Vercel Functions under `/api` on the same domain; Supabase Storage instead of S3; Supabase Queues (`pgmq`) with `pg_cron` + `pg_net` instead of SQS and S3 events; secrets in Vercel and Supabase instead of SSM; migrations deployed from GitHub Actions; removing `infra/`, the AWS SDK and the `DocSpread-dev` stack; diagrams, `product.md`, `CLAUDE.md` and a setup guide.
- Out: replacing the mocks on any screen (later specs, starting with auth); production prompts and extraction quality; export file generation; email (020 J6 stays on hold, and when it returns it uses Resend or Supabase SMTP, not SES); a `prod` Supabase project (the demo runs on `docspread-dev`); a custom domain.
- Takes over 020's open slices: **4** (the deploy criterion becomes Vercel's URL), **7** (deploy automation) and **8** (setup docs). 020 closes as `done` when this spec is approved, with a log row pointing here.
- Definition of Done differs like 020's: no screen changes, so the Playwright check runs only for the diagram tabs, and "mock-only data" doesn't apply to `services/api`. `apps/web` still runs on mocks (`VITE_USE_MOCKS=true`) when this spec is done.

## Architecture
| Concern | Before (020) | After (022) |
| --- | --- | --- |
| Web hosting | S3 + CloudFront (blocked by verification) | Vercel, `rewrites` to `index.html` for every non-`/api` path |
| API | Lambda Function URL, CORS | Vercel Function at `/api/*`, same origin, no CORS |
| Document and export files | S3 private buckets, presigned POST | Supabase Storage private buckets `documents` and `exports`, signed upload URL, storage RLS by company prefix |
| Pipeline trigger | S3 event → SQS | `documents` row moves to `uploaded` after the upload is confirmed → `pgmq` queue `ocr` |
| OCR | Lambda (512 MB), SQS → SQS | Vercel Function `/api/pipeline/ocr`, `pdfjs-dist` text layer or `tesseract.js`, then `pgmq` queue `extract` |
| Classify and extract | Lambda, SQS | Vercel Function `/api/pipeline/extract`, Claude as today |
| Retries and dead letters | SQS `maxReceiveCount` 3 + DLQ | `pgmq` `read_ct`: after 3 reads the message is archived and the document gets `error` |
| Who calls the pipeline | SQS event source | `pg_cron` every 30 s → `pg_net` POST to the function with a shared secret; the function drains a batch |
| Secrets | SSM Parameter Store | Vercel env (functions) and Supabase Vault (the pipeline secret and function URL for `pg_net`) |
| Deploys | CDK from the owner's machine | Vercel Git integration (previews and production); `supabase db push` from GitHub Actions |

Pipeline: browser uploads to Storage with a signed URL → `POST /api/uploads/:id/complete` enqueues `ocr` → cron calls `/api/pipeline/ocr` → OCR writes pages and enqueues `extract` → cron calls `/api/pipeline/extract` → Claude → status and values in Postgres. The web app keeps polling (002).

Repo layout after this spec:
```
apps/web/
  api/                  # Vercel Functions, thin wrappers only
    router.ts           # /api/* (rewrite) → services/api router (uploads)
    pipeline/ocr.ts     # /api/pipeline/ocr
    pipeline/extract.ts # /api/pipeline/extract
  vercel.json           # rewrites, function memory and duration, region
services/api/           # @docspread/api: all logic, no AWS SDK
supabase/migrations/    # + storage buckets and policies, queues, cron
```

## Data

### Rules (unchanged from 020)
- Real values never go into git, chat, specs or logs; only `.env.example` files are committed.
- Everything prefixed `VITE_` ships to the browser. Function secrets have no prefix and are set in Vercel only.
- Supabase publishable and secret keys, never the legacy `anon` / `service_role` keys.

### `apps/web/.env.local` (public values)
```sh
VITE_USE_MOCKS=true
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE_URL=/api                     # same origin on Vercel; vercel dev serves it locally
```

### Vercel env and `services/api/.env.local` (secret)
```sh
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL_CLASSIFY=claude-haiku-5-5
ANTHROPIC_MODEL_EXTRACT=claude-opus-5-5
PIPELINE_SECRET=<random, 32+ bytes>        # same value in Supabase Vault; pg_net sends it
STORAGE_DOCUMENTS_BUCKET=documents
STORAGE_EXPORTS_BUCKET=exports
UPLOAD_MAX_BYTES=20971520
CLASSIFY_MIN_CONFIDENCE=0.7
```
Removed: `AWS_PROFILE`, `AWS_REGION`, `S3_*`, `SSM_*`, `EXTRACT_QUEUE_URL`, `ALLOWED_ORIGIN`, `SES_FROM_ADDRESS`.

### GitHub Actions environment `dev`
```sh
SUPABASE_ACCESS_TOKEN    # scoped to this project
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_REF
```

## Your jobs (only you can do these)

### [x] J1. Decide
- Answer the questions under **Open questions** and approve moving this spec to `ready`. Done 2026-11-19.

Claude guides each job one step at a time when a slice first needs it. Order: J1 → slice 2 → J2 → slices 1, 3 → J3 → slices 4, 5 → slice 6 → J5 → J4 → slice 7.

### [x] J2. Vercel
- Create a Vercel account (Hobby is enough for the demo, see Open questions) and import the GitHub repo with Root Directory `apps/web`, "Include files outside the root directory" on.
- Add the variables above to the Production and Preview environments. The secret values (`SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `PIPELINE_SECRET`) are typed by you only.
- Install the Vercel CLI (`npm i -g vercel`; pnpm has no global bin folder here) and run `vercel link` in `apps/web` for local `vercel dev`. Done 2026-11-19: project `doc-spread`, https://doc-spread.vercel.app, link stored at the repo root (`.vercel/repo.json`). Claude added the non-secret variables with the CLI.
- Turn on Windows Developer Mode, so `vercel dev` can create the symlinks its builders need (open: slice 1's `vercel dev` criterion waits for it).
- Done 2026-11-19: the three secrets are in Production only; add them to Preview too when preview deployments are used.

### [x] J3. Supabase secrets
- Generate `PIPELINE_SECRET` and store it, with the production function URL, in Supabase Vault through the SQL editor (slice 4 gives the exact statements). Claude never sees the value.

### [x] J4. GitHub
- Add the three Supabase secrets to the `dev` environment. Done 2026-11-20: token `github-actions-docspread` (90 days, `docspread-dev` only; Projects, Project Settings, Database, Database Config, Connection Pooling, API Keys read; Migrations read-write; no secret values).

### [x] J5. Retire AWS
- `infra/` is gone after slice 6, so the stack is deleted with CloudFormation directly (`dev` buckets have `autoDeleteObjects`, so their files go too). Sign in with `aws login --profile docspread`, then, one at a time:
  - `aws cloudformation delete-stack --stack-name DocSpread-dev --profile docspread --region eu-north-1` and `aws cloudformation wait stack-delete-complete --stack-name DocSpread-dev --profile docspread --region eu-north-1`
  - the two SSM parameters `put-secrets` created outside the stack: `aws ssm delete-parameters --names /docspread/dev/supabase-secret-key /docspread/dev/anthropic-api-key --profile docspread --region eu-north-1`
  - the CDK bootstrap stack `CDKToolkit` (its staging bucket is retained, so empty and delete it after the stack); Claude gives the exact commands at that step.
- The AWS project itself stays idle (decided 2026-11-19); the free plan ends 2027-04-21. Your two old test Lambdas are not part of the stack and stay.
- Delete the AWS lines from your `services/api/.env.local` (slice 6 lists them).

## Slices

### [x] 1. Web app on Vercel
- **Waits for:** J2
- **Build:** `apps/web/vercel.json` with a rewrite of every path except `/api/` to `/index.html`, the functions region next to Supabase (`fra1`), and a `apps/web/api/health.ts` function that returns `{ ok: true }`. The production build runs on mocks. Update `apps/web/.env.example` for `VITE_API_BASE_URL=/api`.
- **Files:** `apps/web/vercel.json`, `apps/web/api/health.ts`, `apps/web/.env.example`, `apps/web/tsconfig*.json` (if `api/` needs its own config), `turbo.json`
- **Model:** sonnet
- **Accept:**
  - [x] the Vercel production URL serves the app, and `/inbox` loads after a reload (020 slice 4's last criterion)
  - [x] `GET /api/health` answers 200 on the Vercel URL and under `vercel dev`
  - [x] typecheck, lint and build stay green; `pnpm dev` still works without the Vercel CLI

### [x] 2. Storage buckets and policies
- **Waits for:** J1
- **Build:** a migration that creates private Storage buckets `documents` and `exports` with `file_size_limit` 20 MB and the allowed MIME types from 007 (pdf, jpeg, png) on `documents`. Policies on `storage.objects`: a member may read objects under their company's prefix (`<company-id>/...`); no client insert, update or delete (uploads only through signed URLs from the API). pgTAP tests like slice 2 of 020.
- **Files:** `supabase/migrations/*`, `supabase/tests/*`, `supabase/config.toml`
- **Model:** sonnet
- **Accept:**
  - [x] `supabase db reset` and `supabase test db` pass; `supabase db advisors` reports no security issues
  - [x] a test proves a member of company A can't read company B's objects
  - [x] the migration is pushed to `docspread-dev` and `migration list` is in sync

### [x] 3. API as a Vercel Function
- **Waits for:** slice 1, slice 2
- **Build:** `services/api` handlers take a web `Request` and return a `Response` (no Lambda event types). `apps/web/api/router.ts` (every `/api/*` path without its own file is rewritten to it in `vercel.json`) forwards to them. `POST /api/uploads` keeps every 020 rule (JWT via JWKS, company from `team_members`, `documents` row, 007 type and size rules) but returns a Storage signed upload URL for `<company>/<document>/<file>`. New `POST /api/uploads/:id/complete` checks the object exists and the caller owns it, moves the document from `uploaded` to `processing` (conditional, so a second call is refused) and enqueues `ocr`. A migration enables `pgmq`, creates queues `ocr` and `extract`, and adds service-only queue functions (`queue_send`, `queue_read`, `queue_delete`, `queue_archive`; `service_role` only). Env comes from `process.env` only: `readSecretFromSsm` and the `SSM_*` fallbacks go. `smoke-api` and `check-env` move to the new contract.
- **Files:** `services/api/src/{handler,env,auth,upload-rules}.ts`, `services/api/scripts/{smoke-api,check-env}.ts`, `services/api/.env.example`, `services/api/package.json`, `apps/web/api/router.ts`, `apps/web/vercel.json`, `supabase/migrations/*`, `supabase/tests/*`
- **Model:** sonnet
- **Accept:**
  - [x] no token or a bad token gets 401; an oversized or disallowed file is refused
  - [x] the signed URL writes only that one path; an upload under another company's prefix is refused
  - [x] `complete` for a missing object or another company's document is refused
  - [x] `smoke-api` passes against the Vercel production URL; startup with a missing variable names it; the log scan finds no secret
  - [x] no client role can read, send to or archive a queue (pgTAP)

### [x] 4. Cron trigger
- **Waits for:** slice 3, J3
- **Build:** a migration enabling `pg_cron` and `pg_net` (the queues come from slice 3); a `pg_cron` job every 30 seconds that, when a queue has visible messages, POSTs to the matching function with the `PIPELINE_SECRET` header read from Vault. The function URL and secret are read from Vault, never stored in a migration. Document the Vault statements for J3 in the slice report.
- **Files:** `supabase/migrations/*`, `supabase/tests/*`
- **Model:** sonnet
- **Accept:**
  - [x] a message put on `ocr` triggers exactly one call to `/api/pipeline/ocr` within a minute
  - [x] no client role can call the cron job's function or read the Vault secrets
  - [x] the migration contains no secret or URL; advisors report no security issues

### [x] 5. Pipeline on Vercel Functions
- **Waits for:** slice 4
- **Build:** `apps/web/api/pipeline/{ocr,extract}.ts` check the `PIPELINE_SECRET` header, read a batch from their queue with a visibility timeout longer than the function's duration, process each message, delete it on success, archive it and set the document to `error` after the third read. OCR reads the file from Storage and enqueues `extract`; extract reads the file from Storage and calls Claude as today. `sqs.ts` becomes a small queue module over `pgmq`; the S3 event parsing goes. `vercel.json` gives both functions `maxDuration: 300` (the Hobby maximum; memory is fixed at 2 GB on Hobby), and the queue visibility timeout is about 330 s. `smoke-pipeline` moves to Storage and the new trigger.
- **Files:** `services/api/src/pipeline/**`, `services/api/scripts/smoke-pipeline.ts`, `apps/web/api/pipeline/*`, `apps/web/vercel.json`
- **Model:** sonnet
- **Accept:**
  - [x] a multi-page PDF uploaded through the Vercel production URL reaches `needs_review` with values and confidence
  - [x] a scanned JPG goes through Tesseract and reaches a final status other than `error` (`needs_review` when a matching type exists); OCR boxes stay normalized 0..1, origin top-left
  - [x] a broken file ends in `error` and the queue keeps moving
  - [x] a call without the right secret gets 401 and touches no queue
  - [x] token usage and cost are still logged; the 30-page PDF from 020's smoke test fits in the function's duration, or the report says how long it took

### [x] 6. Remove AWS
- **Waits for:** slice 5
- **Build:** delete `infra/` and its workspace entry, every `@aws-sdk/*` dependency, `infra/scripts/put-secrets.ts` and `add-native-binary.mjs`, AWS lines in `.env.example` files and `.gitignore`, and `cdk.out/`. Then tell the owner to run J5. Update `structure.ts`, `pipeline.ts`, `deployment.ts` and `diagrams/index.ts`.
- **Files:** `infra/**`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `services/api/package.json`, `.gitignore`, `apps/web/src/features/architecture/diagrams/*`
- **Model:** haiku (deletions); sonnet for the diagrams
- **Accept:**
  - [x] `grep -ri "aws-sdk\|cdk\|sqs\|ssm" --exclude-dir=node_modules` finds nothing outside docs history and spec logs
  - [x] `pnpm install`, typecheck, lint and build are green
  - [x] the three diagrams show Vercel and Supabase only; the UI check passes for `/architecture?tab=structure`, `?tab=pipeline` and `?tab=deployment`

### [ ] 7. Deploys and docs
- **Waits for:** slice 6, J4
- **Build:** a GitHub Actions workflow that runs `supabase db push` to `dev` on merge to `main` (Vercel deploys the app itself). Update the technical frame in `docs/product.md`, the commands in `CLAUDE.md`, and write `docs/setup.md`: clone to a running local stack (`supabase start`, `vercel dev`), and how to add an env variable.
- **Files:** `.github/workflows/migrate.yml`, `docs/product.md`, `CLAUDE.md`, `docs/setup.md`
- **Model:** haiku
- **Accept:**
  - [ ] a merge to `main` applies new migrations to `dev` with no stored database URL in the repo
  - [ ] a fresh clone reaches a running local stack by following `docs/setup.md`
  - [x] every variable in the `.env.example` files is described once

## Backend needs
Same as 020: this spec moves the foundation, it adds no screen endpoints. The new `complete` route is the one contract change the upload spec (007) must use when it replaces its mock.

## Open questions
All answered by the owner on 2026-11-19 ("all recommended").
- **Vercel plan?**
  - **Decided:** Hobby for the portfolio demo (2 GB memory, 300 s max duration). Upgrade to Pro only if slice 5's 30-page PDF doesn't fit.
- **Long OCR runs?**
  - **Decided:** keep 020's page limit (50 pages) and process one batch per call; split a file into page ranges (re-enqueue with an offset) only if slice 5 shows it's needed.
- **What starts the pipeline?**
  - **Decided:** `pgmq` + `pg_cron` + `pg_net` (retries and dead letters built in, up to 30 s delay), not a Database Webhook or Vercel Queues.
- **How does the browser upload?**
  - **Decided:** a signed upload URL from the API, so the 007 rules and the `documents` row stay on the server, plus bucket limits as a second guard.
- **Functions region?**
  - **Decided:** `fra1`, next to the Supabase project in Frankfurt.
- **Where do functions live?**
  - **Decided:** `apps/web/api/` in the same Vercel project: one domain, no CORS. Whether `/api/*` is a catch-all file or a rewrite to one function is up to slice 3, whichever Vercel supports for a non-Next project.
- **New packages?**
  - **Decided:** none at runtime. Functions use web `Request`/`Response`; the Vercel CLI is installed globally by the owner (J2), not added to the repo. `@aws-sdk/*`, `aws-cdk-lib`, `aws-cdk`, `constructs` and `esbuild` go.
- **Native `@napi-rs/canvas` on Vercel?** Vercel builds on linux x64, so pnpm installs the matching binary and `add-native-binary.mjs` (arm64 for Lambda) goes. If the binary is missing at runtime, slice 5 reports it before any workaround.
- **`dev` and `prod`?**
  - **Decided:** Vercel Production and Preview both point at `docspread-dev` for the demo; a `prod` Supabase project comes with real customers.
- **How does code reach Vercel before the merge?**
  - **Decided:** Claude never pushes. After the owner's `vercel link` (J2), Claude deploys with `vercel deploy --prod` from the CLI. Vercel Production is the `docspread-dev` demo; preview URLs sit behind Deployment Protection, so `pg_net` and the smoke scripts use the production URL, and Vault stores that URL. After the merge, Git deploys take over.
- **Who pushes migrations?**
  - **Decided:** Claude runs `supabase db push` to `docspread-dev` only (the CLI is linked). The owner runs the Vault statements (J3) because they hold the secret.
  - **Changed (slice 2):** the push needs the database password, which Claude must not see, so the owner runs `supabase db push` (it prompts for the password) and Claude checks `supabase migration list` afterwards. From slice 7 on, GitHub Actions pushes.
- From slice 3: `complete` needs the `ocr` queue, so the queues move from slice 4 into slice 3.
  - **Decided (orchestrator, 2026-11-19):** slice 3 creates `pgmq`, the `ocr` and `extract` queues and the `service_role`-only queue functions (in `public`, so supabase-js `rpc()` reaches them); slice 4 keeps `pg_cron`, `pg_net` and Vault.
- From slice 3: there is no status for "row created, file not uploaded yet", and adding one would change the document lifecycle (012, `lifecycle.ts`).
  - **Decided (orchestrator, 2026-11-19):** the row is created `uploaded` as in 020; `complete` moves it to `processing` and enqueues `ocr`. A row whose file never arrives stays `uploaded`; cleaning those up belongs to the upload spec (007) when it replaces its mock.
- **Free-plan pausing?**
  - **Decided:** accepted. Supabase pauses a free project after about a week without activity; the cron job doesn't count, so the owner wakes a paused demo from the dashboard.
- **What happens to `infra/`?**
  - **Decided:** delete it (git history keeps it) and destroy the stack (J5). The AWS project stays idle until the free plan ends.
- **The owner's local `services/api/.env.local`?**
  - **Decided:** Claude doesn't edit it; slice 6 lists the AWS lines for the owner to delete.
- **020's open slices?**
  - **Decided:** 4, 7 and 8 move here as described in Scope; 020 is `done` (2026-11-19).
- **Branch?**
  - **Decided:** `vercel-supabase-022`, stacked on `cloud-setup-020` (merged in, not rebased, since the branch is on origin). Merge the 020 PR first.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-19 | — | draft | written after the owner asked to drop AWS: Textract is unavailable in the project's region, CloudFront waits for verification, and the free plan blocks GitHub OIDC and caps Lambda memory |
| 2026-11-19 | — | ready | owner approved every recommendation and the move to `ready`; deploys through `vercel deploy --prod` (production URL for smoke tests and Vault), Hobby limits (300 s, 2 GB), Claude pushes `dev` migrations; 020 closed as `done` |
| 2026-11-19 | 2 | 2 of 3 (sonnet) | migration `storage_buckets`: private `documents` (20 MB, pdf/jpeg/png) and `exports` (20 MB); `private.can_read_company_object` (uuid-guarded first segment → `is_company_member`); one SELECT policy, no client writes. `storage_buckets.test.sql` 13 tests; suite 49/49; advisors no issues. Push to `docspread-dev` waits for the owner: the CLI needs the database password (403 on the login role without it). |
| 2026-11-19 | 2 | done | owner ran `supabase db push` (the CLI token gets 403 on the login role, so the password goes in with `--password`); the Storage API on `docspread-dev` shows `documents` and `exports` private, 20 MB, MIME list on `documents` only. |
| 2026-11-19 | 1 | 2 of 3 (sonnet) | `apps/web/vercel.json` (`fra1`, rewrite of every non-`/api/` path to `/index.html`), `api/health.ts` (Web `GET` handler), `tsconfig.api.json` (Node types, referenced from `tsconfig.json`), ESLint block for `api/`, `.env.example` `VITE_API_BASE_URL=/api`; root `.vercelignore` keeps `.env*` and build output out of CLI uploads; `.gitignore` gets `.vercel` (the CLI also added `.env*`, removed: it hid `.env.example`). Deployed with `vercel deploy --prod`: `/`, `/inbox`, `/types/type-invoice` 200 HTML, `/api/health` 200 `{"ok":true}` from `fra1`. Typecheck, lint, build green; `pnpm dev` serves. `vercel dev` fails on Windows with EPERM on symlink until Developer Mode is on. |
| 2026-11-19 | 3 | done (sonnet) | `services/api/src/handler.ts` is a Web `handle(Request)` router (optional `/api` prefix; env, JWKS verifier and client built on the first request, no top-level await; `.js` import specifiers so Vercel's per-file compile resolves). `POST /uploads` returns a Storage signed upload URL; `POST /uploads/:id/complete` (404 for missing or foreign ids, 409 before the upload or twice, conditional `uploaded` → `processing`, `queue_send` to `ocr`, rollback on failure). Migrations `queues` (pgmq, `ocr` + `extract`, SECURITY DEFINER `queue_*` wrappers for `service_role` only, client revokes on `pgmq`) and `service_role_grants` (fresh stacks no longer grant it table access); `queues.test.sql` 17, suite 66/66, advisors clean; owner pushed both. `apps/web/api/router.ts` behind a `vercel.json` rewrite (`[...path].ts` matched one segment only). `env.ts` without SSM; `smoke-api` (HTTP or in-process), `check-env` 22 PASS, `scan-logs` reads stdin. Production: smoke-api 25/25 PASS, log scan 0 secrets. `@aws-sdk/s3-presigned-post` removed. |
| 2026-11-19 | 4 | 2 of 3 (sonnet) | migration `pipeline_cron`: `pg_cron` + `pg_net`; `private.trigger_pipeline()` reads Vault `pipeline_base_url` / `pipeline_secret` (missing → notice, no call) and POSTs `{}` with `x-pipeline-secret` to `/api/pipeline/<queue>` once per tick for each queue with a visible message (`vt <= clock_timestamp()`); execute revoked from every API role; job `pipeline-trigger` every 30 s; daily `cron-history-cleanup` keeps one day of `cron.job_run_details`; pg_net timeout 310 s because the functions work inside the request. `pipeline_cron.test.sql` 11, suite 77/77, advisors clean, no URL or secret in the migration. The live "exactly one call" criterion is checked with slice 5 on dev. |
| 2026-11-19 | 5 | 1 of 5 (sonnet) | `apps/web/api/pipeline/{ocr,extract}.ts` → `services/api/src/pipeline/*` (`pipeline-auth.ts`: sha-256 + `timingSafeEqual` on `x-pipeline-secret`; `pipeline-http.ts`: lazy env, drain one message at a time, vt 330 s, no new message after 150 s; `queue.ts` over `queue_*` RPCs replaces `sqs.ts`; archive + `error` at `read_ct >= 3`, orphan messages archived). Files come from Storage; `@aws-sdk/*` gone from `services/api`. `vercel.json`: `maxDuration` 300 for both, `includeFiles` for pdfjs / tesseract / canvas on OCR (unverified). `smoke-pipeline` uploads through the production API and polls. Deployed: both functions answer 401 without or with a wrong secret. The run itself waits for J3 and the slice 4 push. |
| 2026-11-19 | 6 | done (sonnet) | `infra/` deleted and removed from `pnpm-workspace.yaml` (lockfile −29 packages), `.vercelignore` line, stale SQS comment in `claude.ts`. Diagrams `structure.ts` (Vercel Functions under `apps/web/api`, no infra), `pipeline.ts` (signed upload → `complete` → pgmq → pg_cron/pg_net → OCR → extract), `deployment.ts` (Vercel `fra1`, Supabase Frankfurt, Anthropic, GitHub), `index.ts` (sources → 022; `planned` flags removed, 020 is done). Grep for `aws-sdk|aws-cdk|cdk|sqs|ssm` outside `docs/` is empty (only `supabase/config.toml` CLI template comments and a mock vendor mention AWS). Typecheck, lint, build green. UI check 12/12 for the three tabs; screenshots reviewed by the orchestrator: diagrams render in both themes at 375 and 1280 px (the panel scrolls inside, as before). J5 rewritten for the CLI, since `cdk destroy` needs the deleted app. |
| 2026-11-19 | 7 | 1 of 3 (sonnet) | `.github/workflows/migrate.yml` (push to `main` touching `supabase/migrations/**` or manual; environment `dev`; CLI 2.108.0; `link` + `db push --password` from secrets; no URL stored). `docs/setup.md` (clone → local stack, `vercel dev` + local Vault, deploys, every variable once, adding a variable), `product.md` technical frame, `CLAUDE.md` workspaces, commands and notes; `.env.example` comments; `DEMO_USER_*` added to the example and the table. Open: the workflow runs only from `main` (after the merge and J4); the `vercel dev` part of `setup.md` waits for Developer Mode. |
| 2026-11-20 | 4 | done | owner set Vault `pipeline_base_url` + `pipeline_secret` (new `PIPELINE_SECRET`, also in Vercel) and pushed `pipeline_cron`. Probe: a message with a random document id sent to `ocr` at 12:14:43 → one POST to `/api/pipeline/ocr` at 12:15:00, secret accepted, message archived ("no such document"); no second call. |
| 2026-11-20 | 5 | done | `smoke-pipeline` on production (upload through the API, cron-driven): invoice PDF `needs_review` in 62 s (3 pages, 213 tokens, 11 fields, confidence 0.97; ~$0.14 of Claude per invoice: Haiku classify $0.0001 + two Opus extract calls), again after the broken file in 85 s; 30-page PDF OCR in 1 s of work, `unclassified` in 61 s (no matching type, as in 020); broken PDF `error` (`InvalidPDFException`), queue kept moving; wrong or missing secret 401 with the queue untouched; receipt JPG through `tesseract.js` (63 tokens, boxes 0..1) classified Invoice at 0.6 < 0.7, so `unclassified`: correct, since Demo Company has only an Invoice type. The criterion now says "a final status other than `error`" and `smoke-pipeline` checks that (020 never required review for the receipt). `includeFiles`, `/tmp` language data and `@napi-rs/canvas` work on Vercel. Log scan of the run: 22 lines, 0 secrets. |
| 2026-11-20 | — | J5 done | owner deleted `DocSpread-dev` and `CDKToolkit` with CloudFormation, the two `/docspread/dev/*` SSM secrets (Git Bash needs `MSYS_NO_PATHCONV=1` for names starting with `/`), the retained CDK assets bucket (14 versions) and the stack's helper Lambda log groups; the ECR repository went with the stack. Read-only check: no buckets, stacks, parameters, queues or repositories left; only the owner's `test-lamda` and `helloWorldFunc` and their logs remain. |
| 2026-11-20 | 1 | done | owner turned on Windows Developer Mode; `vercel dev --listen 3210` from `apps/web` with `services/api/.env.local` loaded: `/`, `/inbox` HTML, `/api/health` 200, `/api/uploads` and `/api/pipeline/ocr` 401 without credentials, unknown route 404; `smoke-api` over local HTTP 25/25. `setup.md` section 6 shows the env loading, the local smoke command, that the cron of `docspread-dev` calls production, and how to run a pipeline step locally. |
