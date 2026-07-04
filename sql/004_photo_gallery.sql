-- SoenensMedia Portaal — Fase 3: eigen fotogalerij
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

-- private bucket: geen publieke toegang, enkel via ondertekende URL's
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

-- admin ziet/uploadt/verwijdert alles; klant mag enkel bekijken binnen de
-- map van een project waar hij als client_user_id aan gekoppeld is.
-- storage.foldername(name) geeft de padsegmenten van het bestand terug —
-- segment [1] is hier het project-id (padstructuur: {project_id}/bestand).
create policy "photos_select" on storage.objects
  for select using (
    bucket_id = 'project-photos' and (
      is_admin() or exists (
        select 1 from projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.client_user_id = auth.uid()
      )
    )
  );

create policy "photos_insert_admin" on storage.objects
  for insert with check (bucket_id = 'project-photos' and is_admin());

create policy "photos_delete_admin" on storage.objects
  for delete using (bucket_id = 'project-photos' and is_admin());
