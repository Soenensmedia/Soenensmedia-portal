export const STATUS_LABELS = {
  nieuw: 'Nieuw',
  shooting: 'Shooten',
  editing: 'Editen',
  wacht_op_feedback: 'Wacht op feedback',
  revisie: 'Revisie',
  klaar_om_te_versturen: 'Klaar om te versturen',
  verzonden: 'Verzonden',
  afgerond: 'Afgerond',
};

export const STATUS_ORDER = Object.keys(STATUS_LABELS);

export const CONCEPT_TYPE_LABELS = { idee: 'Idee', script: 'Script' };
export const CONCEPT_STATUS_LABELS = {
  in_afwachting: 'In afwachting',
  goedgekeurd: 'Goedgekeurd',
  aanpassing_gevraagd: 'Aanpassing gevraagd',
};

export const EVENT_TYPE_LABELS = {
  shoot: 'Shoot',
  edit: 'Edit',
  business: 'Business',
  learning: 'Leren',
  meeting: 'Meeting',
  other: 'Ander',
};

export const state = {
  user: null,
  profile: null,
  projects: [],
  events: [],
  timeEntries: [],
  clients: [],
  feedback: [],
  allFeedback: [],
  currentView: 'dashboard',
  weekStart: startOfWeek(new Date()),
  activeProjectId: null,
  activeClientProjectId: null,
  activeClientDetailTab: 'overzicht',
  activeScriptingProjectId: null,
  clientProjects: [],
  clientFeedbackByProject: {},
  clientPhotosByProject: {},
  clientConceptsByProject: {},
  portalWelcomeGuide: '',
  portalDeliveryGuide: '',
  clientOwnRecords: [],
  clientFacturen: [],
  clientOffertes: [],
  clientFinSettings: {},
};

export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = zondag
  const diff = (day === 0 ? -6 : 1) - day; // terug naar maandag
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fmtDate(date) {
  return new Intl.DateTimeFormat('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function fmtDateShort(date) {
  return new Intl.DateTimeFormat('nl-BE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

export function fmtTime(date) {
  return new Intl.DateTimeFormat('nl-BE', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function toDateInputValue(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function toTimeInputValue(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(11, 16);
}

export function projectById(id) {
  return state.projects.find((p) => p.id === id) || null;
}
