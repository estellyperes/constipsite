import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://qojjyvshjwpioiwxnrzh.supabase.co';
const supabaseKey = 'sb_publishable_KobslpSUwDU28XxuQEFoYQ_JDiwj_aM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});