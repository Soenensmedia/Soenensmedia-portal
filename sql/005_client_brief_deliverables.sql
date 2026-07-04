-- SoenensMedia Portaal — Fase 4: briefing/deliverables voor de klant
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table projects add column if not exists client_brief text;
alter table projects add column if not exists deliverables text;
