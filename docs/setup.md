# Setup

From a fresh clone to a running local stack, then deploys and how to add an environment variable. The product runs on Vercel (web app and functions), Supabase (database, auth, storage, queues) and Anthropic (Claude). Background: [product.md](product.md), [specs/022-vercel-supabase.md](specs/022-vercel-supabase.md).

Real values never go into git. Only the `.env.example` files are committed.

## 1. Prerequisites

- Node.js (current LTS) and pnpm 10.28.2: `corepack enable`, then `corepack prepare pnpm@10.28.2 --activate`.
- Docker Desktop, running (the local Supabase stack runs in containers).
- Supabase CLI (version 2.108.0 is what CI uses). Install it from the [Supabase CLI docs](https://supabase.com/docs/guides/local-development/cli/getting-started).
- Vercel CLI: `npm i -g vercel`.
- Windows only: turn on **Developer Mode** (Settings > System > For developers). `vercel dev` needs it to create symlinks.

## 2. Install

```sh
git clone <repo-url> doc-spread
cd doc-spread
pnpm install
```

## 3. Local Supabase

```sh
supabase start      # Postgres, Auth, Storage, Studio; ports are in supabase/config.toml
supabase db reset   # applies supabase/migrations and supabase/seed.sql
supabase test db    # optional: the pgTAP tests should all pass
```

`supabase start` prints the local URLs and keys (run `supabase status` to see them again). The API is at `http://127.0.0.1:54321`, Studio at `http://127.0.0.1:54323`.

## 4. Environment files

Copy both examples and fill in the values (see the table in section 8):

```sh
cp apps/web/.env.example apps/web/.env.local
cp services/api/.env.example services/api/.env.local
```

- To run against the local stack, use the local URL and keys from `supabase status`. For the JWKS URL use `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`.
- To run against the `docspread-dev` project, use the values from its Supabase dashboard (Project Settings > API Keys).
- `ANTHROPIC_API_KEY` comes from the Anthropic console. Only the pipeline needs it.
- Make `PIPELINE_SECRET` with `openssl rand -base64 48`.

## 5. Run the web app on mocks

```sh
pnpm dev
```

Open the URL Vite prints. With `VITE_USE_MOCKS=true` every screen runs on typed mocks and needs no backend and no Vercel CLI.

## 6. Run the web app and functions together

On Windows, turn on Developer Mode first (Settings → System → For developers): `vercel dev` creates symlinks and fails with `EPERM` without it.

```sh
vercel link         # once, from the repo root or apps/web; pick the existing project `doc-spread`
cd apps/web
# The functions need the server variables, which live in services/api/.env.local (vercel dev doesn't read it).
# For the real backend also set VITE_USE_MOCKS=false and VITE_API_BASE_URL=/api (shell variables win over apps/web/.env.local):
set -a && . ../../services/api/.env.local && set +a
MSYS_NO_PATHCONV=1 VITE_USE_MOCKS=false VITE_API_BASE_URL=/api vercel dev --listen 3210
```

In Git Bash, always put `MSYS_NO_PATHCONV=1` in front: without it Git Bash rewrites `VITE_API_BASE_URL=/api` into a Windows path (`C:/Program Files/Git/api`) and every API call fails. In PowerShell no workaround is needed:

```powershell
Get-Content ....servicesapi.env.local | ForEach-Object { if ($_ -match '^s*([A-Z0-9_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"'), 'Process') } }
$env:VITE_USE_MOCKS='false'; $env:VITE_API_BASE_URL='/api'
vercel dev --listen 3210
```

`apps/web/vercel.json` rewrites every path to `index.html` except `/api/`, Vite's dev paths (`/@vite`, `/@fs`, `/src/`, `/node_modules/`) and anything with a file extension, so deep links such as `/types/<id>` work and Vite's modules load under `vercel dev`.

Web app and `/api/*` are then on http://localhost:3210, the same routes as production. Check it with the API smoke test over HTTP:

```sh
SMOKE_API_URL=http://localhost:3210/api pnpm --filter @docspread/api smoke
```

With `services/api/.env.local` pointing at `docspread-dev`, the database's cron job still calls the **production** functions (Vault holds the production URL), so the pipeline steps of a local upload run on Vercel. To run a pipeline step on your machine, call the local function yourself; it drains its queue:

```sh
curl -X POST -H "x-pipeline-secret: $PIPELINE_SECRET" http://localhost:3210/api/pipeline/ocr   # same shell as above
```

For a fully local pipeline, point `services/api/.env.local` at the local stack (`supabase status` prints its URL and keys) and set the two Vault secrets below in the local database.

The pipeline is started by `pg_cron` and `pg_net` inside the database, which read two secrets from Supabase Vault. Locally, store them once in the local database (run in Studio's SQL editor at `http://127.0.0.1:54323`; use the same `PIPELINE_SECRET` as in `services/api/.env.local`):

```sql
select vault.create_secret('http://host.docker.internal:3210', 'pipeline_base_url');
select vault.create_secret('<your PIPELINE_SECRET>', 'pipeline_secret');
```

`pipeline_base_url` is the `vercel dev` URL without `/api`, as seen from the database container (`host.docker.internal` is the host machine). Without these two secrets the cron job does nothing and logs a notice. Don't paste the real secret into chat or commit the statement with a value. On the hosted project the base URL is the production URL, `https://doc-spread.vercel.app`.

Smoke tests (they need `services/api/.env.local`):

```sh
pnpm --filter @docspread/api check-env
pnpm --filter @docspread/api smoke
pnpm --filter @docspread/api smoke-pipeline
```

### Run the real flow locally

The first real path (spec 023) runs with mocks off: sign in, create a type, upload, review, approve, export. Start `vercel dev` as above (mocks off, `VITE_API_BASE_URL=/api`, `services/api/.env.local` loaded), open http://localhost:3210 and:

1. Sign up a company on `/sign-up` (company name, email, password; a name that already exists is refused), or sign in as the demo user (`DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` in `services/api/.env.local`).
2. Create a document type with its fields on `/types/new` (blank type; the AI builder, templates and sample-based types are not available yet).
3. Upload a PDF, image or Word file on `/upload`.
4. Wait in `/inbox`. The row goes from Processing to Needs review without a reload, usually in 1-2 minutes. The pipeline runs on the **production** functions, because the cloud database's cron job calls them.
5. Open the document, check the values against the file, edit if needed and approve (or reject with a reason).
6. On `/export` pick the type and download the `.xlsx` or `.csv`. The documents become exported.

Costs: each invoice costs about $0.14 of Claude (classification plus extraction), so upload sparingly. Groups, Settings, onboarding and password reset show "Not available yet" with mocks off. The public demo (Vercel) stays on mocks.

## 7. Deploys

- **App and functions:** Vercel builds every push through its Git integration (previews and production). To deploy by hand from `apps/web`: `vercel deploy --prod`. Production is the demo and uses the `docspread-dev` Supabase project. Preview URLs sit behind Deployment Protection, so the cron job and the smoke scripts use the production URL.
- **Migrations:** `.github/workflows/migrate.yml` runs `supabase db push` against `docspread-dev` when a push to `main` changes `supabase/migrations/**` (or by hand: Actions > Migrate database > Run workflow). By hand from your machine: `supabase link --project-ref <ref>`, then `supabase db push --password <database password>`. The CLI's access token alone gets a 403 on the login role, so the password is needed.
- **GitHub environment `dev`** (Settings > Environments > `dev` > Secrets). The workflow connects to the database through the session pooler (host in `migrate.yml`) and reads two secrets:
  - `SUPABASE_DB_PASSWORD`: the database password of `docspread-dev` (Project Settings > Database).
  - `SUPABASE_PROJECT_REF`: the project reference (the `<ref>` in `https://<ref>.supabase.co`).

## 8. Environment variables

Every variable of both `.env.example` files, once. "Secret" means it must never be committed or put in a `VITE_` name.

### `apps/web/.env.local` (public: shipped to the browser)

| Variable | Used by | Secret | Where to get it |
| --- | --- | --- | --- |
| `VITE_USE_MOCKS` | web app | no | `true` for mocks, `false` for the real backend |
| `VITE_SUPABASE_URL` | web app | no | Supabase dashboard > Connect, or `supabase status` locally |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | web app | no | Supabase dashboard > Project Settings > API Keys > Publishable key |
| `VITE_API_BASE_URL` | web app | no | `/api` (same origin on Vercel and under `vercel dev`) |

### `services/api/.env.local` and Vercel env (secret)

| Variable | Used by | Secret | Where to get it |
| --- | --- | --- | --- |
| `SUPABASE_URL` | API, pipeline | no | same URL as `VITE_SUPABASE_URL` |
| `SUPABASE_SECRET_KEY` | API, pipeline | **yes** | Supabase dashboard > Project Settings > API Keys > Secret key (bypasses row-level security) |
| `SUPABASE_JWKS_URL` | API | no | `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` |
| `ANTHROPIC_API_KEY` | pipeline | **yes** | Anthropic console > API keys |
| `ANTHROPIC_MODEL_CLASSIFY` | pipeline | no | model id for classification (`claude-haiku-5-5`) |
| `ANTHROPIC_MODEL_EXTRACT` | pipeline | no | model id for extraction (`claude-opus-5-5`) |
| `STORAGE_DOCUMENTS_BUCKET` | API, pipeline | no | `documents` (bucket made by a migration) |
| `STORAGE_EXPORTS_BUCKET` | none yet | no | `exports` (bucket made by a migration; reserved for export files) |
| `PIPELINE_SECRET` | pipeline functions, smoke scripts | **yes** | `openssl rand -base64 48`; the same value goes into Vault as `pipeline_secret` |
| `UPLOAD_MAX_BYTES` | API | no | `20971520` (20 MB, equals the bucket limit) |
| `CLASSIFY_MIN_CONFIDENCE` | pipeline | no | `0.7`; a number from 0 to 1 |
| `DEMO_USER_EMAIL` | `seed-demo`, smoke scripts (local only) | no | `demo@docspread.dev`; `seed-demo` fills it in |
| `DEMO_USER_PASSWORD` | `seed-demo`, smoke scripts (local only) | **yes** | written by `seed-demo` when it creates the demo login; never set on Vercel |

## 9. Add a new environment variable

1. Add it to the matching `.env.example` (`apps/web/.env.example` for the browser, `services/api/.env.example` for functions) with a one-line comment that says what it is. Add a row to the table above.
2. Functions only: add its name to the required list in `services/api/src/env.ts` (the API) or `services/api/src/pipeline/pipeline-env.ts` (the pipeline) so a missing value fails with `Missing env variable NAME`. Read it from `process.env` on the first request, not at module top level.
3. Set it in Vercel for Production and Preview (dashboard > Settings > Environment Variables, or `vercel env add NAME production`). Type secrets yourself.
4. Add the real value to your own `.env.local`. Run `pnpm --filter @docspread/api check-env` if it is a function variable.
5. Names starting with `VITE_` ship to the browser: never put a secret in one. `turbo.json` already hashes every `VITE_*` variable, so the build cache stays correct.
