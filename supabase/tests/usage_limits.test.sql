begin;
select plan(8);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test');
insert into public.companies (id, name, default_currency) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'Limit Co A', 'USD'),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'Limit Co B', 'USD');
insert into public.team_members (company_id, user_id, email, role, status) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test', 'admin', 'active');

select is(
  (select monthly_document_limit from public.companies where name = 'Limit Co A'), 50, 'the default limit is 50'
);
select throws_ok(
  $$update public.companies set monthly_document_limit = 0 where name = 'Limit Co A'$$,
  '23514', null, 'a limit of 0 is refused'
);

update public.companies set monthly_document_limit = 2 where name = 'Limit Co A';

-- last month's documents (UTC) do not count
insert into public.documents (company_id, file_name, file_type, uploaded_at) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'old.pdf', 'pdf',
   (date_trunc('month', now() at time zone 'utc') at time zone 'utc') - interval '1 second');
-- another company's documents do not count
insert into public.documents (company_id, file_name, file_type)
  select 'bbbbbbbb-1111-0000-0000-000000000001', 'b' || g || '.pdf', 'pdf' from generate_series(1, 3) g;

select lives_ok(
  $$insert into public.documents (company_id, file_name, file_type) values ('aaaaaaaa-1111-0000-0000-000000000001', '1.pdf', 'pdf')$$,
  'the first upload of the month is accepted'
);
select lives_ok(
  $$insert into public.documents (company_id, file_name, file_type) values ('aaaaaaaa-1111-0000-0000-000000000001', '2.pdf', 'pdf')$$,
  'an upload up to the limit is accepted (old and other-company documents do not count)'
);
select throws_ok(
  $$insert into public.documents (company_id, file_name, file_type) values ('aaaaaaaa-1111-0000-0000-000000000001', '3.pdf', 'pdf')$$,
  'DS001', 'limit_reached', 'an upload at the limit is refused with limit_reached'
);

create temp table caught (detail text);
grant all on caught to authenticated;
do $$
begin
  insert into public.documents (company_id, file_name, file_type) values ('aaaaaaaa-1111-0000-0000-000000000001', '4.pdf', 'pdf');
exception when sqlstate 'DS001' then
  declare d text;
  begin
    get stacked diagnostics d = pg_exception_detail;
    insert into caught values (d);
  end;
end $$;
select is((select detail::json ->> 'limit' from caught), '2', 'the error detail carries the limit');
select is((select detail::json ->> 'used' from caught), '2', 'the error detail carries the used count');

-- a member cannot change the limit through the browser role
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$update public.companies set monthly_document_limit = 100000 where id = 'aaaaaaaa-1111-0000-0000-000000000001'$$,
  '42501', null, 'a company admin cannot update monthly_document_limit'
);

select * from finish();
rollback;
