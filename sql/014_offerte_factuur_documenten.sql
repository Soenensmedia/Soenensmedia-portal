-- SoenensMedia Portaal — Fase 9: offerte/factuur-PDF's genereren + versturen
-- Toevoeging, verandert niets aan bestaande data. Plak in Supabase SQL Editor > Run.

-- Bedrijfsgegevens die op elke PDF komen te staan
alter table fin_settings add column if not exists bedrijfsnaam text;
alter table fin_settings add column if not exists bedrijfsadres text;
alter table fin_settings add column if not exists ondernemingsnummer text;
alter table fin_settings add column if not exists iban text;
alter table fin_settings add column if not exists betalingstermijn_dagen integer not null default 30;

-- Volgnummers (bv. "2026-001") en klant-e-mail (nodig om de PDF te kunnen mailen)
alter table fin_facturen add column if not exists factuurnummer text;
alter table fin_facturen add column if not exists klant_email text;
alter table fin_offertes add column if not exists offertenummer text;
alter table fin_offertes add column if not exists klant_email text;
