/**
 * Email verification utilities
 */

import { supabase } from './supabase'

/**
 * Check if user's email is verified
 * Returns true if:
 * - In development mode (localhost)
 * - User has email_confirmed_at set
 * - User signed up via Google OAuth (auto-verified)
 */
export async function isEmailVerified(userId?: string): Promise<boolean> {
  // In development, skip verification (client-side only)
  if (typeof window !== 'undefined') {
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
    if (isDevelopment) {
      return true
    }
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return false
    }

    // Google OAuth emails are auto-verified
    if (user.app_metadata?.provider === 'google') {
      return true
    }

    // Check if email is confirmed
    return !!user.email_confirmed_at
  } catch (error) {
    console.error('Error checking email verification:', error)
    return false
  }
}

/**
 * Check if a specific user object has verified email
 * Useful when you already have the user object
 */
export function isUserEmailVerified(user: any): boolean {
  if (!user) return false
  
  // In development, skip verification (client-side only)
  if (typeof window !== 'undefined') {
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
    if (isDevelopment) {
      return true
    }
  }

  // Google OAuth emails are auto-verified
  if (user.app_metadata?.provider === 'google') {
    return true
  }

  // Check if email is confirmed
  return !!user.email_confirmed_at
}

/**
 * Resend verification email to current user
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !user.email) {
      return { success: false, error: 'No user or email found' }
    }

    // Check if already verified
    if (user.email_confirmed_at) {
      return { success: false, error: 'Email is already verified' }
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to resend verification email' }
  }
}

