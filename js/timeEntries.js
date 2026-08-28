import { state, fmtDate, startOfWeek, projectById } from './state.js';
import { escapeHtml } from './util.js';
import { createTimeEntry, deleteTimeEntry } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

export function renderUren() {
  renderTimerPanel();
  renderStats();
  renderTable();
}

// ── Live timer: start/stop per opdracht, overleeft een herlaad van de
// pagina via localStorage (enkel 1 timer tegelijk, zoals bij echt werk).
const TIMER_KEY = 'sm_running_timer';
let timerInterval = null;

function getRunningTimer() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setRunningTimer(timer) {
  try {
    if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    else localStorage.removeItem(TIMER_KEY);
  } catch { /* privémodus o.i.d. */ }
}

function fmtElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function renderTimerPanel() {
  const panel = document.getElementById('timer-panel');
  if (!panel) return;
  clearInterval(timerInterval);

  const running = getRunningTimer();

  if (!running) {
    const projectOptions = state.projects
      .map((p) => `<option value="${p.id}">${escapeHtml(p.client_name)} — ${escapeHtml(p.title)}</option>`)
      .join('');
    panel.innerHTML = `
      <div class="timer-panel">
        <select id="timer-project"><option value="">— Algemeen / business —</option>${projectOptions}</select>
        <button type="button" class="btn btn-red btn-small" id="timer-start-btn">▶ Start</button>
      </div>
    `;
    document.getElementById('timer-start-btn').addEventListener('click', () => {
      const projectId = document.getElementById('timer-project').value || null;
      setRunningTimer({ projectId, startedAt: Date.now() });
      renderTimerPanel();
    });
    return;
  }

  const label = running.projectId ? (projectById(running.projectId)?.title || '—') : 'Algemeen / business';
  panel.innerHTML = `
    <div class="timer-panel timer-running">
      <span class="timer-dot"></span>
      <span class="timer-label">${escapeHtml(label)}</span>
      <span class="timer-clock" id="timer-clock">${fmtElapsed(Date.now() - running.startedAt)}</span>
      <button type="button" class="btn btn-ghost btn-small" id="timer-stop-btn">■ Stop</button>
    </div>
  `;
  timerInterval = setInterval(() => {
    const clock = document.getElementById('timer-clock');
    if (clock) clock.textContent = fmtElapsed(Date.now() - running.startedAt);
  }, 1000);

  document.getElementById('timer-stop-btn').addEventListener('click', () => {
    clearInterval(timerInterval);
    setRunningTimer(null);
    const hours = Math.max(0.01, Number(((Date.now() - running.startedAt) / 3600000).toFixed(2)));
    openNewTimeEntryModal({ projectId: running.projectId, hours });
  });
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

export function openNewTimeEntryModal(prefill = {}) {
  const projectOptions = state.projects
    .map((p) => `<option value="${p.id}" ${prefill.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.client_name)} — ${escapeHtml(p.title)}</option>`)
    .join('');

  openModal(`
    <div class="modal-header"><h2>Uren loggen</h2></div>
    <form id="time-form">
      <div class="field"><label>Project (optioneel)</label>
        <select id="tf-project"><option value="" ${!prefill.projectId ? 'selected' : ''}>— Algemeen / business —</option>${projectOptions}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Datum</label><input type="date" id="tf-date" value="${new Date().toISOString().slice(0, 10)}" required></div>
        <div class="field"><label>Uren</label><input type="number" id="tf-hours" step="0.01" min="0.01" value="${prefill.hours ?? ''}" required></div>
      </div>
      <div class="field"><label>Omschrijving</label><input type="text" id="tf-desc"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="tf-cancel">Annuleren</button>
        <button type="submit" class="btn btn-red">Opslaan</button>
      </div>
    </form>
  `);

  if (prefill.hours) document.getElementById('tf-desc').focus();
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
