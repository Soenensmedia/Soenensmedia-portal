import { state } from './state.js';
import { escapeHtml, escapeAttr } from './util.js';
import {
  fetchClients, fetchFinSettings,
  fetchClientContracts, createClientContract, updateClientContract, deleteClientContract,
} from './data.js';
import { CONTRACT_PACKS, DEFAULT_FIELDS, contractArticlesHtml, fmtEUR, nextRef } from './contractDoc.js';
import { initSignaturePad } from './signaturePad.js';
import { generateRetainerContractPdf } from './pdf.js';
import { downloadPdf } from './pdf.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

const STATUS_LABELS = { concept: 'Concept', verzonden: 'Verzonden', ondertekend: 'Ondertekend' };

let clientsCache = [];
let selectedClientId = null;
let contractsCache = [];

export async function renderContracts() {
  const container = document.getElementById('contracts-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    clientsCache = await fetchClients();
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon klanten niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!selectedClientId && clientsCache.length) selectedClientId = clientsCache[0].id;
  renderShell();
  if (selectedClientId) await loadContracts();
}

function renderShell() {
  const container = document.getElementById('contracts-container');
  if (!clientsCache.length) {
    container.innerHTML = '<div class="empty-note">Nog geen klanten — voeg er eerst één toe via de Klanten-tab.</div>';
    return;
  }
  container.innerHTML = `
    <div class="contracts-client-row">
      <div class="field" style="max-width:360px; margin-bottom:0;">
        <label>Klant</label>
        <select id="ct-client-select">
          ${clientsCache.map((c) => `<option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>${escapeHtml(c.naam)}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="btn btn-red btn-small" id="ct-new">+ Nieuw contract</button>
    </div>
    <div id="ct-list"></div>
  `;
  document.getElementById('ct-client-select').addEventListener('change', async (e) => {
    selectedClientId = e.target.value;
    await loadContracts();
  });
  document.getElementById('ct-new').addEventListener('click', () => openContractBuilder(null));
}

export async function openContractById(clientId, contractId) {
  selectedClientId = clientId;
  if (!clientsCache.length) {
    try { clientsCache = await fetchClients(); } catch { clientsCache = []; }
  }
  renderShell();
  await loadContracts();
  const contract = contractsCache.find((c) => c.id === contractId);
  if (contract) openContractViewer(contract);
}

async function loadContracts() {
  const list = document.getElementById('ct-list');
  if (list) list.innerHTML = '<div class="empty-note">Laden...</div>';
  try {
    contractsCache = await fetchClientContracts(selectedClientId);
  } catch (err) {
    if (list) list.innerHTML = `<div class="empty-note">Kon contracten niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }
  renderList();
}

function renderList() {
  const list = document.getElementById('ct-list');
  if (!list) return;
  if (!contractsCache.length) {
    list.innerHTML = '<div class="empty-note">Nog geen contract voor deze klant.</div>';
    return;
  }
  list.innerHTML = `
    <div class="contract-list">
      ${contractsCache.map((c) => `
        <div class="contract-row" data-id="${c.id}">
          <div>
            <div class="contract-row-title">${escapeHtml(c.pack_name || 'Contract')} — ${escapeHtml(c.ref || '')}</div>
            <div class="contract-row-sub">${fmtEUR(c.price)}/maand · ${escapeHtml(String(c.term || ''))} maanden looptijd</div>
          </div>
          <span class="contract-status ${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
        </div>`).join('')}
    </div>
  `;
  list.querySelectorAll('.contract-row').forEach((row) => {
    row.addEventListener('click', () => {
      const contract = contractsCache.find((c) => c.id === row.dataset.id);
      if (contract) openContractViewer(contract);
    });
  });
}

