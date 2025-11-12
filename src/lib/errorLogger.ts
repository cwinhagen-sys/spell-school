/**
 * Persistent error logger that survives page reloads and logouts
 * Stores errors in localStorage so we can debug issues that happen during logout
 */

export interface LogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
  details?: any
}

const MAX_LOGS = 100
const LOG_KEY = 'persistentLogs'

/**
 * Add a log entry that persists across page reloads
 */
export function persistentLog(level: 'info' | 'warn' | 'error', message: string, details?: any) {
  try {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      details
    }
    
    // Also log to console
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    consoleMethod(`[PERSISTENT ${level.toUpperCase()}]`, message, details || '')
    
    // Get existing logs
    const existing = localStorage.getItem(LOG_KEY)
    const logs: LogEntry[] = existing ? JSON.parse(existing) : []
    
    // Add new log
    logs.push(entry)
    
    // Keep only recent logs
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS)
    }
    
    // Save back
    localStorage.setItem(LOG_KEY, JSON.stringify(logs))
  } catch (error) {
    // If even this fails, at least try console
    console.error('Failed to write persistent log:', error)
  }
}

/**
 * Get all persistent logs
 */
export function getPersistentLogs(): LogEntry[] {
  try {
    const existing = localStorage.getItem(LOG_KEY)
    return existing ? JSON.parse(existing) : []
  } catch (error) {
    console.error('Failed to read persistent logs:', error)
    return []
  }
}

/**
 * Clear all persistent logs
 */
export function clearPersistentLogs() {
  try {
    localStorage.removeItem(LOG_KEY)
  } catch (error) {
    console.error('Failed to clear persistent logs:', error)
  }
}

/**
 * Display persistent logs in console (useful after logout)
 */
export function displayPersistentLogs() {
  const logs = getPersistentLogs()
  
  if (logs.length === 0) {
    console.log('📋 No persistent logs found')
    return
  }
  
  console.log(`📋 Found ${logs.length} persistent log entries:`)
  console.log('═══════════════════════════════════════════')
  
  logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleTimeString()
    const icon = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️'
    console.log(`${icon} [${date}] ${log.message}`)
    if (log.details) {
      console.log('   Details:', log.details)
    }
  })
  
  console.log('═══════════════════════════════════════════')
  console.log('To clear logs: clearPersistentLogs()')
}

// Expose functions globally for debugging
if (typeof window !== 'undefined') {
  ;(window as any).displayPersistentLogs = displayPersistentLogs
  ;(window as any).clearPersistentLogs = clearPersistentLogs
  ;(window as any).getPersistentLogs = getPersistentLogs
  
  // Log that error logger is loaded
  console.log('📋 Persistent error logger initialized')
}

