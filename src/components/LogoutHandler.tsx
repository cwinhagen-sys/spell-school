'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'

/**
 * Component that handles logout tracking
 * 
 * NOTE: With the new sync system (SyncManager), we don't need manual sync on logout.
 * SyncManager handles automatic syncing every 3 seconds and on visibilitychange.
 * It also sends beacons automatically on pagehide/beforeunload.
 */
export default function LogoutHandler() {
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' && !session) {
          // User logged out, mark them as logged out
          console.log('User signed out, marking as logged out...')
          await markUserAsLoggedOut()
        }
      }
    )

    // NEW: Simplified - SyncManager handles all automatic syncing
    const handleBeforeUnload = () => {
      console.log('User is closing/navigating away - SyncManager will handle final sync via beacon')
      // SyncManager automatically sends beacon on pagehide/beforeunload
      // No manual intervention needed!
      
      // Mark as logged out when user closes tab or navigates away
      markUserAsLoggedOut()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // This component doesn't render anything
  return null
}
