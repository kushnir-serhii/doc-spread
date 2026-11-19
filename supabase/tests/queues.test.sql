begin;
select plan(17);

-- ---------- service_role: the full message cycle ----------
set local role service_role;

select lives_ok(
  $$select public.queue_send('ocr', '{"documentId":"11111111-1111-1111-1111-111111111111"}'::jsonb)$$,
  'service_role sends to ocr'
);
create temp table read_ocr on commit drop as
  select * from public.queue_read('ocr', 30, 10);

select is((select count(*)::int from read_ocr), 1, 'service_role reads the message');
select is(
  (select message->>'documentId' from read_ocr),
  '11111111-1111-1111-1111-111111111111', 'the message body comes back'
);
select is(
  (select public.queue_delete('ocr', (select msg_id from read_ocr))),
  true, 'service_role deletes a message'
);
select is(
  (select count(*)::int from public.queue_read('ocr', 0, 10)),
  0, 'the deleted message is gone'
);
select lives_ok(
  $$select public.queue_send('extract', '{"documentId":"22222222-2222-2222-2222-222222222222"}'::jsonb)$$,
  'service_role sends to extract'
);
create temp table read_extract on commit drop as
  select * from public.queue_read('extract', 30, 1);
select is(
  (select public.queue_archive('extract', (select msg_id from read_extract))),
  true, 'service_role archives a message'
);

-- ---------- unknown queue names ----------
select throws_ok(
  $$select public.queue_send('nope', '{}'::jsonb)$$,
  '22023', 'unknown queue nope', 'send rejects an unknown queue'
);
select throws_ok(
  $$select * from public.queue_read('nope', 30, 1)$$,
  '22023', 'unknown queue nope', 'read rejects an unknown queue'
);
select throws_ok(
  $$select public.queue_delete('nope', 1)$$,
  '22023', 'unknown queue nope', 'delete rejects an unknown queue'
);
select throws_ok(
  $$select public.queue_archive('nope', 1)$$,
  '22023', 'unknown queue nope', 'archive rejects an unknown queue'
);

-- ---------- anon and authenticated ----------
set local role anon;
select throws_ok(
  $$select public.queue_send('ocr', '{}'::jsonb)$$,
  '42501', null, 'anon cannot send'
);
select throws_ok(
  $$select * from public.queue_read('ocr', 30, 1)$$,
  '42501', null, 'anon cannot read'
);

set local role authenticated;
select throws_ok(
  $$select public.queue_archive('ocr', 1)$$,
  '42501', null, 'authenticated cannot archive'
);
select throws_ok(
  $$select public.queue_delete('ocr', 1)$$,
  '42501', null, 'authenticated cannot delete'
);
select throws_ok(
  $$select * from pgmq.q_ocr$$,
  '42501', null, 'authenticated cannot read the queue table'
);
select throws_ok(
  $$select pgmq.send('ocr', '{}'::jsonb)$$,
  '42501', null, 'authenticated cannot call pgmq directly'
);

select * from finish();
rollback;
