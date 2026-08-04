import { state, CONCEPT_TYPE_LABELS, CONCEPT_STATUS_LABELS } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { fetchProjectConcepts, createConcept, updateConcept, deleteConcept } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

const TEMPLATES = {
  hook_body_cta: {
    label: 'Hook — Body — CTA (reel/short)',
    text: 'HOOK (eerste 3 sec):\n\n\nBODY:\n\n\nCTA:\n',
  },
  testimonial: {
    label: 'Testimonial (Q&A)',
    text: 'VRAAG 1:\nANTWOORD:\n\nVRAAG 2:\nANTWOORD:\n\nVRAAG 3:\nANTWOORD:\n',
  },
  bts: {
    label: 'BTS-verhaal',
    text: 'CONTEXT (wat gaan we zien):\n\n\nMOMENT / VERHAAL:\n\n\nAFSLUITER:\n',
  },
  tips: {
    label: 'Tips-lijst',
    text: 'INTRO-ZIN:\n\nTIP 1:\nTIP 2:\nTIP 3:\n\nAFSLUITER / CTA:\n',
  },
  aftermovie: {
    label: 'Aftermovie-structuur',
    text: 'OPENER (sfeer/energie):\n\n\nHOOGTEPUNTEN (chronologisch):\n-\n-\n-\n\nCLOSING SHOT:\n',
  },
};

export function renderScripting() {
  const select = document.getElementById('scripting-project-select');
  const container = document.getElementById('scripting-container');

  if (!state.projects.length) {
    select.innerHTML = '';
    container.innerHTML = '<div class="empty-note">Nog geen opdrachten aangemaakt.</div>';
    return;
  }

  try {
    if (!state.projects.some((p) => p.id === state.activeScriptingProjectId)) {
      state.activeScriptingProjectId = state.projects[0].id;
    }

    select.innerHTML = state.projects
      .map((p) => `<option value="${p.id}" ${p.id === state.activeScriptingProjectId ? 'selected' : ''}>${escapeHtml(p.title)} — ${escapeHtml(p.client_name)}</option>`)
      .join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon opdrachtenlijst niet opbouwen: ${escapeHtml(err.message)}</div>`;
    showToast('Scripting: ' + err.message, true);
    return;
  }

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
  if (!projectId) {
    showToast('Kies eerst een opdracht hierboven.', true);
    return;
  }
  const isEdit = !!concept?.id;
  openModal(`
    <div class="modal-header"><h2>${isEdit ? 'Idee/script bewerken' : 'Idee/script toevoegen'}</h2></div>
    <form id="concept-form">
      <div class="field"><label>Titel</label><input type="text" id="concept-title" value="${escapeAttr(concept?.title ?? '')}" required></div>
      <div class="field"><label>Type</label>
        <select id="concept-type">
          <option value="idee" ${concept?.type === 'idee' ? 'selected' : ''}>Idee</option>
          <option value="script" ${concept?.type === 'script' || !concept?.type ? 'selected' : ''}>Script</option>
        </select>
      </div>
      <div class="field"><label>Sjabloon (optioneel — vult de inhoud met een startstructuur)</label>
        <select id="concept-template">
          <option value="">— Geen —</option>
          ${Object.entries(TEMPLATES).map(([key, t]) => `<option value="${key}">${escapeHtml(t.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Inhoud</label><textarea id="concept-content" rows="12" placeholder="Omschrijving van het idee, of het volledige script...">${escapeHtml(concept?.content ?? '')}</textarea></div>
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

  document.getElementById('concept-template').addEventListener('change', (e) => {
    const key = e.target.value;
    if (!key) return;
    const textarea = document.getElementById('concept-content');
    if (textarea.value.trim() && !confirm('Dit vervangt de huidige inhoud van het tekstvak. Doorgaan?')) {
      e.target.value = '';
      return;
    }
    textarea.value = TEMPLATES[key].text;
    e.target.value = '';
  });

  document.getElementById('concept-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('concept-title').value.trim(),
      type: document.getElementById('concept-type').value,
      content: document.getElementById('concept-content').value.trim() || null,
    };
    try {
      if (isEdit) {
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

// ── script importeren (.txt / .md) ──────────────────────
export function importScriptFile(projectId, file) {
  if (!projectId) {
    showToast('Kies eerst een opdracht hierboven.', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const title = file.name.replace(/\.(txt|md)$/i, '');
    openConceptForm(projectId, { title, type: 'script', content: reader.result });
  };
  reader.onerror = () => showToast('Kon het bestand niet lezen.', true);
  reader.readAsText(file);
}
