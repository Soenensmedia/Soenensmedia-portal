import { state, fmtDate, startOfWeek, projectById } from './state.js';
import { escapeHtml } from './util.js';
import { createTimeEntry, deleteTimeEntry } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

export function renderUren() {
  renderStats();
  renderTable();
}

function sumHours(entries) {
  const total = entries.reduce((sum, t) => sum + Number(t.hours), 0);
  return Number(total.toFixed(2));
}

function renderStats() {
  const weekStart = startOfWeek(new Date());
  const weekEntries = state.timeEntries.filter((t) => new Date(t.entry_date) >= weekStart);
  const weekTotal = sumHours(weekEntries);
  const allTotal = sumHours(state.timeEntries);

  const perProject = {};
  state.timeEntries.forEach((t) => {
    const key = t.project_id || '__general';
    perProject[key] = (perProject[key] || 0) + Number(t.hours);
  });
  const topEntries = Object.entries(perProject).sort((a, b) => b[1] - a[1]).slice(0, 3);

  document.getElementById('uren-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Deze week</div><div class="stat-value">${weekTotal}u</div></div>
    <div class="stat-card"><div class="stat-label">Totaal gelogd</div><div class="stat-value">${allTotal}u</div></div>
    ${topEntries.map(([key, hours]) => {
      const label = key === '__general' ? 'Algemeen' : (projectById(key)?.title || 'Onbekend');
      return `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${Number(hours.toFixed(2))}u</div></div>`;
    }).join('')}
  `;
}

function renderTable() {
  const tbody = document.getElementById('uren-table-body');
  const sorted = [...state.timeEntries].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));

  tbody.innerHTML = sorted.length
    ? sorted.map((t) => `
      <tr>
        <td>${fmtDate(new Date(t.entry_date))}</td>
        <td>${t.project_id ? escapeHtml(projectById(t.project_id)?.title || '—') : 'Algemeen'}</td>
        <td>${t.hours}u</td>
        <td>${escapeHtml(t.description ?? '')}</td>
        <td><button class="btn-icon" data-id="${t.id}">✕</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="empty-note">Nog geen uren gelogd.</td></tr>';

  tbody.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Deze registratie verwijderen?')) return;
      try {
        await deleteTimeEntry(btn.dataset.id);
        state.timeEntries = state.timeEntries.filter((x) => x.id !== btn.dataset.id);
        renderUren();
        showToast('Registratie verwijderd');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

export function openNewTimeEntryModal() {
  const projectOptions = state.projects
    .map((p) => `<option value="${p.id}">${escapeHtml(p.client_name)} — ${escapeHtml(p.title)}</option>`)
    .join('');

  openModal(`
    <div class="modal-header"><h2>Uren loggen</h2></div>
    <form id="time-form">
      <div class="field"><label>Project (optioneel)</label>
        <select id="tf-project"><option value="">— Algemeen / business —</option>${projectOptions}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Datum</label><input type="date" id="tf-date" value="${new Date().toISOString().slice(0, 10)}" required></div>
        <div class="field"><label>Uren</label><input type="number" id="tf-hours" step="0.25" min="0.25" required></div>
      </div>
      <div class="field"><label>Omschrijving</label><input type="text" id="tf-desc"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="tf-cancel">Annuleren</button>
        <button type="submit" class="btn btn-red">Opslaan</button>
      </div>
    </form>
  `);

  document.getElementById('tf-cancel').addEventListener('click', closeModal);
  document.getElementById('time-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      project_id: document.getElementById('tf-project').value || null,
      entry_date: document.getElementById('tf-date').value,
      hours: Number(document.getElementById('tf-hours').value),
      description: document.getElementById('tf-desc').value.trim() || null,
    };
    try {
      const created = await createTimeEntry(payload);
      state.timeEntries.unshift(created);
      closeModal();
      renderUren();
      showToast('Uren gelogd');
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
