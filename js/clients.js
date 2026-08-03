import { state } from './state.js';
import { escapeHtml } from './util.js';
import { fetchClientProfiles } from './data.js';
import { openProjectDetail } from './projectDetail.js';

export async function renderClients() {
  const container = document.getElementById('clients-container');
  container.innerHTML = '<div class="empty-note">Laden...</div>';

  let clients;
  try {
    clients = await fetchClientProfiles();
  } catch (err) {
    container.innerHTML = `<div class="empty-note">Kon klanten niet laden: ${escapeHtml(err.message)}</div>`;
    return;
  }

  if (!clients.length) {
    container.innerHTML = '<div class="empty-note">Nog geen klant-accounts aangemaakt. Ga naar Supabase → Authentication → Users → Add user.</div>';
    return;
  }

  container.innerHTML = clients.map(clientRowHtml).join('');

  container.querySelectorAll('.client-row-project').forEach((el) => {
    el.addEventListener('click', () => openProjectDetail(el.dataset.projectId));
  });
}

function clientRowHtml(client) {
  const linkedProjects = state.projects.filter((p) => p.client_user_id === client.id);
  return `
    <div class="client-row">
      <div class="client-row-info">
        <div class="client-row-email">${escapeHtml(client.full_name || client.email || client.id)}</div>
        ${client.full_name && client.email ? `<div class="client-row-sub">${escapeHtml(client.email)}</div>` : ''}
      </div>
      <div class="client-row-projects">
        ${linkedProjects.length
          ? linkedProjects.map((p) => `<span class="client-row-project" data-project-id="${p.id}">${escapeHtml(p.title)}</span>`).join('')
          : '<span class="empty-note">Nog niet gekoppeld</span>'}
      </div>
    </div>`;
}
