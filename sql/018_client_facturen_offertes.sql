-- SoenensMedia Portaal — Fase 13: klant ziet eigen gekoppelde offertes/facturen
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.
-- Additief: de bestaande admin-only policies blijven ongewijzigd; dit voegt enkel
-- een extra SELECT-toegang toe voor de klant, en enkel voor rijen die via
-- project_id gekoppeld zijn aan een project waar hij/zij zelf aan gekoppeld is.
-- Facturen/offertes zonder project_id (of niet gekoppeld) blijven onzichtbaar
-- voor klanten, zoals vandaag.

create policy "fin_facturen_select_client" on fin_facturen
  for select using (
    exists (
      select 1 from projects p
      where p.id = fin_facturen.project_id and p.client_user_id = auth.uid()
    )
  );

create policy "fin_offertes_select_client" on fin_offertes
  for select using (
    exists (
      select 1 from projects p
      where p.id = fin_offertes.project_id and p.client_user_id = auth.uid()
    )
  );

-- Bedrijfsgegevens (naam/adres/ondernemingsnr/iban) mogen ook door klanten
-- gelezen worden — nodig om zelf een PDF-kopie te kunnen downloaden, en staat
-- toch al afgedrukt op elke factuur/offerte die ze per mail ontvangen.
create policy "fin_settings_select_client" on fin_settings
  for select using (auth.uid() is not null);
