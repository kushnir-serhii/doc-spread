begin;
select plan(6);

insert into auth.users (id, email) values ('dddddddd-0000-0000-0000-000000000001', 'd@example.test');
insert into public.companies (id, name, default_currency) values
  ('dddddddd-1111-0000-0000-000000000001', 'Change Co', 'USD');
insert into public.team_members (company_id, user_id, email, role, status) values
  ('dddddddd-1111-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'd@example.test', 'member', 'active');
insert into public.documents (id, company_id, file_name, file_type, status) values
  ('dddddddd-4444-0000-0000-000000000001', 'dddddddd-1111-0000-0000-000000000001', 'a.pdf', 'pdf', 'needs_review');

select is(
  (select type_changes from public.documents where id = 'dddddddd-4444-0000-0000-000000000001'), 0::smallint,
  'type_changes starts at 0'
);
select throws_ok(
  $$update public.documents set type_changes = -1 where id = 'dddddddd-4444-0000-0000-000000000001'$$,
  '23514', null, 'a negative type_changes is refused'
);

-- a member (browser role)
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$update public.documents set type_changes = 1 where id = 'dddddddd-4444-0000-0000-000000000001'$$,
  '42501', null, 'a member cannot change type_changes'
);
select lives_ok(
  $$update public.documents set status = 'approved', "values" = '{"x":1}'::jsonb, rejection_reason = null
    where id = 'dddddddd-4444-0000-0000-000000000001'$$,
  'a member can still update values and status'
);
select is(
  (select status from public.documents where id = 'dddddddd-4444-0000-0000-000000000001'), 'approved',
  'the member update was applied'
);

-- the API (service role)
reset role;
set local role service_role;
update public.documents set type_changes = 2 where id = 'dddddddd-4444-0000-0000-000000000001';
select is(
  (select type_changes from public.documents where id = 'dddddddd-4444-0000-0000-000000000001'), 2::smallint,
  'the service role can change type_changes'
);

select * from finish();
rollback;
