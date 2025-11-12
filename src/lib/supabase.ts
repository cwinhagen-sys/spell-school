import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

const baseSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Handle refresh token errors gracefully
    flowType: 'pkce'
  }
})

// Wrap auth methods to handle refresh token errors gracefully
const originalGetSession = baseSupabase.auth.getSession.bind(baseSupabase.auth)
const originalGetUser = baseSupabase.auth.getUser.bind(baseSupabase.auth)

// Deduplicate refresh token calls to prevent "Already Used" errors
let refreshPromise: Promise<any> | null = null
let lastRefreshTime = 0
const REFRESH_COOLDOWN_MS = 1000 // Wait 1 second between refresh attempts

baseSupabase.auth.getSession = async function() {
  try {
    // If there's already a refresh in progress, wait for it
    if (refreshPromise) {
      try {
        await refreshPromise
      } catch {
        // Ignore errors from the pending refresh
      }
    }
    
    // Rate limit refresh attempts
    const now = Date.now()
    if (now - lastRefreshTime < REFRESH_COOLDOWN_MS && refreshPromise) {
      await refreshPromise
    }
    
    const result = await originalGetSession()
    
    if (result.error) {
      // If it's a refresh token error, handle it gracefully
      if (result.error.message?.includes('refresh_token') || 
          result.error.message?.includes('Already Used') || 
          result.error.message?.includes('Invalid Refresh Token')) {
        console.warn('Refresh token error detected in getSession, attempting recovery:', result.error.message)
        refreshPromise = null
        lastRefreshTime = Date.now()
        
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 100))
        return await originalGetSession()
      }
    }
    
    lastRefreshTime = Date.now()
    return result
  } catch (err: any) {
    // Handle refresh token errors gracefully
    if (err?.message?.includes('refresh_token') || 
        err?.message?.includes('Already Used') || 
        err?.message?.includes('Invalid Refresh Token')) {
      console.warn('Refresh token error caught in getSession wrapper:', err.message)
      refreshPromise = null
      lastRefreshTime = Date.now()
      // Return empty session instead of throwing
      return { data: { session: null }, error: err }
    }
    throw err
  } finally {
    // Clear promise after a short delay
    setTimeout(() => {
      refreshPromise = null
    }, REFRESH_COOLDOWN_MS)
  }
}

baseSupabase.auth.getUser = async function() {
  try {
    // If there's already a refresh in progress, wait for it
    if (refreshPromise) {
      try {
        await refreshPromise
      } catch {
        // Ignore errors from the pending refresh
      }
    }
    
    // Rate limit refresh attempts
    const now = Date.now()
    if (now - lastRefreshTime < REFRESH_COOLDOWN_MS && refreshPromise) {
      await refreshPromise
    }
    
    const result = await originalGetUser()
    
    if (result.error) {
      // If it's a refresh token error, handle it gracefully
      if (result.error.message?.includes('refresh_token') || 
          result.error.message?.includes('Already Used') || 
          result.error.message?.includes('Invalid Refresh Token')) {
        console.warn('Refresh token error detected in getUser, attempting recovery:', result.error.message)
        refreshPromise = null
        lastRefreshTime = Date.now()
        
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 100))
        return await originalGetUser()
      }
    }
    
    lastRefreshTime = Date.now()
    return result
  } catch (err: any) {
    // Handle refresh token errors gracefully
    if (err?.message?.includes('refresh_token') || 
        err?.message?.includes('Already Used') || 
        err?.message?.includes('Invalid Refresh Token')) {
      console.warn('Refresh token error caught in getUser wrapper:', err.message)
      refreshPromise = null
      lastRefreshTime = Date.now()
      // Return empty user instead of throwing
      return { data: { user: null }, error: err }
    }
    throw err
  } finally {
    // Clear promise after a short delay
    setTimeout(() => {
      refreshPromise = null
    }, REFRESH_COOLDOWN_MS)
  }
}

export const supabase = baseSupabase

// Set up global error handler for auth errors
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    // Handle token refresh errors globally
    if (event === 'TOKEN_REFRESHED' && !session) {
      console.warn('Token refresh failed, user may need to sign in again')
    }
  })
}

// Helper functions for common operations
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Export safe versions for places that need explicit error handling
export const getSessionSafe = async () => {
  return await supabase.auth.getSession()
}

export const getUserSafe = async () => {
  return await supabase.auth.getUser()
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}
