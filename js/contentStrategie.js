import { state } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import {
  fetchClients,
  fetchContentStrategie, saveContentStrategie,
  fetchContentIdeeen, createContentIdee, updateContentIdee, deleteContentIdee,
  fetchContentScripts, createContentScript, updateContentScript, deleteContentScript,
  fetchContentHookformules, createContentHookformule, deleteContentHookformule,
  fetchContentDraaidag, createContentDraaidag, deleteContentDraaidag,
  fetchContentBroll, createContentBroll, deleteContentBroll,
  fetchContentPlanner, saveContentPlannerRow, deleteContentPlannerRow,
  createConcept, notifyNewConcept,
} from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

const ROLLEN = ['bereik', 'expertise', 'vertrouwen', 'mens', 'conversie'];
const ROL_LABELS = { bereik: 'Bereik', expertise: 'Expertise', vertrouwen: 'Vertrouwen', mens: 'Mens', conversie: 'Conversie' };
const TAG_LABELS = {
  'prater-vrij': 'Geen prater', stock: 'Stock als brandstof', snel: 'Weinig opzet',
  werkplaats: 'Werkplaats', mensen: 'Mensen', los: 'Los & luchtig', traag: 'Lange termijn',
};

let clientsCache = [];
let selectedClientId = null;
let activeSubTab = 'ideeen';
let activeTagFilter = 'alles';

let cache = { strategie: null, ideeen: [], scripts: [], hooks: [], draaidag: [], broll: [], planner: [] };

export async function openContentStrategieForClient(clientId) {
  selectedClientId = clientId;
  activeSubTab = 'ideeen';
  activeTagFilter = 'alles';
  await renderContentStrategie();
}

export async function renderContentStrategie() {
  const container = document.getElementById('content-strategie-container');
  container.className = 'cs-root';
  container.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    clientsCache = await fetchClients();
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon klanten niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!selectedClientId && clientsCache.length) selectedClientId = clientsCache[0].id;
  renderShell();
  if (selectedClientId) await loadClientData();
}

function renderShell() {
  const container = document.getElementById('content-strategie-container');
  const client = clientsCache.find((c) => c.id === selectedClientId);
  container.innerHTML = `
    <div class="field" style="max-width:360px;">
      <label>Klant</label>
      <select id="cs-client-select">
        ${clientsCache.map((c) => `<option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>${escapeHtml(c.naam)}</option>`).join('')}
      </select>
    </div>
    ${!clientsCache.length ? '<div class="empty-note">Nog geen klanten — voeg er eerst één toe via de Klanten-tab.</div>' : `
      <div class="cs-lead" style="margin-top:6px; font-family:'Bebas Neue',sans-serif; font-size:clamp(28px,5vw,44px); letter-spacing:.02em; line-height:.9; color:var(--text); max-width:none;">
        ${client ? escapeHtml(client.naam) : ''}<span style="color:var(--red);">.</span>
      </div>
      <div id="cs-body"></div>
    `}
  `;
  document.getElementById('cs-client-select')?.addEventListener('change', async (e) => {
    selectedClientId = e.target.value;
    activeSubTab = 'ideeen';
    activeTagFilter = 'alles';
    renderShell();
    await loadClientData();
  });
}

async function loadClientData() {
  const body = document.getElementById('cs-body');
  if (body) body.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    const [strategie, ideeen, scripts, hooks, draaidag, broll, planner] = await Promise.all([
      fetchContentStrategie(selectedClientId),
      fetchContentIdeeen(selectedClientId),
      fetchContentScripts(selectedClientId),
      fetchContentHookformules(selectedClientId),
      fetchContentDraaidag(selectedClientId),
      fetchContentBroll(selectedClientId),
      fetchContentPlanner(selectedClientId),
    ]);
    cache = { strategie, ideeen, scripts, hooks, draaidag, broll, planner };
  } catch (err) {
    if (body) body.innerHTML = `<div class="empty-note">Kon data niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  renderBody();
}

const SUBTABS = [
  { key: 'ideeen', label: 'Ideeën' },
  { key: 'scripts', label: 'Scripts' },
  { key: 'hooks', label: 'Hooks' },
  { key: 'draaidag', label: 'Draaidag' },
  { key: 'broll', label: 'B-roll' },
  { key: 'planner', label: 'Planner' },
  { key: 'strategie', label: 'Klant-info' },
];

function renderBody() {
  const body = document.getElementById('cs-body');
  if (!body) return;
  body.innerHTML = `
    <nav class="cs-nav">
      ${SUBTABS.map((t) => `<button type="button" class="${t.key === activeSubTab ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('')}
    </nav>
    <div id="cs-panel"></div>
  `;
  body.querySelectorAll('.cs-nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSubTab = btn.dataset.tab;
      renderBody();
    });
  });
  renderPanel();
}

