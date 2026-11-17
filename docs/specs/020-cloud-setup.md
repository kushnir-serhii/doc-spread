# 020 — Cloud setup: AWS, AI, database and env

**Status:** in-progress · **Depends on:** 012 · **Route(s):** —

## Goal
Every external service the product needs exists in `dev` and `prod`, every setting has one documented place, and one real document can travel from upload through OCR and Claude into the database. Later specs can then replace the mocks screen by screen without touching infrastructure.

## Scope
- In: Supabase projects, schema and row-level security; AWS infrastructure through CDK; the Anthropic API setup; `.env` files and secret storage; deploy automation; an API service with auth and presigned uploads; one end-to-end smoke test.
- Out: replacing the mocks on any screen (later specs, starting with auth); production extraction and classification prompts; export file generation; billing and plans; `supabase-js` in `apps/web`.
- Definition of Done differs from other specs: this spec changes no UI, so the Playwright check does not apply, and "mock-only data" does not apply to `services/api`. `apps/web` still runs on mocks when it is done.

## Architecture
| Concern | Service | Why |
| --- | --- | --- |
| Database, auth, row-level security | Supabase (Postgres) | Planned in [product.md](../product.md) |
| Web hosting | S3 + CloudFront | Planned in [product.md](../product.md) |
| Document and export files | S3 (private buckets) | One place for uploads, page images and exports |
| OCR with a box per word | PDF text layer (pdf.js) for digital PDFs, Tesseract in a Lambda container for scans and photos | Review (008) and pointing (013, 015) need word boxes; Textract isn't offered in the project's region |
| Classification and extraction | Claude API | Works from the OCR tokens and the page image |
| Pipeline, exports, API | AWS Lambda + SQS | No Edge Functions, so AWS access uses IAM roles and no AWS keys are stored |
| Email (auth and export delivery) | AWS SES, also as Supabase custom SMTP — **on hold** (J6) | One sender, one domain |

Pipeline: upload to S3 → SQS → OCR Lambda (PDF text layer, or Tesseract for scans) → SQS → classify and extract with Claude → status and values written to Postgres. The web app keeps polling (002).

## Data

### Rules
- Real values never go into git, chat, specs or logs. Only `.env.example` files are committed; `.gitignore` already covers the rest.
- Everything prefixed `VITE_` ships to the browser, so a secret must never get that prefix.
- Use Supabase publishable and secret keys. The legacy `anon` and `service_role` keys are being deprecated by the end of 2026.
- In Lambda, secrets come from SSM Parameter Store (`/docspread/<env>/<name>`, SecureString) and CDK sets the other values.

### `apps/web/.env.local` (public values)
```sh
VITE_USE_MOCKS=true
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE_URL=https://<api-domain>
```

### `services/api/.env.local` (secret)
```sh
# Database and auth
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...          # SSM in Lambda; bypasses row-level security
SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json

# AI
ANTHROPIC_API_KEY=sk-ant-...               # SSM in Lambda
ANTHROPIC_MODEL_CLASSIFY=claude-haiku-5-5
ANTHROPIC_MODEL_EXTRACT=claude-opus-5-5

# AWS (local only: Lambda sets the region and uses its role)
AWS_PROFILE=docspread
AWS_REGION=eu-north-1
S3_DOCUMENTS_BUCKET=docspread-dev-documents
S3_EXPORTS_BUCKET=docspread-dev-exports
SES_FROM_ADDRESS=no-reply@<domain>

# App
ALLOWED_ORIGIN=http://localhost:5173
UPLOAD_MAX_BYTES=20971520
CLASSIFY_MIN_CONFIDENCE=<see Open questions>
```

### GitHub Actions environments (`dev`, `prod`)
```sh
SUPABASE_ACCESS_TOKEN    # scoped to this project, not a full-account token
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_REF
AWS_DEPLOY_ROLE_ARN      # OIDC role, so no AWS keys in GitHub
```

