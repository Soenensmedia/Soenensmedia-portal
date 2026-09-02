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

// Enkel voor admin: alle feedback in 1 keer, voor het "aandacht nodig"-overzicht.
export const fetchAllFeedback = () =>
  sb.from('project_feedback').select('*').order('created_at').then(unwrap);

// ── video-ideeën & scripts ──────────────────────────────
export const fetchProjectConcepts = (projectId) =>
  sb.from('project_concepts').select('*').eq('project_id', projectId).order('created_at').then(unwrap);

export const fetchAllConcepts = () =>
  sb.from('project_concepts').select('*').order('created_at').then(unwrap);

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

export const notifyNewConcept = (projectId, title, type) =>
  sb.functions.invoke('notify-new-concept', { body: { projectId, title, type } }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });

export const notifyNewContract = (contractId) =>
  sb.functions.invoke('notify-new-contract', { body: { contractId } }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });

export const notifyAdminFeedback = (projectId, message) =>
  sb.functions.invoke('notify-admin-feedback', { body: { projectId, message } }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });

export const inviteClient = (email, projectId = null) =>
  sb.functions.invoke('invite-client', { body: { email, projectId } }).then(({ data, error }) => {
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

// ── contract-bestand bij een opdracht ───────────────────
const CONTRACTS_BUCKET = 'project-contracts';

export const uploadAgreementFile = async (projectId, file) => {
  const path = `${projectId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(CONTRACTS_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
};

export const getAgreementFileUrl = async (path) => {
  const { data, error } = await sb.storage.from(CONTRACTS_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) throw error;
  return data.signedUrl;
};

export const deleteAgreementFile = async (path) => {
  const { error } = await sb.storage.from(CONTRACTS_BUCKET).remove([path]);
  if (error) throw error;
};

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

export const deleteAllPhotos = async (projectId) => {
  const { data, error } = await sb.storage.from(PHOTOS_BUCKET).list(projectId);
  if (error) throw error;
  if (!data || !data.length) return;
  const { error: delErr } = await sb.storage.from(PHOTOS_BUCKET).remove(data.map((f) => `${projectId}/${f.name}`));
  if (delErr) throw delErr;
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

// Voor de klant-kant: er is maar 1 (admin-)bedrijfsinstellingen-rij, en de
// klant heeft geen eigen user_id daarin — dus geen .eq('user_id', ...) filter.
export const fetchAnyFinSettings = async () => {
  const { data, error } = await sb.from('fin_settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
};

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

// ── portal-branding (bedrijfsfoto bovenaan het klantportaal) ──
const PORTAL_BRANDING_BUCKET = 'portal-branding';

export const uploadPortalPhoto = async (file) => {
  const path = `company/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(PORTAL_BRANDING_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
};

// Eigen foto per klant (overschrijft de algemene bedrijfsfoto in die klant se portaal).
export const uploadClientPhoto = async (clientId, file) => {
  const path = `client/${clientId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(PORTAL_BRANDING_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
};

// Omslagfoto per opdracht (overschrijft de klant-/bedrijfsfoto bovenaan bij dat ene project).
export const uploadProjectCover = async (projectId, file) => {
  const path = `project/${projectId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from(PORTAL_BRANDING_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
};

// Publieke bucket: de publieke URL is meteen bruikbaar, geen signed url nodig.
export const getPortalPhotoUrl = (path) => {
  if (!path) return null;
  const { data } = sb.storage.from(PORTAL_BRANDING_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const deletePortalPhoto = async (path) => {
  const { error } = await sb.storage.from(PORTAL_BRANDING_BUCKET).remove([path]);
  if (error) throw error;
};

// ── content-strategie (per klant) ────────────────────────
export const fetchContentStrategie = (clientId) =>
  sb.from('content_strategie').select('*').eq('client_id', clientId).maybeSingle().then(unwrap);
export const saveContentStrategie = (clientId, payload) =>
  sb.from('content_strategie').upsert({ client_id: clientId, ...payload }, { onConflict: 'client_id' }).select().single().then(unwrap);

export const fetchContentIdeeen = (clientId) =>
  sb.from('content_ideeen').select('*').eq('client_id', clientId).order('volgorde').then(unwrap);
export const createContentIdee = (payload) =>
  sb.from('content_ideeen').insert(payload).select().single().then(unwrap);
export const updateContentIdee = (id, payload) =>
  sb.from('content_ideeen').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteContentIdee = (id) =>
  sb.from('content_ideeen').delete().eq('id', id).then(unwrap);

export const fetchContentScripts = (clientId) =>
  sb.from('content_scripts').select('*').eq('client_id', clientId).order('created_at').then(unwrap);
export const createContentScript = (payload) =>
  sb.from('content_scripts').insert(payload).select().single().then(unwrap);
export const updateContentScript = (id, payload) =>
  sb.from('content_scripts').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteContentScript = (id) =>
  sb.from('content_scripts').delete().eq('id', id).then(unwrap);

export const fetchContentHookformules = (clientId) =>
  sb.from('content_hookformules').select('*').eq('client_id', clientId).order('volgorde').then(unwrap);
export const createContentHookformule = (payload) =>
  sb.from('content_hookformules').insert(payload).select().single().then(unwrap);
export const deleteContentHookformule = (id) =>
  sb.from('content_hookformules').delete().eq('id', id).then(unwrap);

export const fetchContentDraaidag = (clientId) =>
  sb.from('content_draaidag').select('*').eq('client_id', clientId).order('volgorde').then(unwrap);
export const createContentDraaidag = (payload) =>
  sb.from('content_draaidag').insert(payload).select().single().then(unwrap);
export const deleteContentDraaidag = (id) =>
  sb.from('content_draaidag').delete().eq('id', id).then(unwrap);

export const fetchContentBroll = (clientId) =>
  sb.from('content_broll').select('*').eq('client_id', clientId).order('volgorde').then(unwrap);
export const createContentBroll = (payload) =>
  sb.from('content_broll').insert(payload).select().single().then(unwrap);
export const deleteContentBroll = (id) =>
  sb.from('content_broll').delete().eq('id', id).then(unwrap);

export const fetchContentInspiratie = (clientId) =>
  sb.from('content_inspiratie').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).then(unwrap);
export const createContentInspiratie = (payload) =>
  sb.from('content_inspiratie').insert(payload).select().single().then(unwrap);
export const deleteContentInspiratie = (id) =>
  sb.from('content_inspiratie').delete().eq('id', id).then(unwrap);

export const fetchContentPlanner = (clientId) =>
  sb.from('content_planner').select('*').eq('client_id', clientId).order('created_at').then(unwrap);
export const saveContentPlannerRow = (id, payload) =>
  id
    ? sb.from('content_planner').update(payload).eq('id', id).select().single().then(unwrap)
    : sb.from('content_planner').insert(payload).select().single().then(unwrap);
export const deleteContentPlannerRow = (id) =>
  sb.from('content_planner').delete().eq('id', id).then(unwrap);

// ── retainer-contracten ───────────────────────────────
export const fetchClientContracts = (clientId) =>
  sb.from('client_contracts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).then(unwrap);
export const fetchAllClientContracts = () =>
  sb.from('client_contracts').select('*').order('created_at', { ascending: false }).then(unwrap);
export const createClientContract = (payload) =>
  sb.from('client_contracts').insert(payload).select().single().then(unwrap);
export const updateClientContract = (id, payload) =>
  sb.from('client_contracts').update(payload).eq('id', id).select().single().then(unwrap);
export const deleteClientContract = (id) =>
  sb.from('client_contracts').delete().eq('id', id).then(unwrap);
export const signClientContract = (id, name, role, signatureImg) =>
  sb.rpc('sign_client_contract', { p_contract_id: id, p_signed_name: name, p_signed_role: role, p_signature_img: signatureImg }).then(unwrap);
