/**
 * Quest Outbox System
 * 
 * Provides durable, retry-capable quest synchronization that survives
 * tab closure, network failures, and logout scenarios.
 * 
 * Features:
 * - IndexedDB persistence (falls back to localStorage)
 * - sendBeacon for reliable delivery on tab close
 * - Automatic retry on app startup
 * - Idempotent event handling
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Event types for quest synchronization
export type QuestEvent =
  | { 
      id: string
      type: 'QUEST_PROGRESS'
      questId: string
      delta: number
      ts: number
    }
  | { 
      id: string
      type: 'QUEST_COMPLETE'
      questId: string
      xp: number
      ts: number
    }

// IndexedDB schema
interface QuestOutboxDB extends DBSchema {
  events: {
    key: string // event.id
    value: QuestEvent & { createdAt: number }
    indexes: { 'by-created': number }
  }
}

// Outbox configuration
const DB_NAME = 'quest-outbox'
const DB_VERSION = 1
const STORE_NAME = 'events'
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

class QuestOutbox {
  private db: IDBPDatabase<QuestOutboxDB> | null = null
  private isInitialized = false
  private flushInProgress = false

  /**
   * Initialize the outbox system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.db = await openDB<QuestOutboxDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id'
          })
          store.createIndex('by-created', 'createdAt')
        }
      })
      this.isInitialized = true
      console.log('Quest Outbox: Initialized with IndexedDB')
    } catch (error) {
      console.warn('Quest Outbox: IndexedDB failed, falling back to localStorage:', error)
      this.isInitialized = true
    }

    // Set up event listeners for page lifecycle
    this.setupLifecycleListeners()
    
    // Attempt initial flush
    await this.flushOutbox()
  }

  /**
   * Enqueue a quest event for synchronization
   */
  async enqueue(event: QuestEvent): Promise<void> {
    await this.initialize()

    console.log('Quest Outbox: Enqueuing event:', event)
    
    // Emit event that we have pending data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quest-enqueued', {
        detail: { eventId: event.id }
      }))
    }

    try {
      if (this.db) {
        // Use IndexedDB
        await this.db.add(STORE_NAME, {
          ...event,
          createdAt: Date.now()
        })
      } else {
        // Fallback to localStorage
        const key = `quest_outbox_${event.id}`
        localStorage.setItem(key, JSON.stringify({
          ...event,
          createdAt: Date.now()
        }))
      }

      // Attempt immediate flush (fire-and-forget)
      void this.flushOutbox()
    } catch (error) {
      console.error('Quest Outbox: Failed to enqueue event:', error)
    }
  }

  /**
   * Flush all pending events to server
   */
  async flushOutbox(): Promise<void> {
    if (this.flushInProgress) return
    this.flushInProgress = true

    try {
      const events = await this.getPendingEvents()
      if (events.length === 0) {
        // Emit event that sync is complete (no pending events)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quest-sync-complete', {
            detail: { eventsSynced: 0 }
          }))
        }
        return
      }

      console.log(`Quest Outbox: Flushing ${events.length} events`)

      // Get current session token with safe refresh handling
      const { supabase, getSessionSafe } = await import('@/lib/supabase')
      const { data: { session } } = await getSessionSafe()
      
      if (!session?.access_token) {
        console.log('Quest Outbox: No session token, skipping flush')
        return
      }

      const response = await fetch('/api/quest-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ events }),
        keepalive: true, // Important for reliability
        credentials: 'include'
      })

      if (response.ok) {
        // Clear successfully sent events
        await this.clearEvents(events.map(e => e.id))
        console.log(`Quest Outbox: Successfully sent ${events.length} events`)
        
        // Emit event that sync is complete
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quest-sync-complete', {
            detail: { eventsSynced: events.length }
          }))
        }
      } else {
        console.error('Quest Outbox: Server error:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Quest Outbox: Flush error:', error)
    } finally {
      this.flushInProgress = false
    }
  }

  /**
   * Send events using sendBeacon for reliable delivery on tab close
   */
  sendBeaconNow(): boolean {
    const events = this.getPendingEventsSync()
    if (events.length === 0) return true

    console.log(`Quest Outbox: Sending ${events.length} events via beacon`)

    try {
      const blob = new Blob([JSON.stringify({ events })], {
        type: 'application/json'
      })
      
      const success = navigator.sendBeacon('/api/quest-sync', blob)
      if (success) {
        // Clear events on successful beacon
        void this.clearEvents(events.map(e => e.id))
        console.log('Quest Outbox: Beacon sent successfully')
      }
      return success
    } catch (error) {
      console.error('Quest Outbox: Beacon failed:', error)
      return false
    }
  }

  /**
   * Get pending events from storage
   */
  async getPendingEvents(): Promise<QuestEvent[]> {
    await this.initialize()

    try {
      if (this.db) {
        // Use IndexedDB
        const allEvents = await this.db.getAll(STORE_NAME)
        return allEvents.map(({ createdAt, ...event }) => event)
      } else {
        // Fallback to localStorage
        const events: QuestEvent[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('quest_outbox_')) {
            try {
              const event = JSON.parse(localStorage.getItem(key) || '{}')
              if (event.id && event.type) {
                events.push(event)
              }
            } catch {
              // Invalid event, skip
            }
          }
        }
        return events
      }
    } catch (error) {
      console.error('Quest Outbox: Failed to get pending events:', error)
      return []
    }
  }

  /**
   * Get pending events synchronously (for sendBeacon)
   */
  getPendingEventsSync(): QuestEvent[] {
    try {
      if (this.db) {
        // For sendBeacon, we need sync access - use localStorage fallback
        const events: QuestEvent[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('quest_outbox_')) {
            try {
              const event = JSON.parse(localStorage.getItem(key) || '{}')
              if (event.id && event.type) {
                events.push(event)
              }
            } catch {
              // Invalid event, skip
            }
          }
        }
        return events
      } else {
        // Already using localStorage
        const events: QuestEvent[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('quest_outbox_')) {
            try {
              const event = JSON.parse(localStorage.getItem(key) || '{}')
              if (event.id && event.type) {
                events.push(event)
              }
            } catch {
              // Invalid event, skip
            }
          }
        }
        return events
      }
    } catch (error) {
      console.error('Quest Outbox: Failed to get pending events sync:', error)
      return []
    }
  }

  /**
   * Clear successfully sent events
   */
  private async clearEvents(eventIds: string[]): Promise<void> {
    try {
      if (this.db) {
        // Use IndexedDB
        const tx = this.db.transaction(STORE_NAME, 'readwrite')
        for (const id of eventIds) {
          await tx.store.delete(id)
        }
        await tx.done
      } else {
        // Fallback to localStorage
        for (const id of eventIds) {
          localStorage.removeItem(`quest_outbox_${id}`)
        }
      }
    } catch (error) {
      console.error('Quest Outbox: Failed to clear events:', error)
    }
  }

  /**
   * Clear ALL events (for beacon success or emergency)
   */
  async clearAll(): Promise<void> {
    try {
      const events = await this.getPendingEvents()
      await this.clearEvents(events.map(e => e.id))
      console.log(`Quest Outbox: Cleared all ${events.length} events`)
    } catch (error) {
      console.error('Quest Outbox: Failed to clear all events:', error)
    }
  }

  /**
   * Set up page lifecycle event listeners
   */
  private setupLifecycleListeners(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        this.sendBeaconNow()
      } else {
        // Page became visible, attempt flush
        void this.flushOutbox()
      }
    })

    // Handle page unload
    window.addEventListener('pagehide', () => {
      this.sendBeaconNow()
    })

    // Handle beforeunload as backup
    window.addEventListener('beforeunload', () => {
      this.sendBeaconNow()
    })

    // Handle online/offline changes
    window.addEventListener('online', () => {
      void this.flushOutbox()
    })
  }

  /**
   * Get outbox status for debugging
   */
  async getStatus(): Promise<{ pendingCount: number; events: QuestEvent[] }> {
    const events = await this.getPendingEvents()
    return {
      pendingCount: events.length,
      events
    }
  }
}

// Export singleton instance
export const questOutbox = new QuestOutbox()

// Export helper functions for easy integration
export function enqueueQuestProgress(questId: string, delta: number): void {
  void questOutbox.enqueue({
    id: crypto.randomUUID(),
    type: 'QUEST_PROGRESS',
    questId,
    delta,
    ts: Date.now()
  })
}

export function enqueueQuestComplete(questId: string, xp: number): void {
  void questOutbox.enqueue({
    id: crypto.randomUUID(),
    type: 'QUEST_COMPLETE',
    questId,
    xp,
    ts: Date.now()
  })
}

// Initialize outbox on module load
if (typeof window !== 'undefined') {
  void questOutbox.initialize()
}
