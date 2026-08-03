import { state } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import { fetchClients, createClient, updateClient, deleteClient } from './data.js';
import { openModal, closeModal } from './modal.js';
import { openProjectDetail } from './projectDetail.js';
import { showToast } from './toast.js';
export async function renderClients() {
  const container = document.getElementById('clients-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    state.clients = await fetchClients();
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon klanten niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  renderList();
}

function linkedProjects(clientId) {
  return state.projects.filter((p) => p.client_id === clientId);
}

function renderList() {
  const container = document.getElementById('clients-container');
  if (!state.clients.length) {
    container.innerHTML = '<div class="empty-note">Nog geen klanten toegevoegd. Klik op "+ Klant toevoegen".</div>';
    return;
  }
  container.innerHTML = state.clients.map((c) => {
    const projects = linkedProjects(c.id);
    return `
      <div class="client-row" data-id="${c.id}">
        <div class="client-row-info">
          <div class="client-row-email">
            ${escapeHtml(c.naam)}
            ${c.is_retainer ? '<span class="badge-status goedgekeurd" style="margin-left:8px;">Retainer</span>' : ''}
          </div>
          <div class="client-row-sub">
            ${[c.email, c.telefoon].filter(Boolean).map(escapeHtml).join(' · ') || 'Geen contactgegevens'}
            ${c.referral_source ? ` · via ${escapeHtml(c.referral_source)}` : ''}
          </div>
        </div>
        <div class="client-row-projects">
          ${projects.length
            ? projects.map((p) => `<span class="client-row-project" data-project-id="${p.id}">${escapeHtml(p.title)}</span>`).join('')
            : '<span class="empty-note">Nog geen opdracht gekoppeld</span>'}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.client-row-project').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectDetail(el.dataset.projectId);
    });
  });
  container.querySelectorAll('.client-row').forEach((row) => {
    row.addEventListener('click', () => {
      const client = state.clients.find((c) => c.id === row.dataset.id);
      if (client) openClientForm(client);
    });
  });
}

export function openClientForm(client = null) {
  openModal(`
    <div class="modal-header"><h2>${client ? 'Klant bewerken' : 'Klant toevoegen'}</h2></div>
    <form id="client-form">
      <div class="field"><label>Naam</label><input type="text" id="cl-naam" value="${escapeAttr(client?.naam ?? '')}" required></div>
      <div class="field-row">
        <div class="field"><label>E-mail</label><input type="email" id="cl-email" value="${escapeAttr(client?.email ?? '')}"></div>
        <div class="field"><label>Telefoon</label><input type="text" id="cl-telefoon" value="${escapeAttr(client?.telefoon ?? '')}"></div>
      </div>
      <div class="field"><label>Via wie kwam deze klant binnen?</label><input type="text" id="cl-referral" value="${escapeAttr(client?.referral_source ?? '')}" placeholder="Bv. mond-tot-mond, Instagram, oud-klant X..."></div>

      <div class="field">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="cl-is-retainer" style="width:auto;" ${client?.is_retainer ? 'checked' : ''}>
          Vaste maandklant (retainer)
        </label>
      </div>
      <div id="cl-retainer-fields" class="${client?.is_retainer ? '' : 'hidden'}">
        <div class="field-row">
          <div class="field"><label>Startdatum contract</label><input type="date" id="cl-retainer-start" value="${client?.retainer_start ?? ''}"></div>
          <div class="field"><label>Verlengdatum</label><input type="date" id="cl-retainer-verleng" value="${client?.retainer_verlengdatum ?? ''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Video's/jaar (doel)</label><input type="number" min="0" id="cl-retainer-doel" value="${client?.retainer_videos_doel_per_jaar ?? ''}"></div>
          <div class="field"><label>Geleverd dit jaar</label><input type="number" min="0" id="cl-retainer-geleverd" value="${client?.retainer_videos_geleverd_dit_jaar ?? 0}"></div>
        </div>
      </div>

      <div class="field"><label>Notities</label><textarea id="cl-notities" rows="2">${escapeHtml(client?.notities ?? '')}</textarea></div>
      <div class="modal-actions">
        ${client ? '<button type="button" class="btn btn-danger" id="cl-delete">Verwijderen</button>' : '<div></div>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="cl-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById('cl-cancel').addEventListener('click', closeModal);
  document.getElementById('cl-is-retainer').addEventListener('change', (e) => {
    document.getElementById('cl-retainer-fields').classList.toggle('hidden', !e.target.checked);
  });

  document.getElementById('cl-delete')?.addEventListener('click', async () => {
    if (!confirm(`"${client.naam}" verwijderen? Gekoppelde opdrachten blijven bestaan maar verliezen de klantkoppeling.`)) return;
    try {
      await deleteClient(client.id);
      state.clients = state.clients.filter((x) => x.id !== client.id);
      closeModal();
      renderList();
      showToast('Klant verwijderd');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isRetainer = document.getElementById('cl-is-retainer').checked;
    const payload = {
      naam: document.getElementById('cl-naam').value.trim(),
      email: document.getElementById('cl-email').value.trim() || null,
      telefoon: document.getElementById('cl-telefoon').value.trim() || null,
      referral_source: document.getElementById('cl-referral').value.trim() || null,
      is_retainer: isRetainer,
      retainer_start: isRetainer ? (document.getElementById('cl-retainer-start').value || null) : null,
      retainer_verlengdatum: isRetainer ? (document.getElementById('cl-retainer-verleng').value || null) : null,
      retainer_videos_doel_per_jaar: isRetainer && document.getElementById('cl-retainer-doel').value ? Number(document.getElementById('cl-retainer-doel').value) : null,
      retainer_videos_geleverd_dit_jaar: isRetainer && document.getElementById('cl-retainer-geleverd').value ? Number(document.getElementById('cl-retainer-geleverd').value) : 0,
      notities: document.getElementById('cl-notities').value.trim() || null,
    };
    try {
      if (client) {
        const updated = await updateClient(client.id, payload);
        const idx = state.clients.findIndex((x) => x.id === client.id);
        state.clients[idx] = updated;
        showToast('Klant bijgewerkt');
      } else {
        const created = await createClient(payload);
        state.clients.push(created);
        state.clients.sort((a, b) => a.naam.localeCompare(b.naam));
        showToast('Klant toegevoegd');
      }
      closeModal();
      renderList();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
