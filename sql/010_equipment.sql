-- SoenensMedia Portaal — Fase 8: apparatuur-beheer
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  categorie text,
  aankoopdatum date,
  aankoopprijs numeric,
  onderhoud_datum date,
  verzekerd boolean not null default false,
  uitgeleend_aan text,
  notities text,
  created_at timestamptz not null default now()
);

alter table equipment enable row level security;

create policy "equipment_all_admin" on equipment
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.equipment to authenticated;
