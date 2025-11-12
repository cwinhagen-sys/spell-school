import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Use hardcoded values since environment variables might not be set
const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)
