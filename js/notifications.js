// Lokaal (per browser) bijgehouden "gezien door admin"-status, zodat het
// dashboard kan tonen welke projecten nieuwe klant-activiteit hebben
// (project goedgekeurd of contract getekend) zonder een extra tabel.

function seenKey(projectId) {
  return `sm_admin_seen_${projectId}`;
}

export function latestClientActivity(p) {
  const dates = [p.client_approved_at, p.agreement_signed_at]
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  return dates.length ? Math.max(...dates) : null;
}

export function hasUnseenClientActivity(p) {
  const latest = latestClientActivity(p);
  if (!latest) return false;
  try {
    const seen = localStorage.getItem(seenKey(p.id));
    return !seen || latest > new Date(seen).getTime();
  } catch {
    return false;
  }
}

export function markProjectSeen(p) {
  const latest = latestClientActivity(p);
  if (!latest) return;
  try {
    localStorage.setItem(seenKey(p.id), new Date(latest).toISOString());
  } catch {
    /* privémodus o.i.d. — geen probleem, badge blijft dan gewoon staan */
  }
}

// Concepten (ideeën/scripts) die de klant goedkeurde: er is geen timestamp
// voor "wanneer goedgekeurd", dus houden we een set van reeds-geziene
// concept-id's bij i.p.v. een tijdstip-vergelijking.
const SEEN_CONCEPTS_KEY = 'sm_admin_seen_concepts';

function getSeenConceptIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_CONCEPTS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function isConceptApprovalUnseen(concept) {
  if (concept.status !== 'goedgekeurd') return false;
  return !getSeenConceptIds().has(concept.id);
}

export function markConceptSeen(conceptId) {
  try {
    const seen = getSeenConceptIds();
    seen.add(conceptId);
    localStorage.setItem(SEEN_CONCEPTS_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* privémodus o.i.d. — geen probleem, badge blijft dan gewoon staan */
  }
}

// Zelfde aanpak voor door de klant ondertekende contracten.
const SEEN_CONTRACTS_KEY = 'sm_admin_seen_contracts';

function getSeenContractIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_CONTRACTS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function isContractSignedUnseen(contract) {
  if (contract.status !== 'ondertekend') return false;
  return !getSeenContractIds().has(contract.id);
}

export function markContractSeen(contractId) {
  try {
    const seen = getSeenContractIds();
    seen.add(contractId);
    localStorage.setItem(SEEN_CONTRACTS_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* privémodus o.i.d. — geen probleem, badge blijft dan gewoon staan */
  }
}
