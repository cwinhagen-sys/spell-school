import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

// Server-side Supabase client that uses cookies for auth
export function createServerClient() {
  const cookieStore = cookies()
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// For API routes, we need to handle auth differently
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey)
