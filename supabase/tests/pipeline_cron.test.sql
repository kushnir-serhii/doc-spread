begin;
select plan(11);

select is(
  (select schedule from cron.job where jobname = 'pipeline-trigger'),
  '30 seconds', 'cron job pipeline-trigger runs every 30 seconds'
);
select is(
  (select command from cron.job where jobname = 'pipeline-trigger'),
  'select private.trigger_pipeline()', 'the job calls private.trigger_pipeline()'
);

select is(has_function_privilege('anon', 'private.trigger_pipeline()', 'execute'), false, 'anon cannot execute trigger_pipeline');
select is(has_function_privilege('authenticated', 'private.trigger_pipeline()', 'execute'), false, 'authenticated cannot execute trigger_pipeline');
select is(has_function_privilege('service_role', 'private.trigger_pipeline()', 'execute'), false, 'service_role cannot execute trigger_pipeline');
select is(
  has_table_privilege('anon', 'vault.decrypted_secrets', 'select')
    or has_table_privilege('authenticated', 'vault.decrypted_secrets', 'select'),
  false, 'anon and authenticated cannot read vault.decrypted_secrets'
);

-- No secrets: nothing is queued.
create temp table before_count on commit drop as select count(*)::int as n from net.http_request_queue;
select private.trigger_pipeline();
select is((select count(*)::int from net.http_request_queue), (select n from before_count), 'no Vault secrets: no request queued');

-- With secrets and one message on ocr.
select vault.create_secret('https://example.test', 'pipeline_base_url');
select vault.create_secret('test-secret', 'pipeline_secret');
select pgmq.send('ocr', '{"documentId":"11111111-1111-1111-1111-111111111111"}'::jsonb);
select private.trigger_pipeline();
select is((select count(*)::int from net.http_request_queue), (select n from before_count) + 1, 'one visible ocr message: exactly one request');
select is(
  (select count(*)::int from net.http_request_queue
    where url = 'https://example.test/api/pipeline/ocr' and headers ? 'x-pipeline-secret'),
  1, 'the request goes to /api/pipeline/ocr with the x-pipeline-secret header'
);

-- An invisible message causes no request.
select pgmq.set_vt('ocr', (select min(msg_id) from pgmq.q_ocr), 600);
select private.trigger_pipeline();
select is((select count(*)::int from net.http_request_queue), (select n from before_count) + 1, 'invisible message: no new request');

-- Empty extract queue never produced a request.
select is((select count(*)::int from net.http_request_queue where url like '%/extract'), 0, 'empty extract queue: no request');

select * from finish();
rollback;
