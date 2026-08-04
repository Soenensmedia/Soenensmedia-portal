export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// ── gestructureerde scripts (scène-per-scène) ───────────
// Scripts worden opgeslagen als JSON in hetzelfde `content`-tekstveld
// (geen aparte tabel nodig): { __scriptscenes__: true, scenes: [{visueel, tekst, duur}] }.
// Oude/vrije-tekst-inhoud parseert gewoon niet als zo'n object en blijft plain text.
export function parseScriptScenes(content) {
  if (!content) return null;
  try {
    const data = JSON.parse(content);
    if (data && data.__scriptscenes__ && Array.isArray(data.scenes)) return data.scenes;
  } catch {
    // geen geldige JSON = gewone vrije tekst, niets aan de hand
  }
  return null;
}

export function serializeScriptScenes(scenes) {
  return JSON.stringify({ __scriptscenes__: true, scenes });
}

export function scenesTotalDuur(scenes) {
  return scenes.reduce((s, sc) => s + (Number(sc.duur) || 0), 0);
}

export function renderConceptContentHtml(content) {
  const scenes = parseScriptScenes(content);
  if (!scenes) {
    return content ? `<p class="concept-card-content">${escapeHtml(content)}</p>` : '';
  }
  const totalDuur = scenesTotalDuur(scenes);
  return `
    <div class="scene-readonly-list">
      ${scenes.map((s, i) => `
        <div class="scene-readonly-row">
          <div class="scene-readonly-num">${i + 1}${s.duur ? ` · ${s.duur}s` : ''}</div>
          <div class="scene-readonly-cols">
            <div><span class="scene-readonly-label">Visueel</span><div>${escapeHtml(s.visueel || '—')}</div></div>
            <div><span class="scene-readonly-label">Tekst / voice-over</span><div>${escapeHtml(s.tekst || '—')}</div></div>
          </div>
        </div>`).join('')}
      ${totalDuur ? `<div class="hint-dim" style="margin-top:6px;">Totale duur: ±${totalDuur}s</div>` : ''}
    </div>`;
}
