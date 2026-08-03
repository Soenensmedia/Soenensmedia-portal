-- SoenensMedia Portaal — Fase 6: financieel dashboard (enkel voor admin)
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

-- ── FACTUREN ─────────────────────────────────────────────
create table if not exists fin_facturen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  klant text,
  omschrijving text,
  datum date not null default current_date,
  vervaldatum date,
  bedrag numeric(10,2) not null default 0,
  btw numeric(5,2) not null default 21,
  status text not null default 'open' check (status in ('open','betaald')),
  created_at timestamptz not null default now()
);

-- ── KOSTEN (incl. vaste kosten via type='vast') ──────────
create table if not exists fin_kosten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  omschrijving text,
  datum date not null default current_date,
  bedrag numeric(10,2) not null default 0,
  btw numeric(5,2) not null default 21,
  aftrekbaar boolean not null default true,
  type text not null default 'eenmalig' check (type in ('eenmalig','vast')),
  frequentie text check (frequentie in ('maandelijks','kwartaal','jaarlijks')),
  created_at timestamptz not null default now()
);

-- ── PROJECTEN (financieel/facturatie, apart van productie-projects) ──
create table if not exists fin_projecten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  naam text,
  klant text,
  geschat_bedrag numeric(10,2) not null default 0,
  status text not null default 'idee' check (status in ('idee','te-factureren','gefactureerd','betaald')),
  notities text,
  file_path text,
  file_name text,
  created_at timestamptz not null default now()
);

-- ── AANKOPEN (verlanglijst) ───────────────────────────────
create table if not exists fin_aankopen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  naam text,
  prijs numeric(10,2) not null default 0,
  prioriteit text not null default 'gemiddeld' check (prioriteit in ('laag','gemiddeld','hoog')),
  notities text,
  status text not null default 'verlanglijst' check (status in ('verlanglijst','gekocht')),
  created_at timestamptz not null default now()
);

-- ── INSTELLINGEN (1 rij per gebruiker) ────────────────────
create table if not exists fin_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  default_btw numeric(5,2) not null default 21,
  period text not null default 'kwartaal' check (period in ('maand','kwartaal')),
  banksaldo numeric(10,2) not null default 0,
  reserve_doel_maanden numeric(5,2) not null default 3,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ── BTW "opzij gezet"-vinkje per periode ─────────────────
create table if not exists fin_btw_set_aside (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  period_key text not null,
  set_aside boolean not null default false,
  unique (user_id, period_key)
);

-- ── RLS: enkel admin, nooit klant ────────────────────────
alter table fin_facturen enable row level security;
alter table fin_kosten enable row level security;
alter table fin_projecten enable row level security;
alter table fin_aankopen enable row level security;
alter table fin_settings enable row level security;
alter table fin_btw_set_aside enable row level security;

create policy "fin_facturen_admin" on fin_facturen for all using (is_admin()) with check (is_admin());
create policy "fin_kosten_admin" on fin_kosten for all using (is_admin()) with check (is_admin());
create policy "fin_projecten_admin" on fin_projecten for all using (is_admin()) with check (is_admin());
create policy "fin_aankopen_admin" on fin_aankopen for all using (is_admin()) with check (is_admin());
create policy "fin_settings_admin" on fin_settings for all using (is_admin()) with check (is_admin());
create policy "fin_btw_set_aside_admin" on fin_btw_set_aside for all using (is_admin()) with check (is_admin());

-- ── basisrechten (zonder dit: "permission denied for table") ──
grant select, insert, update, delete on
  fin_facturen, fin_kosten, fin_projecten, fin_aankopen, fin_settings, fin_btw_set_aside
  to authenticated;

-- ── opslag voor geüploade facturen bij fin_projecten ─────
insert into storage.buckets (id, name, public)
values ('fin-facturen', 'fin-facturen', false)
on conflict (id) do nothing;

create policy "fin_facturen_storage_admin" on storage.objects
  for all using (bucket_id = 'fin-facturen' and is_admin())
  with check (bucket_id = 'fin-facturen' and is_admin());
