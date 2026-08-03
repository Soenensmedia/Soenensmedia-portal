import { state, STATUS_LABELS, fmtDate } from './state.js';
import { escapeHtml } from './util.js';
import { openProjectDetail } from './projectDetail.js';

const DONE_STATUSES = ['afgerond', 'verzonden'];

export function renderDeadlines() {
  const container = document.getElementById('deadlines-container');

  const withDeadline = state.projects
    .filter((p) => p.deadline && !DONE_STATUSES.includes(p.status))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const withoutDeadline = state.projects.filter((p) => !p.deadline && !DONE_STATUSES.includes(p.status));

  if (!withDeadline.length && !withoutDeadline.length) {
    container.innerHTML = '<div class="empty-note">Geen openstaande opdrachten.</div>';
    return;
  }

  container.innerHTML = `
    ${withDeadline.length ? `<div class="deadline-list">${withDeadline.map(rowHtml).join('')}</div>` : '<div class="empty-note">Geen openstaande opdrachten met een deadline.</div>'}
    ${withoutDeadline.length ? `
      <div class="deadline-section-label">Zonder deadline (${withoutDeadline.length})</div>
      <div class="deadline-list">${withoutDeadline.map(rowHtml).join('')}</div>
    ` : ''}
  `;

  container.querySelectorAll('.deadline-row').forEach((row) => {
    row.addEventListener('click', () => openProjectDetail(row.dataset.id));
  });
}

function urgency(deadline) {
  if (!deadline) return { label: '', cls: '' };
  const today = new Date(new Date().toDateString());
  const d = new Date(deadline);
  const days = Math.round((d - today) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d verlopen`, cls: 'deadline-overdue' };
  if (days === 0) return { label: 'Vandaag', cls: 'deadline-today' };
  if (days <= 3) return { label: `Over ${days}d`, cls: 'deadline-soon' };
  return { label: `Over ${days}d`, cls: '' };
}

function rowHtml(p) {
  const { label, cls } = urgency(p.deadline);
  return `
    <div class="deadline-row ${cls}" data-id="${p.id}">
      <div class="deadline-row-main">
        <div class="deadline-row-title">${escapeHtml(p.title)}</div>
        <div class="deadline-row-client">${escapeHtml(p.client_name)} — ${escapeHtml(STATUS_LABELS[p.status] || p.status)}</div>
      </div>
      <div class="deadline-row-date">
        ${p.deadline ? `<span class="deadline-badge ${cls}">${label}</span><span class="deadline-date-text">${fmtDate(new Date(p.deadline))}</span>` : '<span class="deadline-date-text">—</span>'}
      </div>
    </div>`;
}
