import { supabase } from '@/lib/supabase'

/**
 * Update user's last_active timestamp
 * This should be called when users perform meaningful actions
 */
export async function updateUserActivity(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Update last_active in profiles
    const { error } = await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id)
    
    if (error) {
      // If last_active column doesn't exist, silently fail
      if (error.code === '42703') {
        console.log('last_active column does not exist, skipping activity update')
        return
      }
      console.log('Activity tracking failed:', error)
    }
  } catch (error) {
    // Silently fail - this is not critical
    console.log('Activity tracking failed:', error)
  }
}

/**
 * Check if a timestamp represents "currently active" (within last 2 minutes)
 */
export function isCurrentlyActive(timestamp: string): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  return diffMinutes <= 2
}

/**
 * Check if a timestamp represents "recently active" (within last 10 minutes)
 */
export function isRecentlyActive(timestamp: string): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  return diffMinutes <= 10
}

/**
 * Mark user as logged out by setting last_active to a very old timestamp
 * This will immediately remove them from "Playing" status
 */
export async function markUserAsLoggedOut(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('No user found for logout marking')
      return
    }

    // Set last_active to 10 minutes ago to ensure they're not "Playing"
    // This is more than the 2-minute "Playing" threshold
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    console.log('Attempting to update last_active for user:', user.id)
    const { error } = await supabase
      .from('profiles')
      .update({ last_active: tenMinutesAgo })
      .eq('id', user.id)
    
    if (error) {
      console.error('Error updating last_active:', error)
      // If last_active column doesn't exist, try to create it first
      if (error.code === '42703') { // column does not exist
        console.log('last_active column does not exist, skipping update')
        return
      }
    } else {
      console.log('User marked as logged out successfully')
    }
  } catch (error) {
    console.error('Failed to mark user as logged out:', error)
  }
}
