import { state, CONCEPT_TYPE_LABELS, CONCEPT_STATUS_LABELS, fmtDate } from './state.js';
import { escapeHtml, escapeAttr, parseScriptScenes, serializeScriptScenes, renderConceptContentHtml } from './util.js';
import { fetchProjectConcepts, createConcept, updateConcept, deleteConcept, fetchProjectFeedback } from './data.js';
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

  let concepts, feedback;
  try {
    [concepts, feedback] = await Promise.all([
      fetchProjectConcepts(projectId),
      fetchProjectFeedback(projectId),
    ]);
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon ideeën/scripts niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }

  container.innerHTML = concepts.length
    ? `<div class="concept-list">${concepts.map((c) => scriptingCardHtml(c, feedback.filter((f) => f.concept_id === c.id))).join('')}</div>`
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

function scriptingCardHtml(c, conceptFeedback = []) {
  return `
    <div class="concept-card" data-id="${c.id}">
      <div class="concept-card-header">
        <span class="badge-status ${c.type}">${CONCEPT_TYPE_LABELS[c.type] ?? c.type}</span>
        <span class="badge-status ${c.status}">${CONCEPT_STATUS_LABELS[c.status] ?? c.status}</span>
      </div>
      <div class="concept-card-title">${escapeHtml(c.title)}</div>
      ${renderConceptContentHtml(c.content)}
      <div class="concept-feedback">
        <div class="empty-note" style="margin-bottom:6px;">Feedback van klant</div>
        ${conceptFeedback.length
          ? conceptFeedback.map((f) => `<div class="detail-list-item"><span>${escapeHtml(f.message)}</span><span>${fmtDate(new Date(f.created_at))}</span></div>`).join('')
          : '<div class="empty-note">Nog geen feedback op dit item.</div>'}
      </div>
      <div class="concept-row-actions">
        <button type="button" class="btn btn-ghost btn-small concept-edit" data-id="${c.id}">Bewerken</button>
        <button type="button" class="btn btn-ghost btn-small concept-delete" data-id="${c.id}">Verwijderen</button>
      </div>
    </div>`;
}

function sceneRowHtml(index, scene = {}) {
  return `
    <div class="scene-row" data-index="${index}">
      <div class="scene-row-header">
        <span class="scene-row-label">Scène ${index + 1}</span>
        <button type="button" class="btn-icon scene-remove">✕</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Visueel (wat zie je)</label><textarea class="scene-visueel" rows="2">${escapeHtml(scene.visueel ?? '')}</textarea></div>
        <div class="field"><label>Tekst / voice-over</label><textarea class="scene-tekst" rows="2">${escapeHtml(scene.tekst ?? '')}</textarea></div>
      </div>
      <div class="field" style="max-width:160px;"><label>Duur (sec, optioneel)</label><input type="number" min="0" class="scene-duur" value="${scene.duur ?? ''}"></div>
    </div>`;
}

function renumberScenes() {
  document.querySelectorAll('#scenes-list .scene-row').forEach((row, i) => {
    row.dataset.index = i;
    row.querySelector('.scene-row-label').textContent = `Scène ${i + 1}`;
  });
}

function wireSceneRow(row) {
  row.querySelector('.scene-remove').addEventListener('click', () => {
    row.remove();
    renumberScenes();
  });
}

function contentAreaHtml(mode, scenes, freeText) {
  if (mode === 'scenes') {
    return `
      <div class="field"><label>Scènes</label></div>
      <div id="scenes-list">${scenes.map((s, i) => sceneRowHtml(i, s)).join('')}</div>
      <button type="button" class="btn btn-ghost btn-small" id="scene-add">+ Scène toevoegen</button>
    `;
  }
  return `<div class="field"><label>Inhoud</label><textarea id="concept-content" rows="12" placeholder="Omschrijving van het idee, of het volledige script...">${escapeHtml(freeText)}</textarea></div>`;
}

function wireContentArea(mode) {
  if (mode !== 'scenes') return;
  document.querySelectorAll('#scenes-list .scene-row').forEach(wireSceneRow);
  document.getElementById('scene-add').addEventListener('click', () => {
    const list = document.getElementById('scenes-list');
    const idx = list.querySelectorAll('.scene-row').length;
    list.insertAdjacentHTML('beforeend', sceneRowHtml(idx, {}));
    wireSceneRow(list.lastElementChild);
  });
}

function readScenesFromDom() {
  return Array.from(document.querySelectorAll('#scenes-list .scene-row')).map((row) => ({
    visueel: row.querySelector('.scene-visueel').value.trim(),
    tekst: row.querySelector('.scene-tekst').value.trim(),
    duur: row.querySelector('.scene-duur').value ? Number(row.querySelector('.scene-duur').value) : null,
  }));
}

