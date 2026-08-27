// Gedeelde opmaak van de retainerovereenkomst (admin-builder + klant-weergave
// gebruiken exact dezelfde artikeltekst, overgenomen uit het goedgekeurde
// contract-artifact — enkel de variabele velden verschillen per contract.
import { escapeHtml } from './util.js';

export const CONTRACT_PACKS = {
  p1: {
    key: 'p1', label: 'Pakket 1 · Reels', name: 'Reels Retainer', price: 2000,
    items: [
      '5 reels per maand, van concept tot afgewerkte export',
      '1 draaidag per maand op locatie naar keuze',
      'Montage, kleurcorrectie, ondertiteling en geluidsmix',
      'Aanlevering in verticaal 9:16, plus vierkante of horizontale versie op vraag',
      'Maandelijkse contentplanning en captionvoorstellen',
      '2 rondes feedback per video',
    ],
  },
  p2: {
    key: 'p2', label: 'Pakket 2 · Paid & Brand', name: 'Paid & Brand Retainer', price: 1300,
    items: [
      "4 paid ad-video's per maand, geoptimaliseerd voor Meta en TikTok",
      '1 brandvideo per jaar, inbegrepen in de retainer',
      'Per ad meerdere hooks en varianten voor A/B-testing',
      'Montage, kleurcorrectie, ondertiteling en geluidsmix',
      'Aanlevering in de formaten die de advertentiekanalen vragen',
      '2 rondes feedback per video',
    ],
  },
  p3: {
    key: 'p3', label: 'Pakket 3 · Alles-in-één', name: 'Alles-in-één Retainer', price: 3600,
    items: [
      '5 reels per maand, van concept tot afgewerkte export',
      "4 paid ad-video's per maand met meerdere hooks per ad",
      '1 brandvideo per jaar, inbegrepen in de retainer',
      '2 draaidagen per maand op locatie naar keuze',
      'Volledige contentstrategie en maandplanning',
      'Prioriteit in de planning en een vast aanspreekpunt',
      'Maandelijkse rapportage en overleg',
      '2 rondes feedback per video',
    ],
  },
  custom: {
    key: 'custom', label: 'Op maat', name: 'Pakket op maat', price: 0,
    items: ['Beschrijf hier de eerste prestatie', 'Voeg regels toe met de knop onderaan'],
  },
};

export const DEFAULT_FIELDS = {
  ver: '1.0',
  plaats: 'Kortrijk',
  plaats2: 'Kortrijk',
  smName: 'Soenens Media',
  smAdr: 'Straat en nummer, postcode gemeente',
  smVat: 'BE 0000.000.000',
  smMail: 'info@soenensmedia.be',
  clName: '',
  clAdr: 'Straat en nummer, postcode gemeente',
  clVat: 'BE 0000.000.000',
  clContact: '',
  hourly: 85,
  payterm: 14,
  booking: 10,
  revisions: 2,
  archive: 6,
  court: 'Gent, afdeling Kortrijk',
};

