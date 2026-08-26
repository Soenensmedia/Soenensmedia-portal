import { state } from './state.js';
import { escapeHtml } from './util.js';
import { openModal, closeModal } from './modal.js';
import { openProjectDetail } from './projectDetail.js';
import { openClientForm } from './clients.js';

const MAX_RESULTS_PER_GROUP = 8;

export function openSearchModal() {
  openModal(`
    <div class="modal-header"><h2>Zoeken</h2></div>
    <input type="text" id="search-input" placeholder="Klant of opdracht..." autocomplete="off">
    <div id="search-results" class="search-results"></div>
  `);
  const input = document.getElementById('search-input');
  input.focus();
  input.addEventListener('input', () => renderSearchResults(input.value.trim()));
  renderSearchResults('');
}

function renderSearchResults(query) {
  const results = document.getElementById('search-results');
  if (!query) {
    results.innerHTML = '<div class="empty-note">Typ om te zoeken doorheen klanten en opdrachten.</div>';
    return;
  }

  const q = query.toLowerCase();
  const projectMatches = state.projects.filter((p) =>
    p.title.toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q));
  const clientMatches = (state.clients || []).filter((c) =>
    c.naam.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));

  if (!projectMatches.length && !clientMatches.length) {
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
  `;

  results.querySelectorAll('.search-result-row').forEach((row) => {
    row.addEventListener('click', () => {
      closeModal();
      if (row.dataset.type === 'client') {
        const client = state.clients.find((c) => c.id === row.dataset.id);
        if (client) openClientForm(client);
      } else {
        openProjectDetail(row.dataset.id);
      }
    });
  });
}
