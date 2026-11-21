-- One company per name, ignoring case and spacing (spec 023). Sign-up checks first and maps this index's
-- unique violation (23505) to `company_taken`, so two parallel sign-ups cannot both win.
create unique index companies_name_normalized_key
  on public.companies (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
