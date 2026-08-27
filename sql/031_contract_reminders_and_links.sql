-- SoenensMedia Portaal — Fase 46: opdracht-contract koppelen aan een project,
-- terugkeerdatum bij uitgeleende apparatuur
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table client_contracts add column if not exists project_id uuid references projects(id) on delete set null;
alter table equipment add column if not exists terug_verwacht_op date;
