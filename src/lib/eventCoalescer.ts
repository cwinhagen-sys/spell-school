/**
 * Event Coalescing System
 * 
 * Combines multiple similar events into single events before database sync
 * Example: 10 XP events → 1 event with total XP
 */

import { isFeatureEnabled } from './featureFlags'

export interface OutboxEvent {
  id: string
  type: 'xp_gain' | 'quest_progress' | 'quest_complete' | 'badge_unlock'
  data: any
  timestamp: number
}

/**
 * Coalesce events to reduce database queries
 */
export function coalesceEvents(events: OutboxEvent[]): OutboxEvent[] {
  if (!isFeatureEnabled('USE_EVENT_COALESCING')) {
    // Feature disabled, return as-is
    return events
  }

  const log = (...args: any[]) => {
    if (isFeatureEnabled('DEBUG_MODE')) {
      console.log('[Coalescer]', ...args)
    }
  }

  log(`Coalescing ${events.length} events...`)

  // Group events by type
  const xpEvents = events.filter(e => e.type === 'xp_gain')
  const questProgressEvents = events.filter(e => e.type === 'quest_progress')
  const questCompleteEvents = events.filter(e => e.type === 'quest_complete')
  const badgeEvents = events.filter(e => e.type === 'badge_unlock')

  const coalesced: OutboxEvent[] = []

  // 1. Coalesce XP events (sum all XP)
  if (xpEvents.length > 0) {
    const totalXP = xpEvents.reduce((sum, e) => sum + (e.data.amount || 0), 0)
    
    if (totalXP > 0) {
      coalesced.push({
        id: crypto.randomUUID(),
        type: 'xp_gain',
        data: { 
          amount: totalXP,
          source: 'coalesced',
          originalCount: xpEvents.length
        },
        timestamp: Date.now()
      })
      
      log(`Coalesced ${xpEvents.length} XP events → ${totalXP} total XP`)
    }
  }

  // 2. Coalesce quest progress by quest_id
  if (questProgressEvents.length > 0) {
    const progressByQuest: Record<string, number> = {}
    
    questProgressEvents.forEach(e => {
      const questId = e.data.questId
      progressByQuest[questId] = (progressByQuest[questId] || 0) + (e.data.delta || 1)
    })

    Object.entries(progressByQuest).forEach(([questId, delta]) => {
      coalesced.push({
        id: crypto.randomUUID(),
        type: 'quest_progress',
        data: { questId, delta },
        timestamp: Date.now()
      })
    })
    
    log(`Coalesced ${questProgressEvents.length} quest progress events → ${Object.keys(progressByQuest).length} quests`)
  }

  // 3. Keep quest completions (important, don't coalesce)
  questCompleteEvents.forEach(e => {
    coalesced.push(e)
  })

  // 4. Keep badge unlocks (important, don't coalesce)
  badgeEvents.forEach(e => {
    coalesced.push(e)
  })

  log(`Coalescing complete: ${events.length} → ${coalesced.length} events (${Math.round((1 - coalesced.length/events.length) * 100)}% reduction)`)

  return coalesced
}

/**
 * Batch events into chunks for sync
 */
export function batchEvents(events: OutboxEvent[], batchSize: number = 50): OutboxEvent[][] {
  const batches: OutboxEvent[][] = []
  
  for (let i = 0; i < events.length; i += batchSize) {
    batches.push(events.slice(i, i + batchSize))
  }
  
  return batches
}

/**
 * Estimate sync impact (for debugging)
 */
export function estimateSyncImpact(events: OutboxEvent[]) {
  const coalesced = coalesceEvents(events)
  
  return {
    before: {
      events: events.length,
      estimatedQueries: events.length, // Worst case: 1 query per event
    },
    after: {
      events: coalesced.length,
      estimatedQueries: coalesced.length,
    },
    reduction: {
      events: events.length - coalesced.length,
      percentage: Math.round((1 - coalesced.length / events.length) * 100),
      queriesSaved: events.length - coalesced.length
    }
  }
}























