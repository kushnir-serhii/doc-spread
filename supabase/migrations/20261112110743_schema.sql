-- DocSpread schema (spec 020, slice 2). Row-level security per company on every table.
-- Money is stored in integer minor units + ISO currency inside the jsonb values (Money shape).
-- No country defaults: company currency is required input, locale is nullable (null = browser default).

-- ---------- private helpers (not exposed through the Data API) ----------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- company_id never changes after insert: no moving rows to another company.
create or replace function private.forbid_company_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------- tables ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text not null default '',
  recipients jsonb not null default '[]'::jsonb,
  default_currency char(3) not null check (default_currency ~ '^[A-Z]{3}$'),
  locale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  status text not null check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (company_id, email),
  unique (company_id, user_id),
  check (status = 'invited' or user_id is not null)
);
create index team_members_user_id_idx on public.team_members (user_id);

-- helpers that read team_members; security definer so policies do not recurse
create or replace function private.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.company_id = p_company_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'active'
  );
$$;

create or replace function private.is_company_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.company_id = p_company_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'active'
      and tm.role in ('owner', 'admin')
  );
$$;

revoke execute on function private.is_company_member(uuid) from public, anon;
revoke execute on function private.is_company_admin(uuid) from public, anon;
grant execute on function private.is_company_member(uuid) to authenticated;
grant execute on function private.is_company_admin(uuid) to authenticated;

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  description text not null default '',
  current_version integer not null default 1 check (current_version >= 1),
  -- shared by the team, not versioned (009); ExportMapping without typeId/updatedAt
  export_mapping jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);
create index document_types_company_id_idx on public.document_types (company_id);

create table public.document_type_versions (
  type_id uuid not null,
  version integer not null check (version >= 1),
  company_id uuid not null,
  fields jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  title_field_id text,
  list_column_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (type_id, version),
  unique (type_id, version, company_id),
  foreign key (type_id, company_id) references public.document_types (id, company_id) on delete cascade
);
create index document_type_versions_company_id_idx on public.document_type_versions (type_id, company_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'jpg', 'png')),
  page_count integer not null default 0 check (page_count >= 0),
  storage_path text,
  uploaded_at timestamptz not null default now(),
  status text not null default 'uploaded' check (
    status in ('uploaded', 'processing', 'unclassified', 'needs_review', 'approved', 'exported', 'rejected', 'error')
  ),
  type_id uuid,
  type_version integer,
  classification_confidence numeric check (classification_confidence between 0 and 1),
  -- keyed by field id, FieldValue shape (money = integer minor units + ISO currency)
  "values" jsonb not null default '{}'::jsonb,
  overall_confidence numeric not null default 0 check (overall_confidence between 0 and 1),
  error_message text,
  rejection_reason text,
  -- optimistic locking for concurrent edits (012): bumped on every update
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  check ((type_id is null) = (type_version is null)),
  -- the type version must belong to the same company (MATCH SIMPLE: skipped while unclassified)
  foreign key (type_id, type_version, company_id)
    references public.document_type_versions (type_id, version, company_id)
);
create index documents_company_id_status_idx on public.documents (company_id, status);
create index documents_type_idx on public.documents (type_id, type_version, company_id);
create index documents_company_uploaded_idx on public.documents (company_id, uploaded_at desc);

create table public.document_pages (
  document_id uuid not null,
  page_index integer not null check (page_index >= 0),
  company_id uuid not null,
  width numeric not null,
  height numeric not null,
  image_path text,
  -- [{ id, text, bbox: { x, y, w, h } }], normalized 0..1 to the page after rotation, origin top-left
  tokens jsonb not null default '[]'::jsonb,
  primary key (document_id, page_index),
  foreign key (document_id, company_id) references public.documents (id, company_id) on delete cascade
);
create index document_pages_company_id_idx on public.document_pages (document_id, company_id);

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  format text not null check (format in ('csv', 'xlsx', 'pdf_bundle')),
  type_id uuid not null,
  document_ids uuid[] not null default '{}',
  destination text not null check (destination in ('download', 'email')),
  recipient text,
  columns jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  foreign key (type_id, company_id) references public.document_types (id, company_id) on delete cascade
);
create index export_jobs_company_id_idx on public.export_jobs (company_id);
create index export_jobs_type_id_idx on public.export_jobs (type_id, company_id);
create index export_jobs_created_by_idx on public.export_jobs (created_by);

