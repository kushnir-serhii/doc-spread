-- The API and the pipeline use the secret key (service_role) and bypass row-level security on purpose.
-- Newer Supabase stacks no longer grant service_role access to public tables by default, so grant it explicitly.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
