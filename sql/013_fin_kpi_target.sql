-- SoenensMedia Portaal — Fase 8: omzetdoel per maand voor KPI-vergelijking
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table fin_settings add column if not exists omzet_doel_maand numeric not null default 0;
