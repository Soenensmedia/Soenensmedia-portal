-- SoenensMedia Portaal — Fase 48: Instagram-inspiratie-tab in het Contentsysteem
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists content_inspiratie (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  link text not null,
  notities text,
  created_at timestamptz not null default now()
);

alter table content_inspiratie enable row level security;

create policy "content_inspiratie_all_admin" on content_inspiratie
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on public.content_inspiratie to authenticated;
