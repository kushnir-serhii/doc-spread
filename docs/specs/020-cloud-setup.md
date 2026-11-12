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
| Document and export files | S3 (private buckets) | Textract reads multi-page PDFs directly from S3 |
| OCR with a box per word | AWS Textract | Review (008) and pointing (013, 015) need word boxes |
| Classification and extraction | Claude API | Works from the Textract tokens and the page image |
| Pipeline, exports, API | AWS Lambda + SQS | No Edge Functions, so AWS access uses IAM roles and no AWS keys are stored |
| Email (auth and export delivery) | AWS SES, also as Supabase custom SMTP | One sender, one domain |

Pipeline: upload to S3 → SQS → Textract → SNS → SQS → classify and extract with Claude → status and values written to Postgres. The web app keeps polling (002).

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
AWS_PROFILE=docspread-dev
AWS_REGION=<region>
S3_DOCUMENTS_BUCKET=docspread-dev-documents
S3_EXPORTS_BUCKET=docspread-dev-exports
TEXTRACT_SNS_TOPIC_ARN=arn:aws:sns:...
TEXTRACT_ROLE_ARN=arn:aws:iam::...
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

### [ ] J3. AWS accounts
- Check that MFA is on for the root user of the management account.
- Create the `docspread-dev` account under AWS Organizations (`docspread-prod` before the first real customer).
- Turn on IAM Identity Center and give yourself admin access to both.
- Run `aws configure sso` with profiles `docspread-dev` and `docspread-prod`.
- Set a monthly AWS Budgets alert.

### [ ] J4. Supabase projects
- Create the organization and the `docspread-dev` and `docspread-prod` projects, in the chosen region, and save the database passwords in your password manager.
- Create the publishable and secret keys for each project.
- Create a scoped personal access token for CI.

### [ ] J5. Anthropic
- Create the Console account, add billing, and accept the commercial terms.
- Create a `dev` and a `prod` workspace, one API key each, with a spend limit.

### [ ] J6. Domain and email
- Buy or choose the domain, and add the DNS records for SES (DKIM) and the CloudFront certificate.
- Request SES production access in the AWS console. AWS reviews it, and it can take a day or more.
- In Supabase, enter the SES SMTP credentials under Auth settings.

### [ ] J7. Put the secrets in place
- Fill in both `.env.local` files from the `.env.example` files.
- Run the secrets script from slice 3 to copy them to SSM, once per environment.
- Add the GitHub Actions secrets to the `dev` and `prod` environments.
- Protect the `prod` GitHub environment with a required reviewer (you).

### [ ] J8. Release
- Run `cdk bootstrap` once in each account.
- Approve every `prod` deploy and migration. Claude only touches `dev`.
- Merge the PRs.

### [ ] J9. Before real customer documents
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
- **Build:** an `infra/` workspace with one CDK app and `dev` / `prod` stages: private document and export buckets with CORS for pdf.js, CloudFront serving `index.html` for unknown paths, SQS queues with dead-letter queues, the Textract SNS topic and role, Lambda placeholders, the SES identity, and the GitHub OIDC role. A script copies the two secrets from `services/api/.env.local` to SSM, so they're never typed into a shell.
- **Files:** `infra/**`, `pnpm-workspace.yaml`
- **Accept:**
  - [x] `cdk synth` succeeds for both stages with no account credentials
  - [x] no bucket allows public access; web files are readable only through CloudFront
  - [x] each Lambda role can reach only its own buckets, queues and parameters
  - [x] the same synth output differs between stages only in names and sizes

### [ ] 4. Deploy `dev`
- **Waits for:** J3, J6 (DNS), J7, J8 (bootstrap)
- **Build:** deploy the `dev` stack, push the migrations to the `dev` Supabase project, and fill the real output values into `.env.example` comments where they aren't secret.
- **Files:** `infra/**`, `docs/specs/020-cloud-setup.md`
- **Accept:**
  - [ ] the `dev` CloudFront URL serves the app, and a deep link like `/inbox` loads after a reload
  - [ ] the S3 object URLs are denied without a signature
  - [ ] `supabase migration list` shows local and remote in sync

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
- **Build:** the pipeline for one document: S3 event, SQS, Textract, SNS, then a Claude call through `@anthropic-ai/sdk` that classifies and extracts with structured outputs, and writes the status, values and word boxes to Postgres. Set `effort` explicitly, check `stop_reason` for `refusal`, and enable the server-side fallback on the Opus call (Haiku has none, so a Haiku refusal leaves the document unclassified). Failures land in the dead-letter queue and set the `error` status. Basic prompts only; production quality is a later spec.
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
- **EU-only processing?**
  - **Decided (2026-11-10):** not promised. Claude runs through the standard Anthropic API, and the privacy policy (J9) must say documents are processed by Anthropic, possibly outside the EU.
