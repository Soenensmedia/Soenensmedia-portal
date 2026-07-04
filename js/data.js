import { sb } from './supabaseClient.js';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// ── projects ──────────────────────────────────────────
export const fetchProjects = () =>
  sb.from('projects').select('*').order('created_at', { ascending: false }).then(unwrap);

export const createProject = (payload) =>
  sb.from('projects').insert(payload).select().single().then(unwrap);

export const updateProject = (id, payload) =>
  sb.from('projects').update(payload).eq('id', id).select().single().then(unwrap);

export const deleteProject = (id) =>
  sb.from('projects').delete().eq('id', id).then(unwrap);

export const fetchProject = (id) =>
  sb.from('projects').select('*').eq('id', id).single().then(unwrap);

// ── calendar events ───────────────────────────────────
export const fetchEvents = () =>
  sb.from('calendar_events').select('*').order('start_time').then(unwrap);

export const createEvent = (payload) =>
  sb.from('calendar_events').insert(payload).select().single().then(unwrap);

export const updateEvent = (id, payload) =>
  sb.from('calendar_events').update(payload).eq('id', id).select().single().then(unwrap);

export const deleteEvent = (id) =>
  sb.from('calendar_events').delete().eq('id', id).then(unwrap);

// ── time entries ──────────────────────────────────────
export const fetchTimeEntries = () =>
  sb.from('time_entries').select('*').order('entry_date', { ascending: false }).then(unwrap);

export const createTimeEntry = (payload) =>
  sb.from('time_entries').insert(payload).select().single().then(unwrap);

export const deleteTimeEntry = (id) =>
  sb.from('time_entries').delete().eq('id', id).then(unwrap);

// ── profiel (rol: admin/client) ───────────────────────
// Expliciet filteren op de eigen user-id: voor een admin laat de RLS-policy
// op `profiles` (terecht) alle rijen zien, dus zonder deze filter zou
// .single() falen zodra er meer dan 1 profiel bestaat.
export const fetchOwnProfile = async () => {
  const { data: { user } } = await sb.auth.getUser();
  return sb.from('profiles').select('*').eq('id', user.id).single().then(unwrap);
};

// ── klantenportaal ─────────────────────────────────────
export const linkClientByEmail = (projectId, email) =>
  sb.rpc('link_client_by_email', { p_project_id: projectId, p_email: email }).then(unwrap);

export const approveProject = (projectId) =>
  sb.rpc('approve_project', { p_project_id: projectId }).then(unwrap);

export const fetchProjectFeedback = (projectId) =>
  sb.from('project_feedback').select('*').eq('project_id', projectId).order('created_at').then(unwrap);

export const createFeedback = (projectId, message) =>
  sb.from('project_feedback').insert({ project_id: projectId, message }).select().single().then(unwrap);

// ── fotogalerij ─────────────────────────────────────────
const PHOTOS_BUCKET = 'project-photos';
const SIGNED_URL_TTL = 4 * 60 * 60; // 4 uur

export const uploadPhoto = async (projectId, file) => {
  const path = `${projectId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(PHOTOS_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
};

export const listPhotos = async (projectId) => {
  const { data, error } = await sb.storage.from(PHOTOS_BUCKET).list(projectId, {
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;
  return Promise.all((data || []).map(async (file) => {
    const { data: signed, error: signErr } = await sb.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(`${projectId}/${file.name}`, SIGNED_URL_TTL);
    if (signErr) throw signErr;
    return { name: file.name, url: signed.signedUrl };
  }));
};

export const deletePhoto = async (projectId, filename) => {
  const { error } = await sb.storage.from(PHOTOS_BUCKET).remove([`${projectId}/${filename}`]);
  if (error) throw error;
};
