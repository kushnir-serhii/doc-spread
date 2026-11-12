begin;
select plan(29);

-- ---------- fixtures (as the postgres superuser) ----------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'b@example.test');

insert into public.companies (id, name, default_currency) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'Company A', 'USD'),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'Company B', 'USD');

insert into public.team_members (id, company_id, user_id, email, role, status) values
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test', 'owner', 'active'),
  ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', 'b@example.test', 'owner', 'active');

insert into public.document_types (id, company_id, name) values
  ('aaaaaaaa-3333-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'Type A'),
  ('bbbbbbbb-3333-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001', 'Type B');

insert into public.document_type_versions (type_id, version, company_id) values
  ('aaaaaaaa-3333-0000-0000-000000000001', 1, 'aaaaaaaa-1111-0000-0000-000000000001'),
  ('bbbbbbbb-3333-0000-0000-000000000001', 1, 'bbbbbbbb-1111-0000-0000-000000000001');

insert into public.documents (id, company_id, file_name, file_type, type_id, type_version) values
  ('aaaaaaaa-4444-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 'a.pdf', 'pdf',
   'aaaaaaaa-3333-0000-0000-000000000001', 1),
  ('bbbbbbbb-4444-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001', 'b.pdf', 'pdf',
   'bbbbbbbb-3333-0000-0000-000000000001', 1);

insert into public.document_pages (document_id, page_index, company_id, width, height) values
  ('aaaaaaaa-4444-0000-0000-000000000001', 0, 'aaaaaaaa-1111-0000-0000-000000000001', 100, 100),
  ('bbbbbbbb-4444-0000-0000-000000000001', 0, 'bbbbbbbb-1111-0000-0000-000000000001', 100, 100);

insert into public.export_jobs (id, company_id, created_by, format, type_id, destination, columns) values
  ('aaaaaaaa-5555-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'csv', 'aaaaaaaa-3333-0000-0000-000000000001', 'download', '{}'),
  ('bbbbbbbb-5555-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', 'csv', 'bbbbbbbb-3333-0000-0000-000000000001', 'download', '{}');

insert into public.templates (id, name) values ('test-template', 'Test template');

-- ---------- act as user A ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

-- positive: A sees A's rows
select is((select count(*)::int from public.companies where id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees company A');
select is((select count(*)::int from public.team_members where company_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees team A');
select is((select count(*)::int from public.document_types where company_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees types A');
select is((select count(*)::int from public.document_type_versions where company_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees type versions A');
select is((select count(*)::int from public.documents where company_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees documents A');
select is((select count(*)::int from public.document_pages where company_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees pages A');
select is((select count(*)::int from public.export_jobs where company_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 1, 'A sees export jobs A');
select is((select count(*)::int from public.templates where id = 'test-template'), 1, 'A reads templates');

-- read: A sees nothing of B
select is((select count(*)::int from public.companies where id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read company B');
select is((select count(*)::int from public.team_members where company_id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read team B');
select is((select count(*)::int from public.document_types where company_id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read types B');
select is((select count(*)::int from public.document_type_versions where company_id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read type versions B');
select is((select count(*)::int from public.documents where company_id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read documents B');
select is((select count(*)::int from public.document_pages where company_id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read pages B');
select is((select count(*)::int from public.export_jobs where company_id = 'bbbbbbbb-1111-0000-0000-000000000001'), 0, 'A cannot read export jobs B');

-- change: updates and deletes of B's rows touch nothing (rows are invisible); verified below as superuser
update public.companies set name = 'hacked' where id = 'bbbbbbbb-1111-0000-0000-000000000001';
update public.document_types set name = 'hacked' where id = 'bbbbbbbb-3333-0000-0000-000000000001';
update public.documents set file_name = 'hacked.pdf' where id = 'bbbbbbbb-4444-0000-0000-000000000001';
update public.team_members set role = 'member' where id = 'bbbbbbbb-2222-0000-0000-000000000001';
delete from public.documents where id = 'bbbbbbbb-4444-0000-0000-000000000001';

-- insert into B's company
select throws_ok(
  $$insert into public.documents (company_id, file_name, file_type)
    values ('bbbbbbbb-1111-0000-0000-000000000001', 'x.pdf', 'pdf')$$,
  '42501', null, 'A cannot insert a document into company B');
select throws_ok(
  $$insert into public.team_members (company_id, user_id, email, role, status)
    values ('bbbbbbbb-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test', 'admin', 'active')$$,
  '42501', null, 'A cannot add themselves to company B');
select throws_ok(
  $$insert into public.document_types (company_id, name) values ('bbbbbbbb-1111-0000-0000-000000000001', 'x')$$,
  '42501', null, 'A cannot insert a type into company B');
select throws_ok(
  $$insert into public.export_jobs (company_id, created_by, format, type_id, destination, columns)
    values ('bbbbbbbb-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'csv',
            'bbbbbbbb-3333-0000-0000-000000000001', 'download', '{}')$$,
  '42501', null, 'A cannot insert an export job into company B');

-- reassign: own rows cannot move to B or to B's type
select throws_ok(
  $$update public.documents set company_id = 'bbbbbbbb-1111-0000-0000-000000000001'
    where id = 'aaaaaaaa-4444-0000-0000-000000000001'$$,
  '42501', null, 'A cannot move own document to company B');
select throws_ok(
  $$update public.documents set type_id = 'bbbbbbbb-3333-0000-0000-000000000001', type_version = 1
    where id = 'aaaaaaaa-4444-0000-0000-000000000001'$$,
  '23503', null, 'A cannot link own document to the type of company B');
select throws_ok(
  $$insert into public.documents (company_id, file_name, file_type, type_id, type_version)
    values ('aaaaaaaa-1111-0000-0000-000000000001', 'x.pdf', 'pdf', 'bbbbbbbb-3333-0000-0000-000000000001', 1)$$,
  '23503', null, 'A cannot create a document in A with the type of B');
select throws_ok(
  $$update public.document_types set company_id = 'bbbbbbbb-1111-0000-0000-000000000001'
    where id = 'aaaaaaaa-3333-0000-0000-000000000001'$$,
  '42501', null, 'A cannot move own type to company B');

-- templates have no client writes
select throws_ok(
  $$insert into public.templates (id, name) values ('x', 'x')$$,
  '42501', null, 'clients cannot write templates');

-- own edit works and bumps the optimistic-lock version
update public.documents set file_name = 'a2.pdf' where id = 'aaaaaaaa-4444-0000-0000-000000000001';
select is((select version from public.documents where id = 'aaaaaaaa-4444-0000-0000-000000000001'), 2, 'A edits own document; version bumped');

-- anon has no access at all
reset role;
set local role anon;
select throws_ok($$select * from public.documents$$, '42501', null, 'anon cannot read documents');

-- ---------- verify as superuser that B is untouched ----------
reset role;
select is((select name from public.companies where id = 'bbbbbbbb-1111-0000-0000-000000000001'), 'Company B', 'company B untouched');
select is((select file_name from public.documents where id = 'bbbbbbbb-4444-0000-0000-000000000001'), 'b.pdf', 'document B untouched and not deleted');
select is((select role from public.team_members where id = 'bbbbbbbb-2222-0000-0000-000000000001'), 'owner', 'team member B untouched');

select * from finish();
rollback;