- **Models?**
  - **Decided (2026-11-10):** `claude-haiku-5-5` for classification ($0.10 / $0.50 per million tokens) and `claude-opus-5-5` for extraction ($4 / $20). Check the classification results and cost on real documents in slice 6; each model is one env variable.
- **New libraries?**
  - **Decided (2026-11-10):** approved: `aws-cdk-lib`, `@aws-sdk/*`, `@anthropic-ai/sdk`, `@supabase/supabase-js` (in `services/api` only) and `jose`.
- **Which AWS accounts?**
  - **Decided (2026-11-10):** the owner's existing organization (management account `264013447959`). It's a demo for now, so a new `docspread-dev` account is created first and `prod` is added before the first real customer. Account `672502664494` is left untouched.
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
- **Docker for slice 2?**
  - **Decided (2026-11-12):** Claude starts Docker Desktop when slice 2 begins.
- From slice 2: who creates a company and its first owner? Clients have no insert on `companies`, so sign-up is assumed to go through the API service with the secret key.
- From slice 2: owners and admins write document types and versions; any member edits documents and creates export jobs. Does that match the product (011 roles)?
- From slice 2: type versions can still be updated or deleted by owners and admins. Should a saved version be immutable (012: "every version kept")?
- From slice 2: ids are `uuid` in the database and strings in the mocks; the spec that replaces the mocks has to map them.
- From slice 3: bucket names (`docspread-dev-documents` …) are global across all AWS accounts, so slice 4 may hit a name that is taken. Add a short suffix (for example the account id) if it does.
- From slice 3: the api role has no SES permission yet; add it with the export email (after J6).
- From slice 3: `@types/node` was added to `infra` (type definitions only, same range as `apps/web`).
- From 007: what confidence leaves a document unclassified, and is there a page limit per file? Recommended for the smoke test: 0.7 and 50 pages, revisited with real results.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-09 | — | draft | written from the backend needs of 002–019; slices split from the jobs only the owner can do |
| 2026-11-12 | — | jobs | J1, J2 done. `dev` keys in place and tested: Supabase secret key (200), Anthropic key (200), web publishable key. AWS account waits for verification; prod accounts later (demo). |
| 2026-11-12 | — | ready | owner approved draft → ready; branch, CDK extras, jsonb values, no domain yet, Docker decided |
| 2026-11-12 | 1 | done (haiku) | `.env.example` in apps/web and services/api, `lib/env.ts` + `vite-env.d.ts`, startup check in `main.tsx` when mocks are off, Turbo `env`/`inputs` (hash changes on a VITE_ value and on a `.env*` file), workspaces `services/*` and `infra`. Typecheck, lint, build green. The missing-variable error was checked in logic, not in a browser. |
| 2026-11-12 | 2 | done (sonnet) | `supabase/` with one migration: 8 tables, RLS per company through `private` helpers, explicit grants, composite foreign keys and a trigger that blocks moving rows between companies. `supabase db reset` clean, `supabase test db` 29/29, `supabase db advisors` (security) no issues. Seed empty, no country defaults. |
| 2026-11-12 | 3 | done (sonnet) | `infra/` (`@docspread/infra`): CDK app with `DocSpread-dev` / `DocSpread-prod`; web bucket + CloudFront (origin access control, SPA fallback), documents and exports buckets, ingest and Textract queues with DLQs, SNS topic + Textract role, 3 placeholder Lambdas with per-role permissions, optional SES identity, GitHub OIDC deploy role, `put-secrets` script (not run). `synth` and `check` pass with no credentials. Diagrams: `structure.ts` (infra, supabase), `deployment.ts` (Function URL). |
