import { state, STATUS_LABELS, fmtDate } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { fetchProjects, fetchProjectFeedback, createFeedback, approveProject, listPhotos } from './data.js';
import { showToast } from './toast.js';

export async function renderClientView() {
  const container = document.getElementById('client-projects-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';

  let projects;
  try {
    projects = await fetchProjects();
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon projecten niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }

  state.clientProjects = projects;

  if (!projects.length) {
    container.innerHTML = '<div class="empty-note">Er is nog geen project aan je account gekoppeld. Neem contact op met SoenensMedia.</div>';
    return;
  }

  await Promise.all(projects.map(async (p) => {
    try {
      state.clientFeedbackByProject[p.id] = await fetchProjectFeedback(p.id);
    } catch {
      state.clientFeedbackByProject[p.id] = [];
    }
    try {
      state.clientPhotosByProject[p.id] = await listPhotos(p.id);
    } catch {
      state.clientPhotosByProject[p.id] = [];
    }
  }));

  if (state.activeClientProjectId && projects.some((p) => p.id === state.activeClientProjectId)) {
    renderClientProjectDetail(state.activeClientProjectId);
  } else {
    renderClientList();
  }
}

function renderClientList() {
  state.activeClientProjectId = null;
  const container = document.getElementById('client-projects-container');
  const name = state.profile?.full_name || state.profile?.email || '';
  const count = state.clientProjects.length;

  container.innerHTML = `
    <div class="client-welcome">
      <div class="client-welcome-title">Welkom${name ? ', ' + escapeHtml(name) : ''}</div>
      <div class="client-welcome-sub">${count === 1 ? '1 project' : count + ' projecten'} klaarstaand voor jou</div>
    </div>
    <div class="client-project-tiles">
      ${state.clientProjects.map(tileHtml).join('')}
    </div>`;

  container.querySelectorAll('.client-project-tile').forEach((el) => {
    el.addEventListener('click', () => renderClientProjectDetail(el.dataset.id));
  });
}

function tileHtml(p) {
  const photos = state.clientPhotosByProject[p.id] || [];
  const cover = photos[0]?.url;
  return `
    <div class="client-project-tile" data-id="${p.id}">
      <div class="tile-cover" ${cover ? `style="background-image:url('${escapeAttr(cover)}')"` : ''}>
        ${!cover ? '<span class="tile-cover-placeholder">SM</span>' : ''}
      </div>
      <div class="tile-info">
        <div class="tile-title">${escapeHtml(p.title)}</div>
        <div class="tile-status">${escapeHtml(STATUS_LABELS[p.status] || p.status)}</div>
      </div>
    </div>`;
}

function renderClientProjectDetail(projectId) {
  state.activeClientProjectId = projectId;
  const p = state.clientProjects.find((x) => x.id === projectId);
  if (!p) {
    renderClientList();
    return;
  }
  const feedback = state.clientFeedbackByProject[p.id] || [];
  const photos = state.clientPhotosByProject[p.id] || [];

  const container = document.getElementById('client-projects-container');
  container.innerHTML = `
    <button type="button" class="btn btn-ghost btn-small client-back-btn" id="client-back-btn">‹ Terug naar projecten</button>
    ${projectDetailHtml(p, feedback, photos)}
  `;

  document.getElementById('client-back-btn').addEventListener('click', renderClientList);
  wireProjectDetailEvents(p, photos);
  applyMosaicLayout(container);
}

// Elke 5de foto krijgt een groter formaat, gebaseerd op de echte afmetingen
// (rechtop vs liggend) zodat een staande foto nooit plat-getrokken wordt.
function applyMosaicLayout(container) {
  container.querySelectorAll('.gallery-mosaic .photo-thumb').forEach((thumb, i) => {
    if ((i + 1) % 5 !== 0) return;
    const img = thumb.querySelector('img');
    const decide = () => {
      const portrait = img.naturalHeight > img.naturalWidth;
      thumb.classList.add(portrait ? 'mosaic-tall' : 'mosaic-big');
    };
    if (img.complete && img.naturalWidth) {
      decide();
    } else {
      img.addEventListener('load', decide, { once: true });
    }
  });
}

function projectDetailHtml(p, feedback, photos) {
  return `
    <div class="client-project-card">
      <div class="client-project-header">
        <div>
          <div class="title">${escapeHtml(p.title)}</div>
          <div class="deadline">Status: ${escapeHtml(STATUS_LABELS[p.status] || p.status)}</div>
        </div>
        ${p.client_approved
          ? `<span class="approve-banner approved">Goedgekeurd op ${fmtDate(new Date(p.client_approved_at))}</span>`
          : `<button class="btn btn-red btn-small" id="approve-btn-${p.id}">Goedkeuren</button>`}
      </div>

      ${(p.client_brief || p.deliverables) ? `
        <div class="detail-section">
          ${p.client_brief ? `<p class="client-brief-text">${escapeHtml(p.client_brief)}</p>` : ''}
          ${p.deliverables ? `<div class="deliverables-box"><h3>Deliverables</h3><p>${escapeHtml(p.deliverables)}</p></div>` : ''}
        </div>` : ''}

      ${photos.length ? `
        <div class="detail-section">
          <div class="section-header-row">
            <h3>Foto's</h3>
            <button type="button" class="btn btn-ghost btn-small" id="download-all-btn">Download alles</button>
          </div>
          <div class="photo-grid gallery-mosaic">
            ${photos.map((ph, i) => `<div class="photo-thumb" data-index="${i}"><img src="${escapeAttr(ph.url)}" alt=""></div>`).join('')}
          </div>
        </div>` : ''}

      ${p.frame_io_url ? `
        <div class="detail-section">
          <h3>Review</h3>
          ${p.frame_io_is_folder
            ? `<div class="frame-folder-card">
                 <div class="frame-folder-text">
                   <div class="frame-folder-title">Volledige levering klaar</div>
                   <div class="frame-folder-sub">Bekijk alle bestanden en geef feedback op Frame.io</div>
                 </div>
                 <a class="btn btn-red btn-small" href="${escapeAttr(p.frame_io_url)}" target="_blank" rel="noopener">Openen</a>
               </div>`
            : `<div class="frame-embed-wrapper"><iframe src="${escapeAttr(p.frame_io_url)}" allow="fullscreen" loading="lazy"></iframe></div>
               <a class="btn btn-ghost btn-small" href="${escapeAttr(p.frame_io_url)}" target="_blank" rel="noopener">Open in Frame.io</a>`}
        </div>` : ''}

      <div class="detail-section">
        <h3>Feedback</h3>
        ${feedback.length
          ? feedback.map((f) => `<div class="detail-list-item"><span>${escapeHtml(f.message)}</span><span>${fmtDate(new Date(f.created_at))}</span></div>`).join('')
          : '<div class="empty-note">Nog geen feedback.</div>'}
        <form id="fb-form-${p.id}" class="feedback-form">
          <input type="text" id="fb-input-${p.id}" placeholder="Schrijf feedback...">
          <button type="submit" class="btn btn-red btn-small">Versturen</button>
        </form>
      </div>
    </div>`;
}

function wireProjectDetailEvents(p, photos) {
  const form = document.getElementById(`fb-form-${p.id}`);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById(`fb-input-${p.id}`);
    const message = input.value.trim();
    if (!message) return;
    try {
      await createFeedback(p.id, message);
      state.clientFeedbackByProject[p.id] = await fetchProjectFeedback(p.id);
      showToast('Feedback verstuurd');
      renderClientProjectDetail(p.id);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  const approveBtn = document.getElementById(`approve-btn-${p.id}`);
  approveBtn?.addEventListener('click', async () => {
    if (!confirm('Dit project goedkeuren?')) return;
    try {
      await approveProject(p.id);
      state.clientProjects = await fetchProjects();
      showToast('Project goedgekeurd');
      renderClientProjectDetail(p.id);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.querySelectorAll('.photo-thumb').forEach((el) => {
    el.addEventListener('click', () => openLightbox(photos, Number(el.dataset.index)));
  });

  document.getElementById('download-all-btn')?.addEventListener('click', () => downloadAllPhotos(p, photos));
}

// ── lightbox met vorige/volgende navigatie ──────────────
function openLightbox(photos, startIndex) {
  let current = startIndex;
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  document.body.appendChild(overlay);

  function render() {
    const photo = photos[current];
    overlay.innerHTML = `
      <button type="button" class="lightbox-close">✕</button>
      ${photos.length > 1 ? '<button type="button" class="lightbox-nav lightbox-prev">‹</button>' : ''}
      <img src="${escapeAttr(photo.url)}" alt="">
      ${photos.length > 1 ? '<button type="button" class="lightbox-nav lightbox-next">›</button>' : ''}
      <button type="button" class="lightbox-download">Download</button>
    `;
    overlay.querySelector('.lightbox-prev')?.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
    overlay.querySelector('.lightbox-next')?.addEventListener('click', (e) => { e.stopPropagation(); go(1); });
    overlay.querySelector('.lightbox-download').addEventListener('click', (e) => { e.stopPropagation(); downloadPhoto(photo); });
  }

  function go(delta) {
    current = (current + delta + photos.length) % photos.length;
    render();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('lightbox-close')) close();
  });

  function onKey(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  }
  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  }
  document.addEventListener('keydown', onKey);
  render();
}

// ── downloads ────────────────────────────────────────────
function cleanFilename(name) {
  return name.replace(/^\d+_/, '');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

async function downloadPhoto(photo) {
  try {
    const res = await fetch(photo.url);
    const blob = await res.blob();
    triggerBlobDownload(blob, cleanFilename(photo.name));
  } catch (err) {
    showToast('Kon foto niet downloaden: ' + err.message, true);
  }
}

async function downloadAllPhotos(p, photos) {
  showToast('Zip wordt gemaakt...');
  try {
    const zip = new JSZip();
    await Promise.all(photos.map(async (photo) => {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      zip.file(cleanFilename(photo.name), blob);
    }));
    const content = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(content, `${slugify(p.title)}-fotos.zip`);
    showToast('Download gestart');
  } catch (err) {
    showToast('Kon zip niet maken: ' + err.message, true);
  }
}
