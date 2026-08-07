-- SoenensMedia Portaal — Fase 17: eigen foto per klant
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table clients add column if not exists photo_path text;
