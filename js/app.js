import { signIn, signUp, signOut, onAuthChange } from './auth.js';
import { state } from './state.js';
import { fetchProjects, fetchEvents, fetchTimeEntries, fetchOwnProfile } from './data.js';
import { renderDashboard, openNewProjectModal } from './dashboard.js';
import { renderAgenda, shiftWeek, resetWeek } from './agenda.js';
import { renderUren, openNewTimeEntryModal } from './timeEntries.js';
import { renderClientView } from './clientView.js';
import { showToast } from './toast.js';

const loginView = document.getElementById('login-view');
const appShell = document.getElementById('app-shell');
const clientShell = document.getElementById('client-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginToggleLink = document.getElementById('login-toggle-link');
const loginToggleText = document.getElementById('login-toggle-text');
const loginSubmit = document.getElementById('login-submit');

let mode = 'signin';

loginToggleLink.addEventListener('click', () => {
  mode = mode === 'signin' ? 'signup' : 'signin';
  loginSubmit.textContent = mode === 'signin' ? 'Inloggen' : 'Account aanmaken';
  loginToggleText.textContent = mode === 'signin' ? 'Nog geen account?' : 'Al een account?';
  loginToggleLink.textContent = mode === 'signin' ? 'Account aanmaken' : 'Inloggen';
  loginError.textContent = '';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
      loginError.textContent = 'Account aangemaakt. Bevestig eventueel je e-mail en log daarna in.';
      mode = 'signin';
      loginSubmit.textContent = 'Inloggen';
    }
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

document.getElementById('new-project-btn').addEventListener('click', openNewProjectModal);
document.getElementById('new-time-entry-btn').addEventListener('click', openNewTimeEntryModal);
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
    const [projects, events, timeEntries] = await Promise.all([
      fetchProjects(),
      fetchEvents(),
      fetchTimeEntries(),
    ]);
    state.projects = projects;
    state.events = events;
    state.timeEntries = timeEntries;
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
