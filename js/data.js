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

export const updateOwnName = (fullName) =>
  sb.rpc('update_own_name', { p_full_name: fullName }).then(unwrap);

// ── klantenportaal ─────────────────────────────────────
export const linkClientByEmail = (projectId, email) =>
  sb.rpc('link_client_by_email', { p_project_id: projectId, p_email: email }).then(unwrap);

export const approveProject = (projectId) =>
  sb.rpc('approve_project', { p_project_id: projectId }).then(unwrap);

export const fetchProjectFeedback = (projectId) =>
  sb.from('project_feedback').select('*').eq('project_id', projectId).order('created_at').then(unwrap);

export const createFeedback = (projectId, message, conceptId = null) =>
  sb.from('project_feedback').insert({ project_id: projectId, message, concept_id: conceptId }).select().single().then(unwrap);

// ── video-ideeën & scripts ──────────────────────────────
export const fetchProjectConcepts = (projectId) =>
  sb.from('project_concepts').select('*').eq('project_id', projectId).order('created_at').then(unwrap);

export const createConcept = (payload) =>
  sb.from('project_concepts').insert(payload).select().single().then(unwrap);

export const updateConcept = (id, payload) =>
  sb.from('project_concepts').update(payload).eq('id', id).select().single().then(unwrap);

export const deleteConcept = (id) =>
  sb.from('project_concepts').delete().eq('id', id).then(unwrap);

export const approveConcept = (conceptId) =>
  sb.rpc('approve_concept', { p_concept_id: conceptId }).then(unwrap);

export const fetchClientProfiles = () =>
  sb.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false }).then(unwrap);

export const notifyStatusChange = (projectId) =>
  sb.functions.invoke('notify-status-change', { body: { projectId } }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });

export const sendDocumentEmail = (payload) =>
  sb.functions.invoke('send-document-email', { body: payload }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });

// ── klant-journey: welkomstgids, overeenkomst, delivery-gids ──
export const fetchPortalContent = async (key) => {
  const { data, error } = await sb.from('portal_content').select('*').eq('content_key', key).maybeSingle();
  if (error) throw error;
  return data;
};

export const savePortalContent = (key, content) =>
  sb.from('portal_content').upsert({ content_key: key, content }, { onConflict: 'content_key' }).select().single().then(unwrap);

export const signAgreement = (projectId, signedName) =>
  sb.rpc('sign_agreement', { p_project_id: projectId, p_signed_name: signedName }).then(unwrap);

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

// ── financiën (enkel admin) ──────────────────────────────
export const fetchFinFacturen = () =>
  sb.from('fin_facturen').select('*').order('datum', { ascending: false }).then(unwrap);
export const createFinFactuur = (payload) =>
  sb.from('fin_facturen').insert(payload).select().single().then(unwrap);
export const updateFinFactuur = (id, payload) =>
  sb.from('fin_facturen').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteFinFactuur = (id) =>
  sb.from('fin_facturen').delete().eq('id', id).then(unwrap);

export const fetchFinKosten = () =>
  sb.from('fin_kosten').select('*').order('datum', { ascending: false }).then(unwrap);
export const createFinKost = (payload) =>
  sb.from('fin_kosten').insert(payload).select().single().then(unwrap);
export const updateFinKost = (id, payload) =>
  sb.from('fin_kosten').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteFinKost = (id) =>
  sb.from('fin_kosten').delete().eq('id', id).then(unwrap);

export const fetchFinProjecten = () =>
  sb.from('fin_projecten').select('*').order('naam').then(unwrap);
export const createFinProject = (payload) =>
  sb.from('fin_projecten').insert(payload).select().single().then(unwrap);
export const updateFinProject = (id, payload) =>
  sb.from('fin_projecten').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteFinProject = (id) =>
  sb.from('fin_projecten').delete().eq('id', id).then(unwrap);

export const fetchFinAankopen = () =>
  sb.from('fin_aankopen').select('*').then(unwrap);
export const createFinAankoop = (payload) =>
  sb.from('fin_aankopen').insert(payload).select().single().then(unwrap);
export const updateFinAankoop = (id, payload) =>
  sb.from('fin_aankopen').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteFinAankoop = (id) =>
  sb.from('fin_aankopen').delete().eq('id', id).then(unwrap);

export const fetchFinSettings = async () => {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('fin_settings').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
};
export const saveFinSettings = (payload) =>
  sb.from('fin_settings').upsert(payload, { onConflict: 'user_id' }).select().single().then(unwrap);

export const fetchBtwSetAside = async (periodKey) => {
  const { data, error } = await sb.from('fin_btw_set_aside').select('*').eq('period_key', periodKey).maybeSingle();
  if (error) throw error;
  return data;
};
export const saveBtwSetAside = (periodKey, setAside) =>
  sb.from('fin_btw_set_aside')
    .upsert({ period_key: periodKey, set_aside: setAside }, { onConflict: 'user_id,period_key' })
    .select().single().then(unwrap);

// ── financiën: factuur-bestand bij een financieel project ─
const FIN_FACTUREN_BUCKET = 'fin-facturen';

export const uploadFinFactuurFile = async (projectId, file) => {
  const path = `${projectId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(FIN_FACTUREN_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
};

export const getFinFactuurUrl = async (path) => {
  const { data, error } = await sb.storage.from(FIN_FACTUREN_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw error;
  return data.signedUrl;
};

export const deleteFinFactuurFile = async (path) => {
  const { error } = await sb.storage.from(FIN_FACTUREN_BUCKET).remove([path]);
  if (error) throw error;
};

// ── klanten (business-record, los van portaal-accounts) ──
export const fetchClients = () =>
  sb.from('clients').select('*').order('naam').then(unwrap);
export const createClient = (payload) =>
  sb.from('clients').insert(payload).select().single().then(unwrap);
export const updateClient = (id, payload) =>
  sb.from('clients').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteClient = (id) =>
  sb.from('clients').delete().eq('id', id).then(unwrap);

// ── offertes ──────────────────────────────────────────
export const fetchFinOffertes = () =>
  sb.from('fin_offertes').select('*').order('datum', { ascending: false }).then(unwrap);
export const createFinOfferte = (payload) =>
  sb.from('fin_offertes').insert(payload).select().single().then(unwrap);
export const updateFinOfferte = (id, payload) =>
  sb.from('fin_offertes').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteFinOfferte = (id) =>
  sb.from('fin_offertes').delete().eq('id', id).then(unwrap);

// ── equipment ─────────────────────────────────────────
export const fetchEquipment = () =>
  sb.from('equipment').select('*').order('naam').then(unwrap);
export const createEquipment = (payload) =>
  sb.from('equipment').insert(payload).select().single().then(unwrap);
export const updateEquipment = (id, payload) =>
  sb.from('equipment').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteEquipment = (id) =>
  sb.from('equipment').delete().eq('id', id).then(unwrap);

// ── content planning ──────────────────────────────────
export const fetchContentPosts = () =>
  sb.from('content_posts').select('*').order('gepland_op', { ascending: true, nullsFirst: false }).then(unwrap);
export const createContentPost = (payload) =>
  sb.from('content_posts').insert(payload).select().single().then(unwrap);
export const updateContentPost = (id, payload) =>
  sb.from('content_posts').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteContentPost = (id) =>
  sb.from('content_posts').delete().eq('id', id).then(unwrap);

export const fetchContentGoals = () =>
  sb.from('content_goals').select('*').then(unwrap);
export const saveContentGoal = (platform, doelPerWeek) =>
  sb.from('content_goals').upsert({ platform, doel_per_week: doelPerWeek }, { onConflict: 'platform' }).select().single().then(unwrap);
