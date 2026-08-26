import { state } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';
import {
  fetchFinFacturen, createFinFactuur, updateFinFactuur, deleteFinFactuur,
  fetchFinKosten, createFinKost, updateFinKost, deleteFinKost,
  fetchFinProjecten, createFinProject, updateFinProject, deleteFinProject,
  fetchFinAankopen, createFinAankoop, updateFinAankoop, deleteFinAankoop,
  fetchFinOffertes, createFinOfferte, updateFinOfferte, deleteFinOfferte,
  fetchFinSettings, saveFinSettings,
  fetchBtwSetAside, saveBtwSetAside,
  uploadFinFactuurFile, getFinFactuurUrl, deleteFinFactuurFile,
  sendDocumentEmail,
} from './data.js';
import { generateFactuurPdf, generateOffertePdf, downloadPdf, pdfToBase64 } from './pdf.js';

const FIN_TABS = ['dashboard', 'btw', 'offertes', 'facturen', 'kosten', 'projecten', 'aankopen', 'instellingen'];
const FIN_TAB_LABELS = { dashboard: 'Dashboard', btw: 'BTW', offertes: 'Offertes', facturen: 'Facturen', kosten: 'Kosten', projecten: 'Projecten', aankopen: 'Aankopen', instellingen: 'Instellingen' };

const FACTUUR_STATUS_LABELS = { open: 'Open', betaald: 'Betaald' };
const OFFERTE_STATUS_LABELS = { verstuurd: 'Verstuurd', geaccepteerd: 'Geaccepteerd', geweigerd: 'Geweigerd' };
const KOST_FREQ_LABELS = { maandelijks: 'Maandelijks', kwartaal: 'Per kwartaal', jaarlijks: 'Jaarlijks' };
const FIN_PROJECT_STATUS_LABELS = { idee: 'Idee', 'te-factureren': 'Te factureren', gefactureerd: 'Gefactureerd', betaald: 'Betaald' };
const AANKOOP_PRIORITEIT_LABELS = { laag: 'Laag', gemiddeld: 'Gemiddeld', hoog: 'Hoog' };
const MONTHS_FULL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const FIN = {
  activeTab: 'dashboard',
  facturen: [],
  kosten: [],
  projecten: [],
  aankopen: [],
  offertes: [],
  settings: {
    default_btw: 21, period: 'kwartaal', banksaldo: 0, reserve_doel_maanden: 3, omzet_doel_maand: 0,
    bedrijfsnaam: '', bedrijfsadres: '', ondernemingsnummer: '', iban: '', betalingstermijn_dagen: 30,
  },
  btwCursor: new Date(),
  charts: {},
};

