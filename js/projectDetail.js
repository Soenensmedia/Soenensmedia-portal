import { state, STATUS_ORDER, STATUS_LABELS, fmtDate, fmtDateShort, projectById } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { updateProject, deleteProject, linkClientByEmail, fetchProject, uploadPhoto, listPhotos, deletePhoto, notifyStatusChange } from './data.js';
import { openModal, closeModal } from './modal.js';
import { renderDashboard } from './dashboard.js';
import { showToast } from './toast.js';

export function openProjectDetail(id) {
  const p = projectById(id);
  if (!p) return;

  const linkedEvents = state.events
    .filter((e) => e.project_id === id)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const linkedEntries = state.timeEntries.filter((t) => t.project_id === id);
  const totalHours = linkedEntries.reduce((sum, t) => sum + Number(t.hours), 0);

  openModal(`
    <div class="modal-header"><h2>Opdracht</h2></div>
    <form id="pd-form">
      <div class="field"><label>Klant</label><input type="text" id="pd-client" value="${escapeAttr(p.client_name)}" required></div>
      <div class="field"><label>Titel</label><input type="text" id="pd-title" value="${escapeAttr(p.title)}" required></div>
      <div class="field-row">
        <div class="field"><label>Status</label>
          <select id="pd-status">${STATUS_ORDER.map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Deadline</label><input type="date" id="pd-deadline" value="${p.deadline ?? ''}"></div>
      </div>
      <div class="field"><label>Notities</label><textarea id="pd-notes" rows="3">${escapeHtml(p.notes ?? '')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-danger" id="pd-delete">Verwijderen</button>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="pd-cancel">Sluiten</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>

    <div class="detail-section">
      <h3>Klantenportaal</h3>
      <div class="field"><label>Frame.io link</label><input type="url" id="pd-frame-url" value="${escapeAttr(p.frame_io_url ?? '')}" placeholder="https://..."></div>
      <div class="field">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="pd-frame-is-folder" style="width:auto;" ${p.frame_io_is_folder ? 'checked' : ''}>
          Dit is een map met meerdere items (geen preview mogelijk — toont enkel een knop)
        </label>
      </div>
      <div class="field">
        <label>Klant koppelen (e-mail van hun portaal-account)</label>
        <div class="field-row">
          <input type="email" id="pd-client-email" placeholder="klant@bedrijf.be">
          <button type="button" class="btn btn-ghost btn-small" id="pd-link-client">Koppelen</button>
        </div>
      </div>
      <div class="empty-note">
        ${p.client_user_id ? 'Klant is gekoppeld aan dit project.' : 'Nog geen klant gekoppeld — de klant moet eerst zelf een account aanmaken.'}
        ${p.client_approved ? ` Goedgekeurd door klant op ${fmtDate(new Date(p.client_approved_at))}.` : ''}
      </div>
      <div class="field"><label>Briefing / omschrijving voor klant</label><textarea id="pd-client-brief" rows="3" placeholder="Korte uitleg over het project, wat er is afgesproken...">${escapeHtml(p.client_brief ?? '')}</textarea></div>
      <div class="field"><label>Deliverables</label><textarea id="pd-deliverables" rows="2" placeholder="Bv. 20 foto's, 1 video van 2 minuten">${escapeHtml(p.deliverables ?? '')}</textarea></div>
    </div>

    <div class="detail-section">
      <h3>Foto's</h3>
      <div class="field-row">
        <input type="file" id="pd-photo-input" accept="image/*" multiple>
        <button type="button" class="btn btn-ghost btn-small" id="pd-photo-upload">Uploaden</button>
      </div>
      <div class="photo-grid" id="pd-photo-grid"><div class="empty-note">Laden...</div></div>
    </div>

    <div class="detail-section">
      <h3>Agenda-items (${linkedEvents.length})</h3>
      ${linkedEvents.length
        ? linkedEvents.map((e) => `<div class="detail-list-item"><span>${escapeHtml(e.title)}</span><span>${fmtDateShort(new Date(e.start_time))}</span></div>`).join('')
        : '<div class="empty-note">Nog geen agenda-items gekoppeld.</div>'}
    </div>

    <div class="detail-section">
      <h3>Uren (totaal: ${totalHours}u)</h3>
      ${linkedEntries.length
        ? linkedEntries.map((t) => `<div class="detail-list-item"><span>${fmtDate(new Date(t.entry_date))} — ${escapeHtml(t.description ?? '')}</span><span>${t.hours}u</span></div>`).join('')
        : '<div class="empty-note">Nog geen uren gelogd voor deze opdracht.</div>'}
    </div>
  `);

  document.getElementById('pd-cancel').addEventListener('click', closeModal);

  document.getElementById('pd-delete').addEventListener('click', async () => {
    if (!confirm(`"${p.title}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    try {
      await deleteProject(id);
      state.projects = state.projects.filter((x) => x.id !== id);
      closeModal();
      renderDashboard();
      showToast('Opdracht verwijderd');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('pd-link-client').addEventListener('click', async () => {
    const email = document.getElementById('pd-client-email').value.trim();
    if (!email) return;
    try {
      await linkClientByEmail(id, email);
      const updated = await fetchProject(id);
      const idx = state.projects.findIndex((x) => x.id === id);
      state.projects[idx] = updated;
      showToast('Klant gekoppeld');
      closeModal();
      openProjectDetail(id);
      renderDashboard();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('pd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      client_name: document.getElementById('pd-client').value.trim(),
      title: document.getElementById('pd-title').value.trim(),
      status: document.getElementById('pd-status').value,
      deadline: document.getElementById('pd-deadline').value || null,
      notes: document.getElementById('pd-notes').value.trim() || null,
      frame_io_url: document.getElementById('pd-frame-url').value.trim() || null,
      frame_io_is_folder: document.getElementById('pd-frame-is-folder').checked,
      client_brief: document.getElementById('pd-client-brief').value.trim() || null,
      deliverables: document.getElementById('pd-deliverables').value.trim() || null,
    };
    const statusChanged = payload.status !== p.status;
    try {
      const updated = await updateProject(id, payload);
      const idx = state.projects.findIndex((x) => x.id === id);
      state.projects[idx] = updated;
      closeModal();
      renderDashboard();
      showToast('Opdracht bijgewerkt');
    } catch (err) {
      showToast(err.message, true);
      return;
    }
    if (statusChanged && p.client_user_id) {
      notifyStatusChange(id)
        .then(() => showToast('Klant per mail verwittigd'))
        .catch((err) => showToast('Kon klant niet mailen: ' + err.message, true));
    }
  });

  refreshPhotoGrid(id);

  document.getElementById('pd-photo-upload').addEventListener('click', async () => {
    const input = document.getElementById('pd-photo-input');
    const files = Array.from(input.files || []);
    if (!files.length) return;
    try {
      for (const file of files) {
        await uploadPhoto(id, file);
      }
      input.value = '';
      showToast(`${files.length} foto('s) geüpload`);
      refreshPhotoGrid(id);
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function refreshPhotoGrid(projectId) {
  const grid = document.getElementById('pd-photo-grid');
  if (!grid) return;
  try {
    const photos = await listPhotos(projectId);
    if (!grid.isConnected) return;
    grid.innerHTML = photos.length
      ? photos.map((p) => `
        <div class="photo-thumb">
          <img src="${escapeAttr(p.url)}" alt="">
          <button type="button" class="photo-thumb-delete" data-name="${escapeAttr(p.name)}">✕</button>
        </div>`).join('')
      : '<div class="empty-note">Nog geen foto\'s geüpload.</div>';

    grid.querySelectorAll('.photo-thumb-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Deze foto verwijderen?')) return;
        try {
          await deletePhoto(projectId, btn.dataset.name);
          refreshPhotoGrid(projectId);
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    if (grid.isConnected) {
      grid.innerHTML = `<div class="empty-note">Kon foto's niet laden: ${escapeHtml(err.message)}</div>`;
    }
  }
}
