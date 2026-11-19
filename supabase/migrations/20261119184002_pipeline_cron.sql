-- Pipeline trigger (spec 022 slice 4): pg_cron ticks every 30 s; for each queue with a visible message
-- one pg_net POST goes to the matching Vercel function. The base URL and the shared secret live in
-- Supabase Vault (names: pipeline_base_url, pipeline_secret), never in this file.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function private.trigger_pipeline()
returns void
language plpgsql
set search_path = ''
as $$
declare
  base_url text;
  secret text;
  q text;
  has_visible boolean;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'pipeline_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'pipeline_secret';

  if base_url is null then
    raise notice 'trigger_pipeline: Vault secret pipeline_base_url is missing';
  end if;
  if secret is null then
    raise notice 'trigger_pipeline: Vault secret pipeline_secret is missing';
  end if;
  if base_url is null or secret is null then
    return;
  end if;

  foreach q in array array['ocr', 'extract'] loop
    execute format('select exists (select 1 from pgmq.%I where vt <= clock_timestamp())', 'q_' || q)
      into has_visible;
    if has_visible then
      perform net.http_post(
        url := base_url || '/api/pipeline/' || q,
        headers := jsonb_build_object('content-type', 'application/json', 'x-pipeline-secret', secret),
        body := '{}'::jsonb,
        -- The function works inside the request (maxDuration 300 s), so wait for it.
        timeout_milliseconds := 310000
      );
    end if;
  end loop;
end;
$$;

-- Only the cron job (postgres) calls it.
revoke execute on function private.trigger_pipeline() from public, anon, authenticated, service_role;

-- Re-run safe: cron.schedule upserts a job by name (pg_cron >= 1.5).
select cron.schedule('pipeline-trigger', '30 seconds', 'select private.trigger_pipeline()');

-- Two runs a minute add ~2,900 rows a day to cron history; keep one day of it.
select cron.schedule(
  'cron-history-cleanup',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$
);