const eur = (n) => '€' + (Math.round((n || 0) * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0 = (n) => '€' + Math.round(n || 0).toLocaleString('nl-BE', { maximumFractionDigits: 0 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDateShortNL = (iso) => (iso ? new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export async function renderFinance() {
  const container = document.getElementById('finance-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    const [facturen, kosten, projecten, aankopen, settings] = await Promise.all([
      fetchFinFacturen(), fetchFinKosten(), fetchFinProjecten(), fetchFinAankopen(), fetchFinSettings(),
    ]);
    FIN.facturen = facturen;
    FIN.kosten = kosten;
    FIN.projecten = projecten;
    FIN.aankopen = aankopen;
    if (settings) FIN.settings = settings;
    // Offertes is de nieuwste tabel (Fase 8) — apart opvangen zodat een nog niet
    // uitgevoerde migratie niet de rest van het financieel dashboard blokkeert.
    try {
      FIN.offertes = await fetchFinOffertes();
    } catch {
      FIN.offertes = [];
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon financiële data niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  renderFinShell();
}

// Vanuit de zoekfunctie: laad de Financiën-tab, spring naar het juiste
// sub-tabblad en open meteen de bewerk-modal van het gevonden document.
export async function openFinanceRecordFromSearch(type, id) {
  await renderFinance();
  FIN.activeTab = type;
  renderFinShell();
  const record = (type === 'facturen' ? FIN.facturen : FIN.offertes).find((x) => x.id === id);
  if (record) {
    if (type === 'facturen') openFactuurModal(record);
    else openOfferteModal(record);
  }
}

function renderFinShell() {
  const container = document.getElementById('finance-container');
  container.innerHTML = `
    <div class="fin-subnav">
      ${FIN_TABS.map((t) => `<button type="button" class="fin-subtab-btn ${t === FIN.activeTab ? 'active' : ''}" data-fintab="${t}">${FIN_TAB_LABELS[t]}</button>`).join('')}
    </div>
    <div id="fin-subview"></div>
  `;
  container.querySelectorAll('.fin-subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      FIN.activeTab = btn.dataset.fintab;
      renderFinShell();
    });
  });
  renderFinSubview();
}

function renderFinSubview() {
  const el = document.getElementById('fin-subview');
  if (FIN.activeTab === 'dashboard') return renderFinDashboard(el);
  if (FIN.activeTab === 'btw') return renderFinBtw(el);
  if (FIN.activeTab === 'offertes') return renderFinOffertesTab(el);
  if (FIN.activeTab === 'facturen') return renderFinFacturenTab(el);
  if (FIN.activeTab === 'kosten') return renderFinKostenTab(el);
  if (FIN.activeTab === 'projecten') return renderFinProjectenTab(el);
  if (FIN.activeTab === 'aankopen') return renderFinAankopenTab(el);
  if (FIN.activeTab === 'instellingen') return renderFinInstellingenTab(el);
}

// ── berekeningen (1-op-1 overgenomen uit Financieel-Dashboard.html) ──
function computeVasteKostenMnd() {
  return FIN.kosten.filter((k) => k.type === 'vast').reduce((s, k) => {
    if (k.frequentie === 'maandelijks') return s + Number(k.bedrag);
    if (k.frequentie === 'kwartaal') return s + Number(k.bedrag) / 3;
    if (k.frequentie === 'jaarlijks') return s + Number(k.bedrag) / 12;
    return s;
  }, 0);
}

function periodBounds(date, period) {
  const y = date.getFullYear();
  if (period === 'maand') {
    const m = date.getMonth();
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0), key: `${y}-${String(m + 1).padStart(2, '0')}` };
  }
  const q = Math.floor(date.getMonth() / 3);
  const start = new Date(y, q * 3, 1);
  const end = new Date(y, q * 3 + 3, 0);
  return { start, end, key: `${y}-Q${q + 1}` };
}
function periodLabel(date, period) {
  if (period === 'maand') return MONTHS_FULL[date.getMonth()] + ' ' + date.getFullYear();
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}
function inRange(dateISO, start, end) {
  const d = new Date(dateISO);
  return d >= start && d <= end;
}
function btwDeadlineFor(periodEnd) {
  // Belgische btw-aangifte: uiterlijk de 20e van de maand na het einde van de periode.
  return new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 20);
}
function currentBtwSaldo() {
  const period = FIN.settings.period;
  const { start, end } = periodBounds(new Date(), period);
  const verschuldigd = FIN.facturen.filter((f) => inRange(f.datum, start, end)).reduce((s, f) => s + Number(f.bedrag) * (Number(f.btw) / 100), 0);
  const aftrekbaar = FIN.kosten.filter((k) => inRange(k.datum, start, end) && k.aftrekbaar).reduce((s, k) => s + Number(k.bedrag) * (Number(k.btw) / 100), 0);
  return verschuldigd - aftrekbaar;
}
function computeVrijeRuimte() {
  const vasteKostenMnd = computeVasteKostenMnd();
  const reserveDoel = vasteKostenMnd * (Number(FIN.settings.reserve_doel_maanden) || 0);
  const btwOpzij = Math.max(0, currentBtwSaldo());
  const vrijeRuimte = Number(FIN.settings.banksaldo) - reserveDoel - btwOpzij;
  return { vasteKostenMnd, reserveDoel, btwOpzij, vrijeRuimte, banksaldo: Number(FIN.settings.banksaldo) };
}
function nextDocumentNumber(existingRows, numberField) {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const maxSeq = existingRows
    .map((r) => r[numberField])
    .filter((n) => n && n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function handleDownloadPdf(kind, row) {
  try {
    // Eigen geïmporteerd offerte-bestand heeft voorrang op de auto-gegenereerde PDF.
    if (row.bestand_path) {
      window.open(await getFinFactuurUrl(row.bestand_path), '_blank');
      return;
    }
    const doc = kind === 'factuur' ? generateFactuurPdf(row, FIN.settings) : generateOffertePdf(row, FIN.settings);
    const nummer = kind === 'factuur' ? row.factuurnummer : row.offertenummer;
    downloadPdf(doc, `${kind}-${nummer || row.id.slice(0, 8)}.pdf`);
  } catch (err) {
    showToast('Kon PDF niet maken: ' + err.message, true);
  }
}

async function handleEmailPdf(kind, row) {
  if (!row.klant_email) {
    showToast('Geen e-mailadres bij deze klant ingevuld — vul dat eerst in via bewerken (✎).', true);
    return;
  }
  if (!confirm(`Deze ${kind} versturen naar ${row.klant_email}?`)) return;
  try {
    const nummer = kind === 'factuur' ? row.factuurnummer : row.offertenummer;
    let base64, filename;
    if (row.bestand_path) {
      const url = await getFinFactuurUrl(row.bestand_path);
      const blob = await (await fetch(url)).blob();
      base64 = await blobToBase64(blob);
      filename = row.bestand_naam || `${kind}-${nummer || row.id.slice(0, 8)}.pdf`;
    } else {
      const doc = kind === 'factuur' ? generateFactuurPdf(row, FIN.settings) : generateOffertePdf(row, FIN.settings);
      base64 = pdfToBase64(doc);
      filename = `${kind}-${nummer || row.id.slice(0, 8)}.pdf`;
    }
    await sendDocumentEmail({
      to: row.klant_email,
      subject: `${kind === 'factuur' ? 'Factuur' : 'Offerte'}${nummer ? ' ' + nummer : ''} — ${FIN.settings.bedrijfsnaam || 'SoenensMedia'}`,
      kind,
      nummer,
      pdfBase64: base64,
      filename,
    });
    showToast('Verstuurd naar ' + row.klant_email);
  } catch (err) {
    showToast('Kon niet versturen: ' + err.message, true);
  }
}

function adviesFor(prijs, vrijeRuimte) {
  if (vrijeRuimte <= 0) return { cls: 'wachten', label: 'Nog even wachten', sub: 'geen ruimte boven je reserve-doel en btw-verplichting' };
  const pct = prijs / vrijeRuimte;
  if (pct <= 0.5) return { cls: 'verstandig', label: 'Verstandig', sub: `±${Math.round(pct * 100)}% van je vrije ruimte` };
  if (pct <= 1) return { cls: 'opgelet', label: 'Kan, met aandacht', sub: `gebruikt ${Math.round(pct * 100)}% van je vrije ruimte` };
  return { cls: 'wachten', label: 'Nog even wachten', sub: `overschrijdt je vrije ruimte met ${eur(prijs - vrijeRuimte)}` };
}

// ── DASHBOARD ────────────────────────────────────────────
// Laatste `n` maanden (incl. huidige), oudste eerst — gebruikt voor zowel de
// sparklines als de grote omzet/kosten-grafiek.
function lastMonths(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return months;
}
function monthKey(d) { return `${d.getFullYear()}-${d.getMonth()}`; }
function monthlySums(items, dateField, amountField, months) {
  const sums = new Map(months.map((m) => [monthKey(m), 0]));
  items.forEach((it) => {
    if (!it[dateField]) return;
    const d = new Date(it[dateField]);
    const key = monthKey(d);
    if (sums.has(key)) sums.set(key, sums.get(key) + Number(it[amountField] || 0));
  });
  return months.map((m) => sums.get(monthKey(m)));
}

function destroyChart(key) {
  if (FIN.charts[key]) { FIN.charts[key].destroy(); delete FIN.charts[key]; }
}

function renderFinDashboard(el) {
  const now = new Date();
  const thisYear = now.getFullYear();

  const openstaande = FIN.facturen.filter((f) => f.status === 'open');
  const openstaandeBedrag = openstaande.reduce((s, f) => s + Number(f.bedrag) * (1 + Number(f.btw) / 100), 0);
  const vervallen = openstaande.filter((f) => f.vervaldatum && new Date(f.vervaldatum) < now);

  const facturenDitJaar = FIN.facturen.filter((f) => new Date(f.datum).getFullYear() === thisYear);
  const omzetJaar = facturenDitJaar.reduce((s, f) => s + Number(f.bedrag), 0);

  const btwSaldo = currentBtwSaldo();

  const kostenDitJaar = FIN.kosten.filter((k) => new Date(k.datum).getFullYear() === thisYear);
  const uitgavenJaar = kostenDitJaar.reduce((s, k) => s + Number(k.bedrag), 0);
  const winstmarge = omzetJaar > 0 ? Math.round(((omzetJaar - uitgavenJaar) / omzetJaar) * 100) : 0;

  const vasteKostenMnd = computeVasteKostenMnd();
  const reserveMaanden = vasteKostenMnd > 0 ? Number(FIN.settings.banksaldo) / vasteKostenMnd : 0;

  const facturenDitMaand = FIN.facturen.filter((f) => {
    const d = new Date(f.datum);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const omzetMaand = facturenDitMaand.reduce((s, f) => s + Number(f.bedrag), 0);
  const doelMaand = Number(FIN.settings.omzet_doel_maand) || 0;
  const doelPct = doelMaand > 0 ? Math.min(100, Math.round((omzetMaand / doelMaand) * 100)) : 0;

  const gemProjectwaarde = facturenDitJaar.length ? omzetJaar / facturenDitJaar.length : 0;

  const urenDitJaar = state.timeEntries
    .filter((t) => new Date(t.entry_date).getFullYear() === thisYear)
    .reduce((s, t) => s + Number(t.hours), 0);
  const uurtarief = urenDitJaar > 0 ? omzetJaar / urenDitJaar : 0;

  const months = lastMonths(12);
  const monthLabels = months.map((m) => MONTHS_FULL[m.getMonth()].slice(0, 3));
  const omzetSeries = monthlySums(FIN.facturen, 'datum', 'bedrag', months);
  const kostenSeries = monthlySums(FIN.kosten, 'datum', 'bedrag', months);
  const sparkMonths = months.slice(-6);
  const omzetSpark = omzetSeries.slice(-6);
  const kostenSpark = kostenSeries.slice(-6);

  const klantTotals = new Map();
  facturenDitJaar.forEach((f) => {
    const naam = f.klant || 'Onbekend';
    klantTotals.set(naam, (klantTotals.get(naam) || 0) + Number(f.bedrag));
  });
  const topKlanten = [...klantTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const kostenVast = kostenDitJaar.filter((k) => k.type === 'vast').reduce((s, k) => s + Number(k.bedrag), 0);
  const kostenEenmalig = kostenDitJaar.filter((k) => k.type !== 'vast').reduce((s, k) => s + Number(k.bedrag), 0);

  const kpis = [
    { label: btwSaldo >= 0 ? 'BTW te betalen (huidig)' : 'BTW terug te vorderen', value: eur0(Math.abs(btwSaldo)), sub: periodLabel(now, FIN.settings.period) },
    { label: 'Winstmarge', value: winstmarge + '%', sub: 'omzet − kosten, dit jaar' },
    { label: 'Reserve', value: vasteKostenMnd > 0 ? reserveMaanden.toFixed(1) + ' mnd' : '—', sub: 'op basis van banksaldo' },
    { label: 'Vaste kosten / mnd', value: eur0(vasteKostenMnd), sub: '' },
    { label: 'Gem. projectwaarde', value: eur0(gemProjectwaarde), sub: 'per factuur, dit jaar' },
    { label: 'Effectief uurtarief', value: urenDitJaar > 0 ? eur(uurtarief) + '/u' : '—', sub: urenDitJaar > 0 ? `${urenDitJaar}u gelogd dit jaar` : 'nog geen uren gelogd' },
  ];

  el.innerHTML = `
    <div class="fin-overview">
      <div class="fin-hero">
        <div class="fin-hero-label">Omzet dit jaar</div>
        <div class="fin-hero-value">${eur0(omzetJaar)}</div>
        <div class="fin-hero-sub">${openstaande.length} openstaande factu${openstaande.length === 1 ? 'ur' : 'ren'} — ${eur0(openstaandeBedrag)}</div>
      </div>

      <div class="fin-small-card">
        <div class="fin-small-label">Omzet</div>
        <div class="fin-small-value">${eur0(omzetMaand)}</div>
        <div class="fin-canvas-wrap"><canvas id="fin-spark-omzet"></canvas></div>
      </div>
      <div class="fin-small-card">
        <div class="fin-small-label">Kosten</div>
        <div class="fin-small-value">${eur0(kostenSpark[kostenSpark.length - 1] || 0)}</div>
        <div class="fin-canvas-wrap"><canvas id="fin-spark-kosten"></canvas></div>
      </div>

      <div class="fin-goal-card">
        <div class="fin-small-label">Omzetdoel deze maand</div>
        <div class="fin-goal-row"><span class="fin-goal-pct">${doelMaand > 0 ? doelPct + '%' : '—'}</span><span class="fin-goal-amt">${eur0(omzetMaand)} / ${doelMaand > 0 ? eur0(doelMaand) : '—'}</span></div>
        <div class="fin-goal-bar"><div class="fin-goal-bar-fill" style="width:${doelPct}%"></div></div>
      </div>

      <div class="fin-chart-card">
        <div class="fin-small-label">Omzet per klant, dit jaar</div>
        <div class="fin-canvas-wrap"><canvas id="fin-chart-klanten"></canvas></div>
      </div>

      <div class="fin-notif-panel">
        <div class="fin-small-label">Meldingen</div>
        ${vervallen.length
          ? vervallen.slice(0, 4).map((f) => `<div class="fin-notif-row fin-notif-urgent">Factuur ${escapeHtml(f.factuurnummer || f.klant || '')} is vervallen (${fmtDateShortNL(f.vervaldatum)})</div>`).join('')
          : '<div class="fin-notif-row fin-notif-ok">Geen vervallen facturen</div>'}
        ${btwSaldo >= 0 ? `<div class="fin-notif-row">BTW-saldo te betalen: ${eur0(btwSaldo)}</div>` : ''}
      </div>

      <div class="fin-chart-card fin-chart-wide">
        <div class="fin-small-label">Omzet &amp; kosten per maand</div>
        <div class="fin-canvas-wrap"><canvas id="fin-chart-trend"></canvas></div>
      </div>

      <div class="fin-chart-card">
        <div class="fin-small-label">Kosten dit jaar — vast vs. eenmalig</div>
        <div class="fin-canvas-wrap"><canvas id="fin-chart-kosten-verdeling"></canvas></div>
      </div>
    </div>

    <div class="stats-row" style="margin-top:20px;">
      ${kpis.map((k) => `
        <div class="stat-card">
          <div class="stat-label">${escapeHtml(k.label)}</div>
          <div class="stat-value">${k.value}</div>
          ${k.sub ? `<div class="stat-sub">${escapeHtml(k.sub)}</div>` : ''}
        </div>`).join('')}
    </div>
  `;

  drawFinCharts({ sparkMonths, omzetSpark, kostenSpark, monthLabels, omzetSeries, kostenSeries, topKlanten, kostenVast, kostenEenmalig });
}

function drawFinCharts({ sparkMonths, omzetSpark, kostenSpark, monthLabels, omzetSeries, kostenSeries, topKlanten, kostenVast, kostenEenmalig }) {
  if (typeof window.Chart === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  const red = styles.getPropertyValue('--red').trim() || '#e03535';
  const green = '#16a34a';
  const textDim = styles.getPropertyValue('--text-dim').trim() || '#6b6b72';
  const line = styles.getPropertyValue('--line').trim() || '#dedcd6';
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = textDim;

  ['spark-omzet', 'spark-kosten', 'chart-klanten', 'chart-trend', 'chart-kosten-verdeling'].forEach(destroyChart);

  const sparkLabels = sparkMonths.map((m) => MONTHS_FULL[m.getMonth()].slice(0, 3));

  const omzetCanvas = document.getElementById('fin-spark-omzet');
  if (omzetCanvas) {
    FIN.charts['spark-omzet'] = new Chart(omzetCanvas, {
      type: 'line',
      data: { labels: sparkLabels, datasets: [{ data: omzetSpark, borderColor: green, backgroundColor: green + '22', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
    });
  }
  const kostenCanvas = document.getElementById('fin-spark-kosten');
  if (kostenCanvas) {
    FIN.charts['spark-kosten'] = new Chart(kostenCanvas, {
      type: 'line',
      data: { labels: sparkLabels, datasets: [{ data: kostenSpark, borderColor: red, backgroundColor: red + '22', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
    });
  }

  const klantenCanvas = document.getElementById('fin-chart-klanten');
  if (klantenCanvas) {
    FIN.charts['chart-klanten'] = new Chart(klantenCanvas, {
      type: 'bar',
      data: {
        labels: topKlanten.map(([naam]) => naam),
        datasets: [{ data: topKlanten.map(([, bedrag]) => Math.round(bedrag)), backgroundColor: '#e03535cc', borderRadius: 4, maxBarThickness: 28 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: line }, ticks: { callback: (v) => eur0(v) } } },
      },
    });
  }

  const trendCanvas = document.getElementById('fin-chart-trend');
  if (trendCanvas) {
    FIN.charts['chart-trend'] = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          { label: 'Omzet', data: omzetSeries.map((v) => Math.round(v)), borderColor: green, backgroundColor: green + '1a', fill: true, tension: 0.3, pointRadius: 2 },
          { label: 'Kosten', data: kostenSeries.map((v) => Math.round(v)), borderColor: red, backgroundColor: 'transparent', borderDash: [4, 3], tension: 0.3, pointRadius: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: line }, ticks: { callback: (v) => eur0(v) } } },
      },
    });
  }

  const verdelingCanvas = document.getElementById('fin-chart-kosten-verdeling');
  if (verdelingCanvas) {
    FIN.charts['chart-kosten-verdeling'] = new Chart(verdelingCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Vaste kosten', 'Eenmalige kosten'],
        datasets: [{ data: [Math.round(kostenVast), Math.round(kostenEenmalig)], backgroundColor: ['#e03535', '#f0b8b8'], borderWidth: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
      },
    });
  }
}

// ── BTW ──────────────────────────────────────────────────
function renderFinBtw(el) {
  const period = FIN.settings.period;
  const { start, end, key } = periodBounds(FIN.btwCursor, period);

  const facturenInPeriod = FIN.facturen.filter((f) => inRange(f.datum, start, end));
  const kostenInPeriod = FIN.kosten.filter((k) => inRange(k.datum, start, end) && k.aftrekbaar);

  const verschuldigd = facturenInPeriod.reduce((s, f) => s + Number(f.bedrag) * (Number(f.btw) / 100), 0);
  const aftrekbaar = kostenInPeriod.reduce((s, k) => s + Number(k.bedrag) * (Number(k.btw) / 100), 0);
  const saldo = verschuldigd - aftrekbaar;

  const nowBounds = periodBounds(new Date(), period);
  const deadline = btwDeadlineFor(nowBounds.end);
  const daysLeft = Math.ceil((deadline - new Date(new Date().toDateString())) / 86400000);
  const reminderCls = daysLeft <= 7 ? 'btw-owe' : daysLeft <= 21 ? '' : 'btw-refund';

  el.innerHTML = `
    <div class="fin-vrije-ruimte-banner ${reminderCls === 'btw-owe' ? 'fin-reminder-urgent' : ''}">
      <strong>BTW-aangifte ${escapeHtml(periodLabel(new Date(), period))}</strong> moet ingediend zijn vóór ${fmtDateShortNL(deadline.toISOString().slice(0, 10))}
      — ${daysLeft >= 0 ? `nog ${daysLeft} dag${daysLeft === 1 ? '' : 'en'}` : `${Math.abs(daysLeft)} dag${Math.abs(daysLeft) === 1 ? '' : 'en'} te laat`}.
    </div>
    <div class="week-nav" style="margin-bottom:16px;">
      <button type="button" class="btn btn-ghost btn-small" id="btw-prev">‹</button>
      <span class="week-label">${escapeHtml(periodLabel(FIN.btwCursor, period))}</span>
      <button type="button" class="btn btn-ghost btn-small" id="btw-next">›</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-label">BTW verschuldigd (op omzet)</div><div class="stat-value">${eur(verschuldigd)}</div></div>
      <div class="stat-card"><div class="stat-label">BTW aftrekbaar (op kosten)</div><div class="stat-value">${eur(aftrekbaar)}</div></div>
      <div class="stat-card ${saldo >= 0 ? 'btw-owe' : 'btw-refund'}">
        <div class="stat-label">${saldo >= 0 ? 'Te betalen aan de btw' : 'Terug te vorderen'}</div>
        <div class="stat-value">${eur(Math.abs(saldo))}</div>
      </div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;margin:16px 0;font-size:13px;color:var(--text-dim);">
      <input type="checkbox" id="btw-set-aside" style="width:auto;">
      Ik heb dit bedrag opzij gezet
    </label>
    <div class="detail-section">
      <h3>Facturen in deze periode (${facturenInPeriod.length})</h3>
      ${facturenInPeriod.length ? `<table class="log-table"><thead><tr><th>Klant</th><th>Datum</th><th>Bedrag excl.</th><th>Btw%</th><th>Btw bedrag</th></tr></thead><tbody>
        ${facturenInPeriod.map((f) => `<tr><td>${escapeHtml(f.klant || '—')}</td><td>${fmtDateShortNL(f.datum)}</td><td>${eur(f.bedrag)}</td><td>${f.btw}%</td><td>${eur(Number(f.bedrag) * Number(f.btw) / 100)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty-note">Geen facturen in deze periode.</div>'}
    </div>
    <div class="detail-section">
      <h3>Aftrekbare kosten in deze periode (${kostenInPeriod.length})</h3>
      ${kostenInPeriod.length ? `<table class="log-table"><thead><tr><th>Omschrijving</th><th>Datum</th><th>Bedrag excl.</th><th>Btw%</th><th>Btw bedrag</th></tr></thead><tbody>
        ${kostenInPeriod.map((k) => `<tr><td>${escapeHtml(k.omschrijving || '—')}</td><td>${fmtDateShortNL(k.datum)}</td><td>${eur(k.bedrag)}</td><td>${k.btw}%</td><td>${eur(Number(k.bedrag) * Number(k.btw) / 100)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty-note">Geen aftrekbare kosten in deze periode.</div>'}
    </div>
  `;

  document.getElementById('btw-prev').addEventListener('click', () => {
    FIN.btwCursor = new Date(FIN.btwCursor);
    FIN.btwCursor.setMonth(FIN.btwCursor.getMonth() - (period === 'maand' ? 1 : 3));
    renderFinBtw(el);
  });
  document.getElementById('btw-next').addEventListener('click', () => {
    FIN.btwCursor = new Date(FIN.btwCursor);
    FIN.btwCursor.setMonth(FIN.btwCursor.getMonth() + (period === 'maand' ? 1 : 3));
    renderFinBtw(el);
  });

  const setAsideBox = document.getElementById('btw-set-aside');
  fetchBtwSetAside(key).then((row) => { setAsideBox.checked = !!row?.set_aside; }).catch(() => {});
  setAsideBox.addEventListener('change', () => {
    saveBtwSetAside(key, setAsideBox.checked).catch((err) => showToast(err.message, true));
  });
}

// ── OFFERTES ─────────────────────────────────────────────
function renderFinOffertesTab(el) {
  const rows = [...FIN.offertes].sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  el.innerHTML = `
    <div class="view-header"><h2>Offertes</h2><button type="button" class="btn btn-red btn-small" id="fin-add-offerte">+ Offerte toevoegen</button></div>
    ${rows.length ? `<table class="log-table"><thead><tr><th>Nr.</th><th>Klant</th><th>Omschrijving</th><th>Datum</th><th>Bedrag</th><th>Project</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((o) => {
        const project = o.project_id ? state.projects.find((p) => p.id === o.project_id) : null;
        return `<tr>
          <td>${escapeHtml(o.offertenummer || '—')}${o.bestand_path ? ' 📎' : ''}</td>
          <td>${escapeHtml(o.klant || '—')}</td>
          <td>${escapeHtml(o.omschrijving || '—')}</td>
          <td>${fmtDateShortNL(o.datum)}</td>
          <td>${eur(o.bedrag)}</td>
          <td>${project ? escapeHtml(project.title) : '<span class="hint-dim">—</span>'}</td>
          <td><span class="badge-status ${o.status === 'geaccepteerd' ? 'goedgekeurd' : o.status === 'geweigerd' ? 'aanpassing_gevraagd' : 'in_afwachting'}">${OFFERTE_STATUS_LABELS[o.status]}</span></td>
          <td>
            <button type="button" class="btn-icon fin-pdf-offerte" data-id="${o.id}" title="Download">📄</button>
            <button type="button" class="btn-icon fin-email-offerte" data-id="${o.id}" title="Verstuur per e-mail">✉</button>
            <button type="button" class="btn-icon fin-to-factuur" data-id="${o.id}" title="Omzetten naar factuur">🧾</button>
            <button type="button" class="btn-icon fin-edit-offerte" data-id="${o.id}">✎</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>` : '<div class="empty-note">Nog geen offertes. Klik op "+ Offerte toevoegen".</div>'}
  `;
  document.getElementById('fin-add-offerte').addEventListener('click', () => openOfferteModal(null));
  el.querySelectorAll('.fin-edit-offerte').forEach((btn) => {
    btn.addEventListener('click', () => openOfferteModal(FIN.offertes.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-pdf-offerte').forEach((btn) => {
    btn.addEventListener('click', () => handleDownloadPdf('offerte', FIN.offertes.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-email-offerte').forEach((btn) => {
    btn.addEventListener('click', () => handleEmailPdf('offerte', FIN.offertes.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-to-factuur').forEach((btn) => {
    btn.addEventListener('click', () => convertOfferteToFactuur(FIN.offertes.find((x) => x.id === btn.dataset.id)));
  });
}

function convertOfferteToFactuur(offerte) {
  if (!confirm(`Offerte ${offerte.offertenummer || ''} omzetten naar een nieuwe factuur?`)) return;
  openFactuurModal(null, {
    klant: offerte.klant,
    klant_email: offerte.klant_email,
    omschrijving: offerte.omschrijving,
    bedrag: offerte.bedrag,
    project_id: offerte.project_id,
    fromOfferteId: offerte.id,
  });
}

function openOfferteModal(existing) {
  const o = existing || { klant: '', klant_email: '', omschrijving: '', datum: todayISO(), bedrag: 0, status: 'verstuurd', project_id: null };
  const projectOptions = state.projects
    .map((p) => `<option value="${p.id}" ${o.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.client_name)} — ${escapeHtml(p.title)}</option>`)
    .join('');
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Offerte bewerken' : 'Offerte toevoegen'}</h2></div>
    <form id="fin-offerte-form">
      ${existing?.offertenummer ? `<div class="empty-note">Offertenummer: <strong>${escapeHtml(existing.offertenummer)}</strong></div>` : ''}
      <div class="field"><label>Klant</label><input type="text" id="fo-klant" value="${escapeAttr(o.klant || '')}"></div>
      <div class="field"><label>E-mail klant (voor "Verstuur per e-mail")</label><input type="email" id="fo-klant-email" value="${escapeAttr(o.klant_email || '')}" placeholder="klant@bedrijf.be"></div>
      <div class="field"><label>Omschrijving</label><input type="text" id="fo-omschrijving" value="${escapeAttr(o.omschrijving || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Datum</label><input type="date" id="fo-datum" value="${o.datum || ''}"></div>
        <div class="field"><label>Bedrag excl. btw (€)</label><input type="number" step="0.01" id="fo-bedrag" value="${o.bedrag}"></div>
      </div>
      <div class="field"><label>Gekoppeld project (optioneel)</label>
        <select id="fo-project"><option value="">— Geen —</option>${projectOptions}</select>
      </div>
      <div class="field"><label>Status</label>
        <select id="fo-status">
          <option value="verstuurd" ${o.status === 'verstuurd' ? 'selected' : ''}>Verstuurd</option>
          <option value="geaccepteerd" ${o.status === 'geaccepteerd' ? 'selected' : ''}>Geaccepteerd</option>
          <option value="geweigerd" ${o.status === 'geweigerd' ? 'selected' : ''}>Geweigerd</option>
        </select>
      </div>
      <div class="field" id="fo-file-field">
        <label>Eigen offerte-bestand (optioneel — i.p.v. de auto-gegenereerde PDF bij Download/Verstuur)</label>
        ${o.bestand_path
          ? `<div class="field-row" style="align-items:center;">
               <a href="#" id="fo-view-file">📄 ${escapeHtml(o.bestand_naam || 'bekijken')}</a>
               <button type="button" class="btn-icon" id="fo-remove-file">✕</button>
             </div>`
          : `<input type="file" id="fo-bestand-input" accept="application/pdf,image/*,.doc,.docx">`}
      </div>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="fo-delete">Verwijderen</button>' : '<span></span>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="fo-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('fo-cancel').addEventListener('click', closeModal);
  if (existing) {
    document.getElementById('fo-delete').addEventListener('click', async () => {
      if (!confirm('Deze offerte verwijderen?')) return;
      try {
        await deleteFinOfferte(existing.id);
        FIN.offertes = FIN.offertes.filter((x) => x.id !== existing.id);
        closeModal();
        renderFinSubview();
        showToast('Offerte verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  }
  document.getElementById('fo-view-file')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      window.open(await getFinFactuurUrl(existing.bestand_path), '_blank');
    } catch (err) { showToast(err.message, true); }
  });
  document.getElementById('fo-remove-file')?.addEventListener('click', async () => {
    if (!confirm('Geïmporteerd offerte-bestand verwijderen?')) return;
    try {
      await deleteFinFactuurFile(existing.bestand_path);
      const updated = await updateFinOfferte(existing.id, { bestand_path: null, bestand_naam: null });
      FIN.offertes[FIN.offertes.findIndex((x) => x.id === existing.id)] = updated;
      openOfferteModal(updated);
      showToast('Bestand verwijderd');
    } catch (err) { showToast(err.message, true); }
  });
  document.getElementById('fin-offerte-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      klant: document.getElementById('fo-klant').value.trim(),
      klant_email: document.getElementById('fo-klant-email').value.trim() || null,
      omschrijving: document.getElementById('fo-omschrijving').value.trim(),
      datum: document.getElementById('fo-datum').value || todayISO(),
      bedrag: parseFloat(document.getElementById('fo-bedrag').value) || 0,
      project_id: document.getElementById('fo-project').value || null,
      status: document.getElementById('fo-status').value,
    };
    const file = document.getElementById('fo-bestand-input')?.files[0] || null;
    try {
      let saved;
      if (existing) {
        saved = await updateFinOfferte(existing.id, payload);
      } else {
        payload.offertenummer = nextDocumentNumber(FIN.offertes, 'offertenummer');
        saved = await createFinOfferte(payload);
      }
      if (file) {
        const path = await uploadFinFactuurFile(saved.id, file);
        saved = await updateFinOfferte(saved.id, { bestand_path: path, bestand_naam: file.name });
      }
      if (existing) {
        FIN.offertes[FIN.offertes.findIndex((x) => x.id === existing.id)] = saved;
      } else {
        FIN.offertes.unshift(saved);
      }
      closeModal();
      renderFinSubview();
      showToast('Offerte opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
}

// ── FACTUREN ─────────────────────────────────────────────
function renderFinFacturenTab(el) {
  const rows = [...FIN.facturen].sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  el.innerHTML = `
    <div class="view-header"><h2>Facturen</h2><button type="button" class="btn btn-red btn-small" id="fin-add-factuur">+ Factuur toevoegen</button></div>
    ${rows.length ? `<table class="log-table"><thead><tr><th>Nr.</th><th>Klant</th><th>Omschrijving</th><th>Datum</th><th>Vervaldatum</th><th>Bedrag excl.</th><th>Incl. btw</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((f) => {
        const incl = Number(f.bedrag) * (1 + Number(f.btw) / 100);
        const laat = f.status === 'open' && f.vervaldatum && new Date(f.vervaldatum) < new Date(new Date().toDateString());
        return `<tr>
          <td>${escapeHtml(f.factuurnummer || '—')}</td>
          <td>${escapeHtml(f.klant || '—')}</td>
          <td>${escapeHtml(f.omschrijving || '—')}</td>
          <td>${fmtDateShortNL(f.datum)}</td>
          <td>${fmtDateShortNL(f.vervaldatum)}</td>
          <td>${eur(f.bedrag)}</td>
          <td>${eur(incl)}</td>
          <td><span class="badge-status ${f.status}">${FACTUUR_STATUS_LABELS[f.status]}</span>${laat ? ' <span class="badge-status aanpassing_gevraagd">Laat</span>' : ''}</td>
          <td>
            <button type="button" class="btn-icon fin-pdf-factuur" data-id="${f.id}" title="Download PDF">📄</button>
            <button type="button" class="btn-icon fin-email-factuur" data-id="${f.id}" title="Verstuur per e-mail">✉</button>
            <button type="button" class="btn-icon fin-edit-factuur" data-id="${f.id}">✎</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>` : '<div class="empty-note">Nog geen facturen. Klik op "+ Factuur toevoegen".</div>'}
  `;
  document.getElementById('fin-add-factuur').addEventListener('click', () => openFactuurModal(null));
  el.querySelectorAll('.fin-edit-factuur').forEach((btn) => {
    btn.addEventListener('click', () => openFactuurModal(FIN.facturen.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-pdf-factuur').forEach((btn) => {
    btn.addEventListener('click', () => handleDownloadPdf('factuur', FIN.facturen.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-email-factuur').forEach((btn) => {
    btn.addEventListener('click', () => handleEmailPdf('factuur', FIN.facturen.find((x) => x.id === btn.dataset.id)));
  });
}

function openFactuurModal(existing, prefill = null) {
  const vervalDefault = new Date();
  vervalDefault.setDate(vervalDefault.getDate() + (Number(FIN.settings.betalingstermijn_dagen) || 30));
  const f = existing || {
    klant: prefill?.klant || '',
    klant_email: prefill?.klant_email || '',
    omschrijving: prefill?.omschrijving || '',
    datum: todayISO(),
    vervaldatum: prefill ? vervalDefault.toISOString().slice(0, 10) : todayISO(),
    bedrag: prefill?.bedrag ?? 0,
    btw: FIN.settings.default_btw,
    status: 'open',
  };
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Factuur bewerken' : 'Factuur toevoegen'}</h2></div>
    <form id="fin-factuur-form">
      ${existing?.factuurnummer ? `<div class="empty-note">Factuurnummer: <strong>${escapeHtml(existing.factuurnummer)}</strong></div>` : ''}
      <div class="field"><label>Klant</label><input type="text" id="ff-klant" value="${escapeAttr(f.klant || '')}"></div>
      <div class="field"><label>E-mail klant (voor "Verstuur per e-mail")</label><input type="email" id="ff-klant-email" value="${escapeAttr(f.klant_email || '')}" placeholder="klant@bedrijf.be"></div>
      <div class="field"><label>Omschrijving</label><input type="text" id="ff-omschrijving" value="${escapeAttr(f.omschrijving || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Factuurdatum</label><input type="date" id="ff-datum" value="${f.datum || ''}"></div>
        <div class="field"><label>Vervaldatum</label><input type="date" id="ff-vervaldatum" value="${f.vervaldatum || ''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Bedrag excl. btw (€)</label><input type="number" step="0.01" id="ff-bedrag" value="${f.bedrag}"></div>
        <div class="field"><label>Btw %</label><input type="number" step="0.5" id="ff-btw" value="${f.btw}"></div>
      </div>
      <div class="field"><label>Status</label>
        <select id="ff-status">
          <option value="open" ${f.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="betaald" ${f.status === 'betaald' ? 'selected' : ''}>Betaald</option>
        </select>
      </div>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="ff-delete">Verwijderen</button>' : '<span></span>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="ff-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('ff-cancel').addEventListener('click', closeModal);
  if (existing) {
    document.getElementById('ff-delete').addEventListener('click', async () => {
      if (!confirm('Deze factuur verwijderen?')) return;
      try {
        await deleteFinFactuur(existing.id);
        FIN.facturen = FIN.facturen.filter((x) => x.id !== existing.id);
        closeModal();
        renderFinSubview();
        showToast('Factuur verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  }
  document.getElementById('fin-factuur-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      klant: document.getElementById('ff-klant').value.trim(),
      klant_email: document.getElementById('ff-klant-email').value.trim() || null,
      omschrijving: document.getElementById('ff-omschrijving').value.trim(),
      datum: document.getElementById('ff-datum').value || todayISO(),
      vervaldatum: document.getElementById('ff-vervaldatum').value || null,
      bedrag: parseFloat(document.getElementById('ff-bedrag').value) || 0,
      btw: parseFloat(document.getElementById('ff-btw').value) || 0,
      status: document.getElementById('ff-status').value,
    };
    if (!existing && prefill?.project_id) payload.project_id = prefill.project_id;
    try {
      if (existing) {
        const updated = await updateFinFactuur(existing.id, payload);
        FIN.facturen[FIN.facturen.findIndex((x) => x.id === existing.id)] = updated;
      } else {
        payload.factuurnummer = nextDocumentNumber(FIN.facturen, 'factuurnummer');
        FIN.facturen.unshift(await createFinFactuur(payload));
        if (prefill?.fromOfferteId) {
          const offerte = FIN.offertes.find((x) => x.id === prefill.fromOfferteId);
          if (offerte && offerte.status !== 'geaccepteerd') {
            const updatedOfferte = await updateFinOfferte(offerte.id, { status: 'geaccepteerd' });
            FIN.offertes[FIN.offertes.findIndex((x) => x.id === offerte.id)] = updatedOfferte;
          }
        }
      }
      closeModal();
      renderFinSubview();
      showToast(prefill?.fromOfferteId ? 'Factuur aangemaakt vanuit offerte' : 'Factuur opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
}

// ── KOSTEN ───────────────────────────────────────────────
function renderFinKostenTab(el) {
  const rows = [...FIN.kosten].sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  el.innerHTML = `
    <div class="view-header"><h2>Kosten</h2><button type="button" class="btn btn-red btn-small" id="fin-add-kost">+ Kost toevoegen</button></div>
    ${rows.length ? `<table class="log-table"><thead><tr><th>Omschrijving</th><th>Datum</th><th>Bedrag excl.</th><th>Btw</th><th>Type</th><th></th></tr></thead><tbody>
      ${rows.map((k) => `<tr>
        <td>${escapeHtml(k.omschrijving || '—')}</td>
        <td>${fmtDateShortNL(k.datum)}</td>
        <td>${eur(k.bedrag)}</td>
        <td>${k.btw}% ${k.aftrekbaar ? '<span class="hint-green">aftrekbaar</span>' : '<span class="hint-dim">niet aftrekbaar</span>'}</td>
        <td>${k.type === 'vast' ? 'Vast · ' + KOST_FREQ_LABELS[k.frequentie] : 'Eenmalig'}</td>
        <td><button type="button" class="btn-icon fin-edit-kost" data-id="${k.id}">✎</button></td>
      </tr>`).join('')}
    </tbody></table>` : '<div class="empty-note">Nog geen kosten. Klik op "+ Kost toevoegen".</div>'}
  `;
  document.getElementById('fin-add-kost').addEventListener('click', () => openKostModal(null));
  el.querySelectorAll('.fin-edit-kost').forEach((btn) => {
    btn.addEventListener('click', () => openKostModal(FIN.kosten.find((x) => x.id === btn.dataset.id)));
  });
}

function openKostModal(existing, forcedType) {
  const k = existing || { omschrijving: '', datum: todayISO(), bedrag: 0, btw: FIN.settings.default_btw, aftrekbaar: true, type: forcedType || 'eenmalig', frequentie: 'maandelijks' };
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Kost bewerken' : 'Kost toevoegen'}</h2></div>
    <form id="fin-kost-form">
      <div class="field"><label>Omschrijving</label><input type="text" id="fk-omschrijving" value="${escapeAttr(k.omschrijving || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Datum</label><input type="date" id="fk-datum" value="${k.datum || ''}"></div>
        <div class="field"><label>Bedrag excl. btw (€)</label><input type="number" step="0.01" id="fk-bedrag" value="${k.bedrag}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Btw %</label><input type="number" step="0.5" id="fk-btw" value="${k.btw}"></div>
        <div class="field"><label>Type</label>
          <select id="fk-type">
            <option value="eenmalig" ${k.type === 'eenmalig' ? 'selected' : ''}>Eenmalig</option>
            <option value="vast" ${k.type === 'vast' ? 'selected' : ''}>Vaste kost</option>
          </select>
        </div>
      </div>
      <div class="field" id="fk-freq-field" style="${k.type === 'vast' ? '' : 'display:none;'}">
        <label>Frequentie</label>
        <select id="fk-frequentie">
          <option value="maandelijks" ${k.frequentie === 'maandelijks' ? 'selected' : ''}>Maandelijks</option>
          <option value="kwartaal" ${k.frequentie === 'kwartaal' ? 'selected' : ''}>Per kwartaal</option>
          <option value="jaarlijks" ${k.frequentie === 'jaarlijks' ? 'selected' : ''}>Jaarlijks</option>
        </select>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:13px;color:var(--text-dim);">
        <input type="checkbox" id="fk-aftrekbaar" style="width:auto;" ${k.aftrekbaar ? 'checked' : ''}>
        Btw op deze kost is aftrekbaar
      </label>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="fk-delete">Verwijderen</button>' : '<span></span>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="fk-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('fk-type').addEventListener('change', (e) => {
    document.getElementById('fk-freq-field').style.display = e.target.value === 'vast' ? '' : 'none';
  });
  document.getElementById('fk-cancel').addEventListener('click', closeModal);
  if (existing) {
    document.getElementById('fk-delete').addEventListener('click', async () => {
      if (!confirm('Deze kost verwijderen?')) return;
      try {
        await deleteFinKost(existing.id);
        FIN.kosten = FIN.kosten.filter((x) => x.id !== existing.id);
        closeModal();
        renderFinSubview();
        showToast('Kost verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  }
  document.getElementById('fin-kost-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      omschrijving: document.getElementById('fk-omschrijving').value.trim(),
      datum: document.getElementById('fk-datum').value || todayISO(),
      bedrag: parseFloat(document.getElementById('fk-bedrag').value) || 0,
      btw: parseFloat(document.getElementById('fk-btw').value) || 0,
      type: document.getElementById('fk-type').value,
      frequentie: document.getElementById('fk-frequentie').value,
      aftrekbaar: document.getElementById('fk-aftrekbaar').checked,
    };
    try {
      if (existing) {
        const updated = await updateFinKost(existing.id, payload);
        FIN.kosten[FIN.kosten.findIndex((x) => x.id === existing.id)] = updated;
      } else {
        FIN.kosten.unshift(await createFinKost(payload));
      }
      closeModal();
      renderFinSubview();
      showToast('Kost opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
}

// ── PROJECTEN (financieel) ──────────────────────────────
function renderFinProjectenTab(el) {
  const rows = [...FIN.projecten].sort((a, b) => (a.naam || '').localeCompare(b.naam || ''));
  el.innerHTML = `
    <div class="view-header"><h2>Projecten</h2><button type="button" class="btn btn-red btn-small" id="fin-add-project">+ Project toevoegen</button></div>
    ${rows.length ? `<table class="log-table"><thead><tr><th>Project</th><th>Klant</th><th>Geschat bedrag</th><th>Status</th><th>Factuur</th><th></th></tr></thead><tbody>
      ${rows.map((p) => `<tr>
        <td>${escapeHtml(p.naam || '—')}</td>
        <td>${escapeHtml(p.klant || '—')}</td>
        <td>${eur(p.geschat_bedrag)}</td>
        <td><span class="badge-status ${p.status}">${FIN_PROJECT_STATUS_LABELS[p.status]}</span></td>
        <td>
          ${p.file_path
            ? `<a href="#" class="fin-view-file" data-id="${p.id}">📄 ${escapeHtml(p.file_name || 'bekijken')}</a> <button type="button" class="btn-icon fin-remove-file" data-id="${p.id}">✕</button>`
            : `<label class="fin-upload-label">⬆ Uploaden<input type="file" class="fin-upload-input" data-id="${p.id}" accept="application/pdf,image/*" style="display:none;"></label>`}
        </td>
        <td><button type="button" class="btn-icon fin-edit-project" data-id="${p.id}">✎</button></td>
      </tr>`).join('')}
    </tbody></table>` : '<div class="empty-note">Nog geen projecten. Klik op "+ Project toevoegen".</div>'}
  `;
  document.getElementById('fin-add-project').addEventListener('click', () => openFinProjectModal(null));
  el.querySelectorAll('.fin-edit-project').forEach((btn) => {
    btn.addEventListener('click', () => openFinProjectModal(FIN.projecten.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-upload-input').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const proj = FIN.projecten.find((x) => x.id === input.dataset.id);
      try {
        const path = await uploadFinFactuurFile(proj.id, file);
        const updated = await updateFinProject(proj.id, { file_path: path, file_name: file.name });
        FIN.projecten[FIN.projecten.findIndex((x) => x.id === proj.id)] = updated;
        renderFinSubview();
        showToast('Bestand geüpload');
      } catch (err) { showToast(err.message, true); }
    });
  });
  el.querySelectorAll('.fin-view-file').forEach((a) => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const proj = FIN.projecten.find((x) => x.id === a.dataset.id);
      try {
        window.open(await getFinFactuurUrl(proj.file_path), '_blank');
      } catch (err) { showToast(err.message, true); }
    });
  });
  el.querySelectorAll('.fin-remove-file').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const proj = FIN.projecten.find((x) => x.id === btn.dataset.id);
      if (!confirm('Geüploade factuur verwijderen?')) return;
      try {
        await deleteFinFactuurFile(proj.file_path);
        const updated = await updateFinProject(proj.id, { file_path: null, file_name: null });
        FIN.projecten[FIN.projecten.findIndex((x) => x.id === proj.id)] = updated;
        renderFinSubview();
      } catch (err) { showToast(err.message, true); }
    });
  });
}

function openFinProjectModal(existing) {
  const p = existing || { naam: '', klant: '', geschat_bedrag: 0, status: 'idee', notities: '' };
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Project bewerken' : 'Project toevoegen'}</h2></div>
    <form id="fin-project-form">
      <div class="field"><label>Projectnaam</label><input type="text" id="fp-naam" value="${escapeAttr(p.naam || '')}"></div>
      <div class="field"><label>Klant</label><input type="text" id="fp-klant" value="${escapeAttr(p.klant || '')}"></div>
      <div class="field"><label>Geschat te factureren bedrag excl. btw (€)</label><input type="number" step="0.01" id="fp-bedrag" value="${p.geschat_bedrag}"></div>
      <div class="field"><label>Status</label>
        <select id="fp-status">
          <option value="idee" ${p.status === 'idee' ? 'selected' : ''}>Idee</option>
          <option value="te-factureren" ${p.status === 'te-factureren' ? 'selected' : ''}>Te factureren</option>
          <option value="gefactureerd" ${p.status === 'gefactureerd' ? 'selected' : ''}>Gefactureerd</option>
          <option value="betaald" ${p.status === 'betaald' ? 'selected' : ''}>Betaald</option>
        </select>
      </div>
      <div class="field"><label>Notities</label><textarea id="fp-notities" rows="3">${escapeHtml(p.notities || '')}</textarea></div>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="fp-delete">Verwijderen</button>' : '<span></span>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="fp-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('fp-cancel').addEventListener('click', closeModal);
  if (existing) {
    document.getElementById('fp-delete').addEventListener('click', async () => {
      if (!confirm('Dit project verwijderen? Een geüploade factuur wordt ook verwijderd.')) return;
      try {
        if (existing.file_path) await deleteFinFactuurFile(existing.file_path);
        await deleteFinProject(existing.id);
        FIN.projecten = FIN.projecten.filter((x) => x.id !== existing.id);
        closeModal();
        renderFinSubview();
        showToast('Project verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  }
  document.getElementById('fin-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      naam: document.getElementById('fp-naam').value.trim(),
      klant: document.getElementById('fp-klant').value.trim(),
      geschat_bedrag: parseFloat(document.getElementById('fp-bedrag').value) || 0,
      status: document.getElementById('fp-status').value,
      notities: document.getElementById('fp-notities').value.trim(),
    };
    try {
      if (existing) {
        const updated = await updateFinProject(existing.id, payload);
        FIN.projecten[FIN.projecten.findIndex((x) => x.id === existing.id)] = updated;
      } else {
        FIN.projecten.push(await createFinProject(payload));
      }
      closeModal();
      renderFinSubview();
      showToast('Project opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
}

// ── AANKOPEN ─────────────────────────────────────────────
function renderFinAankopenTab(el) {
  const { vasteKostenMnd, reserveDoel, btwOpzij, vrijeRuimte, banksaldo } = computeVrijeRuimte();
  const vasteKosten = FIN.kosten.filter((k) => k.type === 'vast').sort((a, b) => (a.omschrijving || '').localeCompare(b.omschrijving || ''));
  const rows = [...FIN.aankopen].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'verlanglijst' ? -1 : 1;
    return (b.prijs || 0) - (a.prijs || 0);
  });

  el.innerHTML = `
    <div class="fin-vrije-ruimte-banner">
      <strong>Vrije ruimte voor aankopen: ${eur(vrijeRuimte)}</strong><br>
      Banksaldo ${eur(banksaldo)} − reserve-doel ${eur(reserveDoel)} (${FIN.settings.reserve_doel_maanden} mnd vaste kosten × ${eur(vasteKostenMnd)}) − nog te betalen btw ${eur(btwOpzij)}.
      Pas je banksaldo en reserve-doel aan bij Instellingen.
    </div>

    <div class="detail-section">
      <div class="section-header-row"><h3>Vaste kosten</h3><button type="button" class="btn btn-ghost btn-small" id="fin-add-vaste-kost">+ Vaste kost toevoegen</button></div>
      ${vasteKosten.length ? `<table class="log-table"><thead><tr><th>Omschrijving</th><th>Bedrag excl.</th><th>Frequentie</th><th>≈ per maand</th><th></th></tr></thead><tbody>
        ${vasteKosten.map((k) => {
          const mnd = k.frequentie === 'maandelijks' ? Number(k.bedrag) : k.frequentie === 'kwartaal' ? Number(k.bedrag) / 3 : Number(k.bedrag) / 12;
          return `<tr><td>${escapeHtml(k.omschrijving || '—')}</td><td>${eur(k.bedrag)}</td><td>${KOST_FREQ_LABELS[k.frequentie]}</td><td>${eur(mnd)}</td><td><button type="button" class="btn-icon fin-edit-vastekost" data-id="${k.id}">✎</button></td></tr>`;
        }).join('')}
      </tbody></table>` : '<div class="empty-note">Nog geen vaste kosten.</div>'}
    </div>

    <div class="detail-section">
      <div class="section-header-row"><h3>Verlanglijst</h3><button type="button" class="btn btn-red btn-small" id="fin-add-aankoop">+ Item toevoegen</button></div>
      ${rows.length ? `<table class="log-table"><thead><tr><th>Item</th><th>Prijs</th><th>Prioriteit</th><th>Advies</th><th>Status</th><th></th></tr></thead><tbody>
        ${rows.map((a) => {
          const adv = adviesFor(Number(a.prijs), vrijeRuimte);
          return `<tr>
            <td>${escapeHtml(a.naam || '—')}</td>
            <td>${eur(a.prijs)}</td>
            <td>${AANKOOP_PRIORITEIT_LABELS[a.prioriteit]}</td>
            <td>${a.status === 'gekocht' ? '<span class="hint-dim">—</span>' : `<span class="badge-advies ${adv.cls}">${adv.label}</span><div class="hint-dim">${escapeHtml(adv.sub)}</div>`}</td>
            <td><span class="badge-status ${a.status === 'gekocht' ? 'betaald' : 'verlanglijst'}">${a.status === 'gekocht' ? 'Gekocht' : 'Verlanglijst'}</span></td>
            <td>
              <button type="button" class="btn-icon fin-toggle-gekocht" data-id="${a.id}">${a.status === 'gekocht' ? '↺' : '✓'}</button>
              <button type="button" class="btn-icon fin-edit-aankoop" data-id="${a.id}">✎</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody></table>` : '<div class="empty-note">Nog niets op je verlanglijst.</div>'}
    </div>
  `;

  document.getElementById('fin-add-vaste-kost').addEventListener('click', () => openKostModal(null, 'vast'));
  el.querySelectorAll('.fin-edit-vastekost').forEach((btn) => {
    btn.addEventListener('click', () => openKostModal(FIN.kosten.find((x) => x.id === btn.dataset.id)));
  });
  document.getElementById('fin-add-aankoop').addEventListener('click', () => openAankoopModal(null));
  el.querySelectorAll('.fin-edit-aankoop').forEach((btn) => {
    btn.addEventListener('click', () => openAankoopModal(FIN.aankopen.find((x) => x.id === btn.dataset.id)));
  });
  el.querySelectorAll('.fin-toggle-gekocht').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = FIN.aankopen.find((x) => x.id === btn.dataset.id);
      try {
        const updated = await updateFinAankoop(item.id, { status: item.status === 'gekocht' ? 'verlanglijst' : 'gekocht' });
        FIN.aankopen[FIN.aankopen.findIndex((x) => x.id === item.id)] = updated;
        renderFinSubview();
      } catch (err) { showToast(err.message, true); }
    });
  });
}

function openAankoopModal(existing) {
  const a = existing || { naam: '', prijs: 0, prioriteit: 'gemiddeld', notities: '', status: 'verlanglijst' };
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Item bewerken' : 'Item toevoegen'}</h2></div>
    <form id="fin-aankoop-form">
      <div class="field"><label>Wat wil je kopen?</label><input type="text" id="fa-naam" value="${escapeAttr(a.naam || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Geschatte prijs (€)</label><input type="number" step="0.01" id="fa-prijs" value="${a.prijs}"></div>
        <div class="field"><label>Prioriteit</label>
          <select id="fa-prioriteit">
            <option value="laag" ${a.prioriteit === 'laag' ? 'selected' : ''}>Laag</option>
            <option value="gemiddeld" ${a.prioriteit === 'gemiddeld' ? 'selected' : ''}>Gemiddeld</option>
            <option value="hoog" ${a.prioriteit === 'hoog' ? 'selected' : ''}>Hoog</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Notities</label><textarea id="fa-notities" rows="2">${escapeHtml(a.notities || '')}</textarea></div>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="fa-delete">Verwijderen</button>' : '<span></span>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="fa-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('fa-cancel').addEventListener('click', closeModal);
  if (existing) {
    document.getElementById('fa-delete').addEventListener('click', async () => {
      if (!confirm('Dit item verwijderen?')) return;
      try {
        await deleteFinAankoop(existing.id);
        FIN.aankopen = FIN.aankopen.filter((x) => x.id !== existing.id);
        closeModal();
        renderFinSubview();
        showToast('Item verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  }
  document.getElementById('fin-aankoop-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      naam: document.getElementById('fa-naam').value.trim(),
      prijs: parseFloat(document.getElementById('fa-prijs').value) || 0,
      prioriteit: document.getElementById('fa-prioriteit').value,
      notities: document.getElementById('fa-notities').value.trim(),
    };
    try {
      if (existing) {
        const updated = await updateFinAankoop(existing.id, payload);
        FIN.aankopen[FIN.aankopen.findIndex((x) => x.id === existing.id)] = updated;
      } else {
        FIN.aankopen.push(await createFinAankoop({ ...payload, status: 'verlanglijst' }));
      }
      closeModal();
      renderFinSubview();
      showToast('Item opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
}

// ── INSTELLINGEN ─────────────────────────────────────────
function renderFinInstellingenTab(el) {
  const s = FIN.settings;
  el.innerHTML = `
    <div class="detail-section" style="border:none; padding-top:0;">
      <div class="field"><label>Standaard btw %</label><input type="number" step="0.5" id="fs-defaultbtw" value="${s.default_btw}"></div>
      <div class="field"><label>BTW-periode</label>
        <select id="fs-period">
          <option value="maand" ${s.period === 'maand' ? 'selected' : ''}>Per maand</option>
          <option value="kwartaal" ${s.period === 'kwartaal' ? 'selected' : ''}>Per kwartaal</option>
        </select>
      </div>
      <div class="field"><label>Banksaldo (€)</label><input type="number" step="0.01" id="fs-banksaldo" value="${s.banksaldo}"></div>
      <div class="field"><label>Reserve-doel (maanden vaste kosten)</label><input type="number" step="0.5" id="fs-reservedoel" value="${s.reserve_doel_maanden}"></div>
      <div class="field"><label>Omzetdoel per maand (€)</label><input type="number" step="1" id="fs-omzetdoel" value="${s.omzet_doel_maand ?? 0}"></div>
      <button type="button" class="btn btn-red btn-small" id="fs-save">Opslaan</button>
    </div>
    <div class="detail-section">
      <h3>Bedrijfsgegevens (voor offerte/factuur-PDF's)</h3>
      <div class="field"><label>Bedrijfsnaam</label><input type="text" id="fs-bedrijfsnaam" value="${escapeAttr(s.bedrijfsnaam ?? '')}" placeholder="SoenensMedia"></div>
      <div class="field"><label>Adres</label><input type="text" id="fs-bedrijfsadres" value="${escapeAttr(s.bedrijfsadres ?? '')}" placeholder="Straat 1, 8800 Roeselare"></div>
      <div class="field-row">
        <div class="field"><label>Ondernemingsnummer</label><input type="text" id="fs-ondernemingsnummer" value="${escapeAttr(s.ondernemingsnummer ?? '')}" placeholder="BE0123.456.789"></div>
        <div class="field"><label>IBAN</label><input type="text" id="fs-iban" value="${escapeAttr(s.iban ?? '')}" placeholder="BE00 0000 0000 0000"></div>
      </div>
      <div class="field"><label>Betalingstermijn (dagen)</label><input type="number" step="1" id="fs-betalingstermijn" value="${s.betalingstermijn_dagen ?? 30}"></div>
      <div class="field-row">
        <div class="field"><label>Contact e-mail (klanten zien dit)</label><input type="email" id="fs-contact-email" value="${escapeAttr(s.contact_email ?? '')}" placeholder="info@soenensmedia.be"></div>
        <div class="field"><label>Contact telefoon (klanten zien dit)</label><input type="text" id="fs-contact-telefoon" value="${escapeAttr(s.contact_telefoon ?? '')}" placeholder="0470 25 67 85"></div>
      </div>
      <button type="button" class="btn btn-red btn-small" id="fs-save-bedrijf">Opslaan</button>
    </div>
    <div class="detail-section">
      <h3>Back-up</h3>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-ghost btn-small" id="fs-export">⬇ Exporteer back-up</button>
        <label class="btn btn-ghost btn-small" style="cursor:pointer;">⬆ Importeer back-up (van oude tool)<input type="file" id="fs-import-input" accept=".json" style="display:none;"></label>
      </div>
      <div class="empty-note">Import leest het JSON-formaat dat de oude "Financieel-Dashboard.html" exporteert.</div>
    </div>
  `;

  document.getElementById('fs-save').addEventListener('click', async () => {
    const payload = {
      default_btw: parseFloat(document.getElementById('fs-defaultbtw').value) || 0,
      period: document.getElementById('fs-period').value,
      banksaldo: parseFloat(document.getElementById('fs-banksaldo').value) || 0,
      reserve_doel_maanden: parseFloat(document.getElementById('fs-reservedoel').value) || 0,
      omzet_doel_maand: parseFloat(document.getElementById('fs-omzetdoel').value) || 0,
    };
    try {
      FIN.settings = await saveFinSettings(payload);
      showToast('Instellingen opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById('fs-save-bedrijf').addEventListener('click', async () => {
    const payload = {
      ...FIN.settings,
      bedrijfsnaam: document.getElementById('fs-bedrijfsnaam').value.trim() || null,
      bedrijfsadres: document.getElementById('fs-bedrijfsadres').value.trim() || null,
      ondernemingsnummer: document.getElementById('fs-ondernemingsnummer').value.trim() || null,
      iban: document.getElementById('fs-iban').value.trim() || null,
      betalingstermijn_dagen: parseInt(document.getElementById('fs-betalingstermijn').value, 10) || 30,
      contact_email: document.getElementById('fs-contact-email').value.trim() || null,
      contact_telefoon: document.getElementById('fs-contact-telefoon').value.trim() || null,
    };
    try {
      FIN.settings = await saveFinSettings(payload);
      showToast('Bedrijfsgegevens opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById('fs-export').addEventListener('click', () => {
    const backup = { settings: FIN.settings, facturen: FIN.facturen, kosten: FIN.kosten, projecten: FIN.projecten, aankopen: FIN.aankopen };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financieel-portaal-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  document.getElementById('fs-import-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        showToast('Kon dit bestand niet lezen. Is het een geldige back-up (.json)?', true);
        return;
      }
      if (!confirm('Dit voegt de facturen/kosten/projecten/aankopen uit dit bestand toe aan je huidige data. Doorgaan?')) return;
      try {
        await importOldBackup(parsed);
        showToast('Back-up geïmporteerd');
        renderFinance();
      } catch (err) {
        showToast('Import mislukt: ' + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

async function importOldBackup(parsed) {
  const jobs = [];
  (parsed.facturen || []).forEach((f) => {
    jobs.push(createFinFactuur({ klant: f.klant, omschrijving: f.omschrijving, datum: f.datum, vervaldatum: f.vervaldatum, bedrag: f.bedrag, btw: f.btw, status: f.status }));
  });
  (parsed.kosten || []).forEach((k) => {
    jobs.push(createFinKost({ omschrijving: k.omschrijving, datum: k.datum, bedrag: k.bedrag, btw: k.btw, aftrekbaar: k.aftrekbaar, type: k.type, frequentie: k.frequentie || 'maandelijks' }));
  });
  (parsed.projecten || []).forEach((p) => {
    jobs.push(createFinProject({ naam: p.naam, klant: p.klant, geschat_bedrag: p.geschatBedrag ?? p.geschat_bedrag, status: p.status, notities: p.notities }));
  });
  (parsed.aankopen || []).forEach((a) => {
    jobs.push(createFinAankoop({ naam: a.naam, prijs: a.prijs, prioriteit: a.prioriteit, notities: a.notities, status: a.status }));
  });
  if (parsed.settings) {
    jobs.push(saveFinSettings({
      default_btw: parsed.settings.defaultBtw ?? parsed.settings.default_btw,
      period: parsed.settings.period,
      banksaldo: parsed.settings.banksaldo,
      reserve_doel_maanden: parsed.settings.reserveDoelMaanden ?? parsed.settings.reserve_doel_maanden,
    }));
  }
  await Promise.all(jobs);
}
