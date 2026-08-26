import { state, STATUS_ORDER, STATUS_LABELS, fmtDate, fmtTime } from './state.js';
import { escapeHtml } from './util.js';
import { createProject, updateProject, notifyStatusChange, getPortalPhotoUrl } from './data.js';
import { openModal, closeModal } from './modal.js';
import { openProjectDetail } from './projectDetail.js';
import { openClientForm } from './clients.js';
import { openEquipmentForm } from './equipment.js';
import { showToast } from './toast.js';
import { hasUnseenClientActivity, isConceptApprovalUnseen, markConceptSeen } from './notifications.js';
import { TYPE_COLOR_VAR } from './agenda.js';

const RETAINER_RENEWAL_WARNING_DAYS = 30;
const ONDERHOUD_WARNING_DAYS = 30;
const DEFAULT_AFGEROND_LIMIT = 5;
let showAllAfgerond = false;

function todayHtml() {
  const now = new Date();
  const todayStr = now.toDateString();

  const events = state.events
    .filter((e) => new Date(e.start_time).toDateString() === todayStr)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const deadlineItems = state.projects
    .filter((p) => p.deadline && p.status !== 'afgerond' && p.status !== 'verzonden' && new Date(p.deadline) <= now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  if (!events.length && !deadlineItems.length) return '';

  return `
    <div class="today-panel">
      <div class="today-title">Vandaag</div>
      ${events.map((e) => `
        <div class="today-row">
          <span class="today-dot" style="background:var(${TYPE_COLOR_VAR[e.event_type] || '--c-other'})"></span>
          <span class="today-time">${fmtTime(new Date(e.start_time))}</span>
          <span class="today-label">${escapeHtml(e.title)}</span>
        </div>`).join('')}
      ${deadlineItems.map((p) => {
        const overdue = new Date(p.deadline) < new Date(now.toDateString());
        return `
        <div class="today-row today-row-deadline" data-id="${p.id}">
          <span class="today-dot today-dot-deadline"></span>
          <span class="today-label">${escapeHtml(p.title)} <span class="today-sub">— ${escapeHtml(p.client_name)}</span></span>
          <span class="today-badge ${overdue ? 'today-badge-overdue' : ''}">${overdue ? 'Deadline verlopen' : 'Deadline vandaag'}</span>
        </div>`;
      }).join('')}
    </div>`;
}

function attentionItems() {
  const items = [];
  state.projects.forEach((p) => {
    if (p.status === 'afgerond') return;

    if (p.client_user_id) {
      const thread = state.allFeedback
        .filter((f) => f.project_id === p.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const last = thread[thread.length - 1];
      if (last && last.author_user_id === p.client_user_id) {
        items.push({ type: 'project', id: p.id, title: p.title, sub: p.client_name, reason: 'Wacht op jouw antwoord' });
      }
    }

    if ((p.agreement_content || p.agreement_bestand_path) && !p.agreement_signed_at) {
      items.push({ type: 'project', id: p.id, title: p.title, sub: p.client_name, reason: 'Contract nog niet ondertekend door klant' });
    }
  });

  const now = new Date();
  (state.clients || []).forEach((c) => {
    if (!c.is_retainer || !c.retainer_verlengdatum) return;
    const renewDate = new Date(c.retainer_verlengdatum);
    const daysLeft = Math.ceil((renewDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > RETAINER_RENEWAL_WARNING_DAYS) return;
    const reason = daysLeft < 0
      ? `Retainer verlopen op ${fmtDate(renewDate)}`
      : daysLeft === 0
        ? 'Retainer verlengt vandaag'
        : `Retainer verlengt over ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}`;
    items.push({ type: 'client', id: c.id, title: c.naam, sub: 'Retainer', reason });
  });

  (state.allConcepts || []).forEach((c) => {
    if (!isConceptApprovalUnseen(c)) return;
    const p = state.projects.find((x) => x.id === c.project_id);
    if (!p) return;
    items.push({ type: 'concept', id: c.id, projectId: p.id, title: p.title, sub: p.client_name, reason: `"${c.title}" goedgekeurd door klant` });
  });

  (state.equipment || []).forEach((eq) => {
    if (!eq.onderhoud_datum) return;
    const due = new Date(eq.onderhoud_datum);
    const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > ONDERHOUD_WARNING_DAYS) return;
    const reason = daysLeft < 0
      ? `Onderhoud verlopen op ${fmtDate(due)}`
      : daysLeft === 0
        ? 'Onderhoud vandaag gepland'
        : `Onderhoud over ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}`;
    items.push({ type: 'equipment', id: eq.id, title: eq.naam, sub: 'Onderhoud', reason });
  });

  return items;
}

function attentionHtml() {
  const items = attentionItems();
  if (!items.length) return '';
  return `
    <div class="attention-panel">
      <div class="attention-title">Aandacht nodig (${items.length})</div>
      ${items.map((it) => `
        <div class="attention-row" data-type="${it.type}" data-id="${it.id}" ${it.projectId ? `data-project-id="${it.projectId}"` : ''}>
          <span class="attention-project">${escapeHtml(it.title)} <span class="attention-client">— ${escapeHtml(it.sub)}</span></span>
          <span class="attention-reason">${escapeHtml(it.reason)}</span>
        </div>`).join('')}
    </div>`;
}

export function renderDashboard() {
  const todayContainer = document.getElementById('today-container');
  if (todayContainer) {
    todayContainer.innerHTML = todayHtml();
    todayContainer.querySelectorAll('.today-row-deadline').forEach((el) => {
      el.addEventListener('click', () => openProjectDetail(el.dataset.id));
    });
  }

  const attentionContainer = document.getElementById('attention-container');
  if (attentionContainer) {
    attentionContainer.innerHTML = attentionHtml();
    attentionContainer.querySelectorAll('.attention-row').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.dataset.type === 'client') {
          const client = state.clients.find((c) => c.id === el.dataset.id);
          if (client) openClientForm(client);
        } else if (el.dataset.type === 'concept') {
          markConceptSeen(el.dataset.id);
          openProjectDetail(el.dataset.projectId);
          renderDashboard();
        } else if (el.dataset.type === 'equipment') {
          const eq = state.equipment.find((x) => x.id === el.dataset.id);
          if (eq) openEquipmentForm(eq);
        } else {
          openProjectDetail(el.dataset.id);
        }
      });
    });
  }

  const container = document.getElementById('kanban-container');
  container.innerHTML = STATUS_ORDER.map((status) => {
    const allInStatus = state.projects.filter((p) => p.status === status);
    let projects = allInStatus;
    let showToggle = false;
    if (status === 'afgerond') {
      projects = [...allInStatus].sort((a, b) =>
        new Date(b.status_changed_at || b.created_at || 0) - new Date(a.status_changed_at || a.created_at || 0));
      showToggle = projects.length > DEFAULT_AFGEROND_LIMIT;
      if (!showAllAfgerond && showToggle) projects = projects.slice(0, DEFAULT_AFGEROND_LIMIT);
    }
    return `
      <div class="kanban-col" data-status="${status}">
        <div class="kanban-col-title"><span>${STATUS_LABELS[status]}</span><span class="kanban-col-count">${allInStatus.length}</span></div>
        ${projects.map(cardHtml).join('')}
        ${showToggle ? `<button type="button" class="kanban-toggle-afgerond">${showAllAfgerond ? 'Toon minder' : `+ ${allInStatus.length - DEFAULT_AFGEROND_LIMIT} meer tonen`}</button>` : ''}
      </div>`;
  }).join('');

  container.querySelectorAll('.kanban-toggle-afgerond').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAllAfgerond = !showAllAfgerond;
      renderDashboard();
    });
  });

  container.querySelectorAll('.project-card').forEach((el) => {
    el.addEventListener('click', () => openProjectDetail(el.dataset.id));
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    });
  });

  container.querySelectorAll('.kanban-col').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      handleDrop(e.dataTransfer.getData('text/plain'), col.dataset.status);
    });
  });
}

