'use client'

import { useRef, useCallback } from 'react'

/**
 * Hook for preventing duplicate simultaneous requests
 * Ensures only one request of each type runs at a time
 */
export function useRequestDeduplication() {
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())

  const deduplicate = useCallback(async <T,>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // If request is already pending, return the existing promise
    if (pendingRequests.current.has(key)) {
      console.log(`⏭️ Request deduplication: Skipping duplicate request for "${key}"`)
      return pendingRequests.current.get(key)!
    }

    // Start new request
    console.log(`🚀 Request deduplication: Starting new request for "${key}"`)
    const promise = requestFn()
      .finally(() => {
        // Clean up when done
        pendingRequests.current.delete(key)
        console.log(`✅ Request deduplication: Completed request for "${key}"`)
      })

    pendingRequests.current.set(key, promise)
    return promise
  }, [])

  const clear = useCallback((key?: string) => {
    if (key) {
      pendingRequests.current.delete(key)
    } else {
      pendingRequests.current.clear()
    }
  }, [])

  return { deduplicate, clear }
}





















