/**
 * Clear Old Sync Data
 * 
 * Utility to clean up old events from IndexedDB/localStorage
 * that might belong to other users or be corrupted.
 */

import { xpOutbox } from './xpOutbox'
import { questOutbox } from './questOutbox'

/**
 * Clear all XP and Quest outbox data
 * Use this to fix sync issues or when switching users
 */
export async function clearAllSyncData(): Promise<void> {
  console.log('🧹 Clearing all sync data...')
  
  try {
    // Clear XP outbox
    await xpOutbox.clearAll()
    console.log('✅ XP outbox cleared')
    
    // Clear Quest outbox
    await questOutbox.clearAll()
    console.log('✅ Quest outbox cleared')
    
    console.log('🎉 All sync data cleared successfully!')
  } catch (error) {
    console.error('❌ Error clearing sync data:', error)
  }
}

/**
 * Check and clean up invalid events on app startup
 */
export async function cleanupInvalidEvents(): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('No user logged in, skipping cleanup')
      return
    }

    // Get pending XP events
    const xpStatus = await xpOutbox.getStatus()
    const invalidXpEvents = xpStatus.events.filter(e => e.student_id !== user.id)
    
    if (invalidXpEvents.length > 0) {
      console.warn(`🧹 Found ${invalidXpEvents.length} invalid XP events from other users, clearing...`)
      // Clear all to be safe
      await xpOutbox.clearAll()
      console.log('✅ Invalid XP events cleared')
    }

    // Get pending Quest events
    const questStatus = await questOutbox.getStatus()
    // Quest events don't have student_id in the same way, so just clear if there are any old ones
    
    console.log('✅ Cleanup complete')
  } catch (error) {
    console.error('⚠️ Cleanup failed (non-critical):', error)
  }
}

// Expose to window for manual cleanup in console
if (typeof window !== 'undefined') {
  (window as any).clearAllSyncData = clearAllSyncData;
  (window as any).cleanupInvalidEvents = cleanupInvalidEvents
}

