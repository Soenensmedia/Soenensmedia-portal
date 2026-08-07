import { state, STATUS_ORDER, STATUS_LABELS, CONCEPT_TYPE_LABELS, CONCEPT_STATUS_LABELS, fmtDate } from './state.js';
import { escapeHtml, escapeAttr, renderConceptContentHtml } from './util.js';
import { fetchProjects, fetchProjectFeedback, createFeedback, approveProject, listPhotos, fetchProjectConcepts, approveConcept, fetchPortalContent, signAgreement, fetchClients, fetchOwnProfile, updateOwnName, fetchFinFacturen, fetchFinOffertes, fetchAnyFinSettings, getFinFactuurUrl, getPortalPhotoUrl, getAgreementFileUrl } from './data.js';
import { openModal, closeModal } from './modal.js';
import { generateFactuurPdf, generateOffertePdf, generateAgreementCopyPdf, downloadPdf } from './pdf.js';
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

  try {
    const [welcome, delivery] = await Promise.all([
      fetchPortalContent('welcome_guide'),
      fetchPortalContent('delivery_guide'),
    ]);
    state.portalWelcomeGuide = welcome?.content ?? '';
    state.portalDeliveryGuide = delivery?.content ?? '';
  } catch {
    state.portalWelcomeGuide = '';
    state.portalDeliveryGuide = '';
  }

  try {
    state.clientOwnRecords = await fetchClients();
  } catch {
    state.clientOwnRecords = [];
  }

  try {
    const [facturen, offertes, settings] = await Promise.all([
      fetchFinFacturen(), fetchFinOffertes(), fetchAnyFinSettings(),
    ]);
    state.clientFacturen = facturen;
    state.clientOffertes = offertes;
    state.clientFinSettings = settings || {};
    state.portalPhotoUrl = getPortalPhotoUrl(settings?.portal_photo_path);
  } catch {
    state.clientFacturen = [];
    state.clientOffertes = [];
    state.clientFinSettings = {};
    state.portalPhotoUrl = '';
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
    try {
      state.clientConceptsByProject[p.id] = await fetchProjectConcepts(p.id);
    } catch {
      state.clientConceptsByProject[p.id] = [];
    }
  }));

  if (state.activeClientProjectId && projects.some((p) => p.id === state.activeClientProjectId)) {
    renderClientProjectDetail(state.activeClientProjectId);
  } else {
    renderClientList();
  }
}

