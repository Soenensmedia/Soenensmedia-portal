// Kleine, afhankelijkheidsvrije handtekening-pad — canvas tekenen met muis of
// vinger, gebruikt zowel bij het opmaken van een contract (eigen handtekening)
// als bij het ondertekenen door de klant.
export function initSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasInk = false;
  let last = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const prev = hasInk ? canvas.toDataURL() : null;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#15151a';
    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prev;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }
  function start(e) {
    e.preventDefault();
    drawing = true;
    last = pos(e);
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    hasInk = true;
  }
  function end() { drawing = false; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  return {
    clear() {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      hasInk = false;
    },
    isEmpty() { return !hasInk; },
    toDataURL() { return canvas.toDataURL('image/png'); },
  };
}
