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
