-- SoenensMedia Portaal — Fase 8: footage/back-up-status per opdracht
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table projects add column if not exists archived boolean not null default false;
alter table projects add column if not exists storage_location text;
