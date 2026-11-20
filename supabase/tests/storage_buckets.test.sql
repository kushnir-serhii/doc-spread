begin;
select plan(13);

-- ---------- fixtures (as the postgres superuser) ----------
insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-00000000000a', 'a@example.test'),
  ('dddddddd-0000-0000-0000-00000000000b', 'b@example.test');

insert into public.companies (id, name, default_currency) values
  ('dddddddd-1111-0000-0000-00000000000a', 'Company A', 'USD'),
  ('dddddddd-1111-0000-0000-00000000000b', 'Company B', 'USD');

insert into public.team_members (id, company_id, user_id, email, role, status) values
  ('dddddddd-2222-0000-0000-00000000000a', 'dddddddd-1111-0000-0000-00000000000a',
   'dddddddd-0000-0000-0000-00000000000a', 'a@example.test', 'member', 'active'),
  ('dddddddd-2222-0000-0000-00000000000b', 'dddddddd-1111-0000-0000-00000000000b',
   'dddddddd-0000-0000-0000-00000000000b', 'b@example.test', 'member', 'active');

insert into storage.buckets (id, name, public) values ('other', 'other', false);

insert into storage.objects (bucket_id, name) values
  ('documents', 'dddddddd-1111-0000-0000-00000000000a/d1/a.pdf'),
  ('documents', 'dddddddd-1111-0000-0000-00000000000b/d2/b.pdf'),
  ('exports',   'dddddddd-1111-0000-0000-00000000000a/d1/a.csv'),
  ('exports',   'dddddddd-1111-0000-0000-00000000000b/d2/b.csv'),
  ('documents', 'not-a-uuid/x.pdf'),
  ('documents', 'loose.pdf'),
  ('other',     'dddddddd-1111-0000-0000-00000000000a/d1/a.pdf');

-- ---------- buckets ----------
select is(
  (select count(*)::int from storage.buckets
    where id in ('documents', 'exports') and not public and file_size_limit = 20971520),
  2,
  'documents and exports are private with a 20 MB limit'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'documents'),
  array['application/pdf', 'image/jpeg', 'image/png'],
  'documents allows only PDF, JPEG and PNG'
);

-- ---------- member of A ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*)::int from storage.objects
    where name = 'dddddddd-1111-0000-0000-00000000000a/d1/a.pdf'),
  1, 'a member reads their own document'
);
select is(
  (select count(*)::int from storage.objects
    where name = 'dddddddd-1111-0000-0000-00000000000a/d1/a.csv'),
  1, 'a member reads their own export'
);
select is(
  (select count(*)::int from storage.objects where name like 'dddddddd-1111-0000-0000-00000000000b/%'),
  0, 'a member cannot read another company''s objects'
);
select is(
  (select count(*)::int from storage.objects
    where name in ('not-a-uuid/x.pdf', 'loose.pdf')),
  0, 'objects with a non-uuid first segment are invisible (no cast error)'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'other'),
  0, 'objects in other buckets are not covered'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('documents', 'dddddddd-1111-0000-0000-00000000000a/d3/new.pdf')$$,
  '42501', null, 'a member cannot insert objects, even under their own prefix'
);

with u as (
  update storage.objects set name = name || '.x'
  where name = 'dddddddd-1111-0000-0000-00000000000a/d1/a.pdf' returning 1
) select is((select count(*)::int from u), 0, 'a member cannot update objects');

-- Supabase also blocks direct deletes with a trigger; either way nothing is removed.
do $$ begin
  delete from storage.objects where name = 'dddddddd-1111-0000-0000-00000000000a/d1/a.pdf';
exception when others then null;
end $$;
select is(
  (select count(*)::int from storage.objects
    where name = 'dddddddd-1111-0000-0000-00000000000a/d1/a.pdf'),
  1, 'a member cannot delete objects'
);

-- ---------- anon ----------
reset role;
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select is(
  (select count(*)::int from storage.objects where bucket_id in ('documents', 'exports')),
  0, 'anon reads nothing'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('documents', 'dddddddd-1111-0000-0000-00000000000a/d3/anon.pdf')$$,
  '42501', null, 'anon cannot insert objects'
);

-- ---------- superuser still sees all ----------
reset role;
select is(
  (select count(*)::int from storage.objects where bucket_id in ('documents', 'exports')),
  6, 'the service side sees every object'
);

select * from finish();
rollback;