export function fmtEUR(n) {
  return '€ ' + (Number(n) || 0).toLocaleString('nl-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtStartText(startDate) {
  if (!startDate) return '—';
  return new Date(startDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function nextRef() {
  const year = new Date().getFullYear();
  const n = Math.floor(1 + Math.random() * 998).toString().padStart(3, '0');
  return `SM-RET-${year}-${n}`;
}

function f(fields, key) {
  return escapeHtml(fields?.[key] ?? DEFAULT_FIELDS[key] ?? '');
}

// Artikelen 1 t.e.m. 10 (alles behalve de handtekeningen, die apart gerenderd
// worden — admin en klant hebben elk hun eigen interactieve tekenvlak).
export function contractArticlesHtml(contract) {
  const fields = contract.fields || {};
  const items = Array.isArray(contract.items) ? contract.items : [];
  const price = Number(contract.price) || 0;
  const term = Number(contract.term) || 12;
  const notice = Number(contract.notice) || 2;
  const adsEnabled = fields.ads === 'true';
  const adsFee = adsEnabled ? (Number(fields.adsManagementFee) || 0) : 0;
  const monthly = price + adsFee;
  const vat = monthly * 0.21;
  const incl = monthly + vat;
  const total = monthly * term;

  return `
    <header class="doc-masthead">
      <div class="doc-brand"><span class="doc-dot"></span> SOENENS MEDIA</div>
      <h1>Retainerovereenkomst</h1>
      <p class="doc-sub">Doorlopende videoproductie en contentbegeleiding</p>
      <div class="doc-ref">
        <span>Ref. ${escapeHtml(contract.ref || '—')}</span>
        <span>Versie ${f(fields, 'ver')}</span>
        <span>Opgemaakt te ${f(fields, 'plaats')}</span>
      </div>
    </header>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">01</span> Partijen</h2>
      <div class="doc-parties">
        <div class="doc-party">
          <span class="doc-role">De dienstverlener</span>
          <span class="doc-line doc-name">${f(fields, 'smName')}</span>
          <span class="doc-line">${f(fields, 'smAdr')}</span>
          <span class="doc-line">BTW ${f(fields, 'smVat')}</span>
          <span class="doc-line">${f(fields, 'smMail')}</span>
        </div>
        <div class="doc-party">
          <span class="doc-role">De klant</span>
          <span class="doc-line doc-name">${f(fields, 'clName')}</span>
          <span class="doc-line">${f(fields, 'clAdr')}</span>
          <span class="doc-line">BTW ${f(fields, 'clVat')}</span>
          <span class="doc-line">Contactpersoon: ${f(fields, 'clContact')}</span>
        </div>
      </div>
      <p class="doc-small" style="margin-top:12px">Hierna samen "de partijen" genoemd. Zij komen het volgende overeen.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">02</span> Voorwerp van de overeenkomst</h2>
      <p>Soenens Media levert de klant op doorlopende basis videoproductie- en contentdiensten volgens het pakket dat in artikel 3 is beschreven. De opdracht omvat concept, opname, montage en oplevering van het overeengekomen volume aan content per maand, inclusief de begeleiding die daarbij hoort.</p>
      <p>Soenens Media voert de opdracht uit als zelfstandig dienstverlener, met eigen materiaal en naar eigen professioneel inzicht. Er is geen band van ondergeschiktheid tussen de partijen. De verbintenis is een inspanningsverbintenis: Soenens Media staat in voor de kwaliteit en de tijdige levering van de content, niet voor een bepaald commercieel resultaat, bereik of aantal weergaven.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">03</span> Pakket en vergoeding</h2>
      <div class="doc-pack-card">
        <div class="doc-pack-top">
          <div>
            <span class="doc-kicker">Pakket</span>
            <span class="doc-pname">${escapeHtml(contract.pack_name || '—')}</span>
          </div>
          <div class="doc-price">
            <span class="doc-amt">${fmtEUR(price)}</span>
            <span class="doc-per">per maand, excl. 21% btw</span>
          </div>
        </div>
        <ul class="doc-deliver">${items.map((it) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
      <div class="doc-totals">
        <div><span>Pakket, excl. btw</span><span>${fmtEUR(price)}</span></div>
        ${adsEnabled && adsFee > 0 ? `<div><span>Beheer advertenties (opzet + optimalisatie), excl. btw</span><span>${fmtEUR(adsFee)}</span></div>` : ''}
        <div><span>Maandelijks totaal, excl. btw</span><span>${fmtEUR(monthly)}</span></div>
        <div><span>Btw 21%</span><span>${fmtEUR(vat)}</span></div>
        <div><span>Maandelijks totaal, incl. btw</span><span>${fmtEUR(incl)}</span></div>
        <div><span>Totaal over de vaste looptijd (${term} maanden, excl. btw)</span><span>${fmtEUR(total)}</span></div>
      </div>
      <p class="doc-small" style="margin-top:14px">Niet-gebruikte prestaties uit een lopende maand worden niet overgedragen naar een volgende maand, tenzij de partijen dat schriftelijk anders afspreken. Werk buiten het pakket wordt vooraf geraamd en pas na schriftelijke goedkeuring van de klant uitgevoerd, aan een uurtarief van ${fmtEUR(fields.hourly ?? DEFAULT_FIELDS.hourly)} excl. btw of aan een vooraf afgesproken vaste prijs.</p>
      ${adsEnabled ? `
      <p class="doc-small" style="margin-top:10px">Daarnaast beheert Soenens Media, op vraag van de klant, de betaalde advertentiecampagnes voor de content uit dit pakket: opzet, doelgroepbepaling, optimalisatie en periodieke rapportage op de advertentiekanalen van de klant (o.a. Meta, TikTok)${adsFee > 0 ? `, voor een vergoeding van ${fmtEUR(adsFee)} per maand excl. btw, inbegrepen in het maandelijks totaal hierboven` : ''}. De klant geeft Soenens Media hiervoor toegang tot de nodige advertentie- en zakelijke accounts en blijft eindverantwoordelijke voor de inhoud van de campagnes en de naleving van de toepasselijke reclamewetgeving. Het advertentiebudget zelf — de bedragen die effectief aan het platform (Meta, TikTok, ...) besteed worden — wordt rechtstreeks door de klant betaald${fields.adsBudget ? `, geraamd op ${escapeHtml(fields.adsBudget)}` : ''}, en valt buiten de vergoeding aan Soenens Media.</p>` : ''}
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">04</span> Looptijd en opzegging</h2>
      <p>Deze overeenkomst gaat in op ${escapeHtml(fmtStartText(contract.start_date))} en heeft een vaste looptijd van ${term} maanden. Na afloop van die periode wordt zij stilzwijgend verlengd voor opeenvolgende periodes van één maand.</p>
      <p>Elke partij kan de overeenkomst beëindigen tegen het einde van de vaste looptijd of, bij stilzwijgende verlenging, tegen het einde van een lopende maand, mits schriftelijke opzegging per e-mail of aangetekend schrijven met een opzegtermijn van ${notice} maanden. Tijdens de opzegtermijn blijven beide partijen hun verbintenissen volledig nakomen.</p>
      <p>Beëindigt de klant de overeenkomst vroegtijdig binnen de vaste looptijd zonder ernstige tekortkoming van Soenens Media, dan blijven de vergoedingen voor de resterende maanden van die vaste looptijd verschuldigd.</p>
      <p>Elke partij kan de overeenkomst met onmiddellijke ingang beëindigen bij een zware tekortkoming van de andere partij die niet is rechtgezet binnen vijftien kalenderdagen na schriftelijke ingebrekestelling, en bij faillissement of staking van betaling.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">05</span> Betaling</h2>
      <p>Soenens Media factureert het maandbedrag telkens bij het begin van de maand waarop het betrekking heeft. Facturen zijn betaalbaar binnen ${f(fields, 'payterm')} kalenderdagen na factuurdatum.</p>
      <p>Bij niet-betaling op de vervaldag is van rechtswege en zonder ingebrekestelling de interest verschuldigd zoals bepaald in de wet van 2 augustus 2002 betreffende de bestrijding van de betalingsachterstand bij handelstransacties, vermeerderd met een forfaitaire schadevergoeding van 10% van het openstaande bedrag met een minimum van € 75.</p>
      <p>Blijft een factuur meer dan dertig kalenderdagen onbetaald, dan mag Soenens Media de dienstverlening opschorten tot alle openstaande bedragen zijn voldaan, zonder dat dit de klant recht geeft op enige vergoeding en zonder dat de betalingsverplichting voor de opgeschorte maanden vervalt. Protest tegen een factuur wordt schriftelijk en gemotiveerd meegedeeld binnen acht kalenderdagen na ontvangst.</p>
      <p>De prijzen zijn jaarlijks indexeerbaar op de verjaardag van de overeenkomst, op basis van de evolutie van de Belgische consumptieprijsindex, mits schriftelijke mededeling minstens één maand vooraf.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">06</span> Werkwijze, planning en medewerking</h2>
      <p>De partijen leggen aan het begin van elke maand samen de contentplanning vast. Draaidagen worden minstens ${f(fields, 'booking')} werkdagen vooraf ingepland. Een door de klant geannuleerde of verplaatste draaidag binnen achtenveertig uur voor aanvang wordt als gepresteerd beschouwd.</p>
      <p>De klant zorgt tijdig voor alles wat voor de uitvoering nodig is: toegang tot locaties, personen en producten, merkmateriaal zoals logo's en huisstijl, en de nodige toestemmingen van de personen die in beeld komen. Vertraging die daaruit voortvloeit, verlengt de leveringstermijnen zonder gevolg voor de maandelijkse vergoeding.</p>
      <p>Elke oplevering omvat ${f(fields, 'revisions')} rondes feedback, telkens gebundeld en schriftelijk aangeleverd binnen vijf werkdagen na oplevering. Blijft feedback binnen die termijn uit, dan geldt de levering als goedgekeurd. Bijkomende rondes of wijzigingen aan een reeds goedgekeurd concept worden aangerekend aan het uurtarief uit artikel 3.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">07</span> Intellectuele rechten en gebruik</h2>
      <p>Soenens Media draagt de vermogensrechten op de definitief opgeleverde en goedgekeurde content over aan de klant, voor onbeperkte duur en wereldwijd, voor gebruik op de eigen kanalen en in de eigen advertising van de klant. Die overdracht treedt pas in werking na volledige betaling van de betrokken facturen.</p>
      <p>Ruwe opnames, projectbestanden, presets en werkdocumenten blijven eigendom van Soenens Media en worden niet meegeleverd, tenzij anders schriftelijk overeengekomen en tegen een afzonderlijke vergoeding. Soenens Media bewaart het bronmateriaal gedurende ${f(fields, 'archive')} maanden na oplevering.</p>
      <p>Muziek, stockbeelden, lettertypes en andere licentiematerialen worden gebruikt binnen de grenzen van hun licentie. Wenst de klant een ruimer gebruik, dan draagt hij de kosten van de bijkomende licentie.</p>
      <p>Soenens Media mag de gerealiseerde content gebruiken in haar eigen portfolio, op haar website en sociale kanalen en in offertes, tenzij de klant daar schriftelijk bezwaar tegen maakt.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">08</span> Aansprakelijkheid</h2>
      <p>De aansprakelijkheid van Soenens Media is beperkt tot de rechtstreekse schade en tot maximaal het bedrag dat de klant in de drie maanden voorafgaand aan het schadegeval heeft betaald in het kader van deze overeenkomst. Indirecte schade zoals winstderving, omzetverlies, reputatieschade of verlies van data komt niet voor vergoeding in aanmerking.</p>
      <p>De klant is verantwoordelijk voor de juistheid van de informatie, claims en cijfers die hij aanlevert en die in de content worden verwerkt, en voor de naleving van de reclamewetgeving en de platformregels bij de publicatie ervan.</p>
      <p>Geen van beide partijen is aansprakelijk voor een tekortkoming die het gevolg is van overmacht, waaronder ziekte, ongeval, extreme weersomstandigheden die een opname onmogelijk maken, uitval van apparatuur buiten haar controle, of storingen bij externe platformen. In dat geval wordt de planning in onderling overleg verschoven.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">09</span> Vertrouwelijkheid en gegevens</h2>
      <p>De partijen behandelen alle vertrouwelijke informatie die zij van elkaar ontvangen als strikt vertrouwelijk, tijdens de overeenkomst en gedurende drie jaar erna. Persoonsgegevens worden verwerkt in overeenstemming met de Algemene Verordening Gegevensbescherming, uitsluitend voor de uitvoering van deze overeenkomst.</p>
      <p>De klant staat ervoor in dat de personen die in de content herkenbaar in beeld komen daarvoor hun toestemming hebben gegeven, en vrijwaart Soenens Media voor aanspraken op dat vlak.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">10</span> Slotbepalingen</h2>
      <p>Deze overeenkomst vervangt alle eerdere afspraken over hetzelfde voorwerp. Wijzigingen zijn slechts geldig indien schriftelijk overeengekomen door beide partijen. Is een bepaling nietig of onafdwingbaar, dan blijven de overige bepalingen onverkort gelden en vervangen de partijen de betrokken bepaling door een geldige bepaling die het beoogde doel zo dicht mogelijk benadert.</p>
      <p>Geen van beide partijen mag deze overeenkomst overdragen aan een derde zonder schriftelijk akkoord van de andere partij.</p>
      <p>Op deze overeenkomst is uitsluitend het Belgisch recht van toepassing. Geschillen die niet in der minne kunnen worden geregeld, behoren tot de exclusieve bevoegdheid van de ondernemingsrechtbank van ${f(fields, 'court')}.</p>
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════
// Losse opdracht (offerte & opdrachtbevestiging) — eenmalige
// videoproductie, met lijnprijzen i.p.v. een vast maandbedrag.
// ═══════════════════════════════════════════════════════════

export const ORDER_TEMPLATES = {
  brand: {
    key: 'brand', label: 'Bedrijfsvideo', type: 'Bedrijfsvideo',
    brief: 'Beschrijf hier kort wat we gaan maken: het doel van de video, de toon, waar ze gebruikt wordt en wat er zeker in moet. Deze omschrijving bepaalt de omvang van de opdracht.',
    items: [
      { d: 'Concept, scenario en voorbereiding', q: 1, u: 'forfait', r: 450 },
      { d: 'Draaidag met camera, licht en geluid', q: 1, u: 'dag', r: 950 },
      { d: 'Montage, kleurcorrectie en geluidsmix', q: 1, u: 'forfait', r: 850 },
      { d: 'Muzieklicentie', q: 1, u: 'stuk', r: 75 },
    ],
    inc: ['Voorbereidend gesprek en scenario', 'Eén draaidag van maximaal 8 uur', 'Montage met kleurcorrectie, geluidsmix en muziek', 'Twee rondes feedback', 'Oplevering in 16:9 en 9:16'],
    exc: ['Acteurs, modellen en voice-over', 'Locatiehuur en vergunningen', 'Drone-opnames', 'Ondertiteling in een vreemde taal', 'Meerwerk na de tweede feedbackronde'],
  },
  reels: {
    key: 'reels', label: 'Reels-shoot', type: 'Reels-shoot',
    brief: "Een halve draaidag waarop we in één keer een reeks korte verticale video's opnemen voor Instagram en TikTok, klaar om de komende weken uit te spelen.",
    items: [
      { d: 'Concept en shotlijst', q: 1, u: 'forfait', r: 250 },
      { d: 'Halve draaidag op locatie', q: 1, u: 'halve dag', r: 550 },
      { d: 'Montage per reel, inclusief ondertiteling', q: 6, u: 'stuk', r: 120 },
    ],
    inc: ['Voorbereiding en shotlijst', 'Halve draaidag van maximaal 4 uur', 'Montage met ondertiteling en muziek', 'Eén ronde feedback per reel', 'Oplevering in 9:16'],
    exc: ['Advertentiebudget en plaatsing', 'Copywriting van de captions', 'Acteurs en modellen', 'Extra reels boven het afgesproken aantal'],
  },
  event: {
    key: 'event', label: 'Event & aftermovie', type: 'Eventregistratie',
    brief: 'Registratie van het event en een aftermovie van ongeveer 2 minuten, plus enkele korte clips voor sociale media dezelfde week nog.',
    items: [
      { d: 'Voorbereiding en afstemming met de organisatie', q: 1, u: 'forfait', r: 300 },
      { d: 'Registratie ter plaatse', q: 1, u: 'dag', r: 1100 },
      { d: 'Aftermovie van circa 2 minuten', q: 1, u: 'forfait', r: 750 },
      { d: 'Korte clips voor sociale media', q: 3, u: 'stuk', r: 130 },
    ],
    inc: ['Voorbereidend overleg met de organisatie', 'Registratie ter plaatse met camera en geluid', 'Aftermovie met muzieklicentie', 'Eén ronde feedback', 'Oplevering binnen twee weken na het event'],
    exc: ['Livestream en meercamera-regie', 'Overnachting en verplaatsing buiten België', 'Fotografie', 'Extra draaidagen'],
  },
  blank: {
    key: 'blank', label: 'Blanco', type: 'Videoproductie',
    brief: 'Beschrijf hier kort wat we gaan maken: het doel van de video, de toon, waar ze gebruikt wordt en wat er zeker in moet.',
    items: [{ d: 'Omschrijving van de prestatie', q: 1, u: 'stuk', r: 0 }],
    inc: ['Vul aan wat inbegrepen is'],
    exc: ['Vul aan wat niet inbegrepen is'],
  },
};

export const ORDER_DEFAULT_FIELDS = {
  ...DEFAULT_FIELDS,
  projName: '',
  projType: ORDER_TEMPLATES.brand.type,
  shootDate: 'Nader te bepalen',
  location: 'Nader te bepalen',
  delivery: 'Binnen 3 weken na de draaidag',
  formats: '16:9 en 9:16, mp4',
  brief: ORDER_TEMPLATES.brand.brief,
  kmFree: 30,
  base: 'Kortrijk',
  kmRate: '0,45',
  deposit: 40,
};

export function fmtEUR2(n) {
  return '€ ' + (Number(n) || 0).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function nextOrderRef() {
  const year = new Date().getFullYear();
  const n = Math.floor(1 + Math.random() * 998).toString().padStart(3, '0');
  return `SM-${year}-${n}`;
}

function fo(fields, key) {
  return escapeHtml(fields?.[key] ?? ORDER_DEFAULT_FIELDS[key] ?? '');
}
function linesFromField(fields, key) {
  return (fields?.[key] || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

export function orderTotals(contract) {
  const fields = contract.fields || {};
  const items = Array.isArray(contract.items) ? contract.items : [];
  const subtotal = items.reduce((s, it) => s + (Number(it.q) || 0) * (Number(it.r) || 0), 0);
  const discount = Number(fields.discount) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const vat = afterDiscount * 0.21;
  const total = afterDiscount + vat;
  const useDeposit = fields.useDeposit !== 'false';
  const depositPct = Number(fields.deposit ?? ORDER_DEFAULT_FIELDS.deposit);
  const deposit = useDeposit ? total * (depositPct / 100) : 0;
  const balance = total - deposit;
  return { subtotal, discount, afterDiscount, vat, total, useDeposit, depositPct, deposit, balance };
}

export function orderArticlesHtml(contract) {
  const fields = contract.fields || {};
  const items = Array.isArray(contract.items) ? contract.items : [];
  const inc = linesFromField(fields, 'inc');
  const exc = linesFromField(fields, 'exc');
  const { subtotal, discount, vat, total, useDeposit, depositPct, deposit, balance } = orderTotals(contract);

  return `
    <header class="doc-masthead">
      <div class="doc-brand"><span class="doc-dot"></span> SOENENS MEDIA</div>
      <h1>Offerte &amp; opdrachtbevestiging</h1>
      <p class="doc-sub">Eenmalige videoproductie</p>
      <div class="doc-ref">
        <span>Ref. ${escapeHtml(contract.ref || '—')}</span>
        <span>Datum ${fo(fields, 'dateText') || escapeHtml(fmtStartText(contract.created_at || new Date()))}</span>
        <span>Geldig tot ${fo(fields, 'validText') || '—'}</span>
      </div>
    </header>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">01</span> Partijen</h2>
      <div class="doc-parties">
        <div class="doc-party">
          <span class="doc-role">De dienstverlener</span>
          <span class="doc-line doc-name">${fo(fields, 'smName')}</span>
          <span class="doc-line">${fo(fields, 'smAdr')}</span>
          <span class="doc-line">BTW ${fo(fields, 'smVat')}</span>
          <span class="doc-line">${fo(fields, 'smMail')}</span>
        </div>
        <div class="doc-party">
          <span class="doc-role">De klant</span>
          <span class="doc-line doc-name">${fo(fields, 'clName')}</span>
          <span class="doc-line">${fo(fields, 'clAdr')}</span>
          <span class="doc-line">BTW ${fo(fields, 'clVat')}</span>
          <span class="doc-line">Contactpersoon: ${fo(fields, 'clContact')}</span>
        </div>
      </div>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">02</span> De opdracht</h2>
      <dl class="doc-meta">
        <div><dt>Project</dt><dd>${fo(fields, 'projName') || '—'}</dd></div>
        <div><dt>Type</dt><dd>${fo(fields, 'projType')}</dd></div>
        <div><dt>Draaidag(en)</dt><dd>${fo(fields, 'shootDate')}</dd></div>
        <div><dt>Locatie</dt><dd>${fo(fields, 'location')}</dd></div>
        <div><dt>Oplevering</dt><dd>${fo(fields, 'delivery')}</dd></div>
        <div><dt>Formaten</dt><dd>${fo(fields, 'formats')}</dd></div>
      </dl>
      ${fields.brief ? `<p class="doc-small" style="margin-top:12px">${escapeHtml(fields.brief)}</p>` : ''}
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">03</span> Prijs</h2>
      <div class="doc-items-wrap">
        <table class="doc-items">
          <thead><tr><th>Omschrijving</th><th>Aantal</th><th>Eenheid</th><th>Prijs</th><th>Totaal</th></tr></thead>
          <tbody>
            ${items.map((it) => `<tr><td>${escapeHtml(it.d || '')}</td><td>${it.q || 0}</td><td>${escapeHtml(it.u || '')}</td><td>${fmtEUR2(it.r)}</td><td>${fmtEUR2((Number(it.q) || 0) * (Number(it.r) || 0))}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="doc-totals">
        <div><span>Subtotaal, excl. btw</span><span>${fmtEUR2(subtotal)}</span></div>
        ${discount > 0 ? `<div><span>Korting</span><span>−${fmtEUR2(discount)}</span></div>` : ''}
        <div><span>Btw 21%</span><span>${fmtEUR2(vat)}</span></div>
        <div><span>Totaal, incl. btw</span><span>${fmtEUR2(total)}</span></div>
        ${useDeposit ? `
        <div><span>Voorschot ${depositPct}% bij bestelling</span><span>${fmtEUR2(deposit)}</span></div>
        <div><span>Saldo bij oplevering</span><span>${fmtEUR2(balance)}</span></div>` : ''}
      </div>
      <p class="doc-small" style="margin-top:14px">Alle prijzen zijn in euro en exclusief 21% btw, tenzij anders vermeld. Verplaatsingen binnen een straal van ${fo(fields, 'kmFree')} km rond ${fo(fields, 'base')} zijn inbegrepen; daarbuiten wordt € ${fo(fields, 'kmRate')} per kilometer aangerekend.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">04</span> Wat is inbegrepen</h2>
      <div class="doc-cols">
        <div><h3 class="doc-col-h">Inbegrepen</h3><ul class="doc-deliver">${inc.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
        <div><h3 class="doc-col-h">Niet inbegrepen</h3><ul class="doc-deliver doc-deliver-out">${exc.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
      </div>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">05</span> Planning en medewerking</h2>
      <p>De draaidag wordt in onderling overleg vastgelegd en minstens ${fo(fields, 'booking') || DEFAULT_FIELDS.booking} werkdagen vooraf bevestigd. De klant zorgt tijdig voor toegang tot de locatie, de personen en de producten die in beeld komen, en voor het merkmateriaal dat in de montage verwerkt moet worden.</p>
      <p>Wordt een draaidag door de klant geannuleerd of verplaatst binnen achtenveertig uur voor aanvang, dan wordt die dag als gepresteerd aangerekend.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">06</span> Feedback en revisies</h2>
      <p>De opdracht omvat ${fo(fields, 'revisions') || DEFAULT_FIELDS.revisions} rondes feedback op de montage. Feedback wordt gebundeld en schriftelijk aangeleverd binnen vijf werkdagen na oplevering van de versie. Blijft feedback binnen die termijn uit, dan geldt de versie als goedgekeurd.</p>
      <p>Bijkomende rondes, of wijzigingen aan een reeds goedgekeurde versie of aan het afgesproken concept, worden aangerekend aan € ${fo(fields, 'hourly') || DEFAULT_FIELDS.hourly} per uur, excl. btw, na voorafgaande raming en schriftelijke goedkeuring door de klant.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">07</span> Betaling</h2>
      <p>${useDeposit
        ? `Bij bestelling is een voorschot van ${depositPct}% van het totaalbedrag verschuldigd. De opdracht wordt pas ingepland na ontvangst van dat voorschot. Het saldo wordt gefactureerd bij oplevering van de definitieve versie.`
        : 'Er wordt geen voorschot gevraagd. Het volledige bedrag wordt gefactureerd bij oplevering van de definitieve versie.'}</p>
      <p>Facturen zijn betaalbaar binnen ${fo(fields, 'payterm') || DEFAULT_FIELDS.payterm} kalenderdagen na factuurdatum.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">08</span> Meerwerk en annulering</h2>
      <p>Werk buiten de omschrijving in artikel 2 en de lijnen in artikel 3 is meerwerk. Meerwerk wordt vooraf geraamd en pas na schriftelijke goedkeuring van de klant uitgevoerd.</p>
      <p>${useDeposit
        ? 'Annuleert de klant de opdracht na ondertekening, dan blijft het voorschot verworven als vergoeding voor de reeds gemaakte kosten en de gereserveerde tijd.'
        : 'Annuleert de klant de opdracht na ondertekening, dan is 25% van het overeengekomen bedrag verschuldigd als vergoeding voor de reeds gemaakte kosten en de gereserveerde tijd.'} Annuleert de klant nadat de opnames zijn gestart, dan zijn alle reeds geleverde prestaties verschuldigd, verhoogd met 25% van het resterende bedrag.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">09</span> Rechten en gebruik</h2>
      <p>Soenens Media draagt de vermogensrechten op de definitief opgeleverde en goedgekeurde video over aan de klant, voor onbeperkte duur en wereldwijd, voor gebruik op de eigen kanalen en in de eigen advertising van de klant. Die overdracht treedt pas in werking na volledige betaling.</p>
      <p>Ruwe opnames en projectbestanden blijven eigendom van Soenens Media en worden niet meegeleverd, tenzij anders schriftelijk overeengekomen en tegen een afzonderlijke vergoeding. Het bronmateriaal wordt ${fo(fields, 'archive') || DEFAULT_FIELDS.archive} maanden na oplevering bewaard.</p>
    </section>

    <section class="doc-art">
      <h2 class="doc-art-h"><span class="doc-n">10</span> Aansprakelijkheid en slotbepalingen</h2>
      <p>De aansprakelijkheid van Soenens Media is beperkt tot de rechtstreekse schade en tot maximaal het bedrag van deze opdracht. Indirecte schade zoals winstderving, omzetverlies of reputatieschade komt niet voor vergoeding in aanmerking.</p>
      <p>Op deze overeenkomst is uitsluitend het Belgisch recht van toepassing. Geschillen behoren tot de exclusieve bevoegdheid van de ondernemingsrechtbank van ${fo(fields, 'court') || DEFAULT_FIELDS.court}.</p>
    </section>
  `;
}

// Dispatcher — kiest de juiste documentopmaak op basis van contract.kind.
export function contractDocHtml(contract) {
  return contract.kind === 'opdracht' ? orderArticlesHtml(contract) : contractArticlesHtml(contract);
}