## Your jobs (only you can do these)
These need your identity, payment details, legal agreement or secrets. Claude cannot do them and must not receive the secret values. Each slice lists the jobs it waits for.

### [x] J1. Decide
- Answer the region and model questions under **Open questions**.
- Approve the new libraries listed there.

### [x] J2. Local tools
- Install Docker Desktop, the Supabase CLI and the AWS CLI v2.

### [x] J3. AWS access
- The project "Caffeine Driven Development" (account `672502664494`, free plan, region `eu-north-1`) holds DocSpread; only one project is allowed on this plan.
- The CLI profile `docspread` is signed in with `aws login --profile docspread` (renew it the same way when it expires).
- The free plan's spend limit protects against surprise bills; it ends on 2027-04-21 or when the credits run out.

### [ ] J4. Supabase projects
- Create the organization and the `docspread-dev` and `docspread-prod` projects, in the chosen region, and save the database passwords in your password manager.
- Create the publishable and secret keys for each project.
- Create a scoped personal access token for CI.

### [ ] J5. Anthropic
- Create the Console account, add billing, and accept the commercial terms.
- Create a `dev` and a `prod` workspace, one API key each, with a spend limit.

### [ ] J6. Domain and email — on hold
**On hold (2026-11-12):** not needed for the portfolio demo, and no slice waits for it. The steps stay here for when the project gets a domain.
- Buy or choose the domain, and add the DNS records for SES (DKIM) and the CloudFront certificate.
- Request SES production access in the AWS console. AWS reviews it, and it can take a day or more.
- In Supabase, enter the SES SMTP credentials under Auth settings.

### [ ] J7. Put the secrets in place
- Fill in both `.env.local` files from the `.env.example` files.
- Run the secrets script from slice 3 to copy them to SSM, once per environment.
- Add the GitHub Actions secrets to the `dev` and `prod` environments.
- Protect the `prod` GitHub environment with a required reviewer (you).

### [ ] J8. Release (bootstrap done 2026-11-17)
- Run `cdk bootstrap` once in each account.
- Approve every `prod` deploy and migration. Claude only touches `dev`.
- Merge the PRs.

### [ ] J9. Before real customer documents — on hold
**On hold (2026-11-12):** the project is a portfolio demo and takes no real customer documents. These steps come back before it does.
- Accept the data processing terms of AWS, Supabase and Anthropic.
- Publish a privacy policy that names them as processors. Documents contain personal data.

## Slices
The loop runs slices in order and stops, with a list of what's missing, at the first slice whose jobs aren't done.

### [x] 1. Env skeleton
- **Waits for:** nothing
- **Build:** both `.env.example` files as above. A typed env reader in `apps/web` that treats every variable as optional while `VITE_USE_MOCKS` isn't `false`, and names the missing variable otherwise. `turbo.json` build gets `"env": ["VITE_*"]` and `.env*` in its inputs, so a production build can't reuse a dev bundle.
- **Files:** `apps/web/.env.example`, `services/api/.env.example`, `apps/web/src/lib/env.ts`, `apps/web/src/vite-env.d.ts`, `turbo.json`, `pnpm-workspace.yaml`
- **Model:** haiku
- **Accept:**
  - [x] the app builds and runs as today with no `.env` file
  - [x] with `VITE_USE_MOCKS=false` and a variable missing, the error names that variable
  - [x] `git status` shows `.env.example` files as trackable and `.env.local` as ignored
  - [x] changing a `VITE_` value causes a Turbo cache miss

### [x] 2. Database schema on the local stack
- **Waits for:** J1, J2
- **Build:** `supabase init` and migrations for the tables listed in the header of `src/lib/mock/api.ts`: companies, team members, document types (one row per id + version), documents linked to type id and version, values, pages with OCR tokens, export jobs, templates. Row-level security per company on every table, and explicit Data API grants. Money as integer minor units + ISO currency, per [conventions.md](../conventions.md).
- **Files:** `supabase/config.toml`, `supabase/migrations/*`, `supabase/seed.sql`, `supabase/tests/*`
- **Accept:**
  - [x] `supabase db reset` runs from nothing with no errors
  - [x] `supabase db advisors` reports no security issues
  - [x] a test proves a member of company A can't read, change or reassign rows of company B
  - [x] the seed contains no country defaults (no PLN or `pl-PL`)

