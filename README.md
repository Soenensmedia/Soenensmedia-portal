# SoenensMedia Portaal

## Setup

Dit portaal is een simpele webapp (geen installatie nodig) met:
- **Dashboard** — overzicht van al je opdrachten per status, toevoegen/verwijderen/bewerken
- **Agenda** — weekplanning voor shoots, edits, en werk aan je bedrijf (leren, business dev)
- **Uren** — tijd loggen per opdracht of algemeen, met totalen

De data staat centraal in [Supabase](https://supabase.com) (gratis), zodat je op laptop én GSM dezelfde info ziet.

## Stap 1 — Supabase account + project

1. Ga naar [supabase.com](https://supabase.com) → maak een gratis account.
2. Klik **New project**. Kies een naam (bv. "soenensmedia-portal") en een wachtwoord voor de database (bewaar dit ergens veilig, je hebt het zelden nodig).
3. Wacht tot het project klaar is (~2 min).
4. Ga naar **SQL Editor** (linkermenu) → **New query**.
5. Open het bestand [`sql/schema.sql`](sql/schema.sql) uit deze map, kopieer de volledige inhoud, plak het in de SQL Editor, en klik **Run**.
6. Ga naar **Project Settings** (tandwiel-icoon) → **API**.
   - Kopieer de **Project URL**
   - Kopieer de **anon public** key

## Stap 2 — Configuratie invullen

Open [`js/config.js`](js/config.js) en vervang:

```js
export const SUPABASE_URL = "https://JOUW-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "JOUW-ANON-PUBLIC-KEY";
```

door je eigen Project URL en anon public key uit stap 1.6.

## Stap 3 — Lokaal testen (optioneel maar aanbevolen)

Open Terminal, ga naar deze map en start een lokale server:

```
cd ~/soenensmedia-portal
python3 -m http.server 8420
```

Open in je browser: [http://localhost:8420](http://localhost:8420)

Log in met het account dat je via Supabase → **Authentication → Users → Add user** hebt aangemaakt (zie "Beveiliging: enkel jij kan accounts aanmaken" verderop).

Test even: een opdracht toevoegen, een agenda-item plannen, uren loggen. Klopt alles? Dan ben je klaar om te deployen.

## Stap 4 — Online zetten via Netlify Drop

1. Ga naar [app.netlify.com/drop](https://app.netlify.com/drop) (gratis account aanmaken indien gevraagd).
2. Sleep de hele map `soenensmedia-portal` in het venster.
3. Je krijgt meteen een live link (bv. `https://iets-random.netlify.app`) — dit werkt op elk toestel, ook je GSM.
4. (Optioneel) Bij Netlify kan je onder **Site settings** een eigen, makkelijker te onthouden naam kiezen voor de link.

## Updates deployen

Telkens Claude iets aanpast aan het portaal: sleep de map gewoon opnieuw naar [app.netlify.com/drop](https://app.netlify.com/drop) — dat overschrijft de vorige versie op dezelfde link.

## Fase 2 — Klantenportaal (nieuw)

Klanten kunnen inloggen en zien dan enkel hún project, met de Frame.io-review, een feedback-veld en een "Goedkeuren"-knop. Jij (admin) blijft alles zien via het bestaande dashboard.

**Update:** publieke account-aanmaak staat intussen **uit** (zie "Beveiliging" hieronder) — jij maakt voortaan zelf elk account aan via Supabase, klanten kunnen niet meer zelf "Account aanmaken" klikken. Nieuwe accounts krijgen nog steeds automatisch de rol "client" en zien niets totdat jij ze koppelt aan een project.

### Eenmalig instellen

1. Ga naar Supabase → **SQL Editor** → nieuwe query.
2. Open [`sql/002_client_portal.sql`](sql/002_client_portal.sql), kopieer de volledige inhoud, plak en klik **Run**. (Dit is een aanvulling — je bestaande data blijft gewoon staan.)
3. Onderaan dat bestand staat een aparte regel:
   ```sql
   update profiles set role = 'admin' where email = 'jouw-login-email@hier.be';
   ```
   Vervang het e-mailadres door het e-mailadres waarmee jij zelf inlogt in het portaal, en voer enkel die ene regel apart uit. Zonder deze stap zie je zelf ook maar 1 project (als klant-rol) in plaats van het volledige dashboard.

### Een klant koppelen aan een project

1. Maak eerst zelf een account voor de klant aan: Supabase → **Authentication → Users → Add user** (e-mail + een wachtwoord, geef dat wachtwoord door aan de klant, bv. via e-mail).
2. Open in jouw dashboard de betreffende opdracht → onder **Klantenportaal** vul je hun e-mailadres in bij "Klant koppelen" en klik **Koppelen**.
3. Plak ook de Frame.io-share-link bij **Frame.io link** en klik **Opslaan**.
4. De klant logt in met het e-mail/wachtwoord dat jij hebt aangemaakt, en ziet vanaf nu dat project, met de video-review, kan feedback typen, en kan goedkeuren.

> Let op: links naar een **map met meerdere bestanden** kunnen niet embedden (Frame.io staat dat niet toe voor hun volledige app-omgeving, enkel voor losse review-links). Vink in dat geval **"Dit is een map met meerdere items"** aan bij het project — dan toont het portaal enkel de "Open in Frame.io"-knop i.p.v. een lege embed-box.

### Extra migratie: map-vinkje

Voer ook [`sql/003_frame_folder_flag.sql`](sql/003_frame_folder_flag.sql) uit in de SQL Editor (kleine aanvulling, voegt enkel 1 kolom toe).

## Fase 3 — Eigen fotogalerij (nieuw)

Voor foto's hoef je Frame.io niet meer te gebruiken: je kan ze rechtstreeks in het portaal uploaden, met een nette grid-weergave en een lightbox (foto's groot bekijken) voor de klant.

### Eenmalig instellen

Voer [`sql/004_photo_gallery.sql`](sql/004_photo_gallery.sql) uit in de SQL Editor. Dit maakt een private opslagruimte aan (klant kan enkel zijn eigen foto's zien, nooit die van een ander project).

### Foto's toevoegen aan een project

1. Open in je dashboard de betreffende opdracht.
2. Onder **Foto's**: klik **"Bestanden kiezen"**, selecteer 1 of meerdere foto's, klik **Uploaden**.
3. De klant ziet deze foto's automatisch verschijnen in hun weergave (boven de Frame.io-review), als grid — klikken op een foto opent ze groot.
4. Een foto verwijderen: klik het kruisje rechtsboven op de thumbnail (in jouw dashboard-weergave).

> Gratis opslaglimiet is 1GB — ruim voldoende voor foto's over meerdere projecten. Video blijft best via Frame.io lopen (te groot/duur om zelf te hosten op de gratis tier).

## Fase 4 — Klantervaring: navigatie, briefing, lightbox & downloads (nieuw)

Bij meerdere projecten komt de klant nu eerst op een welkomstscherm met een overzicht van al zijn projecten (als tegels, met omslagfoto) — pas na doorklikken zie je de details van dat ene project.

### Eenmalig instellen

Voer [`sql/005_client_brief_deliverables.sql`](sql/005_client_brief_deliverables.sql) uit in de SQL Editor.

### Nieuw voor jou (admin)

Open een opdracht → onder **Klantenportaal** vind je nu ook:
- **Briefing / omschrijving voor klant** — een korte, klantvriendelijke uitleg van het project (los van je eigen interne "Notities").
- **Deliverables** — bv. "20 foto's, 1 video van 2 minuten". Één regel per item werkt het overzichtelijkst.

### Nieuw voor de klant

- Bij het klikken op een foto: kan nu **doorklikken naar volgende/vorige** foto (pijlen of pijltjestoetsen), en per foto **downloaden**.
- Boven de fotogrid staat een **"Download alles"**-knop die alle foto's van dat project in 1 zip-bestand bundelt.

## Beveiliging: enkel jij kan accounts aanmaken (nieuw)

De "Account aanmaken"-optie is uit de app gehaald — niemand kan zichzelf nog registreren. Jij maakt voortaan zelf elk account aan.

### Eenmalig instellen (verplicht)

1. Supabase Dashboard → **Authentication** → **Sign In / Providers** (of **Providers** → **Email**, afhankelijk van de Supabase-versie).
2. Zet **"Allow new users to sign up"** (of **"Enable Sign Up"**) **uit**.
3. Bewaar de instelling.

Vanaf nu faalt elke poging tot zelf-registratie — accounts bestaan enkel nog als jij ze aanmaakt.

### Een nieuw account aanmaken (voor jezelf, of voor een klant)

1. Supabase → **Authentication → Users → Add user**.
2. Vul een e-mail en wachtwoord in → **Create user**.
3. Geef die inloggegevens door aan de betrokken persoon (klant), of gebruik ze zelf om in te loggen.
4. Nieuwe accounts krijgen automatisch de rol "client" (zien niets tot je ze aan een project koppelt) — voor jezelf moet je dus nog steeds de `update profiles set role = 'admin' where email = '...'`-regel uit Fase 2 uitvoeren.

## Fase 5 — Klantenoverzicht, statusmail & drag-and-drop (nieuw)

### Klantenoverzicht

Nieuw tabblad **"Klanten"** naast Dashboard/Agenda/Uren — een overzicht van al je klant-accounts en aan welk(e) project(en) ze gekoppeld zijn. Klik op een project-naam bij een klant om dat project meteen te openen. Geen extra setup nodig.

### Drag-and-drop op het dashboard

Je kan een opdracht-kaartje nu gewoon **verslepen** naar een andere kolom om de status te wijzigen, zonder het detailvenster te openen. Werkt enkel op laptop/desktop (slepen wordt niet ondersteund in mobiele browsers) — op je GSM blijft de bestaande manier (kaartje aanklikken → status wijzigen → opslaan) gewoon werken.

### Automatische e-mail bij statuswijziging

Wanneer je de status van een project met een gekoppelde klant wijzigt (via het detailvenster óf via drag-and-drop), krijgt die klant automatisch een e-mail met de nieuwe status. Dit vraagt een eenmalige, iets technischere setup:

**1. Nieuwe Brevo API-key aanmaken** (dit is een *andere* sleutel dan de SMTP-key van eerder):
   - Brevo → **Settings → SMTP & API → API Keys** tab
   - **Generate a new API key** → kopieer meteen (ook hier: maar 1 keer zichtbaar)

**2. Edge Function aanmaken in Supabase:**
   - Supabase Dashboard → **Edge Functions** (linkermenu) → nieuwe functie
   - Naam: `notify-status-change`
   - Plak de volledige inhoud van [`supabase/functions/notify-status-change/index.ts`](supabase/functions/notify-status-change/index.ts) uit deze map
   - **Deploy**

**3. De Brevo-sleutel geheim toevoegen:**
   - In diezelfde Edge Functions-sectie → **Manage secrets**
   - Nieuwe secret: naam `BREVO_API_KEY`, waarde = de key uit stap 1
   - Opslaan

**4. Testen:** wijzig de status van een opdracht die al aan een klant gekoppeld is (via het detailvenster of drag-and-drop) → je zou een toast "Klant per mail verwittigd" moeten zien, en de klant zou de mail moeten ontvangen.

> Als er iets misloopt (bv. de functie is nog niet aangemaakt), zie je gewoon een foutmelding als toast — dit blokkeert nooit het gewoon opslaan van je wijziging zelf.

## Fase 6 — Financieel dashboard (nieuw)

Nieuw tabblad **"Financiën"** — enkel zichtbaar voor jou (admin), een klant-account kan dit nooit zien. Dit is een volledige poort van je bestaande `~/Desktop/Financieel-Dashboard.html`: Dashboard (kerncijfers), BTW, Facturen, Kosten, Projecten, Aankopen en Instellingen — nu live gesynchroniseerd via Supabase i.p.v. enkel lokaal op 1 toestel.

> De grafieken van de oude tool zitten er bewust nog niet in (enkel de cijfers) — kan later als aparte, kleine uitbreiding als je dat wil.

### Eenmalig instellen

Voer [`sql/006_financien.sql`](sql/006_financien.sql) uit in de SQL Editor.

### Je bestaande cijfers overzetten

1. Open je **huidige** `Financieel-Dashboard.html` → tab **Instellingen** → **"Exporteer back-up"** → dit downloadt een `.json`-bestand met al je facturen/kosten/projecten/aankopen.
2. In het portaal: **Financiën → Instellingen → "Importeer back-up (van oude tool)"** → kies dat bestand.
3. Bevestig — dit **voegt** de data toe (overschrijft niets), dus doe dit maar 1 keer om dubbels te vermijden.

### Wat er anders is dan de oude tool

- **Projecten** in dit Financiën-tabblad zijn iets anders dan de "opdrachten" op je Dashboard-tabblad: dit hier volgt de facturatie (idee → te factureren → gefactureerd → betaald), je Dashboard volgt de productie (nieuw → shooten → ... → afgerond). Bewust apart gehouden.
- Facturen uploaden bij een financieel project werkt zoals voorheen (bekijken/verwijderen via het tabelletje).
- Er is ook een **"Exporteer back-up"**-knop (leest nu uit het portaal zelf) voor gewoon gemoedsrust — los van de eenmalige import hierboven.

## Fase 7 — Video-ideeën & scripts met klant-goedkeuring (nieuw)

Nieuw tabblad **"Scripting"** naast Dashboard/Agenda/Uren/Klanten/Financiën: een eigen, ruime pagina (geen krap venstertje meer) om per opdracht ideeën of volledige scripts toe te voegen, te bewerken en te verwijderen. Bovenaan kies je via een dropdown voor welke opdracht je aan het werken bent.

Zodra je een idee/script toevoegt, ziet de gekoppelde klant dat meteen in zijn eigen portaal (bij de briefing/deliverables, vóór de foto's/video), met per idee/script:

- een **type-badge** (Idee/Script) en **status-badge** (In afwachting / Goedgekeurd / Aanpassing gevraagd),
- een **"Goedkeuren"**-knop (verdwijnt zodra goedgekeurd),
- een eigen klein **feedback-draadje**, apart van de algemene projectfeedback onderaan — feedback op een specifiek idee/script raakt dus nooit vermengd met de algemene feedback over het hele project.

Vanuit het gewone opdracht-detailvenster (Dashboard → kaartje aanklikken) staat ook een knop **"→ Ideeën & Scripts voor dit project"** die je meteen naar de Scripting-tab brengt met die opdracht al geselecteerd.

### Eenmalig instellen

Voer [`sql/007_project_concepts.sql`](sql/007_project_concepts.sql) uit in de SQL Editor.

### Gebruik

1. Ga naar **Scripting** → kies de opdracht bovenaan → **"+ Idee/script toevoegen"** → titel, type (Idee/Script) en de inhoud invullen.
2. De klant ziet dit bij zijn project, kan het goedkeuren of feedback typen specifiek op dat idee/script.
3. De status wordt automatisch **"Goedgekeurd"** zodra de klant op Goedkeuren klikt — jij ziet dit meteen terug op de Scripting-pagina.

### Sjablonen & script importeren (uitbreiding)

Bij "+ Idee/script toevoegen" staat nu ook een **sjabloon-keuzelijst**: Hook-Body-CTA (reel/short), Testimonial (Q&A), BTS-verhaal, Tips-lijst, Aftermovie-structuur. Een sjabloon kiezen vult het tekstvak met een startstructuur die je verder invult — puur een handig startpunt, geen verplichting.

De knop **"Importeer script"** naast "+ toevoegen" laat je een `.txt`- of `.md`-bestand kiezen (bv. een script dat je elders al typte, of dat je uit een gesprek met Claude kopieerde en als tekstbestand bewaarde) — de bestandsnaam wordt de titel, de inhoud van het bestand komt in het tekstvak, en je kan het meteen bewerken en opslaan zoals een normaal script. Word/PDF-bestanden worden nog niet ondersteund — sla ze eerst op als platte tekst (.txt).

### Scène-structuur voor scripts (uitbreiding)

Een script is nu standaard opgebouwd uit **scènes** i.p.v. één groot tekstvak: per scène vul je apart **Visueel** (wat je ziet) en **Tekst/voice-over** (wat er gezegd wordt) in, plus optioneel een **duur in seconden** — zoals een echt productiescript, en handig om snel een totale lengte te zien. Met **"+ Scène toevoegen"** voeg je er zoveel toe als je nodig hebt; elke scène heeft een ✕ om te verwijderen.

Bij "Script" staat een vinkje **"Scène-structuur gebruiken"** — uitvinken geeft het oude, simpele ene-tekstvak terug (met sjablonen), voor als je gewoon snel iets wil noteren. Wisselen tussen beide behoudt je tekst (scènes worden bij het wisselen omgezet naar leesbare tekst en omgekeerd). Bestaande scripts van vóór deze update blijven gewoon werken als vrije tekst — niets is aangepast of verplicht gemigreerd.

Klanten zien de scène-opbouw ook netjes uitgesplitst (Visueel/Tekst per scène + totale duur) in hun eigen portaal, i.p.v. een blok platte tekst.

## Fase 8 — Deadlines, Klanten/Retainers, Financiën-uitbreiding, Equipment, Content Planning (nieuw)

Grote uitbreiding op basis van je lijst met gewenste tabs. In plaats van elk punt letterlijk als aparte tab te bouwen (dan wordt de balk bovenaan onwerkbaar), is dit slim gegroepeerd op wat er al bestond:

- **Projecten-status** bestond al als je Dashboard-kanban — niet opnieuw gebouwd.
- **Offertes & Facturen, KPI's/Doelen, BTW-reminder** zitten nu ín de bestaande **Financiën**-tab (nieuwe sub-tabs/kaarten).
- **Retainers & Referrals** zitten nu in een volledig herbouwde **Klanten**-tab.
- **Footage/Back-up** zijn 2 nieuwe velden in het bestaande opdracht-detailvenster.
- Drie volledig nieuwe tabbladen: **Deadlines**, **Equipment**, **Content**.

### Eenmalig instellen — 6 nieuwe SQL-bestanden, één voor één uitvoeren

Voer deze na elkaar uit in de Supabase SQL Editor (zelfde manier als altijd — plakken, Run):
1. [`sql/008_clients.sql`](sql/008_clients.sql) — klantenlijst (los van portaal-accounts) + retainer/referral-velden.
2. [`sql/009_offertes.sql`](sql/009_offertes.sql) — offertes + koppeling facturen aan een opdracht.
3. [`sql/010_equipment.sql`](sql/010_equipment.sql) — apparatuurbeheer.
4. [`sql/011_content_planning.sql`](sql/011_content_planning.sql) — content planning + postfrequentie-doelen.
5. [`sql/012_projects_footage_deadline.sql`](sql/012_projects_footage_deadline.sql) — archief/opslaglocatie-velden op opdrachten.
6. [`sql/013_fin_kpi_target.sql`](sql/013_fin_kpi_target.sql) — omzetdoel per maand voor de nieuwe KPI-kaart.

Tot je deze hebt uitgevoerd, tonen de nieuwe tabs (Klanten, Equipment, Content, Offertes-sub-tab) gewoon een nette foutmelding i.p.v. te crashen — de rest van het portaal blijft intussen gewoon werken.

### Deadlines (nieuwe tab)

Alle nog niet afgeronde opdrachten met een deadline, gesorteerd van dringend naar later — rood = verlopen, geel = binnen 3 dagen. Opdrachten zonder deadline staan apart onderaan. Klikken opent het gewone opdrachtvenster.

### Klanten (herbouwd)

Dit is nu een echte klantenlijst, los van portaal-accounts (niet elke klant heeft of moet een account hebben). Per klant: naam, contactgegevens, **via wie kwam deze klant binnen** (referral), en optioneel **retainer-gegevens** (vaste maandklant: startdatum, verlengdatum, video's/jaar-doel vs. geleverd). Een opdracht koppel je aan een klant via het nieuwe "Klant (uit klantenlijst)"-veld onderaan het opdracht-detailvenster — dat is een ander veld dan de bestaande "Klant koppelen (e-mail)" voor het portaal-account, en ander dan het vrije tekstveld "Klant" bovenaan.

### Financiën-uitbreiding

- Nieuwe sub-tab **"Offertes"**: status verstuurd/geaccepteerd/geweigerd, optioneel gekoppeld aan een opdracht.
- Facturen-tabel toont nu een **"Laat"**-label bij openstaande facturen na de vervaldatum.
- Dashboard-sub-tab heeft 3 nieuwe KPI-kaarten: omzet deze maand vs. je doel (in te stellen bij Instellingen), gemiddelde projectwaarde, en je effectief uurtarief (omzet ÷ gelogde uren uit de Uren-tab).
- BTW-sub-tab toont bovenaan altijd een reminder-balk: hoeveel dagen tot de BTW-aangifte voor de huidige periode ten laatste moet ingediend zijn (20e van de maand na het kwartaal/de maand).

### Equipment (nieuwe tab)

Simpele tabel: naam, categorie, aankoopdatum/-prijs, onderhoud-datum, verzekerd (ja/nee), uitgeleend aan (leeg = in huis).

### Content (nieuwe tab)

Planning voor je eigen SoenensMedia-content (BTS, reels, testimonials, tips, aftermovie-fragmenten, showreel-fragmenten, persoonlijke verhalen), los van klantwerk: platform, type, status (idee→opname→montage→gepland→gepost), geplande/gepost-datum, caption, optioneel gekoppeld aan een klantproject (voor footage-hergebruik). Bovenaan: **"Doelen instellen"** voor een postfrequentie-doel per platform (x per week), met een teller hoeveel je deze maand al gepost hebt t.o.v. dat doel.

### Wat Leyton zelf moet doen
1. De 6 SQL-bestanden hierboven uitvoeren.
2. Klanten aanmaken in de nieuwe Klanten-tab en bestaande opdrachten er evt. aan koppelen (niet automatisch gebeurd — de oude vrije klantnaam-tekst kon niet betrouwbaar automatisch gekoppeld worden).
3. Content-postfrequentie-doelen instellen.
4. Omzetdoel per maand instellen bij Financiën → Instellingen (anders toont die KPI-kaart gewoon "geen doel ingesteld").

## Fase 9 — Offerte/factuur-PDF's genereren, versturen, importeren & omzetten (nieuw)

Het portaal maakt nu zelf de PDF van een offerte of factuur — geen los Word/Excel-sjabloon meer nodig. Bij elke rij in **Financiën → Offertes** en **Financiën → Facturen** staan knoppen naast bewerken (✎):
- **📄 Download** — genereert de PDF meteen en downloadt hem naar je computer.
- **✉ Verstuur per e-mail** — verstuurt hem als bijlage naar het e-mailadres van de klant (moet je invullen bij het bewerken van die offerte/factuur).
- **🧾 Omzetten naar factuur** (enkel bij Offertes) — maakt meteen een nieuwe factuur aan met klant, omschrijving en bedrag van die offerte al ingevuld (vervaldatum = vandaag + je betalingstermijn), en zet de offerte automatisch op "Geaccepteerd". Handig voor rechtstreekse klanten waar jij zelf de offerte/factuur opstelt — dus **niet** nodig voor werk via Creative Shelter, die hebben hun eigen facturatie.

Elke nieuwe offerte/factuur krijgt automatisch een **volgnummer** (bv. `2026-001`, `2026-002`, ...) — verplicht voor een geldige factuur in België, je hoeft er zelf niets voor te doen.

### Eigen offerte importeren

In het offerte-formulier (zowel bij **"+ Offerte toevoegen"** als bij bewerken) staat onderaan het veld **"Eigen offerte-bestand"** — kies daar je eigen PDF/Word/afbeelding (bv. eentje die je zelf mooier hebt opgemaakt) en sla op. Zodra dat bestand er is, gebruiken **📄 Download** en **✉ Verstuur** automatisch dát bestand in plaats van de auto-gegenereerde PDF — je eigen versie heeft dus altijd voorrang (herkenbaar aan het 📎-icoontje bij het offertenummer in de tabel). Bij bewerken kan je het bestand bekijken of met ✕ verwijderen, waarna het weer terugvalt op de auto-gegenereerde PDF.

### Eenmalig instellen

1. Voer [`sql/014_offerte_factuur_documenten.sql`](sql/014_offerte_factuur_documenten.sql) en [`sql/015_offerte_import_conversie.sql`](sql/015_offerte_import_conversie.sql) uit in de SQL Editor.
2. Ga naar **Financiën → Instellingen → "Bedrijfsgegevens (voor offerte/factuur-PDF's)"** en vul in: bedrijfsnaam, adres, ondernemingsnummer, IBAN, betalingstermijn. Dit komt op elke auto-gegenereerde PDF te staan (niet nodig als je enkel eigen geïmporteerde bestanden gebruikt).
3. **Alleen nodig voor "Verstuur per e-mail"** (downloaden werkt al zonder dit): deploy de Edge Function.
   - Supabase Dashboard → **Edge Functions** → nieuwe functie **`send-document-email`** → plak de volledige inhoud van [`supabase/functions/send-document-email/index.ts`](supabase/functions/send-document-email/index.ts) → **Deploy**.
   - Geen nieuwe secret nodig — hergebruikt dezelfde `BREVO_API_KEY` die je al had ingesteld bij de statuswijziging-e-mail (Fase 5).

### Gebruik

1. Maak een offerte of factuur aan zoals gewoonlijk, en vul het **e-mailadres van de klant** in als je hem per mail wil kunnen versturen. Optioneel: importeer je eigen bestand i.p.v. de auto-gegenereerde PDF te gebruiken.
2. Klant akkoord? Klik bij die offerte op **🧾** om ze in 1 klik om te zetten naar een factuur — pas eventueel het BTW-percentage nog aan (offertes houden geen BTW bij, facturen wel) en sla op.

## Fase 10 — Klant-projectpagina voller & levendiger (nieuw)

De klant-detailpagina oogde kaal bij een project met weinig foto's/scripts. Toegevoegd, zonder dat jij hier iets voor moet instellen:

- **Statusbalk (stepper)**: toont visueel waar het project in het traject zit (Nieuw → Shooten → Editen → ... → Afgerond), met de huidige stap gemarkeerd — werkt voor élk project, ook zonder verder ingevulde content.
- **Hero-afbeelding**: de eerste foto van het project verschijnt als banner bovenaan; zonder foto's toont een net "SM"-logo-badge i.p.v. lege ruimte.
- **Info-strook**: deadline + "opdracht sinds"-datum, altijd zichtbaar.
- **Nette lege-staat-kaartjes** i.p.v. secties die gewoon verdwijnen: "Briefing komt hier binnenkort", "Nog geen ideeën/scripts", "Nog geen foto's" — de pagina behoudt zo altijd dezelfde volledige structuur, ook vroeg in een project.

Geen SQL of instellingen nodig — dit is puur visueel, meteen zichtbaar na herladen.

## Fase 11 — Klant-journey: welkomstgids, overeenkomst met ondertekenen, project brief, delivery-gids (nieuw)

De klantpagina volgt nu een vaste volgorde: **Welkomstgids → Overeenkomst (indien nodig, met verplicht ondertekenen) → Project brief → Delivery-gids**.

- **Welkomstgids**: één algemene tekst (niet per klant), bovenaan elk project. Bewerk je bij **Klanten → "Welkomstgids & delivery-gids"**.
- **Overeenkomst**: per opdracht optioneel in te vullen bij het opdracht-detailvenster ("Overeenkomst"-sectie). Zolang die niet ondertekend is, ziet de klant **enkel** de welkomstgids + de overeenkomst + een teken-formulier (naam intypen + akkoord-vinkje) — de rest van het project (foto's, scripts, feedback, ...) blijft verborgen tot getekend. Leeg laten = geen overeenkomst nodig, klant ziet meteen alles.
- **Project brief**: dit is de bestaande "Briefing"-tekst, nu duidelijk gelabeld als "Project brief" in de klant-weergave.
- **Delivery-gids**: zelfde principe als de welkomstgids (één algemene tekst, zelfde plek om te bewerken), getoond onderaan elk project, vlak voor Feedback.

### Eenmalig instellen

Voer [`sql/016_client_journey.sql`](sql/016_client_journey.sql) uit in de SQL Editor.

### Gebruik

1. Ga naar **Klanten → "Welkomstgids & delivery-gids"** en schrijf beide teksten (bv. hoe het proces verloopt, hoe ze bestanden downloaden).
2. Wil je dat een klant eerst een overeenkomst moet tekenen? Vul de **"Overeenkomst"**-sectie in bij dat specifieke opdracht-detailvenster. Leeg = geen gate.
3. Na ondertekenen zie je in het opdrachtvenster wie tekende en wanneer, met een knopje om de handtekening te wissen (bv. na een wijziging in de voorwaarden, zodat de klant opnieuw moet tekenen).

## Fase 12 — Klant kan eigen naam instellen + retainer-voortgang zien (nieuw)

- **"Mijn naam"**-knop bovenaan in het klantportaal (naast Uitloggen, overal zichtbaar) — de klant typt zelf zijn/haar naam in, i.p.v. dat enkel jij die instelt. Wordt meteen gebruikt in "Welkom, [naam]".
- **Retainer-voortgang**: een vaste-maandklant (die je als "Retainer" markeerde bij Klanten) ziet nu in zijn projectvenster een **"Jouw retainer"**-sectie: hoeveel video's dit jaar al geleverd zijn t.o.v. het jaardoel, en de verlengdatum. Automatisch zichtbaar zodra een opdracht gekoppeld is aan een klant met `is_retainer` aangevinkt — niets extra in te stellen.

### Eenmalig instellen

Voer [`sql/017_client_self_service.sql`](sql/017_client_self_service.sql) uit in de SQL Editor.

### Beveiliging

De klant kan enkel de **eigen** naam wijzigen (via een RPC die enkel `full_name` aanraakt, niet de rol) en enkel de **eigen gekoppelde** klantenrij lezen (via de projectkoppeling) — nooit die van andere klanten.

## Fase 13 — Klantportaal overzichtelijker: offertes/facturen, contact, groepering, status-uitleg (nieuw)

- **Offertes & Facturen bij het project**: de klant ziet nu, per project, de eigen gekoppelde offerte(s) en factuur/facturen (nummer, bedrag incl. btw, status) met een **Download**-knop — zelfde PDF/bestand als jij gebruikt.
- **Contactkaart**: onderaan de projectenlijst staat nu een "Vragen?"-kaartje met je contact e-mail/telefoon (enkel zichtbaar als je die hieronder invult).
- **Projecten gegroepeerd**: de projectenlijst splitst nu in **Actief** en **Afgerond** zodra er van beide zijn — bij enkel actieve (of enkel afgeronde) projecten blijft het gewoon 1 ononderbroken lijst.
- **"Wat nu?"-uitleg per status**: onder de statusbalk in elk project staat nu een korte zin die uitlegt wat de huidige status voor de klant betekent (bv. bij "Wacht op feedback": *"Er staat iets klaar hierboven — we wachten op jouw feedback of goedkeuring."*).

### Eenmalig instellen

Voer [`sql/018_client_facturen_offertes.sql`](sql/018_client_facturen_offertes.sql) en [`sql/019_contact_info.sql`](sql/019_contact_info.sql) uit in de SQL Editor.

Vul daarna je contactgegevens in bij **Financiën → Instellingen → Bedrijfsgegevens** (Contact e-mail / Contact telefoon) — zonder dit blijft de contactkaart gewoon verborgen.

### Beveiliging

De klant ziet enkel offertes/facturen die via het project aan zijn eigen account gekoppeld zijn (RLS-check op `project.client_user_id = auth.uid()`) — nooit die van een ander project/klant.

## Fase 14 — Klant-projectpagina in tabs + bedrijfsfoto (nieuw)

De projectpagina bij de klant was uitgegroeid tot 1 lange scroll (briefing, ideeën, foto's, offertes, feedback allemaal onder elkaar). Dat is nu opgesplitst in tabs, plus een bedrijfsfoto die je zelf instelt.

- **Tabs in het projectvenster**: Overzicht / Ideeën & Scripts / Foto's & Video / Offertes & Facturen / Feedback. Elke tab toont tussen haakjes hoeveel items erin zitten (bv. "Foto's & Video (12)"), en "Offertes & Facturen" verschijnt enkel als er ook echt iets aan dat project gekoppeld is. De status­balk en "wat nu?"-uitleg blijven altijd zichtbaar, ongeacht welke tab open staat.
- **Bedrijfsfoto**: een foto van jou/je werk die bovenaan het klantportaal verschijnt (welkomstscherm) en als achtergrond dient voor projecten die zelf nog geen foto hebben — voelt persoonlijker dan het kale "SM"-icoon.
- De **welkomstgids** stond voorheen op élk project herhaald — die staat nu alleen nog op het startscherm (waar hij al stond), niet meer dubbel in elk projectvenster.

### Eenmalig instellen

Voer [`sql/020_portal_branding.sql`](sql/020_portal_branding.sql) uit in de SQL Editor.

Ga naar **Klanten → Portal-instellingen** (hernoemd van "Welkomstgids & delivery-gids") en upload daar je bedrijfsfoto — verschijnt meteen bij alle klanten.

### Beveiliging

De bedrijfsfoto staat in een publieke opslag-bucket (het is geen gevoelige data, gewoon een foto van je bedrijf) — enkel jij (admin) kan uploaden of verwijderen, klanten kunnen alleen bekijken.

## Fase 15 — Contract uploaden, klant tekent met 1 knop, kopie downloaden (nieuw)

Uitbreiding van de bestaande "Overeenkomst"-functie (Fase 11): naast zelf een contracttekst typen, kan je nu ook een eigen, volledig vormgegeven contract-PDF uploaden per opdracht, een standaardcontract instellen dat je met 1 klik hergebruikt, en na ondertekening een ondertekeningsbewijs downloaden — voor jou en voor de klant.

- **Standaardcontract**: schrijf je vaste voorwaarden 1x in **Klanten → Portal-instellingen** ("Standaard contract-tekst"). Bij een nieuwe opdracht klik je in het detailvenster op **"Gebruik standaardcontract"** om die tekst meteen in te vullen — daarna nog aan te passen per klant indien nodig.
- **Eigen contract-PDF uploaden**: heb je het contract liever zelf vormgegeven (Canva, Word, ...)? Upload het bestand rechtstreeks bij de opdracht — dat overschrijft de tekst voor de klant: die krijgt een "Bekijk contract"-knop met jouw eigen document, in plaats van platte tekst.
- **Tekenen blijft zoals het was**: de klant kan het project pas verder bekijken nadat die zijn naam intypt en akkoord vinkt — geen aparte handeling nodig van jouw kant, je ziet meteen in het detailvenster wie wanneer getekend heeft.
- **Kopie/ondertekeningsbewijs**: zodra getekend, verschijnt zowel bij jou (opdracht-detail) als bij de klant (Overzicht-tab) een **"Download kopie"**-knop. Dat genereert een klein, gebrand PDF-bewijs met projectnaam, naam van de ondertekenaar, datum, en de contracttekst (of een verwijzing naar het geüploade bestand) — een nette kopie voor je eigen archief.

### Eenmalig instellen

Voer [`sql/021_contracts.sql`](sql/021_contracts.sql) uit in de SQL Editor.

Deze migratie bevat ook een **bugfix**: sinds Fase 13 kon een klant een geüpload offerte/factuur-bestand technisch niet downloaden (er ontbrak een leesrecht op de opslag-bucket, enkel op de databasetabel) — dat is nu gerepareerd.

### Beveiliging

Geüploade contracten staan in een privé bucket; enkel jij (admin) kan uploaden/verwijderen, en een klant kan enkel het contract van zijn **eigen** gekoppelde project bekijken — nooit dat van een ander project (zelfde `project_id`-scoping als foto's en offertes/facturen).
