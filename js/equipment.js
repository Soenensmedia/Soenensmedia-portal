import { escapeHtml, escapeAttr } from './util.js';
import { fetchEquipment, createEquipment, updateEquipment, deleteEquipment } from './data.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';
import { fmtDate } from './state.js';

let equipmentCache = [];

export async function renderEquipment() {
  const container = document.getElementById('equipment-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    equipmentCache = await fetchEquipment();
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon apparatuur niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  renderTable();
}

function renderTable() {
  const container = document.getElementById('equipment-container');
  if (!equipmentCache.length) {
    container.innerHTML = '<div class="empty-note">Nog geen apparatuur toegevoegd.</div>';
    return;
  }
  container.innerHTML = `
    <table class="log-table">
      <thead>
        <tr><th>Naam</th><th>Categorie</th><th>Onderhoud</th><th>Verzekerd</th><th>Uitgeleend aan</th><th></th></tr>
      </thead>
      <tbody>
        ${equipmentCache.map((eq) => `
          <tr class="equipment-row" data-id="${eq.id}">
            <td>${escapeHtml(eq.naam)}</td>
            <td>${escapeHtml(eq.categorie ?? '—')}</td>
            <td>${eq.onderhoud_datum ? fmtDate(new Date(eq.onderhoud_datum)) : '—'}</td>
            <td>${eq.verzekerd ? '<span class="badge-status goedgekeurd">Ja</span>' : '<span class="badge-status">Nee</span>'}</td>
            <td>${eq.uitgeleend_aan ? escapeHtml(eq.uitgeleend_aan) : '<span class="hint-dim">In huis</span>'}</td>
            <td><button class="btn-icon equipment-delete" data-id="${eq.id}">✕</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('.equipment-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.equipment-delete')) return;
      const eq = equipmentCache.find((x) => x.id === row.dataset.id);
      if (eq) openEquipmentForm(eq);
    });
  });
  container.querySelectorAll('.equipment-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Dit item verwijderen?')) return;
      try {
        await deleteEquipment(btn.dataset.id);
        equipmentCache = equipmentCache.filter((x) => x.id !== btn.dataset.id);
        renderTable();
        showToast('Verwijderd');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

export function openEquipmentForm(eq = null) {
  openModal(`
    <div class="modal-header"><h2>${eq ? 'Apparatuur bewerken' : 'Apparatuur toevoegen'}</h2></div>
    <form id="equipment-form">
      <div class="field"><label>Naam</label><input type="text" id="eq-naam" value="${escapeAttr(eq?.naam ?? '')}" required></div>
      <div class="field-row">
        <div class="field"><label>Categorie</label><input type="text" id="eq-categorie" value="${escapeAttr(eq?.categorie ?? '')}" placeholder="Camera, lens, licht, ..."></div>
        <div class="field"><label>Aankoopdatum</label><input type="date" id="eq-aankoopdatum" value="${eq?.aankoopdatum ?? ''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Aankoopprijs</label><input type="number" step="0.01" id="eq-aankoopprijs" value="${eq?.aankoopprijs ?? ''}"></div>
        <div class="field"><label>Onderhoud-datum</label><input type="date" id="eq-onderhoud" value="${eq?.onderhoud_datum ?? ''}"></div>
      </div>
      <div class="field">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="eq-verzekerd" style="width:auto;" ${eq?.verzekerd ? 'checked' : ''}>
          Verzekerd
        </label>
      </div>
      <div class="field"><label>Uitgeleend aan</label><input type="text" id="eq-uitgeleend" value="${escapeAttr(eq?.uitgeleend_aan ?? '')}" placeholder="Leeg = in huis"></div>
      <div class="field"><label>Notities</label><textarea id="eq-notities" rows="2">${escapeHtml(eq?.notities ?? '')}</textarea></div>
      <div class="modal-actions">
        ${eq ? '<button type="button" class="btn btn-danger" id="eq-delete">Verwijderen</button>' : '<div></div>'}
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="eq-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById('eq-cancel').addEventListener('click', closeModal);

  document.getElementById('eq-delete')?.addEventListener('click', async () => {
    if (!confirm('Dit item verwijderen?')) return;
    try {
      await deleteEquipment(eq.id);
      equipmentCache = equipmentCache.filter((x) => x.id !== eq.id);
      closeModal();
      renderTable();
      showToast('Verwijderd');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('equipment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      naam: document.getElementById('eq-naam').value.trim(),
      categorie: document.getElementById('eq-categorie').value.trim() || null,
      aankoopdatum: document.getElementById('eq-aankoopdatum').value || null,
      aankoopprijs: document.getElementById('eq-aankoopprijs').value ? Number(document.getElementById('eq-aankoopprijs').value) : null,
      onderhoud_datum: document.getElementById('eq-onderhoud').value || null,
      verzekerd: document.getElementById('eq-verzekerd').checked,
      uitgeleend_aan: document.getElementById('eq-uitgeleend').value.trim() || null,
      notities: document.getElementById('eq-notities').value.trim() || null,
    };
    try {
      if (eq) {
        const updated = await updateEquipment(eq.id, payload);
        const idx = equipmentCache.findIndex((x) => x.id === eq.id);
        equipmentCache[idx] = updated;
        showToast('Apparatuur bijgewerkt');
      } else {
        const created = await createEquipment(payload);
        equipmentCache.push(created);
        showToast('Apparatuur toegevoegd');
      }
      closeModal();
      renderTable();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
