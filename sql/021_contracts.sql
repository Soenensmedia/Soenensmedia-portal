-- SoenensMedia Portaal — Fase 15: contract uploaden + klant-tekenen + kopie
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

alter table projects add column if not exists agreement_bestand_path text;
alter table projects add column if not exists agreement_bestand_naam text;

-- Nieuwe, privé bucket voor geüploade contract-PDF's (per project).
insert into storage.buckets (id, name, public)
values ('project-contracts', 'project-contracts', false)
on conflict (id) do nothing;

create policy "contracts_select" on storage.objects
  for select using (
    bucket_id = 'project-contracts' and (
      is_admin() or exists (
        select 1 from projects p
        where p.id::text = (storage.foldername(name))[1] and p.client_user_id = auth.uid()
      )
    )
  );

create policy "contracts_insert_admin" on storage.objects
  for insert with check (bucket_id = 'project-contracts' and is_admin());

create policy "contracts_delete_admin" on storage.objects
  for delete using (bucket_id = 'project-contracts' and is_admin());

-- Bugfix: de klant kon een geüpload offerte/factuur-bestand (Fase 9/13) nog
-- niet downloaden — er stond nooit een select-policy voor de klant op de
-- 'fin-facturen'-bucket, enkel op de databasetabellen zelf.
create policy "fin_facturen_storage_select_client" on storage.objects
  for select using (
    bucket_id = 'fin-facturen' and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1] and p.client_user_id = auth.uid()
    )
  );
