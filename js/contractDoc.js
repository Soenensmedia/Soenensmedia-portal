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
  const vat = price * 0.21;
  const incl = price + vat;
  const total = price * term;

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
        <div><span>Maandelijks, excl. btw</span><span>${fmtEUR(price)}</span></div>
        <div><span>Btw 21%</span><span>${fmtEUR(vat)}</span></div>
        <div><span>Maandelijks, incl. btw</span><span>${fmtEUR(incl)}</span></div>
        <div><span>Totaal over de vaste looptijd (${term} maanden, excl. btw)</span><span>${fmtEUR(total)}</span></div>
      </div>
      <p class="doc-small" style="margin-top:14px">Niet-gebruikte prestaties uit een lopende maand worden niet overgedragen naar een volgende maand, tenzij de partijen dat schriftelijk anders afspreken. Werk buiten het pakket wordt vooraf geraamd en pas na schriftelijke goedkeuring van de klant uitgevoerd, aan een uurtarief van ${fmtEUR(fields.hourly ?? DEFAULT_FIELDS.hourly)} excl. btw of aan een vooraf afgesproken vaste prijs.</p>
      ${fields.ads === 'true' ? `
      <p class="doc-small" style="margin-top:10px">Daarnaast beheert Soenens Media, op vraag van de klant, de betaalde advertentiecampagnes voor de content uit dit pakket: opzet, doelgroepbepaling, optimalisatie en periodieke rapportage op de advertentiekanalen van de klant (o.a. Meta, TikTok). De klant geeft Soenens Media hiervoor toegang tot de nodige advertentie- en zakelijke accounts en blijft eindverantwoordelijke voor de inhoud van de campagnes en de naleving van de toepasselijke reclamewetgeving. Het advertentiebudget zelf wordt rechtstreeks door de klant aan het platform betaald${fields.adsBudget ? `, geraamd op ${escapeHtml(fields.adsBudget)}` : ''} en valt buiten de vergoeding uit dit artikel.</p>` : ''}
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
