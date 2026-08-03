-- SoenensMedia Portaal — Fase 8: eigen content planning (los van klantwerk)
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists content_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'tiktok', 'linkedin', 'youtube', 'facebook', 'ander')),
  type text not null check (type in ('bts', 'reel', 'testimonial', 'tips', 'aftermovie', 'showreel', 'persoonlijk', 'ander')),
  status text not null default 'idee' check (status in ('idee', 'opname', 'montage', 'gepland', 'gepost')),
  titel text not null,
  caption text,
  gepland_op date,
  gepost_op date,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table content_posts enable row level security;

create policy "content_posts_all_admin" on content_posts
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.content_posts to authenticated;

-- Postfrequentie-doelen per platform (1 rij per platform)
create table if not exists content_goals (
  platform text primary key,
  doel_per_week integer not null default 0
);

alter table content_goals enable row level security;

create policy "content_goals_all_admin" on content_goals
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.content_goals to authenticated;