### [x] 3. AWS infrastructure as code
- **Waits for:** J1
- **Build:** an `infra/` workspace with one CDK app and `dev` / `prod` stages: private document and export buckets with CORS for pdf.js, CloudFront serving `index.html` for unknown paths, SQS queues with dead-letter queues, Lambda placeholders, the SES identity, and the GitHub OIDC role. A script copies the two secrets from `services/api/.env.local` to SSM, so they're never typed into a shell.
- **Files:** `infra/**`, `pnpm-workspace.yaml`
- **Accept:**
  - [x] `cdk synth` succeeds for both stages with no account credentials
  - [x] no bucket allows public access; web files are readable only through CloudFront
  - [x] each Lambda role can reach only its own buckets, queues and parameters
  - [x] the same synth output differs between stages only in names and sizes

### [x] 3a. Stockholm and the OCR Lambda
- **Waits for:** nothing (offline, like slice 3)
- **Build:** the AWS region becomes `eu-north-1` everywhere (stage config, `services/api/.env.example`, the secrets script). The Textract SNS topic, role and permissions go away. The pipeline becomes two steps: `pipeline-ocr` (ingest queue; reads the file, will write words with boxes and page images) and `pipeline-extract` (a new `extract` queue with its DLQ; calls Claude). Both stay placeholders: the real OCR code and the Tesseract container image come in slice 6. Update `check-synth` and the pipeline and deployment diagrams.
- **Files:** `infra/**`, `services/api/.env.example`, `apps/web/src/features/architecture/diagrams/{pipeline,deployment}.ts`
- **Model:** sonnet
- **Accept:**
  - [x] `synth` and `check` pass with no credentials for both stages, and every regional resource is in `eu-north-1`
  - [x] no Textract or SNS resource or permission is left
  - [x] each Lambda role still reaches only its own buckets, queues and parameters
  - [x] the pipeline and deployment diagrams show the OCR step instead of Textract

### [ ] 4. Deploy `dev`
- **Waits for:** J3, J7, J8 (bootstrap)
- **Build:** deploy the `dev` stack, push the migrations to the `dev` Supabase project, and fill the real output values into `.env.example` comments where they aren't secret.
- **Files:** `infra/**`, `docs/specs/020-cloud-setup.md`
- **Accept:**
  - [ ] the `dev` CloudFront URL serves the app, and a deep link like `/inbox` loads after a reload
  - [x] the S3 object URLs are denied without a signature
  - [x] `supabase migration list` shows local and remote in sync

### [ ] 5. API service: auth and presigned upload
- **Waits for:** J4, J7
- **Build:** a `services/api` workspace with a required-env check at startup, Supabase token verification against the JWKS URL, a health route, and a presigned upload route scoped to the caller's company, enforcing the file types and size limit from 007.
- **Files:** `services/api/**`, `infra/**`
- **Accept:**
  - [ ] a request with no token or a bad token gets 401
  - [ ] a valid user gets a URL that can only write under that user's company prefix
  - [ ] an oversized or disallowed file is refused
  - [ ] startup with a missing variable fails and names it, and no log line contains a secret value

