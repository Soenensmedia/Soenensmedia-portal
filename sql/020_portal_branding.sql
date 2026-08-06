-- SoenensMedia Portaal — Fase 14: bedrijfsfoto voor het klantportaal
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

insert into storage.buckets (id, name, public)
values ('portal-branding', 'portal-branding', true)
on conflict (id) do nothing;

create policy "portal_branding_insert_admin" on storage.objects
  for insert with check (bucket_id = 'portal-branding' and is_admin());

create policy "portal_branding_update_admin" on storage.objects
  for update using (bucket_id = 'portal-branding' and is_admin());

create policy "portal_branding_delete_admin" on storage.objects
  for delete using (bucket_id = 'portal-branding' and is_admin());

alter table fin_settings add column if not exists portal_photo_path text;
