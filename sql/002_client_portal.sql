-- SoenensMedia Portaal — Fase 2: klantenportaal met rollen
-- Dit is een TOEVOEGING op schema.sql (die je al eerder draaide) — verandert
-- niets aan bestaande data. Plak dit volledig in Supabase SQL Editor > Run.

-- ── PROFIELEN (rol: admin of client) ────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'client' check (role in ('admin','client')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- ── automatisch een profiel aanmaken bij signup ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill: bestaande accounts (aangemaakt vóór deze migratie) kregen de
-- trigger hierboven niet te zien, dus die krijgen hier alsnog een profiel.
insert into public.profiles (id, email, role)
select id, email, 'client' from auth.users
on conflict (id) do nothing;

-- ── helper: is de ingelogde gebruiker admin? ────────────
-- security definer + eigen search_path zodat dit veilig binnen RLS-policies
-- gebruikt kan worden zonder recursie op de RLS van `profiles` zelf.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles_update_admin" on profiles
  for update using (is_admin());

-- ── projects uitbreiden met klant-koppeling ─────────────
alter table projects add column if not exists client_user_id uuid references auth.users(id);
alter table projects add column if not exists frame_io_url text;
alter table projects add column if not exists client_approved boolean not null default false;
alter table projects add column if not exists client_approved_at timestamptz;

-- RLS op projects herzien: admin ziet/beheert alles, klant ziet enkel zijn
-- eigen gekoppelde project(en) (geen insert/update/delete voor klant — dat
-- gaat via de approve_project()-functie hieronder).
drop policy if exists "projects_select_own" on projects;
drop policy if exists "projects_insert_own" on projects;
drop policy if exists "projects_update_own" on projects;
drop policy if exists "projects_delete_own" on projects;

create policy "projects_select" on projects
  for select using (is_admin() or client_user_id = auth.uid());
create policy "projects_insert_admin" on projects
  for insert with check (is_admin());
create policy "projects_update_admin" on projects
  for update using (is_admin());
create policy "projects_delete_admin" on projects
  for delete using (is_admin());

-- ── feedback-draadje per project ────────────────────────
create table if not exists project_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) default auth.uid(),
  message text not null,
  created_at timestamptz not null default now()
);

alter table project_feedback enable row level security;

create policy "feedback_select" on project_feedback
  for select using (
    is_admin() or exists (
      select 1 from projects p where p.id = project_feedback.project_id and p.client_user_id = auth.uid()
    )
  );
create policy "feedback_insert" on project_feedback
  for insert with check (
    author_user_id = auth.uid() and (
      is_admin() or exists (
        select 1 from projects p where p.id = project_feedback.project_id and p.client_user_id = auth.uid()
      )
    )
  );

-- ── klant koppelen aan project (enkel admin) ────────────
create or replace function public.link_client_by_email(p_project_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not is_admin() then
    raise exception 'Niet toegestaan';
  end if;

  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'Geen gebruiker gevonden met e-mail %', p_email;
  end if;

  update projects set client_user_id = v_user_id where id = p_project_id;
end;
$$;

-- ── project goedkeuren (enkel de gekoppelde klant) ──────
create or replace function public.approve_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from projects where id = p_project_id and client_user_id = auth.uid()
  ) then
    raise exception 'Niet toegestaan';
  end if;

  update projects
  set client_approved = true, client_approved_at = now()
  where id = p_project_id;
end;
$$;

-- ── basisrechten ─────────────────────────────────────────
grant select on public.profiles to authenticated;
grant select, insert on public.project_feedback to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.link_client_by_email(uuid, text) to authenticated;
grant execute on function public.approve_project(uuid) to authenticated;

-- ── EENMALIG handmatig uit te voeren: jezelf admin maken ─
-- Vervang het e-mailadres door het e-mailadres van je eigen login-account
-- en voer dit apart uit (dit staat expres los van de rest, run het pas
-- nadat je hierboven bent ingelogd en dus een profiel-rij hebt):
--
-- update profiles set role = 'admin' where email = 'jouw-login-email@hier.be';
