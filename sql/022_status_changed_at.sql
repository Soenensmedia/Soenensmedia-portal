-- SoenensMedia Portaal — Fase 16: tijdstip van laatste statuswijziging
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table projects add column if not exists status_changed_at timestamptz;
