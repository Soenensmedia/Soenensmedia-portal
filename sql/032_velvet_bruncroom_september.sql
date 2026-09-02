-- SoenensMedia Portaal — Content-ideeën voor Velvet Kortrijk, september
-- Vervangt niets, voegt enkel toe. Plak in Supabase SQL Editor > Run.
-- Vereist dat de klant "Velvet Kortrijk" al bestaat (Klanten-tab).

do $$
declare
  v_client_id uuid;
begin
  select id into v_client_id from clients where naam ilike '%velvet%kortrijk%' limit 1;
  if v_client_id is null then
    raise notice 'Klant "Velvet Kortrijk" niet gevonden — maak de klant eerst aan in de Klanten-tab en run dit opnieuw.';
    return;
  end if;

  insert into content_ideeen (client_id, naam, status, tags, wat, hook, lengte, heroshot, volgorde) values
  (v_client_id, 'Najaarsmenu-onthulling', 'September', array['prater-vrij','snel'],
   'Close-up onthulling van de nieuwe herfstgerechten: stoom van warme chocolademelk, pompoensoep die ingeschonken wordt, kaneel die over een latte gestrooid wordt. Geen gesproken tekst, puur beeld + tekst in beeld per gerecht.',
   'Het najaarsmenu is er.', '3 + 4×5 + 3 = 26 sec', 'Kaneel die in slow motion over de latte-art valt', 0),

  (v_client_id, 'Velvet interieur POV', 'September', array['los','traag'],
   'Rustige POV-wandeling doorheen de zaak: fluwelen stoelen, gouden accenten, ochtendlicht door de ramen, tot je aan een tafel zit. Verkoopt de sfeer, niet het eten.',
   'Zo voelt een zondagochtend hier aan.', '8 + 8 + 8 + 6 = 30 sec', 'Zonlicht dat over de fluwelen bank valt', 1),

  (v_client_id, 'ASMR: latte + croissant', 'September', array['prater-vrij','snel'],
   'Zuiver ASMR: koffie inschenken, latte art, croissant die opengebroken wordt zodat het gelaagde binnenste zichtbaar is. Enkel natuurlijk geluid, geen muziek nodig.',
   '(geen — begint meteen met geluid)', '5 + 5 + 5 + 5 = 20 sec', 'De croissant die openbreekt met zichtbare boterlagen', 2),

  (v_client_id, 'Zondagochtend-ritueel', 'September', array['mensen','traag'],
   'Kort verhaal in beelden: opstaan, naar Velvet Kortrijk wandelen in de herfstzon, bestellen, eerste slok koffie, ontspannen glimlach. Voelt als een mini-film, geen interviews nodig.',
   'Een zondag zoals het hoort.', '4 + 5 + 5 + 6 + 6 = 26 sec', 'Eerste slok koffie met ogen dicht van tevredenheid', 3),

  (v_client_id, 'Bestel voor mij', 'September', array['mensen','snel'],
   'Trending format: camera in de hand alsof de kijker meebestelt, personeel reageert alsof ze de kijker zelf bedienen. Speels en persoonlijk, goed voor engagement.',
   'Bestel voor mij — ik trakteer.', '3 + 4×5 + 3 = 26 sec', 'Barista die recht in de camera lacht bij het serveren', 4),

  (v_client_id, 'Van keuken tot bord', 'September', array['werkplaats','prater-vrij'],
   'Transformatie-reel: rauwe ingrediënten op het aanrecht → bereiding versneld → prachtig afgewerkt bord. Klassiek bevredigend format, makkelijk te filmen tijdens een gewone dienst.',
   '(geen — visuele transformatie spreekt voor zich)', '6 + 10 + 4 = 20 sec', 'Het bord dat op tafel gezet wordt, van bovenaf', 5),

  (v_client_id, 'Verstopt pareltje', 'September', array['los','snel'],
   'POV vanaf de straat: voorbijlopen, iets dat je oog trekt, naar binnen stappen — eindigt op de eerste hap. Speelt in op het "hidden gem"-format dat goed scoort bij lokale ontdekkingen.',
   'De meesten lopen hier gewoon voorbij.', '4 + 4 + 4 + 6 + 6 = 24 sec', 'De deur die opengaat en het interieur onthult', 6),

  (v_client_id, 'Team-voorstelling: de barista', 'September', array['mensen','traag'],
   'Korte, warme intro van één teamlid — naam, wat die het liefst maakt, één persoonlijke touch. Bouwt vertrouwen op en geeft het merk een gezicht voor september (nieuwe klanten na de zomer).',
   'Achter elke goede koffie staat iemand.', '5 + 8 + 8 + 5 = 26 sec', 'Portret terwijl de latte art wordt afgewerkt', 7)

  on conflict do nothing;
end $$;
