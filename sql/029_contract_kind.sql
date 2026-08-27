-- SoenensMedia Portaal — Fase 44: losse-opdracht-bevestiging naast retainer-contract
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table client_contracts add column if not exists kind text not null default 'retainer'; -- retainer | opdracht
