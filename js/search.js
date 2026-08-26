import { state } from './state.js';
import { escapeHtml } from './util.js';
import { openModal, closeModal } from './modal.js';
import { openProjectDetail } from './projectDetail.js';
import { openClientForm } from './clients.js';
import { fetchFinFacturen, fetchFinOffertes } from './data.js';
import { openFinanceRecordFromSearch } from './finance.js';

const MAX_RESULTS_PER_GROUP = 8;

let facturenCache = [];
let offertesCache = [];

export function openSearchModal() {
  openModal(`
    <div class="modal-header"><h2>Zoeken</h2></div>
    <input type="text" id="search-input" placeholder="Klant, opdracht, factuur, offerte..." autocomplete="off">
    <div id="search-results" class="search-results"></div>
  `);
  const input = document.getElementById('search-input');
  input.focus();
  input.addEventListener('input', () => renderSearchResults(input.value.trim()));
  renderSearchResults('');

  // Facturen/offertes worden enkel geladen bij het openen van de Financiën-tab
  // zelf — hier apart en stil ophalen zodat zoeken ze ook zonder dat bezoek vindt.
  Promise.all([fetchFinFacturen().catch(() => []), fetchFinOffertes().catch(() => [])])
    .then(([facturen, offertes]) => {
      facturenCache = facturen;
      offertesCache = offertes;
      if (input.value.trim()) renderSearchResults(input.value.trim());
    });
}

function renderSearchResults(query) {
  const results = document.getElementById('search-results');
  if (!query) {
    results.innerHTML = '<div class="empty-note">Typ om te zoeken doorheen klanten, opdrachten, facturen en offertes.</div>';
    return;
  }

  const q = query.toLowerCase();
  const projectMatches = state.projects.filter((p) =>
    p.title.toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q));
  const clientMatches = (state.clients || []).filter((c) =>
    c.naam.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
  const factuurMatches = facturenCache.filter((f) =>
    (f.klant || '').toLowerCase().includes(q) || (f.omschrijving || '').toLowerCase().includes(q) || (f.factuurnummer || '').toLowerCase().includes(q));
  const offerteMatches = offertesCache.filter((o) =>
    (o.klant || '').toLowerCase().includes(q) || (o.omschrijving || '').toLowerCase().includes(q) || (o.offertenummer || '').toLowerCase().includes(q));

  if (!projectMatches.length && !clientMatches.length && !factuurMatches.length && !offerteMatches.length) {
    results.innerHTML = '<div class="empty-note">Niets gevonden.</div>';
    return;
  }

  results.innerHTML = `
    ${projectMatches.length ? `
      <div class="search-group-label">Opdrachten</div>
      ${projectMatches.slice(0, MAX_RESULTS_PER_GROUP).map((p) => `
        <div class="search-result-row" data-type="project" data-id="${p.id}">
          <span class="search-result-title">${escapeHtml(p.title)}</span>
          <span class="search-result-sub">${escapeHtml(p.client_name)}</span>
        </div>`).join('')}` : ''}
    ${clientMatches.length ? `
      <div class="search-group-label">Klanten</div>
      ${clientMatches.slice(0, MAX_RESULTS_PER_GROUP).map((c) => `
        <div class="search-result-row" data-type="client" data-id="${c.id}">
          <span class="search-result-title">${escapeHtml(c.naam)}</span>
          <span class="search-result-sub">${escapeHtml(c.email || '')}</span>
        </div>`).join('')}` : ''}
    ${factuurMatches.length ? `
      <div class="search-group-label">Facturen</div>
      ${factuurMatches.slice(0, MAX_RESULTS_PER_GROUP).map((f) => `
        <div class="search-result-row" data-type="facturen" data-id="${f.id}">
          <span class="search-result-title">${escapeHtml(f.omschrijving || f.factuurnummer || 'Factuur')}</span>
          <span class="search-result-sub">${escapeHtml(f.klant || '')}</span>
        </div>`).join('')}` : ''}
    ${offerteMatches.length ? `
      <div class="search-group-label">Offertes</div>
      ${offerteMatches.slice(0, MAX_RESULTS_PER_GROUP).map((o) => `
        <div class="search-result-row" data-type="offertes" data-id="${o.id}">
          <span class="search-result-title">${escapeHtml(o.omschrijving || o.offertenummer || 'Offerte')}</span>
          <span class="search-result-sub">${escapeHtml(o.klant || '')}</span>
        </div>`).join('')}` : ''}
  `;

  results.querySelectorAll('.search-result-row').forEach((row) => {
    row.addEventListener('click', () => {
      closeModal();
      if (row.dataset.type === 'client') {
        const client = state.clients.find((c) => c.id === row.dataset.id);
        if (client) openClientForm(client);
      } else if (row.dataset.type === 'facturen' || row.dataset.type === 'offertes') {
        document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
        document.getElementById('view-finance').classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === 'finance'));
        openFinanceRecordFromSearch(row.dataset.type, row.dataset.id);
      } else {
        openProjectDetail(row.dataset.id);
      }
    });
  });
}