### [ ] 6. One document end to end
- **Waits for:** J5, J7
- **Build:** the pipeline for one document: S3 event, SQS, OCR (the PDF text layer through `pdfjs-dist`, or Tesseract (`tesseract.js`, English and Ukrainian) for scans and photos, with word boxes either way), SQS, then a Claude call through `@anthropic-ai/sdk` that classifies and extracts with structured outputs, and writes the status, values and word boxes to Postgres. Set `effort` explicitly, check `stop_reason` for `refusal`, and enable the server-side fallback on the Opus call (Haiku has none, so a Haiku refusal leaves the document unclassified). Failures land in the dead-letter queue and set the `error` status. Basic prompts only; production quality is a later spec.
- **Files:** `services/api/**`, `infra/**`
- **Accept:**
  - [ ] a multi-page PDF uploaded to `dev` reaches `needs_review` with values and confidence
  - [ ] OCR tokens are stored with boxes normalized 0..1 to the page after rotation, origin top-left
  - [ ] a broken file ends in `error` and doesn't block the queue
  - [ ] a currency the model assumed rather than read stays unverified, never silently filled in
  - [ ] the token usage and cost of the run are logged

### [ ] 7. Deploy automation and `prod`
- **Waits for:** J4, J7, J8
- **Build:** GitHub Actions that build, migrate and deploy `dev` on merge to `main` and `prod` after your approval, using OIDC.
- **Files:** `.github/workflows/*`
- **Accept:**
  - [ ] a merge to `main` deploys `dev` with no stored AWS keys
  - [ ] `prod` waits for your approval
  - [ ] `dev` and `prod` builds use their own `VITE_` values

### [ ] 8. Setup docs
- **Waits for:** nothing
- **Build:** update the technical frame in [product.md](../product.md) and the commands in `CLAUDE.md`, and write a short guide to adding a new env variable and running everything locally.
- **Files:** `docs/product.md`, `CLAUDE.md`, `docs/setup.md`
- **Model:** haiku
- **Accept:**
  - [ ] a fresh clone can reach a running local stack by following `docs/setup.md`
  - [ ] every variable in the `.env.example` files is described once

## Backend needs
This spec provides the foundation for the **Backend needs** of 002 to 019. It delivers only the storage, auth and pipeline path; each screen's endpoints come with the spec that replaces its mocks.

## Open questions
- **Region?** One region for Supabase and AWS, close to your customers; the buckets and Textract must share it.
  - **Decided (2026-11-10):** `eu-central-1` (Frankfurt) for Supabase and AWS.
  - **Changed (2026-11-17):** AWS runs in `eu-north-1` (Stockholm). The project is on AWS's new free plan, which fixes one region from the contact address; changing it needs the paid plan plus "advanced features" (irreversible). Supabase stays in Frankfurt.
- **OCR without Textract?**
  - **Decided (2026-11-17):** option C, to stay on the free plan: read the text layer of digital PDFs with `pdfjs-dist` (exact words and boxes), and run Tesseract in a Lambda container image (ECR works on the plan) for scans and photos. Claude still sees the page image. Switching to Textract later means the paid plan, "advanced features" and `eu-central-1`.
- **EU-only processing?**
  - **Decided (2026-11-10):** not promised. Claude runs through the standard Anthropic API, and the privacy policy (J9) must say documents are processed by Anthropic, possibly outside the EU.
- **Models?**
  - **Decided (2026-11-10):** `claude-haiku-5-5` for classification ($0.10 / $0.50 per million tokens) and `claude-opus-5-5` for extraction ($4 / $20). Check the classification results and cost on real documents in slice 6; each model is one env variable.
- **New libraries?**
  - **Decided (2026-11-10):** approved: `aws-cdk-lib`, `@aws-sdk/*`, `@anthropic-ai/sdk`, `@supabase/supabase-js` (in `services/api` only) and `jose`.
- **Which AWS accounts?**
  - **Changed (2026-11-17):** the project "Caffeine Driven Development" itself (account `672502664494`). What looked like a verification block was the region lock: calls outside `eu-north-1` are denied by the plan's policy. The plan allows one project, so `dev` and `prod` would share it; for the demo only `dev` is deployed.
- **Supabase project?**
  - **Decided (2026-11-10):** `docspread-dev`, project ref `zjfzdqojkuoqzksdnyjs`, Frankfurt. `prod` is added with the AWS `prod` account.
- **Branch?**
  - **Decided (2026-11-12):** `cloud-setup-020`, stacked on `architecture-diagrams-021` (its pipeline and deployment diagrams point at this spec). Merge the 021 PR first.
