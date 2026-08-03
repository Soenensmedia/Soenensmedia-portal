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

Klik op **"Account aanmaken"**, maak je eigen login (jouw e-mail + een wachtwoord), en log in. Dit is de enige keer dat je dit doet — dit wordt je persoonlijke toegang tot het portaal.

> Tip: als Supabase e-mailbevestiging vereist, krijg je een mail — klik de bevestigingslink en log daarna in.

Test even: een opdracht toevoegen, een agenda-item plannen, uren loggen. Klopt alles? Dan ben je klaar om te deployen.

## Stap 4 — Online zetten via Netlify Drop

1. Ga naar [app.netlify.com/drop](https://app.netlify.com/drop) (gratis account aanmaken indien gevraagd).
2. Sleep de hele map `soenensmedia-portal` in het venster.
3. Je krijgt meteen een live link (bv. `https://iets-random.netlify.app`) — dit werkt op elk toestel, ook je GSM.
4. (Optioneel) Bij Netlify kan je onder **Site settings** een eigen, makkelijker te onthouden naam kiezen voor de link.

## Updates deployen

Telkens Claude iets aanpast aan het portaal: sleep de map gewoon opnieuw naar [app.netlify.com/drop](https://app.netlify.com/drop) — dat overschrijft de vorige versie op dezelfde link.

## Fase 2 — Klantenportaal (nieuw)

Klanten kunnen nu ook zelf een account aanmaken en inloggen. Ze zien dan enkel hún project, met de Frame.io-review, een feedback-veld en een "Goedkeuren"-knop. Jij (admin) blijft alles zien via het bestaande dashboard.

**Belangrijk:** laat "Account aanmaken" dus gewoon **aan staan** in Supabase (het eerdere advies om dit uit te zetten vervalt) — nieuwe accounts krijgen automatisch de rol "client" en zien niets totdat jij ze koppelt aan een project.

### Eenmalig instellen

1. Ga naar Supabase → **SQL Editor** → nieuwe query.
2. Open [`sql/002_client_portal.sql`](sql/002_client_portal.sql), kopieer de volledige inhoud, plak en klik **Run**. (Dit is een aanvulling — je bestaande data blijft gewoon staan.)
3. Onderaan dat bestand staat een aparte regel:
   ```sql
   update profiles set role = 'admin' where email = 'jouw-login-email@hier.be';
   ```
   Vervang het e-mailadres door het e-mailadres waarmee jij zelf inlogt in het portaal, en voer enkel die ene regel apart uit. Zonder deze stap zie je zelf ook maar 1 project (als klant-rol) in plaats van het volledige dashboard.

### Een klant koppelen aan een project

1. Laat de klant zelf een account aanmaken via de "Account aanmaken"-link op de inlogpagina (met hun eigen e-mail).
2. Open in jouw dashboard de betreffende opdracht → onder **Klantenportaal** vul je hun e-mailadres in bij "Klant koppelen" en klik **Koppelen**.
3. Plak ook de Frame.io-share-link bij **Frame.io link** en klik **Opslaan**.
4. De klant ziet vanaf nu dat project bij het inloggen, met de video-review, kan feedback typen, en kan goedkeuren.

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
