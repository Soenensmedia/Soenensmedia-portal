-- SoenensMedia Portaal — Fase 13: contactgegevens voor de klant-kant
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table fin_settings add column if not exists contact_email text;
alter table fin_settings add column if not exists contact_telefoon text;
