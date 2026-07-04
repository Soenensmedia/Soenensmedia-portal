import { state, EVENT_TYPE_LABELS, fmtTime, fmtDateShort, startOfWeek, toDateInputValue, toTimeInputValue } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { createEvent, updateEvent, deleteEvent } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 48;

const TYPE_COLOR_VAR = {
  shoot: '--c-shoot',
  edit: '--c-edit',
  business: '--c-business',
  learning: '--c-learning',
  meeting: '--c-meeting',
  other: '--c-other',
};

export function renderAgenda() {
  renderWeekLabel();
  renderLegend();
  renderWeekGrid();
}

function renderWeekLabel() {
  const start = state.weekStart;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  document.getElementById('week-label').textContent = `${fmtDateShort(start)} — ${fmtDateShort(end)}`;
}

function renderLegend() {
  document.getElementById('legend').innerHTML = Object.entries(EVENT_TYPE_LABELS)
    .map(([type, label]) => `<div class="legend-item"><span class="legend-dot" style="background:var(${TYPE_COLOR_VAR[type]})"></span>${label}</div>`)
    .join('');
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(state.weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hourLabelsHtml = [...Array(END_HOUR - START_HOUR)]
    .map((_, i) => `<div class="hour-label">${START_HOUR + i}:00</div>`)
    .join('');

  const dayColsHtml = days.map((day) => {
    const dayEvents = state.events.filter((e) => sameDay(new Date(e.start_time), day));
    const linesHtml = [...Array(END_HOUR - START_HOUR)]
      .map((_, i) => `<div class="hour-line" data-day="${day.toISOString()}" data-hour="${START_HOUR + i}"></div>`)
      .join('');
    const eventsHtml = dayEvents.map(eventBlockHtml).join('');
    return `<div class="day-col">${linesHtml}${eventsHtml}</div>`;
  }).join('');

  const headerHtml = `
    <div class="week-grid-header">
      <div class="hour-col-spacer"></div>
      ${days.map((d) => `<div class="day-label ${sameDay(d, today) ? 'today' : ''}">${fmtDateShort(d)}</div>`).join('')}
    </div>`;

  grid.innerHTML = `${headerHtml}<div class="hour-labels">${hourLabelsHtml}</div>${dayColsHtml}`;

  grid.querySelectorAll('.hour-line').forEach((el) => {
    el.addEventListener('click', () => openEventModal(null, new Date(el.dataset.day), Number(el.dataset.hour)));
  });
  grid.querySelectorAll('.event-block').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openEventModal(el.dataset.id);
    });
  });
}

function eventBlockHtml(e) {
  const start = new Date(e.start_time);
  const end = new Date(e.end_time);
  const top = (start.getHours() + start.getMinutes() / 60 - START_HOUR) * HOUR_PX;
  const height = Math.max(((end - start) / 3600000) * HOUR_PX, 20);
  const colorVar = TYPE_COLOR_VAR[e.event_type] || '--c-other';
  return `
    <div class="event-block" data-id="${e.id}" style="top:${top}px;height:${height}px;background:var(${colorVar})">
      <div class="ev-title">${escapeHtml(e.title)}</div>
      <div class="ev-time">${fmtTime(start)}–${fmtTime(end)}</div>
    </div>`;
}

export function shiftWeek(delta) {
  const d = new Date(state.weekStart);
  d.setDate(d.getDate() + delta * 7);
  state.weekStart = d;
  renderAgenda();
}

export function resetWeek() {
  state.weekStart = startOfWeek(new Date());
  renderAgenda();
}

function openEventModal(id, prefillDay, prefillHour) {
  const existing = id ? state.events.find((e) => e.id === id) : null;
  const projectOptions = state.projects
    .map((p) => `<option value="${p.id}" ${existing?.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.client_name)} — ${escapeHtml(p.title)}</option>`)
    .join('');

  let defaultDate, defaultStart, defaultEnd;
  if (existing) {
    defaultDate = toDateInputValue(new Date(existing.start_time));
    defaultStart = toTimeInputValue(new Date(existing.start_time));
    defaultEnd = toTimeInputValue(new Date(existing.end_time));
  } else {
    defaultDate = toDateInputValue(prefillDay);
    defaultStart = `${String(prefillHour).padStart(2, '0')}:00`;
    defaultEnd = `${String(prefillHour + 1).padStart(2, '0')}:00`;
  }

  openModal(`
    <div class="modal-header"><h2>${existing ? 'Agenda-item bewerken' : 'Nieuw agenda-item'}</h2></div>
    <form id="event-form">
      <div class="field"><label>Titel</label><input type="text" id="ef-title" value="${existing ? escapeAttr(existing.title) : ''}" required></div>
      <div class="field"><label>Type</label>
        <select id="ef-type">${Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${existing?.event_type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Datum</label><input type="date" id="ef-date" value="${defaultDate}" required></div>
      <div class="field-row">
        <div class="field"><label>Start</label><input type="time" id="ef-start" value="${defaultStart}" required></div>
        <div class="field"><label>Einde</label><input type="time" id="ef-end" value="${defaultEnd}" required></div>
      </div>
      <div class="field"><label>Project (optioneel)</label>
        <select id="ef-project"><option value="">— Geen —</option>${projectOptions}</select>
      </div>
      <div class="field"><label>Notities</label><textarea id="ef-notes" rows="2">${existing ? escapeHtml(existing.notes ?? '') : ''}</textarea></div>
      <div class="modal-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="ef-delete">Verwijderen</button>' : '<span></span>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="ef-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById('ef-cancel').addEventListener('click', closeModal);

  if (existing) {
    document.getElementById('ef-delete').addEventListener('click', async () => {
      if (!confirm('Agenda-item verwijderen?')) return;
      try {
        await deleteEvent(existing.id);
        state.events = state.events.filter((x) => x.id !== existing.id);
        closeModal();
        renderAgenda();
        showToast('Agenda-item verwijderd');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('ef-date').value;
    const start = document.getElementById('ef-start').value;
    const end = document.getElementById('ef-end').value;
    const payload = {
      title: document.getElementById('ef-title').value.trim(),
      event_type: document.getElementById('ef-type').value,
      start_time: new Date(`${date}T${start}`).toISOString(),
      end_time: new Date(`${date}T${end}`).toISOString(),
      project_id: document.getElementById('ef-project').value || null,
      notes: document.getElementById('ef-notes').value.trim() || null,
    };
    if (new Date(payload.end_time) <= new Date(payload.start_time)) {
      showToast('Einde moet na start liggen', true);
      return;
    }
    try {
      if (existing) {
        const updated = await updateEvent(existing.id, payload);
        const idx = state.events.findIndex((x) => x.id === existing.id);
        state.events[idx] = updated;
        showToast('Agenda-item bijgewerkt');
      } else {
        const created = await createEvent(payload);
        state.events.push(created);
        showToast('Agenda-item toegevoegd');
      }
      closeModal();
      renderAgenda();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
