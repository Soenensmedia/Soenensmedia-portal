import { state, STATUS_ORDER, STATUS_LABELS, fmtDate, fmtDateShort, projectById } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { updateProject, deleteProject, linkClientByEmail, fetchProject, uploadPhoto, listPhotos, deletePhoto, notifyStatusChange, uploadAgreementFile, getAgreementFileUrl, deleteAgreementFile, fetchPortalContent, fetchFinSettings, fetchProjectFeedback, createFeedback } from './data.js';
import { openModal, closeModal } from './modal.js';
import { renderDashboard } from './dashboard.js';
import { showToast } from './toast.js';
import { generateAgreementCopyPdf, downloadPdf } from './pdf.js';
import { markProjectSeen } from './notifications.js';

export function openProjectDetail(id) {
  const p = projectById(id);
  if (!p) return;

  markProjectSeen(p);

  const linkedEvents = state.events
    .filter((e) => e.project_id === id)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const linkedEntries = state.timeEntries.filter((t) => t.project_id === id);
  const totalHours = linkedEntries.reduce((sum, t) => sum + Number(t.hours), 0);

  openModal(`
    <div class="modal-header"><h2>Opdracht</h2></div>
    <form id="pd-form">
      <div class="client-tabs" id="pd-tabs" style="margin-top:0;">
        <button type="button" class="client-tab-btn active" data-pdtab="opdracht">Opdracht</button>
        <button type="button" class="client-tab-btn" data-pdtab="klant">Klant & Contract</button>
        <button type="button" class="client-tab-btn" data-pdtab="media">Media & Archief</button>
        <button type="button" class="client-tab-btn" data-pdtab="activiteit">Activiteit & Feedback</button>
      </div>

      <div class="pd-tab-panel" data-pdpanel="opdracht">
        <div class="field"><label>Klant</label><input type="text" id="pd-client" value="${escapeAttr(p.client_name)}" required></div>
        <div class="field"><label>Titel</label><input type="text" id="pd-title" value="${escapeAttr(p.title)}" required></div>
        <div class="field-row">
          <div class="field"><label>Status</label>
            <select id="pd-status">${STATUS_ORDER.map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Deadline</label><input type="date" id="pd-deadline" value="${p.deadline ?? ''}"></div>
        </div>
        <div class="field"><label>Notities</label><textarea id="pd-notes" rows="3">${escapeHtml(p.notes ?? '')}</textarea></div>
        <div class="field"><label>Klant (uit klantenlijst)</label>
          <select id="pd-client-id">
            <option value="">— Geen —</option>
            ${state.clients.map((c) => `<option value="${c.id}" ${p.client_id === c.id ? 'selected' : ''}>${escapeHtml(c.naam)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="pd-tab-panel hidden" data-pdpanel="klant">
        <div class="detail-section" style="border-top:none; padding-top:0;">
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
          <button type="button" class="btn btn-ghost btn-small" id="pd-open-scripting">→ Ideeën & Scripts voor dit project</button>
        </div>

        <div class="detail-section">
          <h3>Overeenkomst (optioneel)</h3>
          <div class="empty-note">Leeg = geen overeenkomst nodig, klant ziet meteen de rest van het project. Ingevuld (tekst of bestand) = klant moet eerst tekenen voor die verder mag.</div>
          <div class="field-row" style="margin-bottom:10px;">
            <button type="button" class="btn btn-ghost btn-small" id="pd-agreement-template">Gebruik standaardcontract</button>
          </div>
          <div class="field"><label>Tekst van de overeenkomst</label><textarea id="pd-agreement" rows="6" placeholder="Voorwaarden, prijsafspraak, gebruiksrechten, ...">${escapeHtml(p.agreement_content ?? '')}</textarea></div>
          <div class="field">
            <label>Eigen contract-PDF (optioneel — overschrijft de tekst hierboven voor de klant)</label>
            <div id="pd-agreement-file-wrap">
              ${p.agreement_bestand_naam ? `
                <div class="detail-list-item">
                  <span>📄 ${escapeHtml(p.agreement_bestand_naam)}</span>
                  <button type="button" class="btn btn-ghost btn-small" id="pd-agreement-file-remove">Verwijderen</button>
                </div>` : ''}
            </div>
            <input type="file" id="pd-agreement-file-input" accept="application/pdf,image/*">
            <button type="button" class="btn btn-ghost btn-small" id="pd-agreement-file-upload">Uploaden</button>
          </div>
          ${p.agreement_signed_at
            ? `<div class="empty-note">Getekend door <strong>${escapeHtml(p.agreement_signed_name ?? '')}</strong> op ${fmtDate(new Date(p.agreement_signed_at))}.
                <button type="button" class="btn-icon" id="pd-reset-agreement" title="Handtekening wissen (bv. na wijziging voorwaarden)">✕</button>
              </div>
              <button type="button" class="btn btn-ghost btn-small" id="pd-agreement-copy">Download kopie (ondertekeningsbewijs)</button>`
            : '<div class="empty-note">Nog niet ondertekend.</div>'}
        </div>
      </div>

      <div class="pd-tab-panel hidden" data-pdpanel="media">
        <div class="detail-section" style="border-top:none; padding-top:0;">
          <h3>Foto's</h3>
          <div class="field-row">
            <input type="file" id="pd-photo-input" accept="image/*" multiple>
            <button type="button" class="btn btn-ghost btn-small" id="pd-photo-upload">Uploaden</button>
          </div>
          <div class="photo-grid" id="pd-photo-grid"><div class="empty-note">Laden...</div></div>
        </div>

        <div class="detail-section">
          <h3>Footage / back-up</h3>
          <div class="field">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="pd-archived" style="width:auto;" ${p.archived ? 'checked' : ''}>
              Gearchiveerd
            </label>
          </div>
          <div class="field"><label>Opslaglocatie</label><input type="text" id="pd-storage-location" value="${escapeAttr(p.storage_location ?? '')}" placeholder="Bv. externe SSD 2, NAS/Projecten/2026..."></div>
        </div>
      </div>

      <div class="pd-tab-panel hidden" data-pdpanel="activiteit">
        <div class="detail-section" style="border-top:none; padding-top:0;">
          <h3>Feedback van klant</h3>
          <div id="pd-feedback-list"><div class="empty-note">Laden...</div></div>
          <div id="pd-feedback-form" class="feedback-form">
            <input type="text" id="pd-feedback-input" placeholder="Antwoord aan de klant...">
            <button type="button" id="pd-feedback-send" class="btn btn-red btn-small">Versturen</button>
          </div>
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
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-danger" id="pd-delete">Verwijderen</button>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="pd-cancel">Sluiten</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.querySelectorAll('#pd-tabs .client-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pd-tabs .client-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.pd-tab-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.dataset.pdpanel !== btn.dataset.pdtab);
      });
    });
  });

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
      client_id: document.getElementById('pd-client-id').value || null,
      archived: document.getElementById('pd-archived').checked,
      storage_location: document.getElementById('pd-storage-location').value.trim() || null,
      agreement_content: document.getElementById('pd-agreement').value.trim() || null,
    };
    const statusChanged = payload.status !== p.status;
    if (statusChanged) payload.status_changed_at = new Date().toISOString();
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
  refreshFeedbackList(id);

  async function sendAdminFeedback() {
    const input = document.getElementById('pd-feedback-input');
    const message = input.value.trim();
    if (!message) return;
    try {
      const created = await createFeedback(id, message);
      state.allFeedback.push(created);
      input.value = '';
      refreshFeedbackList(id);
    } catch (err) {
      showToast(err.message, true);
    }
  }
  document.getElementById('pd-feedback-send').addEventListener('click', sendAdminFeedback);
  document.getElementById('pd-feedback-input').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    // De input zit binnen het grote pd-form: zonder dit zou Enter hier het
    // hele opdrachtformulier proberen op te slaan/sluiten i.p.v. enkel te antwoorden.
    e.preventDefault();
    e.stopPropagation();
    sendAdminFeedback();
  });

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

  document.getElementById('pd-open-scripting').addEventListener('click', () => {
    state.activeScriptingProjectId = id;
    closeModal();
    document.querySelector('.tab-btn[data-view="scripting"]').click();
  });

  document.getElementById('pd-reset-agreement')?.addEventListener('click', async () => {
    if (!confirm('Handtekening wissen? De klant moet dan opnieuw tekenen voor die verder mag.')) return;
    try {
      const updated = await updateProject(id, { agreement_signed_at: null, agreement_signed_name: null });
      const idx = state.projects.findIndex((x) => x.id === id);
      state.projects[idx] = updated;
      closeModal();
      openProjectDetail(id);
      showToast('Handtekening gewist');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('pd-agreement-template').addEventListener('click', async () => {
    try {
      const tpl = await fetchPortalContent('contract_template');
      if (!tpl?.content) {
        showToast('Nog geen standaardcontract ingesteld (Klanten → Portal-instellingen)', true);
        return;
      }
      document.getElementById('pd-agreement').value = tpl.content;
      showToast('Standaardcontract ingevuld — pas eventueel aan en sla op');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('pd-agreement-file-upload').addEventListener('click', async () => {
    const input = document.getElementById('pd-agreement-file-input');
    const file = input.files[0];
    if (!file) return;
    try {
      if (p.agreement_bestand_path) await deleteAgreementFile(p.agreement_bestand_path).catch(() => {});
      const path = await uploadAgreementFile(id, file);
      const updated = await updateProject(id, { agreement_bestand_path: path, agreement_bestand_naam: file.name });
      const idx = state.projects.findIndex((x) => x.id === id);
      state.projects[idx] = updated;
      showToast('Contract geüpload');
      closeModal();
      openProjectDetail(id);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('pd-agreement-file-remove')?.addEventListener('click', async () => {
    if (!confirm('Geüpload contract verwijderen?')) return;
    try {
      if (p.agreement_bestand_path) await deleteAgreementFile(p.agreement_bestand_path).catch(() => {});
      const updated = await updateProject(id, { agreement_bestand_path: null, agreement_bestand_naam: null });
      const idx = state.projects.findIndex((x) => x.id === id);
      state.projects[idx] = updated;
      showToast('Contract verwijderd');
      closeModal();
      openProjectDetail(id);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('pd-agreement-copy')?.addEventListener('click', async () => {
    try {
      const settings = await fetchFinSettings();
      const doc = generateAgreementCopyPdf(p, settings || {});
      downloadPdf(doc, `overeenkomst-${(p.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    } catch (err) {
      showToast('Kon kopie niet genereren: ' + err.message, true);
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

async function refreshFeedbackList(projectId) {
  const list = document.getElementById('pd-feedback-list');
  if (!list) return;
  try {
    const feedback = await fetchProjectFeedback(projectId);
    if (!list.isConnected) return;
    const general = feedback.filter((f) => !f.concept_id);
    const p = projectById(projectId);
    list.innerHTML = general.length
      ? general.map((f) => `
        <div class="detail-list-item">
          <span><strong>${f.author_user_id === p?.client_user_id ? 'Klant' : 'Jij'}:</strong> ${escapeHtml(f.message)}</span>
          <span>${fmtDate(new Date(f.created_at))}</span>
        </div>`).join('')
      : '<div class="empty-note">Nog geen feedback op deze opdracht.</div>';
    state.allFeedback = state.allFeedback.filter((f) => f.project_id !== projectId).concat(feedback);
  } catch (err) {
    if (list.isConnected) {
      list.innerHTML = `<div class="empty-note">Kon feedback niet laden: ${escapeHtml(err.message)}</div>`;
    }
  }
}
