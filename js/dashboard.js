import { state, STATUS_ORDER, STATUS_LABELS, fmtDate } from './state.js';
import { escapeHtml } from './util.js';
import { createProject, updateProject, notifyStatusChange } from './data.js';
import { openModal, closeModal } from './modal.js';
import { openProjectDetail } from './projectDetail.js';
import { showToast } from './toast.js';

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
        items.push({ project: p, reason: 'Wacht op jouw antwoord' });
      }
    }

    if ((p.agreement_content || p.agreement_bestand_path) && !p.agreement_signed_at) {
      items.push({ project: p, reason: 'Contract nog niet ondertekend door klant' });
    }
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
        <div class="attention-row" data-id="${it.project.id}">
          <span class="attention-project">${escapeHtml(it.project.title)} <span class="attention-client">— ${escapeHtml(it.project.client_name)}</span></span>
          <span class="attention-reason">${escapeHtml(it.reason)}</span>
        </div>`).join('')}
    </div>`;
}

export function renderDashboard() {
  const attentionContainer = document.getElementById('attention-container');
  if (attentionContainer) {
    attentionContainer.innerHTML = attentionHtml();
    attentionContainer.querySelectorAll('.attention-row').forEach((el) => {
      el.addEventListener('click', () => openProjectDetail(el.dataset.id));
    });
  }

  const container = document.getElementById('kanban-container');
  container.innerHTML = STATUS_ORDER.map((status) => {
    const projects = state.projects.filter((p) => p.status === status);
    return `
      <div class="kanban-col" data-status="${status}">
        <div class="kanban-col-title"><span>${STATUS_LABELS[status]}</span><span class="kanban-col-count">${projects.length}</span></div>
        ${projects.map(cardHtml).join('')}
      </div>`;
  }).join('');

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

function cardHtml(p) {
  const isDone = p.status === 'afgerond' || p.status === 'verzonden';
  const overdue = p.deadline && !isDone && new Date(p.deadline) < new Date(new Date().toDateString());
  return `
    <div class="project-card" data-id="${p.id}" draggable="true">
      <div class="client">${escapeHtml(p.client_name)}</div>
      <div class="title">${escapeHtml(p.title)}</div>
      ${p.deadline ? `<div class="deadline ${overdue ? 'overdue' : ''}">Deadline: ${fmtDate(new Date(p.deadline))}</div>` : ''}
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
