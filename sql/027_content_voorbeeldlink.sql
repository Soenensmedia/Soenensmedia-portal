-- SoenensMedia Portaal — Fase 33: voorbeeldlink (bv. Instagram) per idee/script
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table content_ideeen add column if not exists voorbeeld_link text;
alter table content_scripts add column if not exists voorbeeld_link text;
