import { createClient } from '@supabase/supabase-js'

// These are public browser credentials, NOT a service-role key.
// Environment variables may override the project-specific defaults.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://rnjmudldezceypdmrblh.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-XY8DCTDTuKHo5OBQrUpYg_6hXOtRDG'

export const supabase = createClient(url, publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
