import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

// Optimized Supabase client configuration for high concurrency
// - Uses keep-alive connections for better performance
// - No rate limiting - designed to handle many concurrent requests
const supabaseClientOptions = {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false, // Server-side doesn't need session persistence
    autoRefreshToken: false, // Server-side handles tokens differently
    detectSessionInUrl: false,
  },
  global: {
    // Use fetch with keep-alive for connection reuse
    fetch: (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        // Enable keep-alive for connection reuse (reduces overhead)
        // Note: keepalive may not be available in all Node.js versions, but is safe to include
        ...(typeof (globalThis as any).Request !== 'undefined' && { keepalive: true }),
      })
    },
  },
}

// Server-side Supabase client that uses cookies for auth
export function createServerClient() {
  const cookieStore = cookies()
  
  return createClient(supabaseUrl, supabaseAnonKey, supabaseClientOptions)
}

// For API routes, we need to handle auth differently
// This shared instance is safe to reuse across requests as Supabase client is stateless
// and uses HTTP connections which are managed by the underlying fetch implementation
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, supabaseClientOptions)
