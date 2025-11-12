/**
 * XP Outbox System
 * 
 * Provides durable, retry-capable XP synchronization that survives
 * tab closure, network failures, and logout scenarios.
 * 
 * Features:
 * - IndexedDB persistence (falls back to localStorage)
 * - Automatic batching (collects events for 3-5 seconds)
 * - Idempotent event handling (client-generated UUIDs)
 * - sendBeacon fallback for tab close
 * - Single source of truth (xp_totals in DB)
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Event types for XP synchronization
export interface XpEvent {
  id: string              // UUID/ULID for idempotency
  student_id: string      // Student UUID
  kind: string            // 'typing' | 'choice' | 'flashcards' | etc.
  delta: number           // XP to add (positive)
  word_set_id?: string | null
  homework_id?: string | null
  created_at: string      // ISO timestamp
  metadata?: Record<string, unknown>  // Extra context
}

// IndexedDB schema
interface XpOutboxDB extends DBSchema {
  events: {
    key: string // event.id
    value: XpEvent & { enqueuedAt: number }
    indexes: { 'by-enqueued': number }
  }
}

// Outbox configuration
const DB_NAME = 'xp-outbox'
const DB_VERSION = 1
const STORE_NAME = 'events'
const MAX_BATCH_SIZE = 50  // Max events per batch

class XpOutbox {
  private db: IDBPDatabase<XpOutboxDB> | null = null
  private isInitialized = false
  private flushInProgress = false

  /**
   * Initialize the outbox system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.db = await openDB<XpOutboxDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id'
          })
          store.createIndex('by-enqueued', 'enqueuedAt')
        }
      })
      this.isInitialized = true
      console.log('XP Outbox: Initialized with IndexedDB')
    } catch (error) {
      console.warn('XP Outbox: IndexedDB failed, falling back to localStorage:', error)
      this.isInitialized = true
    }

    // Set up event listeners for page lifecycle
    this.setupLifecycleListeners()
    
    // Clean up any events that don't belong to current user
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const pendingEvents = await this.getPendingEvents()
        
        // Filter out events from other users
        const validEvents = pendingEvents.filter(e => e.student_id === user.id)
        const invalidEvents = pendingEvents.filter(e => e.student_id !== user.id)
        
        if (invalidEvents.length > 0) {
          console.warn(`XP Outbox: Found ${invalidEvents.length} events from other users, clearing...`)
          await this.clearEvents(invalidEvents.map(e => e.id))
        }
        
        if (validEvents.length > 0) {
          console.log(`XP Outbox: Found ${validEvents.length} valid pending events, flushing...`)
          await this.flushOutbox()
        } else {
          console.log('XP Outbox: No pending events from current user')
        }
      }
    } catch (initFlushError) {
      console.warn('XP Outbox: Initial flush failed (non-critical):', initFlushError)
      // Continue initialization even if flush fails
    }
  }

  /**
   * Enqueue an XP event for synchronization
   */
  async enqueue(event: XpEvent): Promise<void> {
    await this.initialize()

    console.log('XP Outbox: Enqueuing event:', event)

    try {
      if (this.db) {
        // Use IndexedDB
        await this.db.add(STORE_NAME, {
          ...event,
          enqueuedAt: Date.now()
        })
      } else {
        // Fallback to localStorage
        const key = `xp_outbox_${event.id}`
        localStorage.setItem(key, JSON.stringify({
          ...event,
          enqueuedAt: Date.now()
        }))
      }

      // Attempt immediate flush (fire-and-forget)
      // This will batch with other recent events automatically
      void this.flushOutbox()
    } catch (error) {
      console.error('XP Outbox: Failed to enqueue event:', error)
    }
  }

  /**
   * Flush all pending events to server (batched)
   */
  async flushOutbox(): Promise<void> {
    if (this.flushInProgress) return
    this.flushInProgress = true

    try {
      const events = await this.getPendingEvents()
      if (events.length === 0) {
        // Silent return when no events (reduce console spam)
        return
      }

      console.log(`XP Outbox: Flushing ${events.length} events`)

      // Only dispatch sync start event if we have events (för UI-indikatorn)
      if (typeof window !== 'undefined' && events.length > 0) {
        window.dispatchEvent(new CustomEvent('xp-sync-start', {
          detail: { eventCount: events.length }
        }))
      }

      // Get current session token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.log('XP Outbox: No session token, skipping flush')
        return
      }

      // Take up to MAX_BATCH_SIZE events
      const batch = events.slice(0, MAX_BATCH_SIZE)
      console.log('XP Outbox: Sending batch:', batch)

      const response = await fetch('/api/xp-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true, // Important for reliability on page unload
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        const acceptedIds = result.accepted_ids || []
        
        console.log('XP Outbox: Server response:', result)
        console.log('XP Outbox: Dispatching xp-synced event with:', { 
          total_xp: result.total_xp, 
          events_synced: acceptedIds.length 
        })
        
        // Clear successfully sent events
        await this.clearEvents(acceptedIds)
        console.log(`XP Outbox: Successfully sent ${acceptedIds.length} events`)
        
        // ALWAYS dispatch sync success event for UI indicator
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xp-synced', {
            detail: { 
              total_xp: result.total_xp || 0,
              games_played: result.games_played || 0,
              events_synced: acceptedIds.length
            }
          }))
          console.log('✅ XP Outbox: xp-synced event dispatched!')
        }

        // If there are more events, flush again
        if (events.length > MAX_BATCH_SIZE) {
          setTimeout(() => this.flushOutbox(), 1000)
        }
      } else {
        // Get error details
        const errorText = await response.text()
        console.error('XP Outbox: Server error:', response.status, response.statusText)
        console.error('XP Outbox: Server error details:', errorText)
        
        // Dispatch error event for UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xp-sync-error', {
            detail: { 
              status: response.status,
              error: errorText
            }
          }))
        }
      }
    } catch (error) {
      console.error('XP Outbox: Flush error:', error)
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

    console.log(`XP Outbox: Sending ${events.length} events via beacon`)

    try {
      const blob = new Blob([JSON.stringify({ events })], {
        type: 'application/json'
      })
      
      const success = navigator.sendBeacon('/api/xp-sync', blob)
      if (success) {
        // Clear events on successful beacon
        void this.clearEvents(events.map(e => e.id))
        console.log('XP Outbox: Beacon sent successfully')
      }
      return success
    } catch (error) {
      console.error('XP Outbox: Beacon failed:', error)
      return false
    }
  }

  /**
   * Get pending events from storage
   */
  async getPendingEvents(): Promise<XpEvent[]> {
    await this.initialize()

    try {
      if (this.db) {
        // Use IndexedDB
        const allEvents = await this.db.getAll(STORE_NAME)
        // Sort by enqueuedAt (oldest first)
        allEvents.sort((a, b) => a.enqueuedAt - b.enqueuedAt)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return allEvents.map(({ enqueuedAt, ...event }) => event)
      } else {
        // Fallback to localStorage
        const events: XpEvent[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('xp_outbox_')) {
            try {
              const eventData = JSON.parse(localStorage.getItem(key) || '{}')
              if (eventData.id && eventData.kind) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { enqueuedAt, ...event } = eventData
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
      console.error('XP Outbox: Failed to get pending events:', error)
      return []
    }
  }

  /**
   * Get pending events synchronously (for sendBeacon)
   */
  getPendingEventsSync(): XpEvent[] {
    try {
      const events: XpEvent[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('xp_outbox_')) {
          try {
            const eventData = JSON.parse(localStorage.getItem(key) || '{}')
            if (eventData.id && eventData.kind) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { enqueuedAt, ...event } = eventData
              events.push(event)
            }
          } catch {
            // Invalid event, skip
          }
        }
      }
      return events
    } catch (error) {
      console.error('XP Outbox: Failed to get pending events sync:', error)
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
          localStorage.removeItem(`xp_outbox_${id}`)
        }
      }
    } catch (error) {
      console.error('XP Outbox: Failed to clear events:', error)
    }
  }

  /**
   * Clear ALL events (for emergency or logout)
   */
  async clearAll(): Promise<void> {
    try {
      const events = await this.getPendingEvents()
      await this.clearEvents(events.map(e => e.id))
      console.log(`XP Outbox: Cleared all ${events.length} events`)
    } catch (error) {
      console.error('XP Outbox: Failed to clear all events:', error)
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
        // Page hidden, send beacon
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
  async getStatus(): Promise<{ pendingCount: number; events: XpEvent[] }> {
    const events = await this.getPendingEvents()
    return {
      pendingCount: events.length,
      events
    }
  }
}

// Export singleton instance
export const xpOutbox = new XpOutbox()

// Helper function to generate client-side event
export function createXpEvent(params: {
  student_id: string
  kind: string
  delta: number
  word_set_id?: string | null
  homework_id?: string | null
  metadata?: Record<string, unknown>
}): XpEvent {
  return {
    id: crypto.randomUUID(),
    student_id: params.student_id,
    kind: params.kind,
    delta: Math.max(0, Math.round(params.delta)),
    word_set_id: params.word_set_id || null,
    homework_id: params.homework_id || null,
    created_at: new Date().toISOString(),
    metadata: params.metadata || {}
  }
}

// Initialize outbox on module load
if (typeof window !== 'undefined') {
  void xpOutbox.initialize()
}

