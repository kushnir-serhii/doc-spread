-- Queues (spec 022): pgmq with the two pipeline queues, reachable only through service-only wrappers.
-- The API and the pipeline functions call the wrappers over supabase-js rpc() with the secret key.
-- The wrappers are SECURITY DEFINER so the pgmq schema and its tables need no grant for any API role.

create extension if not exists pgmq;

-- Re-run safe: create a queue only when it doesn't exist yet.
do $$
declare
  q text;
begin
  foreach q in array array['ocr', 'extract'] loop
    if not exists (select 1 from pgmq.meta where queue_name = q) then
      perform pgmq.create(q);
    end if;
  end loop;
end
$$;

-- No client role may touch pgmq directly, whatever the extension granted.
revoke all on schema pgmq from public, anon, authenticated;
revoke all on all tables in schema pgmq from public, anon, authenticated;
revoke all on all sequences in schema pgmq from public, anon, authenticated;
revoke all on all functions in schema pgmq from public, anon, authenticated;

create or replace function public.queue_send(queue_name text, message jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg_id bigint;
begin
  if queue_name not in ('ocr', 'extract') then
    raise exception 'unknown queue %', queue_name using errcode = '22023';
  end if;
  select * into msg_id from pgmq.send(queue_name, message);
  return msg_id;
end;
$$;

create or replace function public.queue_read(queue_name text, visibility_timeout integer, quantity integer)
returns table (msg_id bigint, read_ct integer, enqueued_at timestamptz, vt timestamptz, message jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if queue_name not in ('ocr', 'extract') then
    raise exception 'unknown queue %', queue_name using errcode = '22023';
  end if;
  return query
    select r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
    from pgmq.read(queue_name, visibility_timeout, quantity) as r;
end;
$$;

create or replace function public.queue_delete(queue_name text, message_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if queue_name not in ('ocr', 'extract') then
    raise exception 'unknown queue %', queue_name using errcode = '22023';
  end if;
  return pgmq.delete(queue_name, message_id);
end;
$$;

create or replace function public.queue_archive(queue_name text, message_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if queue_name not in ('ocr', 'extract') then
    raise exception 'unknown queue %', queue_name using errcode = '22023';
  end if;
  return pgmq.archive(queue_name, message_id);
end;
$$;

revoke execute on function public.queue_send(text, jsonb) from public, anon, authenticated;
revoke execute on function public.queue_read(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.queue_delete(text, bigint) from public, anon, authenticated;
revoke execute on function public.queue_archive(text, bigint) from public, anon, authenticated;
grant execute on function public.queue_send(text, jsonb) to service_role;
grant execute on function public.queue_read(text, integer, integer) to service_role;
grant execute on function public.queue_delete(text, bigint) to service_role;
grant execute on function public.queue_archive(text, bigint) to service_role;
