-- SoenensMedia Portaal — Fase 45: adres/BTW-nummer per klant (voor contracten)
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table clients add column if not exists adres text;
alter table clients add column if not exists btw_nummer text;