function renderPanel() {
  const panel = document.getElementById('cs-panel');
  if (!panel) return;
  if (activeSubTab === 'ideeen') return renderIdeeenPanel(panel);
  if (activeSubTab === 'scripts') return renderScriptsPanel(panel);
  if (activeSubTab === 'hooks') return renderHooksPanel(panel);
  if (activeSubTab === 'draaidag') return renderDraaidagPanel(panel);
  if (activeSubTab === 'broll') return renderBrollPanel(panel);
  if (activeSubTab === 'planner') return renderPlannerPanel(panel);
  if (activeSubTab === 'strategie') return renderStrategiePanel(panel);
}

// ── Ideeën ───────────────────────────────────────────────
function renderIdeeenPanel(panel) {
  const allTags = ['alles', ...Array.from(new Set(cache.ideeen.flatMap((i) => i.tags || [])))];
  const filtered = activeTagFilter === 'alles' ? cache.ideeen : cache.ideeen.filter((i) => (i.tags || []).includes(activeTagFilter));

  panel.innerHTML = `
    <div class="section-header-row">
      <p class="cs-lead">Format-skeletten om uit te putten: vaste vorm, wisselend onderwerp. Filter op wat je nodig hebt.</p>
      <button type="button" class="btn btn-red btn-small" id="cs-idee-add">+ Idee</button>
    </div>
    <div class="cs-chips">
      ${allTags.map((t) => `<button type="button" class="cs-chip ${t === activeTagFilter ? 'active' : ''}" data-tag="${escapeAttr(t)}">${t === 'alles' ? 'Alles' : escapeHtml(TAG_LABELS[t] || t)}</button>`).join('')}
    </div>
    <div class="cs-cards">
      ${filtered.length ? filtered.map(ideeCardHtml).join('') : '<div class="empty-note">Geen ideeën voor deze filter.</div>'}
    </div>
  `;
  panel.querySelectorAll('.cs-chip').forEach((chip) => {
    chip.addEventListener('click', () => { activeTagFilter = chip.dataset.tag; renderIdeeenPanel(panel); });
  });
  panel.querySelectorAll('.cs-idee-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Dit idee verwijderen?')) return;
      try {
        await deleteContentIdee(btn.dataset.id);
        cache.ideeen = cache.ideeen.filter((i) => i.id !== btn.dataset.id);
        renderIdeeenPanel(panel);
        showToast('Idee verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  });
  panel.querySelectorAll('.cs-idee-send').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idee = cache.ideeen.find((i) => i.id === btn.dataset.id);
      if (idee) openSendModal('idee', idee);
    });
  });
  panel.querySelectorAll('.cs-idee-edit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idee = cache.ideeen.find((i) => i.id === btn.dataset.id);
      if (idee) openIdeeForm(idee);
    });
  });
  document.getElementById('cs-idee-add')?.addEventListener('click', () => openIdeeForm());
}

