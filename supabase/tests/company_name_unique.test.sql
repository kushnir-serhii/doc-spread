begin;
select plan(4);

insert into public.companies (name, default_currency) values ('Acme Trading', 'USD');

select throws_ok(
  $$insert into public.companies (name, default_currency) values ('ACME trading', 'USD')$$,
  '23505', null, 'a name differing only in case is refused'
);
select throws_ok(
  $$insert into public.companies (name, default_currency) values ('  Acme   Trading ', 'USD')$$,
  '23505', null, 'a name differing only in spacing is refused'
);
select lives_ok(
  $$insert into public.companies (name, default_currency) values ('Acme Trading Ltd', 'USD')$$,
  'a different name is accepted'
);
select is(
  (select count(*)::int from public.companies where name ilike '%acme%'), 2, 'only the two distinct companies exist'
);

select * from finish();
rollback;
