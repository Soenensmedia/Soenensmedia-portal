-- SoenensMedia Portaal — Fase 26: omslagfoto per opdracht
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table projects add column if not exists cover_photo_path text;