function ideeCardHtml(idee) {
  return `
    <div class="cs-idea">
      <h3>${escapeHtml(idee.naam)}${idee.status ? `<span class="cs-tag ${idee.status.toLowerCase().includes('maand') ? 'status-now' : ''}">${escapeHtml(idee.status)}</span>` : ''}</h3>
      <div>${(idee.tags || []).map((t) => `<span class="cs-tag">${escapeHtml(TAG_LABELS[t] || t)}</span>`).join('')}</div>
      <p class="cs-body">${escapeHtml(idee.wat || '')}</p>
      ${idee.hook ? `<div class="cs-hook"><em>Hook</em>"${escapeHtml(idee.hook)}"</div>` : ''}
      ${idee.voorbeeld_link ? `<a class="cs-link" href="${escapeAttr(idee.voorbeeld_link)}" target="_blank" rel="noopener">↗ Voorbeeld bekijken</a>` : ''}
      <dl class="cs-dl">
        ${idee.lengte ? `<dt>Lengte</dt><dd>${escapeHtml(idee.lengte)}</dd>` : ''}
        ${idee.heroshot ? `<dt>Heroshot</dt><dd>${escapeHtml(idee.heroshot)}</dd>` : ''}
      </dl>
      <div class="cs-idea-actions">
        <button type="button" class="btn btn-red btn-small cs-idee-send" data-id="${idee.id}">Stuur naar klant</button>
        <button type="button" class="btn btn-ghost btn-small cs-idee-edit" data-id="${idee.id}">Bewerk</button>
        <button type="button" class="btn-icon cs-idee-delete" data-id="${idee.id}">✕</button>
      </div>
    </div>`;
}

function openIdeeForm(existing = null) {
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Idee bewerken' : 'Idee toevoegen'}</h2></div>
    <form id="cs-idee-form">
      <div class="field"><label>Naam</label><input type="text" id="ci-naam" required value="${escapeAttr(existing?.naam || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Status</label><input type="text" id="ci-status" placeholder="Bv. Maand 1, beschikbaar..." value="${escapeAttr(existing?.status || '')}"></div>
        <div class="field"><label>Tags (komma-gescheiden)</label><input type="text" id="ci-tags" placeholder="prater-vrij, stock, snel" value="${escapeAttr((existing?.tags || []).join(', '))}"></div>
      </div>
      <div class="field"><label>Wat</label><textarea id="ci-wat" rows="2">${escapeHtml(existing?.wat || '')}</textarea></div>
      <div class="field"><label>Hook</label><input type="text" id="ci-hook" value="${escapeAttr(existing?.hook || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Lengte</label><input type="text" id="ci-lengte" placeholder="3 + 3×8 + 4 = 31 sec" value="${escapeAttr(existing?.lengte || '')}"></div>
        <div class="field"><label>Heroshot</label><input type="text" id="ci-heroshot" value="${escapeAttr(existing?.heroshot || '')}"></div>
      </div>
      <div class="field"><label>Voorbeeldlink (bv. Instagram-reel)</label><input type="url" id="ci-voorbeeld" placeholder="https://instagram.com/reel/..." value="${escapeAttr(existing?.voorbeeld_link || '')}"></div>
      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="ci-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">${existing ? 'Opslaan' : 'Toevoegen'}</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('ci-cancel').addEventListener('click', closeModal);
  document.getElementById('cs-idee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      client_id: selectedClientId,
      naam: document.getElementById('ci-naam').value.trim(),
      status: document.getElementById('ci-status').value.trim() || null,
      tags: document.getElementById('ci-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      wat: document.getElementById('ci-wat').value.trim() || null,
      hook: document.getElementById('ci-hook').value.trim() || null,
      lengte: document.getElementById('ci-lengte').value.trim() || null,
      heroshot: document.getElementById('ci-heroshot').value.trim() || null,
      voorbeeld_link: document.getElementById('ci-voorbeeld').value.trim() || null,
    };
    try {
      if (existing) {
        const updated = await updateContentIdee(existing.id, payload);
        const idx = cache.ideeen.findIndex((i) => i.id === existing.id);
        if (idx >= 0) cache.ideeen[idx] = updated;
        closeModal();
        renderPanel();
        showToast('Idee opgeslagen');
      } else {
        const created = await createContentIdee({ ...payload, volgorde: cache.ideeen.length });
        cache.ideeen.push(created);
        closeModal();
        renderPanel();
        showToast('Idee toegevoegd');
      }
    } catch (err) { showToast(err.message, true); }
  });
}

