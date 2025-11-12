/**
 * Feature Flags - Safe ON/OFF switches for new features
 * 
 * Set any flag to FALSE to disable that feature and revert to old behavior
 * This allows safe rollback without code changes
 */

export const FEATURE_FLAGS = {
  /**
   * Animation Queue System
   * - Combines multiple XP gains into one animation
   * - Shows popups in sequence (no collisions)
   * - OFF = Old behavior (separate animations, possible collisions)
   */
  USE_ANIMATION_QUEUE: true,

  /**
   * Event Coalescing in Quest Outbox
   * - Combines multiple XP events into one before sync
   * - Reduces database queries by 70-80%
   * - OFF = Old behavior (each event synced separately)
   */
  USE_EVENT_COALESCING: true,

  /**
   * Beacon API for Guaranteed Sync
   * - Uses navigator.sendBeacon on page hide/close
   * - Guarantees data is sent even if tab closes immediately
   * - OFF = Old behavior (timeout-based sync, possible data loss)
   */
  USE_BEACON_API: true,

  /**
   * Debug Mode - Extra Logging
   * - Logs all animation queue operations
   * - Logs all coalescing operations
   * - Logs all beacon sends
   */
  DEBUG_MODE: true,
} as const

/**
 * Quick disable ALL new features (emergency rollback)
 */
export const EMERGENCY_ROLLBACK = false

/**
 * Get effective flag value (respects emergency rollback)
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  if (EMERGENCY_ROLLBACK) return false
  return FEATURE_FLAGS[flag]
}

/**
 * Log feature flag status (call on app init)
 */
export function logFeatureFlags() {
  if (EMERGENCY_ROLLBACK) {
    console.warn('🚨 EMERGENCY ROLLBACK ACTIVE - All new features disabled!')
    return
  }

  console.log('🎛️ Feature Flags Status:')
  Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`)
  })
}

