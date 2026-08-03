-- SoenensMedia Portaal — Fase 7: video-ideeën & scripts met klant-goedkeuring
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists project_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null default 'idee' check (type in ('idee', 'script')),
  title text not null,
  content text,
  status text not null default 'in_afwachting' check (status in ('in_afwachting', 'goedgekeurd', 'aanpassing_gevraagd')),
  created_at timestamptz not null default now()
);

alter table project_concepts enable row level security;

create policy "concepts_select" on project_concepts
  for select using (
    is_admin() or exists (
      select 1 from projects p where p.id = project_concepts.project_id and p.client_user_id = auth.uid()
    )
  );
create policy "concepts_insert_admin" on project_concepts
  for insert with check (is_admin());
create policy "concepts_update_admin" on project_concepts
  for update using (is_admin());
create policy "concepts_delete_admin" on project_concepts
  for delete using (is_admin());

-- feedback per concept hergebruikt de bestaande project_feedback-tabel
alter table project_feedback add column if not exists concept_id uuid references project_concepts(id) on delete cascade;

-- ── project goedkeuren op concept-niveau (enkel de gekoppelde klant) ──
create or replace function public.approve_concept(p_concept_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from project_concepts c
    join projects p on p.id = c.project_id
    where c.id = p_concept_id and p.client_user_id = auth.uid()
  ) then
    raise exception 'Niet toegestaan';
  end if;

  update project_concepts set status = 'goedgekeurd' where id = p_concept_id;
end;
$$;

grant select, insert, update, delete on public.project_concepts to authenticated;
grant execute on function public.approve_concept(uuid) to authenticated;
