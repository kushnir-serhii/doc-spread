-- The Free monthly document limit goes from 50 to 10 (owner, 2026-11-27). Companies still on the old default get the
-- new one; a limit the owner raised by hand (any value other than 50) is left as it is.
alter table public.companies alter column monthly_document_limit set default 10;
update public.companies set monthly_document_limit = 10 where monthly_document_limit = 50;
