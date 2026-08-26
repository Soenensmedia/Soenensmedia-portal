-- SoenensMedia Portaal — Fase 32: content-strategiesysteem per klant
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.
-- Gebaseerd op het "short-form contentsysteem"-concept (format-skeletten, draaidag,
-- hookformules, b-roll, maandplanner) — één set per klant, admin-only.

create table if not exists content_strategie (
  client_id uuid primary key references clients(id) on delete cascade,
  sector text,
  volume text,
  doelen text[] not null default '{}',
  doelgroepen text[] not null default '{}',
  kernboodschap text,
  updated_at timestamptz not null default now()
);

create table if not exists content_ideeen (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  naam text not null,
  status text,
  tags text[] not null default '{}',
  wat text,
  hook text,
  lengte text,
  heroshot text,
  volgorde integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists content_scripts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  idee_id uuid references content_ideeen(id) on delete set null,
  titel text not null,
  meta text,
  shots jsonb not null default '[]',
  regie text,
  created_at timestamptz not null default now()
);

create table if not exists content_hookformules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  categorie text not null,
  waarom text,
  voorbeelden text[] not null default '{}',
  volgorde integer not null default 0
);

create table if not exists content_draaidag (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  tijd text,
  blok text,
  titel text,
  waarom text,
  shots text[] not null default '{}',
  volgorde integer not null default 0
);

create table if not exists content_broll (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  tekst text not null,
  volgorde integer not null default 0
);

create table if not exists content_planner (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  rol text not null,
  format text,
  onderwerp text,
  hook text,
  maand text,
  created_at timestamptz not null default now()
);

alter table content_strategie enable row level security;
alter table content_ideeen enable row level security;
alter table content_scripts enable row level security;
alter table content_hookformules enable row level security;
alter table content_draaidag enable row level security;
alter table content_broll enable row level security;
alter table content_planner enable row level security;

create policy "content_strategie_all_admin" on content_strategie for all using (is_admin()) with check (is_admin());
create policy "content_ideeen_all_admin" on content_ideeen for all using (is_admin()) with check (is_admin());
create policy "content_scripts_all_admin" on content_scripts for all using (is_admin()) with check (is_admin());
create policy "content_hookformules_all_admin" on content_hookformules for all using (is_admin()) with check (is_admin());
create policy "content_draaidag_all_admin" on content_draaidag for all using (is_admin()) with check (is_admin());
create policy "content_broll_all_admin" on content_broll for all using (is_admin()) with check (is_admin());
create policy "content_planner_all_admin" on content_planner for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on content_strategie to authenticated;
grant select, insert, update, delete on content_ideeen to authenticated;
grant select, insert, update, delete on content_scripts to authenticated;
grant select, insert, update, delete on content_hookformules to authenticated;
grant select, insert, update, delete on content_draaidag to authenticated;
grant select, insert, update, delete on content_broll to authenticated;
grant select, insert, update, delete on content_planner to authenticated;
