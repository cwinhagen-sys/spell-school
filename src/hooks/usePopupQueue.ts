'use client'

import { useState, useCallback, useEffect } from 'react'

export type PopupType = 'level_up' | 'streak' | 'badge' | 'bonus'

export interface QueuedPopup {
  id: string
  type: PopupType
  data: any
  timestamp: number
}

export function usePopupQueue() {
  const [queue, setQueue] = useState<QueuedPopup[]>([])
  const [currentPopup, setCurrentPopup] = useState<QueuedPopup | null>(null)
  const [isShowing, setIsShowing] = useState(false)

  // Add popup to queue
  const enqueuePopup = useCallback((type: PopupType, data: any) => {
    const popup: QueuedPopup = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now()
    }
    
    console.log('📋 Enqueuing popup:', type, data)
    setQueue(prev => [...prev, popup])
  }, [])

  // Show next popup in queue
  const showNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        setCurrentPopup(null)
        setIsShowing(false)
        return prev
      }

      const [next, ...rest] = prev
      console.log('🎬 Showing next popup:', next.type)
      setCurrentPopup(next)
      setIsShowing(true)
      return rest
    })
  }, [])

  // Dismiss current popup and show next
  const dismissCurrent = useCallback(() => {
    console.log('👋 Dismissing current popup')
    setIsShowing(false)
    setCurrentPopup(null)
    
    // Small delay before showing next to avoid overlap
    setTimeout(() => {
      showNext()
    }, 300)
  }, [showNext])

  // Auto-show first popup when queue gets items
  useEffect(() => {
    if (queue.length > 0 && !currentPopup && !isShowing) {
      console.log('🎯 Auto-showing first popup in queue')
      showNext()
    }
  }, [queue, currentPopup, isShowing, showNext])

  // Clear all popups (emergency)
  const clearAll = useCallback(() => {
    setQueue([])
    setCurrentPopup(null)
    setIsShowing(false)
  }, [])

  return {
    enqueuePopup,
    dismissCurrent,
    clearAll,
    currentPopup,
    isShowing,
    queueLength: queue.length
  }
}