async function handleDrop(projectId, newStatus) {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p || p.status === newStatus) return;
  try {
    const updated = await updateProject(projectId, { status: newStatus });
    const idx = state.projects.findIndex((x) => x.id === projectId);
    state.projects[idx] = updated;
    renderDashboard();
    showToast('Status gewijzigd');
    if (p.client_user_id) {
      notifyStatusChange(projectId)
        .then(() => showToast('Klant per mail verwittigd'))
        .catch((err) => showToast('Kon klant niet mailen: ' + err.message, true));
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

function cardThumb(p) {
  if (p.cover_photo_path) return getPortalPhotoUrl(p.cover_photo_path);
  const client = state.clients.find((c) => c.id === p.client_id);
  return client?.photo_path ? getPortalPhotoUrl(client.photo_path) : null;
}

function cardHtml(p) {
  const isDone = p.status === 'afgerond' || p.status === 'verzonden';
  const overdue = p.deadline && !isDone && new Date(p.deadline) < new Date(new Date().toDateString());
  const thumb = cardThumb(p);
  return `
    <div class="project-card ${thumb ? 'has-thumb' : ''}" data-id="${p.id}" draggable="true">
      ${hasUnseenClientActivity(p) ? '<span class="card-badge-new">Nieuw</span>' : ''}
      ${thumb ? `<div class="card-thumb" style="background-image:url('${escapeHtml(thumb)}')"></div>` : ''}
      <div class="card-body">
        <div class="client">${escapeHtml(p.client_name)}</div>
        <div class="title">${escapeHtml(p.title)}</div>
        ${p.deadline ? `<div class="deadline ${overdue ? 'overdue' : ''}">Deadline: ${fmtDate(new Date(p.deadline))}</div>` : ''}
      </div>
    </div>`;
}

export function openNewProjectModal() {
  openModal(`
    <div class="modal-header"><h2>Nieuwe opdracht</h2></div>
    <form id="project-form">
      <div class="field"><label>Klant</label><input type="text" id="pf-client" required></div>
      <div class="field"><label>Titel</label><input type="text" id="pf-title" required></div>
      <div class="field-row">
        <div class="field"><label>Status</label>
          <select id="pf-status">${STATUS_ORDER.map((s) => `<option value="${s}">${STATUS_LABELS[s]}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Deadline</label><input type="date" id="pf-deadline"></div>
      </div>
      <div class="field"><label>Notities</label><textarea id="pf-notes" rows="3"></textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="pf-cancel">Annuleren</button>
        <button type="submit" class="btn btn-red">Toevoegen</button>
      </div>
    </form>
  `);
  document.getElementById('pf-cancel').addEventListener('click', closeModal);
  document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      client_name: document.getElementById('pf-client').value.trim(),
      title: document.getElementById('pf-title').value.trim(),
      status: document.getElementById('pf-status').value,
      deadline: document.getElementById('pf-deadline').value || null,
      notes: document.getElementById('pf-notes').value.trim() || null,
    };
    try {
      const created = await createProject(payload);
      state.projects.unshift(created);
      closeModal();
      renderDashboard();
      showToast('Opdracht toegevoegd');
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
