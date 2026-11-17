begin;
select plan(7);

-- ---------- fixtures (as the postgres superuser) ----------
-- M is a plain member (not owner or admin) of company M.
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'm@example.test');

insert into public.companies (id, name, default_currency) values
  ('cccccccc-1111-0000-0000-000000000001', 'Company M', 'USD');

insert into public.team_members (id, company_id, user_id, email, role, status) values
  ('cccccccc-2222-0000-0000-000000000001', 'cccccccc-1111-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'm@example.test', 'member', 'active');

insert into public.document_types (id, company_id, name) values
  ('cccccccc-3333-0000-0000-000000000001', 'cccccccc-1111-0000-0000-000000000001', 'Invoice');

insert into public.document_type_versions (type_id, version, company_id) values
  ('cccccccc-3333-0000-0000-000000000001', 1, 'cccccccc-1111-0000-0000-000000000001');

-- ---------- act as member M ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$insert into public.document_types (id, company_id, name)
    values ('cccccccc-3333-0000-0000-000000000002', 'cccccccc-1111-0000-0000-000000000001', 'Receipt')$$,
  'a plain member can create a document type'
);

update public.document_types set name = 'Invoice (renamed)' where id = 'cccccccc-3333-0000-0000-000000000001';
select is(
  (select name from public.document_types where id = 'cccccccc-3333-0000-0000-000000000001'),
  'Invoice (renamed)',
  'a plain member can change a document type'
);

select lives_ok(
  $$insert into public.document_type_versions (type_id, version, company_id)
    values ('cccccccc-3333-0000-0000-000000000001', 2, 'cccccccc-1111-0000-0000-000000000001')$$,
  'a plain member can save a new version'
);

select throws_ok(
  $$update public.document_type_versions set fields = '[]'::jsonb
    where type_id = 'cccccccc-3333-0000-0000-000000000001' and version = 1$$,
  '42501',
  null,
  'a member cannot change a saved version'
);

select throws_ok(
  $$delete from public.document_type_versions
    where type_id = 'cccccccc-3333-0000-0000-000000000001' and version = 1$$,
  '42501',
  null,
  'a member cannot delete a saved version'
);

-- ---------- as the superuser: the lock holds for everyone ----------
reset role;

select throws_ok(
  $$update public.document_type_versions set fields = '[]'::jsonb
    where type_id = 'cccccccc-3333-0000-0000-000000000001' and version = 1$$,
  '42501',
  null,
  'not even the service side can change a saved version'
);

select is(
  (select count(*)::int from public.document_type_versions where type_id = 'cccccccc-3333-0000-0000-000000000001'),
  2,
  'both versions are kept'
);

select * from finish();
rollback;
