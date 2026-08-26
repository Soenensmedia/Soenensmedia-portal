function escListener(e) {
  if (e.key === 'Escape') closeModal();
}

export function openModal(html, { dismissible = true, wide = false } = {}) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal${wide ? ' modal-wide' : ''}">${html}</div></div>`;
  if (dismissible) {
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
    document.addEventListener('keydown', escListener);
  }
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.removeEventListener('keydown', escListener);
}
