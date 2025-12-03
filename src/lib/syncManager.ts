/**
 * Sync Manager
 * 
 * Central coordinator for all data synchronization.
 * Manages automatic flushing, throttling, and lifecycle.
 * 
 * Features:
 * - Auto-flush every 3 seconds
 * - Flush on visibilitychange (tab hidden)
 * - Throttled flushes (max once per 2 seconds)
 * - Single point of control for all sync operations
 */

import { xpOutbox } from './xpOutbox'
import { questOutbox } from './questOutbox'

type SyncState = 'IDLE' | 'COLLECTING' | 'FLUSHING' | 'VERIFYING'

class SyncManager {
  private state: SyncState = 'IDLE'
  private flushInterval: NodeJS.Timeout | null = null
  private lastFlushTime = 0
  private readonly FLUSH_INTERVAL_MS = 10000  // 10 seconds (increased from 3 to reduce load)
  private readonly MIN_FLUSH_INTERVAL_MS = 5000  // Throttle: max once per 5 seconds (increased from 2)
  private isInitialized = false

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('SyncManager: Initializing...')

    // Start periodic flushing
    this.startPeriodicFlush()

    // Set up lifecycle listeners
    this.setupLifecycleListeners()

    this.isInitialized = true
    console.log('SyncManager: Initialized successfully')
  }

  /**
   * Start periodic flushing
   */
  private startPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    this.flushInterval = setInterval(() => {
      void this.flush()
    }, this.FLUSH_INTERVAL_MS)

    console.log(`SyncManager: Periodic flush started (every ${this.FLUSH_INTERVAL_MS}ms)`)
  }

  /**
   * Stop periodic flushing
   */
  private stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
      console.log('SyncManager: Periodic flush stopped')
    }
  }

  /**
   * Flush all pending data (throttled)
   */
  async flush(): Promise<void> {
    // Throttle flushes
    const now = Date.now()
    if (now - this.lastFlushTime < this.MIN_FLUSH_INTERVAL_MS) {
      // Silent return när throttled (reduce spam)
      return
    }

    // Check if there's anything to flush BEFORE starting
    try {
      const xpStatus = await xpOutbox.getStatus()
      const questStatus = await questOutbox.getStatus()
      
      const totalPending = xpStatus.pendingCount + questStatus.pendingCount
      
      if (totalPending === 0) {
        // Silent return om inga events (reduce spam)
        return
      }
      
      console.log(`SyncManager: Flushing ${totalPending} pending events...`)
    } catch (checkError) {
      console.warn('SyncManager: Error checking pending events:', checkError)
      return
    }

    this.state = 'FLUSHING'
    this.lastFlushTime = now

    try {
      // Flush XP outbox
      await xpOutbox.flushOutbox()

      // Flush Quest outbox
      await questOutbox.flushOutbox()

      this.state = 'IDLE'
      console.log('SyncManager: Flush completed')
    } catch (error) {
      console.error('SyncManager: Flush error:', error)
      this.state = 'IDLE'
    }
  }

  /**
   * Force immediate flush (bypasses throttling)
   */
  async forceFlush(): Promise<void> {
    this.lastFlushTime = 0  // Reset throttle
    await this.flush()
  }

  /**
   * Flush using sendBeacon (for tab close)
   */
  sendBeaconNow(): void {
    console.log('SyncManager: Sending beacons...')

    try {
      xpOutbox.sendBeaconNow()
      questOutbox.sendBeaconNow()
      console.log('SyncManager: Beacons sent')
    } catch (error) {
      console.error('SyncManager: Beacon error:', error)
    }
  }

  /**
   * Set up page lifecycle event listeners
   */
  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined') return

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        // Page hidden - send beacon for reliability
        console.log('SyncManager: Page hidden, sending beacon')
        this.sendBeaconNow()
      } else {
        // Page visible - flush normally
        console.log('SyncManager: Page visible, flushing normally')
        void this.flush()
      }
    })

    // Handle page unload
    window.addEventListener('pagehide', () => {
      console.log('SyncManager: Page unload, sending beacon')
      this.sendBeaconNow()
    })

    // Handle beforeunload as backup
    window.addEventListener('beforeunload', () => {
      console.log('SyncManager: Before unload, sending beacon')
      this.sendBeaconNow()
    })

    // Handle online/offline changes
    window.addEventListener('online', () => {
      console.log('SyncManager: Network online, flushing')
      void this.flush()
    })

    window.addEventListener('offline', () => {
      console.log('SyncManager: Network offline, pausing sync')
    })
  }

  /**
   * Get sync status for debugging
   */
  async getStatus(): Promise<{
    state: SyncState
    xpPending: number
    questPending: number
  }> {
    const xpStatus = await xpOutbox.getStatus()
    const questStatus = await questOutbox.getStatus()

    return {
      state: this.state,
      xpPending: xpStatus.pendingCount,
      questPending: questStatus.pendingCount
    }
  }

  /**
   * Cleanup (call before logout or app shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('SyncManager: Cleaning up...')
    
    this.stopPeriodicFlush()
    
    // Final flush before cleanup
    await this.forceFlush()
    
    console.log('SyncManager: Cleanup complete')
  }
}

// Export singleton instance
export const syncManager = new SyncManager()

// Initialize on module load
if (typeof window !== 'undefined') {
  void syncManager.initialize()
}
