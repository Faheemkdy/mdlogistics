import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to create a temporary client for creating users without logging out admin
export const createTempClient = () => createClient(supabaseUrl, supabaseAnonKey);

// Helper to map username to email for Supabase Auth
// Using a consistent internal domain for user identification
export const getEmailFromUsername = (username: string) => {
  if (!username) return 'guest@mdcourier.net';
  
  // Clean username: lowercase, remove special characters except dots/underscores
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
  
  // Ensure we have at least something meaningful
  const finalName = cleanUsername.length < 1 ? 'user' : cleanUsername;
  
  return `${finalName}@mdcourier.net`;
};