- **Extra packages for slice 3?**
  - **Decided (2026-11-12):** approved in `infra/` only: `constructs` (required by `aws-cdk-lib`), `aws-cdk` (CLI, dev) and `tsx` (dev).
- **How are extracted values stored?**
  - **Decided (2026-11-12):** one `jsonb` column `values` on `documents`, keyed by field id, in the shape of `FieldValueMap`. Type versions keep `fields` and `actions` as `jsonb` on `document_type_versions`; the export mapping sits on `document_types` (not versioned, 009).
- **Domain before J6?**
  - **Decided (2026-11-12):** none yet. CloudFront uses its default domain, and the SES identity and custom domain are optional CDK context, added when J6 is done.
- **What is on hold for the demo?**
  - **Decided (2026-11-12):** the project is a portfolio demo for now, so J6 (custom domain, SES, production email access) and J9 (data processing terms, privacy policy) are on hold, not removed. The web app uses the default CloudFront domain, the SES identity stays optional CDK context and is not deployed, and no slice waits for either job.
- **Supabase plan?**
  - **Decided (2026-11-12):** the free plan.
- **Docker for slice 2?**
  - **Decided (2026-11-12):** Claude starts Docker Desktop when slice 2 begins.
- From slice 2: who creates a company and its first owner?
  - **Decided (2026-11-17):** the API service, with the secret key, after sign-up. Clients have no insert on `companies` (as built).
- From slice 2: who may change document types?
  - **Decided (2026-11-17):** any member of the company. Migration `type_permissions_and_locked_versions`.
- From slice 2: can a saved type version be edited?
  - **Decided (2026-11-17):** no, it is locked for everyone (policies plus a trigger); a change is a new version. Starting a new type as a copy of an existing one is a later app feature with its own spec (014 builder, 015 sample).
- From slice 2: ids are `uuid` in the database and strings in the mocks; the spec that replaces the mocks has to map them.
- From slice 3: bucket names (`docspread-dev-documents` …) are global across all AWS accounts, so slice 4 may hit a name that is taken. Add a short suffix (for example the account id) if it does.
- From slice 3: the api role has no SES permission yet; add it with the export email (after J6).
- From slice 3: `@types/node` was added to `infra` (type definitions only, same range as `apps/web`).
- From slice 3a: mock code in `apps/web` (`lib/mock/*`, `lib/api/builder.ts`, `features/document-types/sample/*`) still mentions Textract in names or comments. Rename when those mocks are replaced by the real API.
- From slice 4: the free plan's policy forbids creating the GitHub OIDC provider. The deploy role is now behind context `githubDeploy=true` (off by default), so deploys run from the owner's machine with the `docspread` profile. Slice 7 needs another route (or the paid plan).
- From slice 4: CloudFront refuses new distributions until AWS verifies the account (support case 179448009700290, updated 2026-11-17 with the error). `dev` is deployed with context `cdn=false`; the web build is already in `docspread-dev-web`, so the next deploy without that flag only adds CloudFront.
- From slice 4: new accounts allow at most 512 MB per Lambda, so the OCR function uses 512 MB until the quota is raised.
- **Slices 5 and 6: how to build them?**
  - **Decided (2026-11-17):** Tesseract runs as `tesseract.js` (WebAssembly) in a normal Lambda, not a container image; OCR languages English and Ukrainian. Approved backend packages: `tesseract.js`, `pdfjs-dist`, `@napi-rs/canvas`, `esbuild` (dev), and the `@aws-sdk/*` parts. Demo data stays in `dev`: a test login, "Demo Company" (USD) and an Invoice type; the login's password lives only in `services/api/.env.local`. Slice 5 first; slice 6 waits for the owner's go.
