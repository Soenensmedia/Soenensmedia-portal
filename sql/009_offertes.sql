-- SoenensMedia Portaal — Fase 8: offertes + koppeling facturen aan productie-opdracht
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists fin_offertes (
  id uuid primary key default gen_random_uuid(),
  klant text not null,
  project_id uuid references projects(id) on delete set null,
  omschrijving text,
  bedrag numeric not null default 0,
  status text not null default 'verstuurd' check (status in ('verstuurd', 'geaccepteerd', 'geweigerd')),
  datum date not null default current_date,
  created_at timestamptz not null default now()
);

alter table fin_offertes enable row level security;

create policy "fin_offertes_all_admin" on fin_offertes
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.fin_offertes to authenticated;

-- Bestaande facturen optioneel koppelen aan een productie-opdracht (naast de bestaande vrije klant-tekst)
alter table fin_facturen add column if not exists project_id uuid references projects(id) on delete set null;
