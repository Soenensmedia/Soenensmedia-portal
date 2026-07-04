import { sb } from './supabaseClient.js';
import { state } from './state.js';

export async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await sb.auth.signOut();
  state.user = null;
}

export function onAuthChange(callback) {
  sb.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user ?? null;
    callback(session);
  });
}