// ── Scripts ──────────────────────────────────────────────
function renderScriptsPanel(panel) {
  panel.innerHTML = `
    <div class="section-header-row">
      <p class="cs-lead">Uitgewerkte shotlijsten, klaar om te filmen.</p>
      <button type="button" class="btn btn-red btn-small" id="cs-script-add">+ Script</button>
    </div>
    ${cache.scripts.length ? cache.scripts.map(scriptCardHtml).join('') : '<div class="empty-note">Nog geen scripts.</div>'}
  `;
  panel.querySelectorAll('.cs-script-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Dit script verwijderen?')) return;
      try {
        await deleteContentScript(btn.dataset.id);
        cache.scripts = cache.scripts.filter((s) => s.id !== btn.dataset.id);
        renderScriptsPanel(panel);
        showToast('Script verwijderd');
      } catch (err) { showToast(err.message, true); }
    });
  });
  panel.querySelectorAll('.cs-script-send').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const script = cache.scripts.find((s) => s.id === btn.dataset.id);
      if (script) openSendModal('script', script);
    });
  });
  panel.querySelectorAll('.cs-script-edit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const script = cache.scripts.find((s) => s.id === btn.dataset.id);
      if (script) openScriptForm(script);
    });
  });
  document.getElementById('cs-script-add')?.addEventListener('click', () => openScriptForm());
}

function scriptCardHtml(script) {
  const shots = Array.isArray(script.shots) ? script.shots : [];
  return `
    <div class="cs-script">
      <div class="cs-script-head">
        <h3>${escapeHtml(script.titel)}</h3>
        ${script.meta ? `<div class="cs-script-meta">${escapeHtml(script.meta)}</div>` : ''}
        ${script.voorbeeld_link ? `<a class="cs-link" href="${escapeAttr(script.voorbeeld_link)}" target="_blank" rel="noopener">↗ Voorbeeld bekijken</a>` : ''}
      </div>
      ${shots.map((s) => `
        <div class="cs-row">
          <div class="cs-t">${escapeHtml(s.tijd || '')}</div>
          <div class="cs-c">
            <strong>${escapeHtml(s.beeld || '')}</strong>
            ${s.tekst_in_beeld ? `<span class="cs-osd">${escapeHtml(s.tekst_in_beeld)}</span>` : ''}
            ${s.gesproken ? `<span class="cs-say">${escapeHtml(s.gesproken)}</span>` : ''}
          </div>
        </div>`).join('')}
      ${script.regie ? `<div class="cs-regie"><b>Regie.</b> ${escapeHtml(script.regie)}</div>` : ''}
      <div class="cs-script-actions">
        <button type="button" class="btn btn-red btn-small cs-script-send" data-id="${script.id}">Stuur naar klant</button>
        <button type="button" class="btn btn-ghost btn-small cs-script-edit" data-id="${script.id}">Bewerk</button>
        <button type="button" class="btn-icon cs-script-delete" data-id="${script.id}">✕</button>
      </div>
    </div>`;
}

function shotsToLines(shots) {
  return (Array.isArray(shots) ? shots : [])
    .map((s) => [s.tijd, s.beeld, s.tekst_in_beeld, s.gesproken].map((p) => p || '').join(' | '))
    .join('\n');
}