// ── Bouwer (nieuw / concept bewerken) ───────────────────
async function openContractBuilder(existing) {
  const client = clientsCache.find((c) => c.id === selectedClientId);
  let finSettings = {};
  try { finSettings = (await fetchFinSettings()) || {}; } catch { finSettings = {}; }

  const packKey = existing?.pack_key || 'p1';
  const draft = {
    ref: existing?.ref || nextRef(),
    pack_key: packKey,
    pack_name: existing?.pack_name || CONTRACT_PACKS[packKey].name,
    price: existing?.price ?? CONTRACT_PACKS[packKey].price,
    term: existing?.term ?? 12,
    notice: existing?.notice ?? 2,
    start_date: existing?.start_date || '',
    items: existing?.items?.length ? [...existing.items] : [...CONTRACT_PACKS[packKey].items],
    fields: {
      ...DEFAULT_FIELDS,
      smName: finSettings.bedrijfsnaam || DEFAULT_FIELDS.smName,
      smAdr: finSettings.bedrijfsadres || DEFAULT_FIELDS.smAdr,
      smVat: finSettings.ondernemingsnummer || DEFAULT_FIELDS.smVat,
      smMail: finSettings.contact_email || DEFAULT_FIELDS.smMail,
      clName: client?.naam || '',
      clContact: client?.naam || '',
      ...(existing?.fields || {}),
    },
  };

  openModal(`
    <div class="modal-header"><h2>${existing ? 'Contract bewerken' : 'Nieuw retainer-contract'}</h2></div>
    <form id="ct-form">
      <div class="field-row">
        <div class="field"><label>Pakket</label>
          <select id="ctf-pack">
            ${Object.values(CONTRACT_PACKS).map((p) => `<option value="${p.key}" ${p.key === packKey ? 'selected' : ''}>${escapeHtml(p.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Naam van het pakket (zoals getoond in het contract)</label><input type="text" id="ctf-packname" value="${escapeAttr(draft.pack_name)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Prijs per maand (excl. btw)</label><input type="number" min="0" step="50" id="ctf-price" value="${draft.price}"></div>
        <div class="field"><label>Referentie</label><input type="text" id="ctf-ref" value="${escapeAttr(draft.ref)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Looptijd (maanden)</label><input type="number" min="1" id="ctf-term" value="${draft.term}"></div>
        <div class="field"><label>Opzegtermijn (maanden)</label><input type="number" min="0" id="ctf-notice" value="${draft.notice}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Startdatum</label><input type="date" id="ctf-start" value="${escapeAttr(draft.start_date)}"></div>
        <div class="field"><label>Rondes feedback per video</label><input type="number" min="0" id="ctf-revisions" value="${draft.fields.revisions}"></div>
      </div>
      <div class="field"><label>Deliverables (1 per regel — vrij aan te passen, ook bij "Op maat")</label><textarea id="ctf-items" rows="6">${escapeHtml(draft.items.join('\n'))}</textarea></div>

      <div class="field" style="margin-top:4px;">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="ctf-ads" style="width:auto;" ${draft.fields.ads === 'true' ? 'checked' : ''}>
          Extra optie: Soenens Media beheert ook de betaalde advertenties (ads) voor deze klant
        </label>
      </div>
      <div class="field-row" id="ctf-ads-budget-row" style="${draft.fields.ads === 'true' ? '' : 'display:none;'}">
        <div class="field"><label>Advertentiebudget (optioneel, ter info in het contract)</label><input type="text" id="ctf-adsBudget" placeholder="Bv. €500/maand, rechtstreeks aan Meta" value="${escapeAttr(draft.fields.adsBudget || '')}"></div>
        <div></div>
      </div>

      <details open style="margin:14px 0;">
        <summary style="cursor:pointer; font-size:12.5px; color:var(--text-dim);">Overige contractvoorwaarden en partijgegevens</summary>
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
          <div class="field-row">
            <div class="field"><label>Naam Soenens Media</label><input type="text" id="ctf-smName" value="${escapeAttr(draft.fields.smName)}"></div>
            <div class="field"><label>Adres Soenens Media</label><input type="text" id="ctf-smAdr" value="${escapeAttr(draft.fields.smAdr)}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>BTW Soenens Media</label><input type="text" id="ctf-smVat" value="${escapeAttr(draft.fields.smVat)}"></div>
            <div class="field"><label>E-mail Soenens Media</label><input type="text" id="ctf-smMail" value="${escapeAttr(draft.fields.smMail)}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Naam klant</label><input type="text" id="ctf-clName" value="${escapeAttr(draft.fields.clName)}"></div>
            <div class="field"><label>Adres klant</label><input type="text" id="ctf-clAdr" value="${escapeAttr(draft.fields.clAdr)}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>BTW klant</label><input type="text" id="ctf-clVat" value="${escapeAttr(draft.fields.clVat)}"></div>
            <div class="field"><label>Contactpersoon klant</label><input type="text" id="ctf-clContact" value="${escapeAttr(draft.fields.clContact)}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Uurtarief buiten pakket (€)</label><input type="number" id="ctf-hourly" value="${draft.fields.hourly}"></div>
            <div class="field"><label>Betalingstermijn (dagen)</label><input type="number" id="ctf-payterm" value="${draft.fields.payterm}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Draaidag boeken (werkdagen vooraf)</label><input type="number" id="ctf-booking" value="${draft.fields.booking}"></div>
            <div class="field"><label>Archiveringstermijn ruw materiaal (maanden)</label><input type="number" id="ctf-archive" value="${draft.fields.archive}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Bevoegde rechtbank</label><input type="text" id="ctf-court" value="${escapeAttr(draft.fields.court)}"></div>
            <div class="field"><label>Opgemaakt te</label><input type="text" id="ctf-plaats" value="${escapeAttr(draft.fields.plaats)}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Versie</label><input type="text" id="ctf-ver" value="${escapeAttr(draft.fields.ver)}"></div>
            <div></div>
          </div>
        </div>
      </details>

      <div class="detail-section">
        <h3>Voorbeeld</h3>
        <div class="doc-sheet" id="ctf-preview" style="max-width:none; padding:24px;"></div>
      </div>

      <div class="modal-actions">
        <div></div>
        <div class="modal-actions-right">
          <button type="button" class="btn btn-ghost" id="ctf-cancel">Annuleren</button>
          <button type="submit" class="btn btn-red">Opslaan</button>
        </div>
      </div>
    </form>
  `, { wide: true });

  const form = document.getElementById('ct-form');
  const fieldIds = ['smName', 'smAdr', 'smVat', 'smMail', 'clName', 'clAdr', 'clVat', 'clContact', 'hourly', 'payterm', 'booking', 'revisions', 'archive', 'court', 'plaats', 'ver', 'adsBudget'];

  function readDraft() {
    draft.pack_key = document.getElementById('ctf-pack').value;
    draft.pack_name = document.getElementById('ctf-packname').value.trim();
    draft.ref = document.getElementById('ctf-ref').value.trim();
    draft.price = Number(document.getElementById('ctf-price').value) || 0;
    draft.start_date = document.getElementById('ctf-start').value || null;
    draft.term = Number(document.getElementById('ctf-term').value) || 12;
    draft.notice = Number(document.getElementById('ctf-notice').value) || 0;
    draft.items = document.getElementById('ctf-items').value.split('\n').map((l) => l.trim()).filter(Boolean);
    fieldIds.forEach((k) => {
      const el = document.getElementById(`ctf-${k}`);
      if (el) draft.fields[k] = el.value.trim();
    });
    draft.fields.plaats2 = draft.fields.plaats;
    draft.fields.ads = document.getElementById('ctf-ads').checked ? 'true' : 'false';
  }
  function refreshPreview() {
    readDraft();
    document.getElementById('ctf-preview').innerHTML = contractArticlesHtml(draft);
  }
  refreshPreview();
  form.addEventListener('input', refreshPreview);
  document.getElementById('ctf-pack').addEventListener('change', (e) => {
    const pack = CONTRACT_PACKS[e.target.value];
    document.getElementById('ctf-price').value = pack.price;
    document.getElementById('ctf-items').value = pack.items.join('\n');
    document.getElementById('ctf-packname').value = pack.name;
    refreshPreview();
  });
  document.getElementById('ctf-ads').addEventListener('change', (e) => {
    document.getElementById('ctf-ads-budget-row').style.display = e.target.checked ? '' : 'none';
    refreshPreview();
  });

  document.getElementById('ctf-cancel').addEventListener('click', closeModal);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    readDraft();
    const payload = {
      client_id: selectedClientId,
      ref: draft.ref,
      pack_key: draft.pack_key,
      pack_name: draft.pack_name,
      price: draft.price,
      term: draft.term,
      notice: draft.notice,
      start_date: draft.start_date,
      items: draft.items,
      fields: draft.fields,
    };
    try {
      if (existing) {
        const updated = await updateClientContract(existing.id, payload);
        const idx = contractsCache.findIndex((c) => c.id === existing.id);
        if (idx >= 0) contractsCache[idx] = updated;
        showToast('Contract opgeslagen');
      } else {
        const created = await createClientContract({ ...payload, status: 'concept' });
        contractsCache.unshift(created);
        showToast('Contract aangemaakt');
      }
      closeModal();
      renderList();
    } catch (err) { showToast(err.message, true); }
  });
}

// ── Weergave / ondertekenen (Soenens Media) / versturen ──
function openContractViewer(contract) {
  const linkedProject = state.projects.find((p) => p.client_id === contract.client_id && p.client_user_id);

  openModal(`
    <div class="modal-header">
      <h2>${escapeHtml(contract.pack_name || 'Contract')}</h2>
      <span class="contract-status ${contract.status}">${STATUS_LABELS[contract.status] || contract.status}</span>
    </div>
    <div class="doc-sheet" id="ctv-doc" style="max-width:none; padding:24px;">
      ${contractArticlesHtml(contract)}
      <section class="doc-art">
        <h2 class="doc-art-h"><span class="doc-n">11</span> Handtekeningen</h2>
        <div class="doc-signs">
          <div class="doc-sign">
            <span class="doc-sign-cap">Voor Soenens Media</span>
            ${contract.sm_signed_at
              ? `<img class="doc-sig-preview" src="${escapeAttr(contract.sm_sig_image)}" alt="">
                 <div class="doc-sig-done">${escapeHtml(contract.sm_sig_name || '')}${contract.sm_sig_role ? ', ' + escapeHtml(contract.sm_sig_role) : ''}</div>`
              : `<div class="doc-padwrap"><canvas class="doc-pad" id="ctv-sm-pad"></canvas><span class="doc-padhint">Teken hier</span><button type="button" class="doc-padclear" id="ctv-sm-clear">Wissen</button></div>
                 <div class="doc-sigfields">
                   <input type="text" id="ctv-sm-name" placeholder="Naam" value="Leyton Soenens">
                   <input type="text" id="ctv-sm-role" placeholder="Functie" value="Zaakvoerder">
                 </div>
                 <button type="button" class="btn btn-ghost btn-small" id="ctv-sm-save" style="margin-top:8px;">Onderteken namens Soenens Media</button>`}
          </div>
          <div class="doc-sign">
            <span class="doc-sign-cap">Voor de klant</span>
            ${contract.cl_signed_at
              ? `<img class="doc-sig-preview" src="${escapeAttr(contract.cl_sig_image)}" alt="">
                 <div class="doc-sig-done">${escapeHtml(contract.cl_sig_name || '')}${contract.cl_sig_role ? ', ' + escapeHtml(contract.cl_sig_role) : ''}</div>`
              : '<div class="empty-note">Nog niet ondertekend door de klant.</div>'}
          </div>
        </div>
        <p class="doc-legalnote">Beide partijen aanvaarden dat deze elektronische ondertekening dezelfde bewijswaarde heeft als een handgeschreven handtekening, overeenkomstig artikel 25 van Verordening (EU) nr. 910/2014 (eIDAS) en artikel 8.1, 2° van het Burgerlijk Wetboek.</p>
      </section>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-danger" id="ctv-delete">Verwijderen</button>
      <div class="modal-actions-right">
        ${contract.status === 'concept' ? '<button type="button" class="btn btn-ghost" id="ctv-edit">Bewerk</button>' : ''}
        <button type="button" class="btn btn-ghost" id="ctv-pdf">PDF downloaden</button>
        ${contract.status === 'concept' && contract.sm_signed_at ? '<button type="button" class="btn btn-red" id="ctv-send">Versturen naar klant</button>' : ''}
        <button type="button" class="btn btn-ghost" id="ctv-close">Sluiten</button>
      </div>
    </div>
  `, { wide: true });

  let pad = null;
  const padCanvas = document.getElementById('ctv-sm-pad');
  if (padCanvas) pad = initSignaturePad(padCanvas);

  document.getElementById('ctv-sm-clear')?.addEventListener('click', () => pad?.clear());
  document.getElementById('ctv-sm-save')?.addEventListener('click', async () => {
    if (!pad || pad.isEmpty()) { showToast('Teken eerst je handtekening', true); return; }
    const name = document.getElementById('ctv-sm-name').value.trim();
    if (!name) { showToast('Vul een naam in', true); return; }
    try {
      const updated = await updateClientContract(contract.id, {
        sm_sig_image: pad.toDataURL(),
        sm_sig_name: name,
        sm_sig_role: document.getElementById('ctv-sm-role').value.trim() || null,
        sm_signed_at: new Date().toISOString(),
      });
      const idx = contractsCache.findIndex((c) => c.id === contract.id);
      if (idx >= 0) contractsCache[idx] = updated;
      renderList();
      closeModal();
      showToast('Ondertekend namens Soenens Media');
      openContractViewer(updated);
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById('ctv-edit')?.addEventListener('click', () => { closeModal(); openContractBuilder(contract); });
  document.getElementById('ctv-close').addEventListener('click', closeModal);
  document.getElementById('ctv-delete').addEventListener('click', async () => {
    if (!confirm('Dit contract verwijderen?')) return;
    try {
      await deleteClientContract(contract.id);
      contractsCache = contractsCache.filter((c) => c.id !== contract.id);
      closeModal();
      renderList();
      showToast('Contract verwijderd');
    } catch (err) { showToast(err.message, true); }
  });
  document.getElementById('ctv-pdf').addEventListener('click', () => {
    const doc = generateRetainerContractPdf(contract);
    downloadPdf(doc, `${(contract.ref || 'contract')}.pdf`);
  });
  document.getElementById('ctv-send')?.addEventListener('click', async () => {
    if (!linkedProject) {
      showToast('Deze klant heeft nog geen gekoppeld opdracht met portaal-account — koppel er eerst één via Klant & Contract.', true);
      return;
    }
    if (!confirm('Contract versturen naar de klant? De klant moet dan tekenen bij het volgende bezoek aan het portaal.')) return;
    try {
      const updated = await updateClientContract(contract.id, { status: 'verzonden', sent_at: new Date().toISOString() });
      const idx = contractsCache.findIndex((c) => c.id === contract.id);
      if (idx >= 0) contractsCache[idx] = updated;
      closeModal();
      renderList();
      showToast('Verstuurd naar klant');
    } catch (err) { showToast(err.message, true); }
  });
}