function firstNameOf(profile) {
  if (profile?.full_name?.trim()) return profile.full_name.trim().split(/\s+/)[0];
  if (profile?.email) {
    const local = profile.email.split('@')[0];
    const first = local.split(/[._-]+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  }
  return '';
}

const CLIENT_DONE_STATUSES = ['verzonden', 'afgerond'];

function contactCardHtml() {
  const email = state.clientFinSettings?.contact_email;
  const tel = state.clientFinSettings?.contact_telefoon;
  if (!email && !tel) return '';
  return `
    <div class="client-contact-card">
      <div class="client-contact-title">Vragen?</div>
      <div class="client-contact-sub">
        ${email ? `<a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>` : ''}
        ${email && tel ? ' · ' : ''}
        ${tel ? escapeHtml(tel) : ''}
      </div>
    </div>`;
}

function renderClientList() {
  state.activeClientProjectId = null;
  const container = document.getElementById('client-projects-container');
  const name = firstNameOf(state.profile);
  const count = state.clientProjects.length;
  const active = state.clientProjects.filter((p) => !CLIENT_DONE_STATUSES.includes(p.status));
  const done = state.clientProjects.filter((p) => CLIENT_DONE_STATUSES.includes(p.status));

  container.innerHTML = `
    ${state.portalPhotoUrl ? `<div class="client-portal-hero" style="background-image:url('${escapeAttr(state.portalPhotoUrl)}')"></div>` : ''}
    <div class="client-welcome">
      <div class="client-welcome-title">Welkom${name ? ', ' + escapeHtml(name) : ''}</div>
      <div class="client-welcome-sub">${count === 1 ? '1 project' : count + ' projecten'} klaarstaand voor jou</div>
      ${state.portalWelcomeGuide ? `<p class="client-welcome-guide">${escapeHtml(state.portalWelcomeGuide)}</p>` : ''}
    </div>
    ${active.length ? `
      ${done.length ? '<div class="client-group-label">Actief</div>' : ''}
      <div class="client-project-tiles">${active.map(tileHtml).join('')}</div>` : ''}
    ${done.length ? `
      <div class="client-group-label">Afgerond</div>
      <div class="client-project-tiles">${done.map(tileHtml).join('')}</div>` : ''}
    ${contactCardHtml()}
  `;

  container.querySelectorAll('.client-project-tile').forEach((el) => {
    el.addEventListener('click', () => renderClientProjectDetail(el.dataset.id));
  });
}

function tileHtml(p) {
  const photos = state.clientPhotosByProject[p.id] || [];
  const cover = photos[0]?.url || state.portalPhotoUrl;
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
  if (state.activeClientProjectId !== projectId) {
    state.activeClientDetailTab = 'overzicht';
  }
  state.activeClientProjectId = projectId;
  const p = state.clientProjects.find((x) => x.id === projectId);
  if (!p) {
    renderClientList();
    return;
  }

  const container = document.getElementById('client-projects-container');
  const needsSigning = (p.agreement_content || p.agreement_bestand_path) && !p.agreement_signed_at;

  if (needsSigning) {
    container.innerHTML = `
      <button type="button" class="btn btn-ghost btn-small client-back-btn" id="client-back-btn">‹ Terug naar projecten</button>
      ${agreementGateHtml(p)}
    `;
    document.getElementById('client-back-btn').addEventListener('click', renderClientList);
    wireAgreementForm(p);
    return;
  }

  const feedback = state.clientFeedbackByProject[p.id] || [];
  const photos = state.clientPhotosByProject[p.id] || [];
  const concepts = state.clientConceptsByProject[p.id] || [];

  container.innerHTML = `
    <button type="button" class="btn btn-ghost btn-small client-back-btn" id="client-back-btn">‹ Terug naar projecten</button>
    ${projectDetailHtml(p, feedback, photos, concepts)}
  `;

  document.getElementById('client-back-btn').addEventListener('click', renderClientList);
  wireProjectDetailEvents(p, photos, feedback, concepts);
  applyMosaicLayout(container);
}

function agreementGateHtml(p) {
  return `
    <div class="client-project-card">
      <div class="client-hero" ${state.portalPhotoUrl ? `style="background-image:url('${escapeAttr(state.portalPhotoUrl)}')"` : ''}>
        ${!state.portalPhotoUrl ? '<div class="client-hero-placeholder">SM</div>' : ''}
      </div>
      ${state.portalWelcomeGuide ? `
        <div class="detail-section" style="border-top:none; padding-top:0;">
          <h3>Welkom</h3>
          <p class="client-brief-text">${escapeHtml(state.portalWelcomeGuide)}</p>
        </div>` : ''}
      <div class="client-project-header">
        <div><div class="title">${escapeHtml(p.title)}</div></div>
      </div>
      <div class="detail-section">
        <h3>Overeenkomst</h3>
        ${p.agreement_bestand_naam
          ? `<button type="button" class="btn btn-ghost btn-small" id="agreement-view-file-${p.id}">📄 Bekijk contract (${escapeHtml(p.agreement_bestand_naam)})</button>`
          : `<p class="client-brief-text">${escapeHtml(p.agreement_content)}</p>`}
        <form id="agreement-form-${p.id}" style="margin-top:14px;">
          <div class="field"><label>Volledige naam</label><input type="text" id="agreement-name-${p.id}" required placeholder="Je naam"></div>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-dim); margin-bottom:14px;">
            <input type="checkbox" id="agreement-agree-${p.id}" style="width:auto;" required>
            Ik ga akkoord met bovenstaande overeenkomst
          </label>
          <button type="submit" class="btn btn-red">Ondertekenen</button>
        </form>
      </div>
    </div>`;
}

function wireAgreementForm(p) {
  const form = document.getElementById(`agreement-form-${p.id}`);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById(`agreement-name-${p.id}`).value.trim();
    if (!name) return;
    try {
      await signAgreement(p.id, name);
      state.clientProjects = await fetchProjects();
      showToast('Overeenkomst ondertekend');
      renderClientProjectDetail(p.id);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById(`agreement-view-file-${p.id}`)?.addEventListener('click', async () => {
    try {
      window.open(await getAgreementFileUrl(p.agreement_bestand_path), '_blank');
    } catch (err) {
      showToast('Kon contract niet openen: ' + err.message, true);
    }
  });
}

export function openEditNameModal() {
  openModal(`
    <div class="modal-header"><h2>Mijn naam</h2></div>
    <form id="edit-name-form">
      <div class="field"><label>Volledige naam</label><input type="text" id="edit-name-input" value="${escapeAttr(state.profile?.full_name ?? '')}" required></div>
      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="edit-name-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById('edit-name-cancel').addEventListener('click', closeModal);
  document.getElementById('edit-name-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('edit-name-input').value.trim();
    if (!name) return;
    try {
      await updateOwnName(name);
      state.profile = await fetchOwnProfile();
      closeModal();
      showToast('Naam opgeslagen');
      if (state.activeClientProjectId) {
        renderClientProjectDetail(state.activeClientProjectId);
      } else {
        renderClientList();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  });
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

function conceptCardHtml(c, conceptFeedback) {
  return `
    <div class="concept-card" data-id="${c.id}">
      <div class="concept-card-header">
        <span class="badge-status ${c.type}">${CONCEPT_TYPE_LABELS[c.type] ?? c.type}</span>
        <span class="badge-status ${c.status}">${CONCEPT_STATUS_LABELS[c.status] ?? c.status}</span>
      </div>
      <div class="concept-card-title">${escapeHtml(c.title)}</div>
      ${renderConceptContentHtml(c.content)}
      ${c.status !== 'goedgekeurd' ? `<button type="button" class="btn btn-red btn-small concept-approve-btn" data-id="${c.id}">Goedkeuren</button>` : ''}
      <div class="concept-feedback">
        ${conceptFeedback.length
          ? conceptFeedback.map((f) => `<div class="detail-list-item"><span>${escapeHtml(f.message)}</span><span>${fmtDate(new Date(f.created_at))}</span></div>`).join('')
          : '<div class="empty-note">Nog geen feedback op dit item.</div>'}
        <form id="concept-fb-form-${c.id}" class="feedback-form">
          <input type="text" id="concept-fb-input-${c.id}" placeholder="Feedback op dit idee/script...">
          <button type="submit" class="btn btn-ghost btn-small">Versturen</button>
        </form>
      </div>
    </div>`;
}

function statusStepperHtml(status) {
  const doneStatuses = ['afgerond', 'verzonden'];
  const currentIndex = STATUS_ORDER.indexOf(status);
  return `
    <div class="status-stepper">
      ${STATUS_ORDER.map((s, i) => {
        const isDone = i < currentIndex || (doneStatuses.includes(status) && i <= currentIndex);
        const isCurrent = s === status;
        return `
          <div class="stepper-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
            <div class="stepper-dot"></div>
            <div class="stepper-label">${escapeHtml(STATUS_LABELS[s])}</div>
          </div>`;
      }).join('')}
    </div>`;
}

const STATUS_CLIENT_HINTS = {
  nieuw: 'We plannen dit project in. Binnenkort volgt de shoot.',
  shooting: 'De opnames staan gepland of zijn bezig.',
  editing: 'We zijn volop aan het monteren.',
  wacht_op_feedback: 'Er staat iets klaar hierboven — we wachten op jouw feedback of goedkeuring.',
  revisie: 'We verwerken je feedback en passen het aan.',
  klaar_om_te_versturen: 'Bijna klaar — de laatste check voor levering.',
  verzonden: 'Alles is geleverd! Bekijk hieronder je bestanden.',
  afgerond: 'Dit project is volledig afgerond. Bedankt voor je vertrouwen!',
};

function statusHintHtml(status) {
  const hint = STATUS_CLIENT_HINTS[status];
  return hint ? `<div class="client-status-hint">${escapeHtml(hint)}</div>` : '';
}

function retainerHtml(p) {
  const record = p.client_id ? state.clientOwnRecords.find((c) => c.id === p.client_id) : null;
  if (!record?.is_retainer) return '';
  const geleverd = record.retainer_videos_geleverd_dit_jaar ?? 0;
  const doel = record.retainer_videos_doel_per_jaar;
  return `
    <div class="detail-section">
      <h3>Jouw retainer</h3>
      <div class="client-meta-row">
        <div class="client-meta-item"><span class="client-meta-label">Video's dit jaar</span><span>${geleverd}${doel ? ` / ${doel}` : ''}</span></div>
        ${record.retainer_verlengdatum ? `<div class="client-meta-item"><span class="client-meta-label">Verlengdatum</span><span>${fmtDate(new Date(record.retainer_verlengdatum))}</span></div>` : ''}
      </div>
    </div>`;
}

const CLIENT_FACTUUR_STATUS_LABELS = { open: 'Open', betaald: 'Betaald' };
const CLIENT_OFFERTE_STATUS_LABELS = { verstuurd: 'Verstuurd', geaccepteerd: 'Geaccepteerd', geweigerd: 'Geweigerd' };
const clientEur = (n) => '€ ' + (Math.round((n || 0) * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function handleClientDownload(kind, id) {
  const row = kind === 'factuur' ? state.clientFacturen.find((f) => f.id === id) : state.clientOffertes.find((o) => o.id === id);
  if (!row) return;
  try {
    if (row.bestand_path) {
      window.open(await getFinFactuurUrl(row.bestand_path), '_blank');
      return;
    }
    const doc = kind === 'factuur' ? generateFactuurPdf(row, state.clientFinSettings) : generateOffertePdf(row, state.clientFinSettings);
    const nummer = kind === 'factuur' ? row.factuurnummer : row.offertenummer;
    downloadPdf(doc, `${kind}-${nummer || row.id.slice(0, 8)}.pdf`);
  } catch (err) {
    showToast('Kon niet downloaden: ' + err.message, true);
  }
}

const CLIENT_DETAIL_TABS = [
  { key: 'overzicht', label: 'Overzicht' },
  { key: 'ideeen', label: 'Ideeën & Scripts' },
  { key: 'media', label: "Foto's & Video" },
  { key: 'financien', label: 'Offertes & Facturen' },
  { key: 'feedback', label: 'Feedback' },
];

function overzichtTabHtml(p) {
  return `
    ${state.portalWelcomeGuide ? `
      <div class="detail-section" style="border-top:none; padding-top:0;">
        <h3>Welkom</h3>
        <p class="client-brief-text">${escapeHtml(state.portalWelcomeGuide)}</p>
      </div>` : ''}

    <div class="client-meta-row">
      ${p.deadline ? `<div class="client-meta-item"><span class="client-meta-label">Deadline</span><span>${fmtDate(new Date(p.deadline))}</span></div>` : ''}
      ${p.created_at ? `<div class="client-meta-item"><span class="client-meta-label">Opdracht sinds</span><span>${fmtDate(new Date(p.created_at))}</span></div>` : ''}
    </div>

    ${retainerHtml(p)}

    <div class="detail-section">
      <h3>Project brief</h3>
      ${p.client_brief ? `<p class="client-brief-text">${escapeHtml(p.client_brief)}</p>` : '<div class="client-empty-state">✍️ De briefing komt hier binnenkort te staan.</div>'}
      ${p.deliverables
        ? `<div class="deliverables-box"><h3>Deliverables</h3><p>${escapeHtml(p.deliverables)}</p></div>`
        : ''}
    </div>`;
}

function ideeenTabHtml(concepts, feedback) {
  return concepts.length
    ? `<div class="concept-list">${concepts.map((c) => conceptCardHtml(c, feedback.filter((f) => f.concept_id === c.id))).join('')}</div>`
    : '<div class="client-empty-state">💡 Nog geen ideeën of scripts toegevoegd — die verschijnen hier zodra ze klaarstaan.</div>';
}

function mediaTabHtml(p, photos) {
  return `
    <div class="section-header-row">
      <h3>Foto's</h3>
      ${photos.length ? `<button type="button" class="btn btn-ghost btn-small" id="download-all-btn">Download alles</button>` : ''}
    </div>
    ${photos.length
      ? `<div class="photo-grid gallery-mosaic">${photos.map((ph, i) => `<div class="photo-thumb" data-index="${i}"><img src="${escapeAttr(ph.url)}" alt=""></div>`).join('')}</div>`
      : '<div class="client-empty-state">📷 Nog geen foto\'s — deze verschijnen hier zodra de shoot achter de rug is.</div>'}

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

    ${state.portalDeliveryGuide ? `
      <div class="detail-section">
        <h3>Delivery-gids</h3>
        <p class="client-brief-text">${escapeHtml(state.portalDeliveryGuide)}</p>
      </div>` : ''}`;
}

function financeTabHtml(offertes, facturen) {
  return `
    ${offertes.map((o) => `
      <div class="detail-list-item">
        <span>Offerte ${escapeHtml(o.offertenummer || '')} — ${clientEur(o.bedrag)} <span class="badge-status ${o.status === 'geaccepteerd' ? 'goedgekeurd' : o.status === 'geweigerd' ? 'aanpassing_gevraagd' : 'in_afwachting'}">${CLIENT_OFFERTE_STATUS_LABELS[o.status] ?? o.status}</span></span>
        <button type="button" class="btn btn-ghost btn-small client-download-doc" data-kind="offerte" data-id="${o.id}">Download</button>
      </div>`).join('')}
    ${facturen.map((f) => {
      const incl = Number(f.bedrag) * (1 + Number(f.btw) / 100);
      return `
      <div class="detail-list-item">
        <span>Factuur ${escapeHtml(f.factuurnummer || '')} — ${clientEur(incl)} <span class="badge-status ${f.status}">${CLIENT_FACTUUR_STATUS_LABELS[f.status] ?? f.status}</span></span>
        <button type="button" class="btn btn-ghost btn-small client-download-doc" data-kind="factuur" data-id="${f.id}">Download</button>
      </div>`;
    }).join('')}`;
}

function feedbackTabHtml(generalFeedback) {
  return `
    ${generalFeedback.length
      ? generalFeedback.map((f) => `<div class="detail-list-item"><span>${escapeHtml(f.message)}</span><span>${fmtDate(new Date(f.created_at))}</span></div>`).join('')
      : '<div class="empty-note">Nog geen feedback.</div>'}
    <form id="fb-form" class="feedback-form">
      <input type="text" id="fb-input" placeholder="Schrijf feedback...">
      <button type="submit" class="btn btn-red btn-small">Versturen</button>
    </form>`;
}

function projectDetailHtml(p, feedback, photos, concepts) {
  const cover = photos[0]?.url || state.portalPhotoUrl;
  const facturen = state.clientFacturen.filter((f) => f.project_id === p.id);
  const offertes = state.clientOffertes.filter((o) => o.project_id === p.id);
  const generalFeedback = feedback.filter((f) => !f.concept_id);

  const tabCounts = {
    ideeen: concepts.length,
    media: photos.length,
    financien: facturen.length + offertes.length,
    feedback: generalFeedback.length,
  };

  const visibleTabs = CLIENT_DETAIL_TABS.filter((t) => t.key !== 'financien' || tabCounts.financien > 0);
  const activeTab = visibleTabs.some((t) => t.key === state.activeClientDetailTab) ? state.activeClientDetailTab : 'overzicht';

  return `
    <div class="client-project-card">
      <div class="client-hero" ${cover ? `style="background-image:url('${escapeAttr(cover)}')"` : ''}>
        ${!cover ? '<div class="client-hero-placeholder">SM</div>' : ''}
      </div>

      <div class="client-project-header">
        <div>
          <div class="title">${escapeHtml(p.title)}</div>
          <div class="deadline">Status: ${escapeHtml(STATUS_LABELS[p.status] || p.status)}</div>
        </div>
        ${p.client_approved
          ? `<span class="approve-banner approved">Goedgekeurd op ${fmtDate(new Date(p.client_approved_at))}</span>`
          : `<button class="btn btn-red btn-small" id="approve-btn-${p.id}">Goedkeuren</button>`}
      </div>

      ${(p.agreement_content || p.agreement_bestand_path) && p.agreement_signed_at
        ? `<div class="empty-note">Overeenkomst ondertekend door ${escapeHtml(p.agreement_signed_name ?? '')} op ${fmtDate(new Date(p.agreement_signed_at))}.
            <button type="button" class="btn btn-ghost btn-small agreement-copy-btn" data-id="${p.id}">Download kopie</button>
          </div>`
        : ''}

      ${statusStepperHtml(p.status)}
      ${statusHintHtml(p.status)}

      <div class="client-tabs">
        ${visibleTabs.map((t) => `
          <button type="button" class="client-tab-btn ${t.key === activeTab ? 'active' : ''}" data-clienttab="${t.key}">${escapeHtml(t.label)}${tabCounts[t.key] ? ` (${tabCounts[t.key]})` : ''}</button>`).join('')}
      </div>

      <div class="client-tab-panel">
        ${activeTab === 'overzicht' ? overzichtTabHtml(p) : ''}
        ${activeTab === 'ideeen' ? ideeenTabHtml(concepts, feedback) : ''}
        ${activeTab === 'media' ? mediaTabHtml(p, photos) : ''}
        ${activeTab === 'financien' ? financeTabHtml(offertes, facturen) : ''}
        ${activeTab === 'feedback' ? feedbackTabHtml(generalFeedback) : ''}
      </div>
    </div>`;
}

function wireProjectDetailEvents(p, photos, feedback, concepts) {
  document.querySelectorAll('.client-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeClientDetailTab = btn.dataset.clienttab;
      renderClientProjectDetail(p.id);
      document.querySelector('.client-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('.client-download-doc').forEach((btn) => {
    btn.addEventListener('click', () => handleClientDownload(btn.dataset.kind, btn.dataset.id));
  });

  document.querySelector('.agreement-copy-btn')?.addEventListener('click', () => {
    try {
      const doc = generateAgreementCopyPdf(p, state.clientFinSettings || {});
      downloadPdf(doc, `overeenkomst-${(p.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    } catch (err) {
      showToast('Kon kopie niet genereren: ' + err.message, true);
    }
  });

  const form = document.getElementById('fb-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('fb-input');
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

  concepts.forEach((c) => {
    const fbForm = document.getElementById(`concept-fb-form-${c.id}`);
    fbForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById(`concept-fb-input-${c.id}`);
      const message = input.value.trim();
      if (!message) return;
      try {
        await createFeedback(p.id, message, c.id);
        state.clientFeedbackByProject[p.id] = await fetchProjectFeedback(p.id);
        showToast('Feedback verstuurd');
        renderClientProjectDetail(p.id);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  document.querySelectorAll('.concept-approve-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Dit idee/script goedkeuren?')) return;
      try {
        await approveConcept(btn.dataset.id);
        state.clientConceptsByProject[p.id] = await fetchProjectConcepts(p.id);
        showToast('Goedgekeurd');
        renderClientProjectDetail(p.id);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
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
