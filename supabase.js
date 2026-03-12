import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://qojjyvshjwpioiwxnrzh.supabase.co';
const supabaseKey = 'sb_secret_5rPOzsV4vcYVhj323sxrNg_bz83VSao';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }

});