function scenesToFreeText(scenes) {
  return scenes.map((s, i) => `Scène ${i + 1}${s.duur ? ` (${s.duur}s)` : ''}\nVisueel: ${s.visueel}\nTekst: ${s.tekst}`).join('\n\n');
}

export function openConceptForm(projectId, concept = null, formState = null) {
  if (!projectId) {
    showToast('Kies eerst een opdracht hierboven.', true);
    return;
  }
  const isEdit = !!concept?.id;

  // formState draagt de in-progress bewerkingen over bij een structurele herrender
  // (type/modus wisselen) — titel, huidige scènes/vrije tekst blijven zo behouden.
  const type = formState?.type ?? (concept?.type === 'idee' ? 'idee' : 'script');
  const existingScenes = formState?.scenes ?? parseScriptScenes(concept?.content);
  const mode = formState?.mode ?? (type === 'script' ? (existingScenes ? 'scenes' : (concept?.content ? 'vrij' : 'scenes')) : 'vrij');
  const scenes = mode === 'scenes' ? (existingScenes && existingScenes.length ? existingScenes : [{}]) : [];
  const freeText = formState?.freeText ?? (mode === 'vrij' ? (existingScenes ? '' : (concept?.content ?? '')) : '');
  const titleValue = formState?.title ?? (concept?.title ?? '');

  openModal(`
    <div class="modal-header"><h2>${isEdit ? 'Idee/script bewerken' : 'Idee/script toevoegen'}</h2></div>
    <form id="concept-form">
      <div class="field"><label>Titel</label><input type="text" id="concept-title" value="${escapeAttr(titleValue)}" required></div>
      <div class="field"><label>Type</label>
        <select id="concept-type">
          <option value="idee" ${type === 'idee' ? 'selected' : ''}>Idee</option>
          <option value="script" ${type === 'script' ? 'selected' : ''}>Script</option>
        </select>
      </div>
      <div class="field" id="concept-mode-field" style="${type === 'script' ? '' : 'display:none;'}">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="concept-scenes-mode" style="width:auto;" ${mode === 'scenes' ? 'checked' : ''}>
          Scène-structuur gebruiken (visueel + tekst per scène, i.p.v. één tekstvak)
        </label>
      </div>
      ${mode === 'vrij' ? `
      <div class="field">
        <label>Sjabloon (optioneel — vult de inhoud met een startstructuur)</label>
        <select id="concept-template">
          <option value="">— Geen —</option>
          ${Object.entries(TEMPLATES).map(([key, t]) => `<option value="${key}">${escapeHtml(t.label)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div id="concept-content-area">${contentAreaHtml(mode, scenes, freeText)}</div>
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
  wireContentArea(mode);

  function currentFormState(overrides = {}) {
    return {
      title: document.getElementById('concept-title').value,
      type,
      mode,
      scenes: mode === 'scenes' ? readScenesFromDom() : scenes,
      freeText: mode === 'vrij' ? (document.getElementById('concept-content')?.value ?? '') : freeText,
      ...overrides,
    };
  }

  document.getElementById('concept-type').addEventListener('change', (e) => {
    const newType = e.target.value;
    if (newType === type) return;
    // van script->idee met scènes: platslaan naar leesbare tekst zodat niets verloren gaat
    const carry = (newType === 'idee' && mode === 'scenes')
      ? { type: newType, mode: 'vrij', freeText: scenesToFreeText(readScenesFromDom()) }
      : { type: newType };
    openConceptForm(projectId, concept, currentFormState(carry));
  });

  document.getElementById('concept-scenes-mode')?.addEventListener('change', (e) => {
    const newMode = e.target.checked ? 'scenes' : 'vrij';
    const carry = newMode === 'scenes'
      ? { mode: newMode, scenes: (() => { const t = document.getElementById('concept-content')?.value ?? ''; return t ? [{ visueel: '', tekst: t }] : [{}]; })() }
      : { mode: newMode, freeText: scenesToFreeText(readScenesFromDom()) };
    openConceptForm(projectId, concept, currentFormState(carry));
  });

  document.getElementById('concept-template')?.addEventListener('change', (e) => {
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
    const finalType = document.getElementById('concept-type').value;
    const finalContent = mode === 'scenes'
      ? serializeScriptScenes(readScenesFromDom().filter((s) => s.visueel || s.tekst || s.duur))
      : (document.getElementById('concept-content').value.trim() || null);
    const payload = {
      title: document.getElementById('concept-title').value.trim(),
      type: finalType,
      content: finalContent,
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
