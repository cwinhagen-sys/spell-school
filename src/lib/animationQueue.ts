/**
 * Animation Queue System
 * 
 * Manages popup animations to show them in sequence without collisions
 * Coalesces rapid XP gains into single animations
 */

import { isFeatureEnabled } from './featureFlags'

export type AnimationType = 'xp' | 'level_up' | 'badge' | 'streak' | 'quest_complete' | 'bonus'

export interface QueuedAnimation {
  id: string
  type: AnimationType
  data: any
  timestamp: number
  priority: number // Lower = higher priority (0 = show first)
}

class AnimationQueueManager {
  private queue: QueuedAnimation[] = []
  private currentAnimation: QueuedAnimation | null = null
  private isShowing: boolean = false
  private listeners: Set<(state: AnimationQueueState) => void> = new Set()
  private coalescingTimeout: NodeJS.Timeout | null = null
  private xpBuffer: { amount: number; count: number } = { amount: 0, count: 0 }

  /**
   * Get priority for animation type (lower = shown first)
   */
  private getPriority(type: AnimationType): number {
    const priorities = {
      'xp': 1,           // XP shown first (common)
      'quest_complete': 2, // Then quest completions
      'badge': 3,        // Then badges
      'streak': 4,       // Then streak
      'level_up': 5,     // Level up last (most important, should be seen clearly)
      'bonus': 6
    }
    return priorities[type] || 10
  }

  /**
   * Enqueue animation (with smart XP coalescing)
   */
  enqueue(type: AnimationType, data: any) {
    if (!isFeatureEnabled('USE_ANIMATION_QUEUE')) {
      // Feature disabled, use old behavior
      this.notifyListeners({
        currentAnimation: { id: crypto.randomUUID(), type, data, timestamp: Date.now(), priority: 0 },
        queue: [],
        queueLength: 0,
        hasBufferedXP: false,
        isShowing: true
      })
      return
    }

    const log = (...args: any[]) => {
      if (isFeatureEnabled('DEBUG_MODE')) {
        console.log('[AnimQueue]', ...args)
      }
    }

    // Smart XP Coalescing: Buffer rapid XP gains
    if (type === 'xp') {
      this.xpBuffer.amount += data.amount || 0
      this.xpBuffer.count += 1
      
      log(`Buffering XP: +${data.amount} (Total buffered: ${this.xpBuffer.amount}, Count: ${this.xpBuffer.count})`)
      
      // Clear existing timeout
      if (this.coalescingTimeout) {
        clearTimeout(this.coalescingTimeout)
      }
      
      // Wait 500ms for more XP events, then flush
      this.coalescingTimeout = setTimeout(() => {
        if (this.xpBuffer.amount > 0) {
          log(`Flushing XP buffer: +${this.xpBuffer.amount} from ${this.xpBuffer.count} events`)
          
          const animation: QueuedAnimation = {
            id: crypto.randomUUID(),
            type: 'xp',
            data: { 
              amount: this.xpBuffer.amount,
              count: this.xpBuffer.count 
            },
            timestamp: Date.now(),
            priority: this.getPriority('xp')
          }
          
          this.queue.push(animation)
          this.xpBuffer = { amount: 0, count: 0 }
          this.sortQueue()
          this.notifyListeners(this.getState())
          
          // Auto-show if nothing is showing
          if (!this.isShowing && !this.currentAnimation) {
            this.showNext()
          }
        }
      }, 500) // Wait 500ms for more XP events
      
      return
    }

    // For non-XP animations, add to queue immediately
    const animation: QueuedAnimation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      priority: this.getPriority(type)
    }

    log(`Enqueued ${type}:`, data)

    this.queue.push(animation)
    this.sortQueue()
    this.notifyListeners(this.getState())

    // Auto-show if nothing is showing
    if (!this.isShowing && !this.currentAnimation) {
      this.showNext()
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.timestamp - b.timestamp
    })
  }

  /**
   * Show next animation in queue
   */
  showNext() {
    if (this.queue.length === 0) {
      this.currentAnimation = null
      this.isShowing = false
      this.notifyListeners(this.getState())
      return
    }

    const next = this.queue.shift()!
    this.currentAnimation = next
    this.isShowing = true

    const log = (...args: any[]) => {
      if (isFeatureEnabled('DEBUG_MODE')) {
        console.log('[AnimQueue]', ...args)
      }
    }

    log(`Showing ${next.type}:`, next.data)
    this.notifyListeners(this.getState())
  }

  /**
   * Dismiss current animation and show next
   */
  dismiss() {
    const log = (...args: any[]) => {
      if (isFeatureEnabled('DEBUG_MODE')) {
        console.log('[AnimQueue]', ...args)
      }
    }

    log('Dismissing current animation')

    this.isShowing = false
    this.currentAnimation = null
    this.notifyListeners(this.getState())

    // Small delay before showing next
    setTimeout(() => {
      this.showNext()
    }, 300)
  }

  /**
   * Clear all animations (emergency)
   */
  clearAll() {
    this.queue = []
    this.currentAnimation = null
    this.isShowing = false
    this.xpBuffer = { amount: 0, count: 0 }
    
    if (this.coalescingTimeout) {
      clearTimeout(this.coalescingTimeout)
      this.coalescingTimeout = null
    }
    
    this.notifyListeners(this.getState())
  }

  /**
   * Subscribe to animation queue state changes
   */
  subscribe(listener: (state: AnimationQueueState) => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Get current state
   */
  getState(): AnimationQueueState {
    return {
      currentAnimation: this.currentAnimation,
      queue: [...this.queue],
      isShowing: this.isShowing,
      queueLength: this.queue.length,
      hasBufferedXP: this.xpBuffer.amount > 0
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(state: AnimationQueueState) {
    this.listeners.forEach(listener => listener(state))
  }

  /**
   * Flush XP buffer immediately (force show)
   */
  flushXPBuffer() {
    if (this.coalescingTimeout) {
      clearTimeout(this.coalescingTimeout)
      this.coalescingTimeout = null
    }

    if (this.xpBuffer.amount > 0) {
      const animation: QueuedAnimation = {
        id: crypto.randomUUID(),
        type: 'xp',
        data: { 
          amount: this.xpBuffer.amount,
          count: this.xpBuffer.count 
        },
        timestamp: Date.now(),
        priority: this.getPriority('xp')
      }
      
      this.queue.push(animation)
      this.xpBuffer = { amount: 0, count: 0 }
      this.sortQueue()
      this.notifyListeners(this.getState())
      
      if (!this.isShowing && !this.currentAnimation) {
        this.showNext()
      }
    }
  }
}

export interface AnimationQueueState {
  currentAnimation: QueuedAnimation | null
  queue: QueuedAnimation[]
  isShowing: boolean
  queueLength: number
  hasBufferedXP: boolean
}

// Singleton instance
export const animationQueue = new AnimationQueueManager()

// Make globally accessible for easy access from hooks
if (typeof window !== 'undefined') {
  (window as any).animationQueue = animationQueue
}

// React hook
import { useState, useEffect } from 'react'

export function useAnimationQueue() {
  const [state, setState] = useState<AnimationQueueState>(animationQueue.getState())

  useEffect(() => {
    return animationQueue.subscribe(setState)
  }, [])

  return {
    ...state,
    enqueue: (type: AnimationType, data: any) => animationQueue.enqueue(type, data),
    dismiss: () => animationQueue.dismiss(),
    clearAll: () => animationQueue.clearAll(),
    flushXPBuffer: () => animationQueue.flushXPBuffer()
  }
}