-- global, managed by the service (no client writes)
create table public.templates (
  id text primary key,
  name text not null,
  description text not null default '',
  fields jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  title_field_id text,
  list_column_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- triggers ----------
create trigger companies_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
create trigger document_types_updated_at before update on public.document_types
  for each row execute function private.set_updated_at();

create or replace function private.bump_document_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$;
create trigger documents_bump_version before update on public.documents
  for each row execute function private.bump_document_version();

create trigger team_members_company_immutable before update on public.team_members
  for each row execute function private.forbid_company_change();
create trigger document_types_company_immutable before update on public.document_types
  for each row execute function private.forbid_company_change();
create trigger document_type_versions_company_immutable before update on public.document_type_versions
  for each row execute function private.forbid_company_change();
create trigger documents_company_immutable before update on public.documents
  for each row execute function private.forbid_company_change();
create trigger document_pages_company_immutable before update on public.document_pages
  for each row execute function private.forbid_company_change();
create trigger export_jobs_company_immutable before update on public.export_jobs
  for each row execute function private.forbid_company_change();

-- ---------- Data API grants (explicit; nothing for anon) ----------
revoke all on public.companies, public.team_members, public.document_types,
  public.document_type_versions, public.documents, public.document_pages,
  public.export_jobs, public.templates from public, anon, authenticated;

grant select, update on public.companies to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.document_types to authenticated;
grant select, insert, update, delete on public.document_type_versions to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.document_pages to authenticated;
grant select, insert on public.export_jobs to authenticated;
grant select on public.templates to authenticated;

-- ---------- row-level security ----------
alter table public.companies enable row level security;
alter table public.team_members enable row level security;
alter table public.document_types enable row level security;
alter table public.document_type_versions enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.export_jobs enable row level security;
alter table public.templates enable row level security;

-- companies: members read, owner/admin edit; created by the service
create policy companies_select on public.companies for select to authenticated
  using ((select private.is_company_member(id)));
create policy companies_update on public.companies for update to authenticated
  using ((select private.is_company_admin(id)))
  with check ((select private.is_company_admin(id)));

-- team_members: members read; owner/admin manage non-owner rows
create policy team_members_select on public.team_members for select to authenticated
  using ((select private.is_company_member(company_id)));
create policy team_members_insert on public.team_members for insert to authenticated
  with check ((select private.is_company_admin(company_id)) and role <> 'owner');
create policy team_members_update on public.team_members for update to authenticated
  using ((select private.is_company_admin(company_id)) and role <> 'owner')
  with check ((select private.is_company_admin(company_id)) and role <> 'owner');
create policy team_members_delete on public.team_members for delete to authenticated
  using ((select private.is_company_admin(company_id)) and role <> 'owner');

-- document_types and versions: members read, owner/admin write
create policy document_types_select on public.document_types for select to authenticated
  using ((select private.is_company_member(company_id)));
create policy document_types_insert on public.document_types for insert to authenticated
  with check ((select private.is_company_admin(company_id)));
create policy document_types_update on public.document_types for update to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));
create policy document_types_delete on public.document_types for delete to authenticated
  using ((select private.is_company_admin(company_id)));

create policy document_type_versions_select on public.document_type_versions for select to authenticated
  using ((select private.is_company_member(company_id)));
create policy document_type_versions_insert on public.document_type_versions for insert to authenticated
  with check ((select private.is_company_admin(company_id)));
create policy document_type_versions_update on public.document_type_versions for update to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));
create policy document_type_versions_delete on public.document_type_versions for delete to authenticated
  using ((select private.is_company_admin(company_id)));

-- documents: any member works with them
create policy documents_select on public.documents for select to authenticated
  using ((select private.is_company_member(company_id)));
create policy documents_insert on public.documents for insert to authenticated
  with check ((select private.is_company_member(company_id)));
create policy documents_update on public.documents for update to authenticated
  using ((select private.is_company_member(company_id)))
  with check ((select private.is_company_member(company_id)));
create policy documents_delete on public.documents for delete to authenticated
  using ((select private.is_company_member(company_id)));

-- pages: members read, written by the pipeline (service)
create policy document_pages_select on public.document_pages for select to authenticated
  using ((select private.is_company_member(company_id)));

-- export jobs: members read and create; status is updated by the service
create policy export_jobs_select on public.export_jobs for select to authenticated
  using ((select private.is_company_member(company_id)));
create policy export_jobs_insert on public.export_jobs for insert to authenticated
  with check ((select private.is_company_member(company_id)) and created_by = (select auth.uid()));

-- templates: global, read-only
create policy templates_select on public.templates for select to authenticated
  using (true);
