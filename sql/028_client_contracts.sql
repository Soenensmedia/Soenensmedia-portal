-- SoenensMedia Portaal — Fase 38: retainer-contracten per klant, met ondertekening
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

create table if not exists client_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  status text not null default 'concept', -- concept | verzonden | ondertekend
  ref text,
  pack_key text,
  pack_name text,
  price numeric,
  term integer not null default 12,
  notice integer not null default 2,
  start_date date,
  items jsonb not null default '[]'::jsonb,
  fields jsonb not null default '{}'::jsonb,
  sm_sig_image text,
  sm_sig_name text,
  sm_sig_role text,
  sm_signed_at timestamptz,
  cl_sig_image text,
  cl_sig_name text,
  cl_sig_role text,
  cl_signed_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table client_contracts enable row level security;

create policy "client_contracts_admin" on client_contracts
  for all using (is_admin()) with check (is_admin());

-- Klant mag enkel contracten zien van een klant-record waar hij via minstens
-- 1 gekoppeld project aan gelinkt is (zelfde koppel-patroon als het bestaande
-- "Stuur naar klant" in het Contentsysteem — geen aparte klant-account-koppeling nodig).
create policy "client_contracts_client_select" on client_contracts
  for select using (
    exists (
      select 1 from projects p
      where p.client_id = client_contracts.client_id and p.client_user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.client_contracts to authenticated;

-- Klant ondertekent zelf via RPC (zelfde aanpak als sign_agreement/approve_project:
-- RLS laat geen rechtstreekse UPDATE toe, dus enkel via deze functie).
create or replace function public.sign_client_contract(
  p_contract_id uuid, p_signed_name text, p_signed_role text, p_signature_img text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from client_contracts cc
    join projects p on p.client_id = cc.client_id
    where cc.id = p_contract_id and p.client_user_id = auth.uid()
  ) then
    raise exception 'Niet toegestaan';
  end if;

  update client_contracts set
    cl_sig_name = p_signed_name,
    cl_sig_role = p_signed_role,
    cl_sig_image = p_signature_img,
    cl_signed_at = now(),
    status = 'ondertekend'
  where id = p_contract_id;
end;
$$;

grant execute on function public.sign_client_contract(uuid, text, text, text) to authenticated;
