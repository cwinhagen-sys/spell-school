'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'

/**
 * Component that handles logout tracking
 * This should be included on student pages to track when they log out
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

    // Also listen for beforeunload to catch browser close/refresh
    const handleBeforeUnload = () => {
      // Mark as logged out when user closes tab or navigates away
      // Use sendBeacon for more reliable delivery
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
