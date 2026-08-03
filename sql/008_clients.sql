-- SoenensMedia Portaal — Fase 8: klanten-tabel (los van portaal-accounts) + retainers/referrals
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  email text,
  telefoon text,
  referral_source text,
  is_retainer boolean not null default false,
  retainer_start date,
  retainer_videos_doel_per_jaar integer,
  retainer_videos_geleverd_dit_jaar integer not null default 0,
  retainer_verlengdatum date,
  notities text,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;

create policy "clients_all_admin" on clients
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.clients to authenticated;

-- Koppeling met bestaande opdrachten (additief, naast de bestaande client_name-tekst
-- en client_user_id-portaalkoppeling — niets wordt hernoemd of verwijderd)
alter table projects add column if not exists client_id uuid references clients(id) on delete set null;
