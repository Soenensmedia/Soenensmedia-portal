import { signIn, signOut, onAuthChange } from './auth.js';
import { state } from './state.js';
import { fetchProjects, fetchEvents, fetchTimeEntries, fetchOwnProfile, fetchClients } from './data.js';
import { renderDashboard, openNewProjectModal } from './dashboard.js';
import { renderAgenda, shiftWeek, resetWeek } from './agenda.js';
import { renderUren, openNewTimeEntryModal } from './timeEntries.js';
import { renderClients, openClientForm, openPortalContentEditor } from './clients.js';
import { renderFinance } from './finance.js';
import { renderScripting, openConceptForm, importScriptFile } from './scripting.js';
import { renderDeadlines } from './deadlines.js';
import { renderContent } from './content.js';
import { renderEquipment, openEquipmentForm } from './equipment.js';
import { renderClientView, openEditNameModal } from './clientView.js';
import { showToast } from './toast.js';

const loginView = document.getElementById('login-view');
const appShell = document.getElementById('app-shell');
const clientShell = document.getElementById('client-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await signIn(email, password);
  } catch (err) {
    loginError.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut();
});
document.getElementById('client-logout-btn').addEventListener('click', async () => {
  await signOut();
});
document.getElementById('client-edit-name-btn').addEventListener('click', () => openEditNameModal());

document.getElementById('new-project-btn').addEventListener('click', openNewProjectModal);
document.getElementById('new-time-entry-btn').addEventListener('click', openNewTimeEntryModal);
document.getElementById('scripting-add-btn').addEventListener('click', () => openConceptForm(state.activeScriptingProjectId));
document.getElementById('scripting-import-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importScriptFile(state.activeScriptingProjectId, file);
  e.target.value = '';
});
document.getElementById('new-client-btn').addEventListener('click', () => openClientForm());
document.getElementById('portal-content-btn').addEventListener('click', () => openPortalContentEditor());
document.getElementById('new-equipment-btn').addEventListener('click', () => openEquipmentForm());
document.getElementById('prev-week-btn').addEventListener('click', () => shiftWeek(-1));
document.getElementById('next-week-btn').addEventListener('click', () => shiftWeek(1));
document.getElementById('today-btn').addEventListener('click', resetWeek);

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'dashboard') renderDashboard();
  if (view === 'agenda') renderAgenda();
  if (view === 'uren') renderUren();
  if (view === 'clients') renderClients();
  if (view === 'finance') renderFinance();
  if (view === 'scripting') renderScripting();
  if (view === 'deadlines') renderDeadlines();
  if (view === 'content') renderContent();
  if (view === 'equipment') renderEquipment();
}

function showLoginView() {
  loginView.classList.remove('hidden');
  appShell.classList.add('hidden');
  clientShell.classList.add('hidden');
  state.profile = null;
}

async function showAppShell() {
  loginView.classList.add('hidden');
  appShell.classList.remove('hidden');
  try {
    const [projects, events, timeEntries, clients] = await Promise.all([
      fetchProjects(),
      fetchEvents(),
      fetchTimeEntries(),
      fetchClients(),
    ]);
    state.projects = projects;
    state.events = events;
    state.timeEntries = timeEntries;
    state.clients = clients;
  } catch (err) {
    showToast('Kon data niet laden: ' + err.message, true);
  }
  switchView('dashboard');
}

function showClientShell() {
  loginView.classList.add('hidden');
  clientShell.classList.remove('hidden');
  renderClientView();
}

onAuthChange(async (session) => {
  if (!session) {
    showLoginView();
    return;
  }
  try {
    state.profile = await fetchOwnProfile();
  } catch (err) {
    showToast('Kon profiel niet laden: ' + err.message, true);
    return;
  }
  if (state.profile.role === 'admin') {
    showAppShell();
  } else {
    showClientShell();
  }
});
