-- SoenensMedia Portaal — database schema
-- Plak dit volledig in Supabase: Dashboard > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- ── PROJECTS ────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  client_name text not null,
  title text not null,
  status text not null default 'nieuw'
    check (status in ('nieuw','shooting','editing','wacht_op_feedback','revisie','klaar_om_te_versturen','verzonden','afgerond')),
  deadline date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "projects_select_own" on projects for select using (user_id = auth.uid());
create policy "projects_insert_own" on projects for insert with check (user_id = auth.uid());
create policy "projects_update_own" on projects for update using (user_id = auth.uid());
create policy "projects_delete_own" on projects for delete using (user_id = auth.uid());

-- ── CALENDAR EVENTS ─────────────────────────────────────
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  event_type text not null default 'other'
    check (event_type in ('shoot','edit','business','learning','meeting','other')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  project_id uuid references projects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table calendar_events enable row level security;

create policy "events_select_own" on calendar_events for select using (user_id = auth.uid());
create policy "events_insert_own" on calendar_events for insert with check (user_id = auth.uid());
create policy "events_update_own" on calendar_events for update using (user_id = auth.uid());
create policy "events_delete_own" on calendar_events for delete using (user_id = auth.uid());

-- ── TIME ENTRIES ────────────────────────────────────────
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  project_id uuid references projects(id) on delete set null,
  entry_date date not null default current_date,
  hours numeric(5,2) not null check (hours > 0),
  description text,
  created_at timestamptz not null default now()
);

alter table time_entries enable row level security;

create policy "time_select_own" on time_entries for select using (user_id = auth.uid());
create policy "time_insert_own" on time_entries for insert with check (user_id = auth.uid());
create policy "time_update_own" on time_entries for update using (user_id = auth.uid());
create policy "time_delete_own" on time_entries for delete using (user_id = auth.uid());

-- ── basisrechten voor ingelogde gebruikers ──────────────
-- Zonder dit krijg je "permission denied for table ..." ook al staan de
-- RLS-policies hierboven correct: RLS bepaalt WELKE rijen je mag zien/wijzigen,
-- maar de rol moet sowieso basisrechten hebben op de tabel zelf.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects, public.calendar_events, public.time_entries to authenticated;

-- ── auto-update updated_at op projects ──────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();
