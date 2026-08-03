import { state } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { fetchContentPosts, createContentPost, updateContentPost, deleteContentPost, fetchContentGoals, saveContentGoal } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

const PLATFORM_LABELS = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', facebook: 'Facebook', ander: 'Ander' };
const TYPE_LABELS = { bts: 'BTS', reel: 'Reel', testimonial: 'Testimonial', tips: 'Tips', aftermovie: 'Aftermovie-fragment', showreel: 'Showreel-fragment', persoonlijk: 'Persoonlijk verhaal', ander: 'Ander' };
const STATUS_LABELS = { idee: 'Idee', opname: 'Opname', montage: 'Montage', gepland: 'Gepland', gepost: 'Gepost' };
const STATUS_ORDER = ['idee', 'opname', 'montage', 'gepland', 'gepost'];

let postsCache = [];
let goalsCache = [];

export async function renderContent() {
  const container = document.getElementById('content-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    [postsCache, goalsCache] = await Promise.all([fetchContentPosts(), fetchContentGoals()]);
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon content niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  renderContentShell();
}

function renderContentShell() {
  const container = document.getElementById('content-container');
  container.innerHTML = `
    <div class="stats-row" id="content-goals-row"></div>
    <div class="view-header" style="margin: 20px 0 14px;">
      <h3 style="font-size: 1.1rem; color: #fff;">Posts</h3>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn btn-ghost btn-small" id="content-goals-edit">Doelen instellen</button>
        <button type="button" class="btn btn-red btn-small" id="content-post-add">+ Post toevoegen</button>
      </div>
    </div>
    <div id="content-posts-list"></div>
  `;
  renderGoalsRow();
  renderPostsList();
  document.getElementById('content-goals-edit').addEventListener('click', openGoalsForm);
  document.getElementById('content-post-add').addEventListener('click', () => openPostForm());
}

function postsThisMonth(platform) {
  const now = new Date();
  return postsCache.filter((p) => {
    if (p.platform !== platform) return false;
    const dateStr = p.gepost_op || p.gepland_op;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

function renderGoalsRow() {
  const el = document.getElementById('content-goals-row');
  const active = goalsCache.filter((g) => g.doel_per_week > 0);
  if (!active.length) {
    el.innerHTML = '<div class="empty-note">Nog geen postfrequentie-doelen ingesteld — klik op "Doelen instellen".</div>';
    return;
  }
  el.innerHTML = active.map((g) => {
    const doelMaand = Math.round(g.doel_per_week * 4.33);
    const gedaan = postsThisMonth(g.platform);
    return `
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(PLATFORM_LABELS[g.platform] ?? g.platform)}</div>
        <div class="stat-value">${gedaan}/${doelMaand}</div>
        <div class="stat-sub">${g.doel_per_week}x/week doel — deze maand</div>
      </div>`;
  }).join('');
}

function renderPostsList() {
  const el = document.getElementById('content-posts-list');
  if (!postsCache.length) {
    el.innerHTML = '<div class="empty-note">Nog geen content gepland. Klik op "+ Post toevoegen".</div>';
    return;
  }
  const sorted = [...postsCache].sort((a, b) => {
    const da = a.gepland_op || a.gepost_op || '9999';
    const db = b.gepland_op || b.gepost_op || '9999';
    return da < db ? -1 : da > db ? 1 : 0;
  });
  el.innerHTML = `<div class="concept-list">${sorted.map(postCardHtml).join('')}</div>`;

  el.querySelectorAll('.content-card').forEach((card) => {
    card.addEventListener('click', () => {
      const post = postsCache.find((p) => p.id === card.dataset.id);
      if (post) openPostForm(post);
    });
  });
}

function postCardHtml(p) {
  const project = p.project_id ? state.projects.find((x) => x.id === p.project_id) : null;
  return `
    <div class="concept-card content-card" data-id="${p.id}">
      <div class="concept-card-header">
        <span class="badge-status script">${escapeHtml(PLATFORM_LABELS[p.platform] ?? p.platform)}</span>
        <span class="badge-status idee">${escapeHtml(TYPE_LABELS[p.type] ?? p.type)}</span>
        <span class="badge-status ${p.status === 'gepost' ? 'goedgekeurd' : p.status === 'idee' ? '' : 'in_afwachting'}">${STATUS_LABELS[p.status] ?? p.status}</span>
      </div>
      <div class="concept-card-title">${escapeHtml(p.titel)}</div>
      ${p.caption ? `<p class="concept-card-content">${escapeHtml(p.caption)}</p>` : ''}
      <div class="hint-dim">
        ${p.gepland_op ? `Gepland: ${p.gepland_op}` : ''}${p.gepost_op ? ` · Gepost: ${p.gepost_op}` : ''}
        ${project ? ` · Project: ${escapeHtml(project.title)}` : ''}
      </div>
    </div>`;
}

function openPostForm(post = null) {
  const projectOptions = state.projects
    .map((p) => `<option value="${p.id}" ${post?.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.client_name)} — ${escapeHtml(p.title)}</option>`)
    .join('');

  openModal(`
    <div class="modal-header"><h2>${post ? 'Post bewerken' : 'Post toevoegen'}</h2></div>
    <form id="content-form">
      <div class="field"><label>Titel</label><input type="text" id="cf-titel" value="${escapeAttr(post?.titel ?? '')}" required></div>
      <div class="field-row">
        <div class="field"><label>Platform</label>
          <select id="cf-platform">${Object.entries(PLATFORM_LABELS).map(([v, l]) => `<option value="${v}" ${post?.platform === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Type</label>
          <select id="cf-type">${Object.entries(TYPE_LABELS).map(([v, l]) => `<option value="${v}" ${post?.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
      </div>
      <div class="field"><label>Status</label>
        <select id="cf-status">${STATUS_ORDER.map((v) => `<option value="${v}" ${(post?.status ?? 'idee') === v ? 'selected' : ''}>${STATUS_LABELS[v]}</option>`).join('')}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Geplande datum</label><input type="date" id="cf-gepland" value="${post?.gepland_op ?? ''}"></div>
        <div class="field"><label>Gepost op</label><input type="date" id="cf-gepost" value="${post?.gepost_op ?? ''}"></div>
      </div>
      <div class="field"><label>Gekoppeld project (optioneel)</label>
        <select id="cf-project"><option value="">— Geen —</option>${projectOptions}</select>
      </div>
      <div class="field"><label>Caption/tekst</label><textarea id="cf-caption" rows="4">${escapeHtml(post?.caption ?? '')}</textarea></div>
      <div class="modal-actions">
        ${post ? '<button type="button" class="btn btn-danger" id="cf-delete">Verwijderen</button>' : '<div></div>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="cf-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById('cf-cancel').addEventListener('click', closeModal);

  document.getElementById('cf-delete')?.addEventListener('click', async () => {
    if (!confirm('Deze post verwijderen?')) return;
    try {
      await deleteContentPost(post.id);
      postsCache = postsCache.filter((x) => x.id !== post.id);
      closeModal();
      renderContentShell();
      showToast('Verwijderd');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('content-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      titel: document.getElementById('cf-titel').value.trim(),
      platform: document.getElementById('cf-platform').value,
      type: document.getElementById('cf-type').value,
      status: document.getElementById('cf-status').value,
      gepland_op: document.getElementById('cf-gepland').value || null,
      gepost_op: document.getElementById('cf-gepost').value || null,
      project_id: document.getElementById('cf-project').value || null,
      caption: document.getElementById('cf-caption').value.trim() || null,
    };
    try {
      if (post) {
        const updated = await updateContentPost(post.id, payload);
        const idx = postsCache.findIndex((x) => x.id === post.id);
        postsCache[idx] = updated;
        showToast('Post bijgewerkt');
      } else {
        const created = await createContentPost(payload);
        postsCache.push(created);
        showToast('Post toegevoegd');
      }
      closeModal();
      renderContentShell();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

export function openGoalsForm() {
  const platforms = Object.keys(PLATFORM_LABELS);
  const goalFor = (platform) => goalsCache.find((g) => g.platform === platform)?.doel_per_week ?? 0;

  openModal(`
    <div class="modal-header"><h2>Postfrequentie-doelen (per week)</h2></div>
    <form id="goals-form">
      ${platforms.map((p) => `
        <div class="field"><label>${PLATFORM_LABELS[p]}</label><input type="number" min="0" step="1" id="goal-${p}" value="${goalFor(p)}"></div>
      `).join('')}
      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="goals-cancel">Sluiten</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById('goals-cancel').addEventListener('click', closeModal);

  document.getElementById('goals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const updates = await Promise.all(platforms.map((p) => {
        const val = Number(document.getElementById(`goal-${p}`).value) || 0;
        return saveContentGoal(p, val);
      }));
      goalsCache = updates;
      closeModal();
      renderContentShell();
      showToast('Doelen opgeslagen');
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