- From 007: what confidence leaves a document unclassified, and is there a page limit per file? Recommended for the smoke test: 0.7 and 50 pages, revisited with real results.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-09 | — | draft | written from the backend needs of 002–019; slices split from the jobs only the owner can do |
| 2026-11-12 | — | jobs | J1, J2 done. `dev` keys in place and tested: Supabase secret key (200), Anthropic key (200), web publishable key. AWS account waits for verification; prod accounts later (demo). |
| 2026-11-12 | — | ready | owner approved draft → ready; branch, CDK extras, jsonb values, no domain yet, Docker decided |
| 2026-11-12 | — | on hold | portfolio demo: J6 and J9 on hold, slice 4 no longer waits for J6; Supabase on the free plan |
| 2026-11-12 | 1 | done (haiku) | `.env.example` in apps/web and services/api, `lib/env.ts` + `vite-env.d.ts`, startup check in `main.tsx` when mocks are off, Turbo `env`/`inputs` (hash changes on a VITE_ value and on a `.env*` file), workspaces `services/*` and `infra`. Typecheck, lint, build green. The missing-variable error was checked in logic, not in a browser. |
| 2026-11-12 | 2 | done (sonnet) | `supabase/` with one migration: 8 tables, RLS per company through `private` helpers, explicit grants, composite foreign keys and a trigger that blocks moving rows between companies. `supabase db reset` clean, `supabase test db` 29/29, `supabase db advisors` (security) no issues. Seed empty, no country defaults. |
| 2026-11-12 | 3 | done (sonnet) | `infra/` (`@docspread/infra`): CDK app with `DocSpread-dev` / `DocSpread-prod`; web bucket + CloudFront (origin access control, SPA fallback), documents and exports buckets, ingest and Textract queues with DLQs, SNS topic + Textract role, 3 placeholder Lambdas with per-role permissions, optional SES identity, GitHub OIDC deploy role, `put-secrets` script (not run). `synth` and `check` pass with no credentials. Diagrams: `structure.ts` (infra, supabase), `deployment.ts` (Function URL). |
| 2026-11-12 | — | UI check | `/architecture?tab=structure` and `?tab=deployment`: 8/8 passed (375px and 1280px, light and dark); screenshots reviewed, both diagrams render with the new infra and supabase nodes. Slices 4–8 wait for the AWS account (J3) and the other owner jobs. |
| 2026-11-17 | 2 (follow-up) | done | owner answers: company created by the API; any member edits types; saved versions locked (no update/delete grants + trigger). New migration and `type_permissions.test.sql`; `supabase test db` 36/36, advisors no issues. |
| 2026-11-17 | — | rescoped | AWS project is locked to `eu-north-1`, where Textract doesn't exist. Owner chose option C: free plan, PDF text layer + Tesseract (Lambda container) for OCR. J3 done with the `docspread` CLI profile. Slice 3 gets a follow-up for the region and the new OCR Lambda. |
| 2026-11-17 | 3a | done (sonnet) | region `eu-north-1`; SNS topic, Textract role and permissions removed; `pipeline-ocr` (ingest queue, 2048/3008 MB, 5 min) and `pipeline-extract` (new `extract` queue + DLQ); `check-synth` forbids `*` resources, SNS, Textract and other regions. `.env.example` updated. Diagrams `pipeline.ts`, `deployment.ts`; UI check 8/8. |
| 2026-11-17 | 4 (part) | in progress | `DocSpread-dev` deployed to `eu-north-1` with `cdn=false` (3rd attempt: OIDC provider blocked by the plan, CloudFront blocked by verification, Lambda capped at 512 MB). API Function URL answers 501 (placeholder), all buckets refuse unsigned requests (403), web build synced (187 files). Waiting: CloudFront verification, and the owner's `supabase link` + `db push`. |
| 2026-11-17 | 4 (part) | 2 of 3 | owner ran `supabase link` + `db push`: both migrations applied to `docspread-dev`, `migration list` in sync; all 8 tables answer through the Data API with the secret key, and the publishable key is refused (42501). J7: both secrets in SSM. J8: `cdk bootstrap` done. Only the CloudFront criterion is left (verification). |
