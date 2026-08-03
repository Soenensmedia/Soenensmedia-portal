import { state, CONCEPT_TYPE_LABELS, CONCEPT_STATUS_LABELS } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { fetchProjectConcepts, createConcept, updateConcept, deleteConcept } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

export function renderScripting() {
  const select = document.getElementById('scripting-project-select');
  const container = document.getElementById('scripting-container');

  if (!state.projects.length) {
    select.innerHTML = '';
    container.innerHTML = '<div class="empty-note">Nog geen opdrachten aangemaakt.</div>';
    return;
  }

  if (!state.projects.some((p) => p.id === state.activeScriptingProjectId)) {
    state.activeScriptingProjectId = state.projects[0].id;
  }

  select.innerHTML = state.projects
    .map((p) => `<option value="${p.id}" ${p.id === state.activeScriptingProjectId ? 'selected' : ''}>${escapeHtml(p.title)} — ${escapeHtml(p.client_name)}</option>`)
    .join('');

  select.onchange = () => {
    state.activeScriptingProjectId = select.value;
    refreshScriptingList();
  };

  refreshScriptingList();
}

async function refreshScriptingList() {
  const container = document.getElementById('scripting-container');
  const projectId = state.activeScriptingProjectId;
  if (!container || !projectId) return;
  container.innerHTML = '<div class="empty-note">Laden...</div>';

  let concepts;
  try {
    concepts = await fetchProjectConcepts(projectId);
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon ideeën/scripts niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }

  container.innerHTML = concepts.length
    ? `<div class="concept-list">${concepts.map(scriptingCardHtml).join('')}</div>`
    : '<div class="empty-note">Nog geen ideeën of scripts voor deze opdracht.</div>';

  container.querySelectorAll('.concept-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const concept = concepts.find((c) => c.id === btn.dataset.id);
      if (concept) openConceptForm(projectId, concept);
    });
  });
  container.querySelectorAll('.concept-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Dit idee/script verwijderen?')) return;
      try {
        await deleteConcept(btn.dataset.id);
        refreshScriptingList();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

function scriptingCardHtml(c) {
  return `
    <div class="concept-card" data-id="${c.id}">
      <div class="concept-card-header">
        <span class="badge-status ${c.type}">${CONCEPT_TYPE_LABELS[c.type] ?? c.type}</span>
        <span class="badge-status ${c.status}">${CONCEPT_STATUS_LABELS[c.status] ?? c.status}</span>
      </div>
      <div class="concept-card-title">${escapeHtml(c.title)}</div>
      ${c.content ? `<p class="concept-card-content">${escapeHtml(c.content)}</p>` : ''}
      <div class="concept-row-actions">
        <button type="button" class="btn btn-ghost btn-small concept-edit" data-id="${c.id}">Bewerken</button>
        <button type="button" class="btn btn-ghost btn-small concept-delete" data-id="${c.id}">Verwijderen</button>
      </div>
    </div>`;
}

export function openConceptForm(projectId, concept = null) {
  if (!projectId) return;
  openModal(`
    <div class="modal-header"><h2>${concept ? 'Idee/script bewerken' : 'Idee/script toevoegen'}</h2></div>
    <form id="concept-form">
      <div class="field"><label>Titel</label><input type="text" id="concept-title" value="${escapeAttr(concept?.title ?? '')}" required></div>
      <div class="field"><label>Type</label>
        <select id="concept-type">
          <option value="idee" ${concept?.type === 'idee' || !concept ? 'selected' : ''}>Idee</option>
          <option value="script" ${concept?.type === 'script' ? 'selected' : ''}>Script</option>
        </select>
      </div>
      <div class="field"><label>Inhoud</label><textarea id="concept-content" rows="10" placeholder="Omschrijving van het idee, of het volledige script...">${escapeHtml(concept?.content ?? '')}</textarea></div>
      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="concept-cancel">Sluiten</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById('concept-cancel').addEventListener('click', closeModal);

  document.getElementById('concept-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('concept-title').value.trim(),
      type: document.getElementById('concept-type').value,
      content: document.getElementById('concept-content').value.trim() || null,
    };
    try {
      if (concept) {
        await updateConcept(concept.id, payload);
        showToast('Idee/script bijgewerkt');
      } else {
        await createConcept({ ...payload, project_id: projectId });
        showToast('Idee/script toegevoegd');
      }
      closeModal();
      refreshScriptingList();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
