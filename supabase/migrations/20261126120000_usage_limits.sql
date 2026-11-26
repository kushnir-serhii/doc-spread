-- Monthly document limit per company (spec 031), enforced in the database so parallel uploads cannot overshoot.
-- Usage = the company's documents with uploaded_at since the start of the calendar month (UTC).
-- The existing index documents_company_uploaded_idx (company_id, uploaded_at desc) serves the count.

alter table public.companies
  add column monthly_document_limit integer not null default 50 check (monthly_document_limit > 0);

-- Members and admins may edit a company, but not its allowance: update is granted per column,
-- so the limit (and any column added later) is changed only by the owner with SQL / the service key.
revoke update on public.companies from authenticated;
grant update (name, tax_id, recipients, default_currency, locale) on public.companies to authenticated;

-- Refuses the insert with SQLSTATE DS001 (message limit_reached, detail {"limit":N,"used":M}) when the company
-- is at its limit. security definer: the count must see every row of the company whatever the caller's RLS.
create or replace function private.enforce_document_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_used integer;
begin
  -- one insert per company at a time: the count below then includes every committed earlier insert
  perform pg_advisory_xact_lock(hashtext('documents_monthly_limit'), hashtext(new.company_id::text));

  select c.monthly_document_limit into v_limit from public.companies c where c.id = new.company_id;
  if v_limit is null then
    return new; -- unknown company: the foreign key reports it
  end if;

  select count(*)::integer into v_used
  from public.documents d
  where d.company_id = new.company_id
    and d.uploaded_at >= (date_trunc('month', now() at time zone 'utc') at time zone 'utc');

  if v_used >= v_limit then
    raise exception using
      errcode = 'DS001',
      message = 'limit_reached',
      detail = json_build_object('limit', v_limit, 'used', v_used)::text;
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_document_limit() from public, anon, authenticated;

create trigger documents_enforce_limit before insert on public.documents
  for each row execute function private.enforce_document_limit();
