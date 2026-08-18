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
