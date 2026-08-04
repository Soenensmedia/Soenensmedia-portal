-- SoenensMedia Portaal — Fase 11: welkomstgids, overeenkomst (met ondertekenen), delivery-gids
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

-- Globale portaal-content (1 rij per key, bv. 'welcome_guide' en 'delivery_guide')
create table if not exists portal_content (
  content_key text primary key,
  content text,
  updated_at timestamptz not null default now()
);

alter table portal_content enable row level security;

-- Elke ingelogde gebruiker (admin of klant) mag dit lezen — het is loutere informatietekst.
create policy "portal_content_select" on portal_content
  for select using (auth.uid() is not null);
create policy "portal_content_insert_admin" on portal_content
  for insert with check (is_admin());
create policy "portal_content_update_admin" on portal_content
  for update using (is_admin());
create policy "portal_content_delete_admin" on portal_content
  for delete using (is_admin());

grant select, insert, update, delete on public.portal_content to authenticated;

-- Overeenkomst per opdracht (optioneel — leeg = geen overeenkomst nodig)
alter table projects add column if not exists agreement_content text;
alter table projects add column if not exists agreement_signed_at timestamptz;
alter table projects add column if not exists agreement_signed_name text;

-- Klant ondertekent zelf (enkel het eigen, gekoppelde project — RLS laat geen
-- rechtstreekse UPDATE toe op projects, dus via dezelfde RPC-aanpak als approve_project).
create or replace function public.sign_agreement(p_project_id uuid, p_signed_name text)
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

  update projects set agreement_signed_at = now(), agreement_signed_name = p_signed_name where id = p_project_id;
end;
$$;

grant execute on function public.sign_agreement(uuid, text) to authenticated;
