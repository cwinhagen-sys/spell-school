/**
 * Google Authentication Helper Functions
 * Utilities for handling Google OAuth and Workspace authentication
 */

export interface GoogleAuthError {
  message: string
  code?: string
  isWorkspaceError?: boolean
}

/**
 * Check if an error is related to Google Workspace restrictions
 */
export function isWorkspaceError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = (error?.message || error?.error_description || '').toLowerCase()
  const errorCode = (error?.code || '').toLowerCase()
  
  return (
    errorMessage.includes('not approved') ||
    errorMessage.includes('domain') ||
    errorMessage.includes('workspace') ||
    errorMessage.includes('unauthorized domain') ||
    errorMessage.includes('access_denied') ||
    errorCode.includes('access_denied') ||
    errorCode.includes('unauthorized')
  )
}

/**
 * Get a user-friendly error message for Google auth errors
 */
export function getGoogleAuthErrorMessage(error: any): string {
  if (isWorkspaceError(error)) {
    return 'Din skola har ännu inte godkänt Spell School för Google Workspace. Vänligen kontakta din IT-ansvarige eller använd användarnamn och lösenord istället.'
  }
  
  if (error?.message) {
    return error.message
  }
  
  return 'Ett fel uppstod vid inloggning med Google. Försök igen eller använd användarnamn och lösenord.'
}

/**
 * Check if an email is from a Google Workspace domain
 */
export function isWorkspaceEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes('@')) return false
  
  const domain = email.split('@')[1]
  return domain !== 'gmail.com' && domain !== 'googlemail.com'
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null
  return email.split('@')[1]
}

/**
 * Format Google OAuth options for student sign-in
 * 
 * IMPORTANT: Make sure to add your redirect URLs in Supabase Dashboard:
 * - Authentication > URL Configuration > Redirect URLs
 * - Add: http://localhost:3000/auth/callback (for local development)
 * - Add: https://spellschool.se/auth/callback (for production)
 */
export function getGoogleOAuthOptions(role: 'student' | 'teacher' = 'student') {
  // Use window.location.origin to automatically detect the current domain
  // This works for both localhost:3000 and production domains
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  
  if (!origin) {
    console.error('❌ Cannot determine origin for OAuth redirect')
    throw new Error('Cannot determine origin for OAuth redirect')
  }
  
  // CRITICAL: Force localhost:3000 for local development
  // Supabase may use Site URL from Dashboard if redirectTo doesn't match exactly
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
  const finalOrigin = isLocalhost ? 'http://localhost:3000' : origin
  
  const redirectUrl = `${finalOrigin}/auth/callback?role=${role}`
  
  
  // Supabase requires queryParams to be passed directly in options
  // These will be forwarded to Google OAuth
  // NOTE: We don't use 'prompt' parameter so Google can remember the user
  // If user is already logged in to Google, they'll be logged in automatically
  // If not, Google will show the account picker
  return {
    redirectTo: redirectUrl,
    queryParams: {
      hd: '*', // Allow all domains (including Workspace)
      access_type: 'offline', // Request refresh token
      include_granted_scopes: 'true',
    },
    scopes: 'email profile',
    skipBrowserRedirect: false, // Ensure browser redirect happens
  }
}

