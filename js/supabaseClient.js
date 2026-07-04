import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// De UMD build via CDN plaatst een globale `supabase` variabele op window
// (zie index.html). We noemen onze eigen client hieronder `sb` om conflict
// met die globale naam te vermijden.
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
