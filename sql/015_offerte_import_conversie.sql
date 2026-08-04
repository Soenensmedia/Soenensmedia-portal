-- SoenensMedia Portaal — Fase 9b: eigen offerte-bestand importeren
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.
-- Geen nieuwe bucket nodig — hergebruikt de bestaande 'fin-facturen'-bucket uit Fase 6.

alter table fin_offertes add column if not exists bestand_path text;
alter table fin_offertes add column if not exists bestand_naam text;
