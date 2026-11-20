-- Storage: private buckets for uploaded documents and exports (spec 022).
-- Objects live under <company-id>/<document-id>/<file>. Members may read their
-- company's objects; every write goes through the API (secret key, signed upload URLs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png']),
  ('exports', 'exports', false, 20971520, null)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- True when the object's first path segment is the uuid of a company the caller belongs to.
-- A non-uuid segment is simply not visible (no cast error).
create or replace function private.can_read_company_object(p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (select private.is_company_member(((storage.foldername(p_name))[1])::uuid))
    else false
  end;
$$;

revoke execute on function private.can_read_company_object(text) from public, anon;
grant execute on function private.can_read_company_object(text) to authenticated;

-- Read only. No insert/update/delete policy exists for authenticated or anon.
create policy storage_company_objects_select on storage.objects for select to authenticated
  using (
    bucket_id in ('documents', 'exports')
    and (select private.can_read_company_object(name))
  );
