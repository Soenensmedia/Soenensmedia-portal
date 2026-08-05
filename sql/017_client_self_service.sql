-- SoenensMedia Portaal — Fase 12: klant kan eigen naam instellen + retainer-voortgang zien
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

-- Klant mag de eigen retainer-gegevens zien (video's dit jaar/doel, verlengdatum)
-- via het project waar die aan gekoppeld is — enkel lezen, geen wijzigingsrecht.
create policy "clients_select_own_via_project" on clients
  for select using (
    exists (
      select 1 from projects p
      where p.client_id = clients.id and p.client_user_id = auth.uid()
    )
  );

-- Klant kan de eigen naam instellen. Niet via een rechtstreekse UPDATE-policy op
-- profiles, want die tabel bevat ook 'role' — RLS kan geen kolommen beperken,
-- dus (zoals overal elders in dit project) via een security-definer RPC die
-- enkel full_name aanraakt.
create or replace function public.update_own_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set full_name = p_full_name where id = auth.uid();
end;
$$;

grant execute on function public.update_own_name(text) to authenticated;
