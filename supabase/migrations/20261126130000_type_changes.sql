-- Changing a document's type re-runs extraction (spec 032), which costs money, so each document may change type
-- at most 3 times. The API enforces the limit and raises the counter; members cannot touch it from the browser.
alter table public.documents
  add column type_changes smallint not null default 0 check (type_changes >= 0);

-- Browser roles (authenticated, anon) may update documents (RLS decides which rows), but not this column.
-- The API's service key (service_role) and SQL as the owner are not affected.
create or replace function private.forbid_type_changes_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type_changes is distinct from old.type_changes and current_user in ('authenticated', 'anon') then
    raise exception 'type_changes can only be changed by the API' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function private.forbid_type_changes_update() from public, anon, authenticated;

create trigger documents_forbid_type_changes_update before update on public.documents
  for each row execute function private.forbid_type_changes_update();
