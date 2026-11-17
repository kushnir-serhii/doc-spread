-- Spec 020, owner decisions of 2026-11-17:
-- 1. Any member of a company may create and change its document types (not only owners and admins).
-- 2. A saved type version is locked: it is never updated or deleted on its own. A change is a new
--    version; a new type can be started by copying an existing one (an app feature, not SQL).

-- 1. document_types: any member writes
drop policy document_types_insert on public.document_types;
drop policy document_types_update on public.document_types;
drop policy document_types_delete on public.document_types;

create policy document_types_insert on public.document_types for insert to authenticated
  with check ((select private.is_company_member(company_id)));
create policy document_types_update on public.document_types for update to authenticated
  using ((select private.is_company_member(company_id)))
  with check ((select private.is_company_member(company_id)));
create policy document_types_delete on public.document_types for delete to authenticated
  using ((select private.is_company_member(company_id)));

-- 2. document_type_versions: any member adds a version; nobody changes or removes one
drop policy document_type_versions_insert on public.document_type_versions;
drop policy document_type_versions_update on public.document_type_versions;
drop policy document_type_versions_delete on public.document_type_versions;

create policy document_type_versions_insert on public.document_type_versions for insert to authenticated
  with check ((select private.is_company_member(company_id)));

revoke update, delete on public.document_type_versions from authenticated;

-- Also blocks the service role and direct SQL. Deleting a whole type still removes its versions
-- through the foreign key's cascade, which this trigger does not cover.
create function private.block_type_version_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Document type version % of type % is locked. Save a new version instead.',
    old.version, old.type_id
    using errcode = '42501';
end;
$$;

revoke execute on function private.block_type_version_update() from public, anon, authenticated;

create trigger document_type_versions_locked
  before update on public.document_type_versions
  for each row execute function private.block_type_version_update();