function openScriptForm(existing = null) {
  openModal(`
    <div class="modal-header"><h2>${existing ? 'Script bewerken' : 'Script toevoegen'}</h2></div>
    <form id="cs-script-form">
      <div class="field"><label>Titel</label><input type="text" id="cscr-titel" required value="${escapeAttr(existing?.titel || '')}"></div>
      <div class="field"><label>Meta</label><input type="text" id="cscr-meta" placeholder="Bereik ±35 sec, blok D, 11u30" value="${escapeAttr(existing?.meta || '')}"></div>
      <div class="field"><label>Shots (1 per regel: tijd | beeld | tekst in beeld | gesproken)</label>
        <textarea id="cscr-shots" rows="6" placeholder="0:00 | De drie wagens samen | €15.000. Drie wagens. | Vijftienduizend euro...">${escapeHtml(shotsToLines(existing?.shots))}</textarea>
      </div>
      <div class="field"><label>Regie</label><textarea id="cscr-regie" rows="2">${escapeHtml(existing?.regie || '')}</textarea></div>
      <div class="field"><label>Voorbeeldlink (bv. Instagram-reel)</label><input type="url" id="cscr-voorbeeld" placeholder="https://instagram.com/reel/..." value="${escapeAttr(existing?.voorbeeld_link || '')}"></div>
      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="cscr-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">${existing ? 'Opslaan' : 'Toevoegen'}</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('cscr-cancel').addEventListener('click', closeModal);
  document.getElementById('cs-script-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const shots = document.getElementById('cscr-shots').value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [tijd, beeld, tekst_in_beeld, gesproken] = line.split('|').map((p) => p?.trim() || null);
      return { tijd, beeld, tekst_in_beeld, gesproken };
    });
    const payload = {
      client_id: selectedClientId,
      titel: document.getElementById('cscr-titel').value.trim(),
      meta: document.getElementById('cscr-meta').value.trim() || null,
      shots,
      regie: document.getElementById('cscr-regie').value.trim() || null,
      voorbeeld_link: document.getElementById('cscr-voorbeeld').value.trim() || null,
    };
    try {
      if (existing) {
        const updated = await updateContentScript(existing.id, payload);
        const idx = cache.scripts.findIndex((s) => s.id === existing.id);
        if (idx >= 0) cache.scripts[idx] = updated;
        closeModal();
        renderPanel();
        showToast('Script opgeslagen');
      } else {
        const created = await createContentScript(payload);
        cache.scripts.push(created);
        closeModal();
        renderPanel();
        showToast('Script toegevoegd');
      }
    } catch (err) { showToast(err.message, true); }
  });
}

// ── Hooks ────────────────────────────────────────────────
function renderHooksPanel(panel) {
  panel.innerHTML = `
    <div class="section-header-row">
      <p class="cs-lead">Hookformules als inspiratiebank.</p>
      <button type="button" class="btn btn-red btn-small" id="cs-hook-add">+ Categorie</button>
    </div>
    <div class="cs-hookgrid">
      ${cache.hooks.length ? cache.hooks.map((h) => `
        <div class="cs-hookcard">
          <h3>${escapeHtml(h.categorie)}</h3>
          ${h.waarom ? `<p class="cs-why">${escapeHtml(h.waarom)}</p>` : ''}
          <ul>${(h.voorbeelden || []).map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>
          <div class="cs-idea-actions"><button type="button" class="btn-icon cs-hook-delete" data-id="${h.id}">✕</button></div>
        </div>`).join('') : '<div class="empty-note">Nog geen hookformules.</div>'}
    </div>
  `;
  panel.querySelectorAll('.cs-hook-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Verwijderen?')) return;
      try {
        await deleteContentHookformule(btn.dataset.id);
        cache.hooks = cache.hooks.filter((h) => h.id !== btn.dataset.id);
        renderHooksPanel(panel);
      } catch (err) { showToast(err.message, true); }
    });
  });
  document.getElementById('cs-hook-add')?.addEventListener('click', () => {
    openModal(`
      <div class="modal-header"><h2>Hookcategorie toevoegen</h2></div>
      <form id="cs-hook-form">
        <div class="field"><label>Categorie</label><input type="text" id="ch-cat" required placeholder="Getal, Weigering, Tijd..."></div>
        <div class="field"><label>Waarom werkt dit</label><textarea id="ch-waarom" rows="2"></textarea></div>
        <div class="field"><label>Voorbeelden (1 per regel)</label><textarea id="ch-voorbeelden" rows="4"></textarea></div>
        <div class="modal-actions">
          <div></div>
          <div class="modal-actions-right">
            <button type="button" class="btn btn-ghost" id="ch-cancel">Annuleren</button>
            <button type="submit" class="btn btn-red">Toevoegen</button>
          </div>
        </div>
      </form>
    `);
    document.getElementById('ch-cancel').addEventListener('click', closeModal);
    document.getElementById('cs-hook-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        client_id: selectedClientId,
        categorie: document.getElementById('ch-cat').value.trim(),
        waarom: document.getElementById('ch-waarom').value.trim() || null,
        voorbeelden: document.getElementById('ch-voorbeelden').value.split('\n').map((v) => v.trim()).filter(Boolean),
        volgorde: cache.hooks.length,
      };
      try {
        const created = await createContentHookformule(payload);
        cache.hooks.push(created);
        closeModal();
        renderPanel();
        showToast('Toegevoegd');
      } catch (err) { showToast(err.message, true); }
    });
  });
}

// ── Draaidag ─────────────────────────────────────────────
function renderDraaidagPanel(panel) {
  panel.innerHTML = `
    <div class="section-header-row">
      <p class="cs-lead">Blokken voor de opnamedag.</p>
      <button type="button" class="btn btn-red btn-small" id="cs-dd-add">+ Blok</button>
    </div>
    ${cache.draaidag.length ? cache.draaidag.map((b) => `
      <div class="cs-block">
        <div class="cs-tc">
          ${b.tijd ? `<div class="cs-h">${escapeHtml(b.tijd)}</div>` : ''}
          ${b.blok ? `<div class="cs-n">BLOK ${escapeHtml(b.blok)}</div>` : ''}
        </div>
        <div class="cs-block-body">
          <h3>${escapeHtml(b.titel || '')}</h3>
          ${b.waarom ? `<p class="cs-why" style="color:var(--text-dim); font-size:12.5px; margin:0 0 10px;">${escapeHtml(b.waarom)}</p>` : ''}
          <ul>${(b.shots || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          <div class="cs-idea-actions"><button type="button" class="btn-icon cs-dd-delete" data-id="${b.id}">✕</button></div>
        </div>
      </div>`).join('') : '<div class="empty-note">Nog geen draaidag-blokken.</div>'}
  `;
  panel.querySelectorAll('.cs-dd-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Verwijderen?')) return;
      try {
        await deleteContentDraaidag(btn.dataset.id);
        cache.draaidag = cache.draaidag.filter((b) => b.id !== btn.dataset.id);
        renderDraaidagPanel(panel);
      } catch (err) { showToast(err.message, true); }
    });
  });
  document.getElementById('cs-dd-add')?.addEventListener('click', () => {
    openModal(`
      <div class="modal-header"><h2>Draaidag-blok toevoegen</h2></div>
      <form id="cs-dd-form">
        <div class="field-row">
          <div class="field"><label>Tijd</label><input type="text" id="dd-tijd" placeholder="07:00"></div>
          <div class="field"><label>Blok</label><input type="text" id="dd-blok" placeholder="A"></div>
        </div>
        <div class="field"><label>Titel</label><input type="text" id="dd-titel" required></div>
        <div class="field"><label>Waarom</label><textarea id="dd-waarom" rows="2"></textarea></div>
        <div class="field"><label>Shots (1 per regel)</label><textarea id="dd-shots" rows="4"></textarea></div>
        <div class="modal-actions">
          <div></div>
          <div class="modal-actions-right">
            <button type="button" class="btn btn-ghost" id="dd-cancel">Annuleren</button>
            <button type="submit" class="btn btn-red">Toevoegen</button>
          </div>
        </div>
      </form>
    `);
    document.getElementById('dd-cancel').addEventListener('click', closeModal);
    document.getElementById('cs-dd-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        client_id: selectedClientId,
        tijd: document.getElementById('dd-tijd').value.trim() || null,
        blok: document.getElementById('dd-blok').value.trim() || null,
        titel: document.getElementById('dd-titel').value.trim(),
        waarom: document.getElementById('dd-waarom').value.trim() || null,
        shots: document.getElementById('dd-shots').value.split('\n').map((s) => s.trim()).filter(Boolean),
        volgorde: cache.draaidag.length,
      };
      try {
        const created = await createContentDraaidag(payload);
        cache.draaidag.push(created);
        closeModal();
        renderPanel();
        showToast('Toegevoegd');
      } catch (err) { showToast(err.message, true); }
    });
  });
}

// ── B-roll ───────────────────────────────────────────────
function renderBrollPanel(panel) {
  panel.innerHTML = `
    <div class="section-header-row">
      <p class="cs-lead">Losse shots om altijd bij te filmen.</p>
      <button type="button" class="btn btn-red btn-small" id="cs-broll-add">+ Item</button>
    </div>
    ${cache.broll.length ? `<ul class="cs-broll">${cache.broll.map((b) => `
      <li><span>${escapeHtml(b.tekst)}</span> <button type="button" class="btn-icon cs-broll-delete" data-id="${b.id}">✕</button></li>
    `).join('')}</ul>` : '<div class="empty-note">Nog geen b-roll-lijst.</div>'}
  `;
  panel.querySelectorAll('.cs-broll-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await deleteContentBroll(btn.dataset.id);
        cache.broll = cache.broll.filter((b) => b.id !== btn.dataset.id);
        renderBrollPanel(panel);
      } catch (err) { showToast(err.message, true); }
    });
  });
  document.getElementById('cs-broll-add')?.addEventListener('click', async () => {
    const tekst = prompt('Nieuw b-roll-item:');
    if (!tekst?.trim()) return;
    try {
      const created = await createContentBroll({ client_id: selectedClientId, tekst: tekst.trim(), volgorde: cache.broll.length });
      cache.broll.push(created);
      renderPanel();
    } catch (err) { showToast(err.message, true); }
  });
}

// ── Planner ──────────────────────────────────────────────
function renderPlannerPanel(panel) {
  panel.innerHTML = `
    <p class="cs-lead">Vijf rollen, vijf video's voor de volgende maand — elke short een ander doel.</p>
    <table class="cs-plan">
      <thead><tr><th>Rol</th><th>Format</th><th>Onderwerp</th><th>Hook</th><th></th></tr></thead>
      <tbody>
        ${ROLLEN.map((rol) => {
          const row = cache.planner.find((p) => p.rol === rol) || { rol };
          return `
          <tr data-rol="${rol}">
            <td><span class="cs-role">${ROL_LABELS[rol]}</span></td>
            <td><input type="text" class="cs-planner-field" data-field="format" data-rol="${rol}" value="${escapeAttr(row.format || '')}"></td>
            <td><input type="text" class="cs-planner-field" data-field="onderwerp" data-rol="${rol}" value="${escapeAttr(row.onderwerp || '')}"></td>
            <td><input type="text" class="cs-planner-field" data-field="hook" data-rol="${rol}" value="${escapeAttr(row.hook || '')}"></td>
            <td>${row.id ? `<button type="button" class="btn btn-red btn-small cs-planner-send" data-rol="${rol}">Stuur</button>` : ''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <button type="button" class="btn btn-ghost btn-small" id="cs-planner-save" style="margin-top:14px;">Planner opslaan</button>
  `;
  document.getElementById('cs-planner-save').addEventListener('click', async () => {
    try {
      for (const rol of ROLLEN) {
        const existing = cache.planner.find((p) => p.rol === rol);
        const format = panel.querySelector(`.cs-planner-field[data-field="format"][data-rol="${rol}"]`).value.trim();
        const onderwerp = panel.querySelector(`.cs-planner-field[data-field="onderwerp"][data-rol="${rol}"]`).value.trim();
        const hook = panel.querySelector(`.cs-planner-field[data-field="hook"][data-rol="${rol}"]`).value.trim();
        if (!format && !onderwerp && !hook && !existing) continue;
        const saved = await saveContentPlannerRow(existing?.id || null, {
          client_id: selectedClientId, rol, format: format || null, onderwerp: onderwerp || null, hook: hook || null,
        });
        const idx = cache.planner.findIndex((p) => p.rol === rol);
        if (idx >= 0) cache.planner[idx] = saved; else cache.planner.push(saved);
      }
      renderPanel();
      showToast('Planner opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
  panel.querySelectorAll('.cs-planner-send').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = cache.planner.find((p) => p.rol === btn.dataset.rol);
      if (row) openSendModal('planner', row);
    });
  });
}

// ── Strategie (klant-info) ──────────────────────────────
function renderStrategiePanel(panel) {
  const s = cache.strategie || {};
  panel.innerHTML = `
    <form id="cs-strategie-form">
      <div class="field-row">
        <div class="field"><label>Sector</label><input type="text" id="cst-sector" value="${escapeAttr(s.sector || '')}"></div>
        <div class="field"><label>Volume</label><input type="text" id="cst-volume" value="${escapeAttr(s.volume || '')}" placeholder="5 shorts per maand"></div>
      </div>
      <div class="field"><label>Doelen (1 per regel)</label><textarea id="cst-doelen" rows="2">${escapeHtml((s.doelen || []).join('\n'))}</textarea></div>
      <div class="field"><label>Doelgroepen (1 per regel)</label><textarea id="cst-doelgroepen" rows="3">${escapeHtml((s.doelgroepen || []).join('\n'))}</textarea></div>
      <div class="field"><label>Kernboodschap</label><textarea id="cst-kernboodschap" rows="2">${escapeHtml(s.kernboodschap || '')}</textarea></div>
      <button type="submit" class="btn btn-red btn-small">Opslaan</button>
    </form>
  `;
  document.getElementById('cs-strategie-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      sector: document.getElementById('cst-sector').value.trim() || null,
      volume: document.getElementById('cst-volume').value.trim() || null,
      doelen: document.getElementById('cst-doelen').value.split('\n').map((v) => v.trim()).filter(Boolean),
      doelgroepen: document.getElementById('cst-doelgroepen').value.split('\n').map((v) => v.trim()).filter(Boolean),
      kernboodschap: document.getElementById('cst-kernboodschap').value.trim() || null,
    };
    try {
      cache.strategie = await saveContentStrategie(selectedClientId, payload);
      showToast('Opgeslagen');
    } catch (err) { showToast(err.message, true); }
  });
}

// ── Doorsturen naar klant ────────────────────────────────
function openSendModal(kind, item) {
  const projects = state.projects.filter((p) => p.client_id === selectedClientId);
  if (!projects.length) {
    showToast('Deze klant heeft nog geen opdracht gekoppeld — koppel er eerst één via Klant & Contract.', true);
    return;
  }
  openModal(`
    <div class="modal-header"><h2>Doorsturen naar klant</h2></div>
    <form id="cs-send-form">
      <div class="field"><label>Opdracht</label>
        <select id="cs-send-project">${projects.map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Voorbeeldlink (bv. Instagram-reel, optioneel)</label><input type="url" id="cs-send-reel" value="${escapeAttr(item.voorbeeld_link || '')}" placeholder="https://instagram.com/reel/..."></div>
      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="cs-send-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Versturen</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('cs-send-cancel').addEventListener('click', closeModal);
  document.getElementById('cs-send-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('cs-send-project').value;
    const reel = document.getElementById('cs-send-reel').value.trim();
    const { title, content, type } = buildConceptPayload(kind, item, reel);
    try {
      await createConcept({ project_id: projectId, type, title, content });
      closeModal();
      showToast('Verstuurd naar klant — te zien via Ideeën & Scripts op die opdracht');
      const project = state.projects.find((p) => p.id === projectId);
      if (project?.client_user_id) {
        notifyNewConcept(projectId, title, type)
          .then(() => showToast('Klant per mail verwittigd'))
          .catch((err) => showToast('Kon klant niet mailen: ' + err.message, true));
      }
    } catch (err) { showToast(err.message, true); }
  });
}

function buildConceptPayload(kind, item, reel) {
  if (kind === 'idee') {
    const lines = [item.wat, item.hook ? `Hook: "${item.hook}"` : null, item.lengte ? `Lengte: ${item.lengte}` : null, item.heroshot ? `Heroshot: ${item.heroshot}` : null];
    if (reel) lines.push(`Voorbeeld: ${reel}`);
    return { title: item.naam, content: lines.filter(Boolean).join('\n'), type: 'idee' };
  }
  if (kind === 'script') {
    const shots = Array.isArray(item.shots) ? item.shots : [];
    const shotLines = shots.map((s) => [
      s.tijd, s.beeld,
      s.tekst_in_beeld ? `Tekst in beeld: ${s.tekst_in_beeld}` : null,
      s.gesproken ? `Gesproken: ${s.gesproken}` : null,
    ].filter(Boolean).join('\n'));
    const lines = [item.meta, ...shotLines, item.regie ? `Regie: ${item.regie}` : null];
    if (reel) lines.push(`Voorbeeld: ${reel}`);
    return { title: item.titel, content: lines.filter(Boolean).join('\n\n'), type: 'script' };
  }
  // planner row
  const lines = [item.format ? `Format: ${item.format}` : null, item.onderwerp ? `Onderwerp: ${item.onderwerp}` : null, item.hook ? `Hook: "${item.hook}"` : null];
  if (reel) lines.push(`Voorbeeld: ${reel}`);
  return { title: `${ROL_LABELS[item.rol]} — ${item.onderwerp || item.format || 'idee'}`, content: lines.filter(Boolean).join('\n'), type: 'idee' };
}
