'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function formatLocalDateYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Return YYYY-MM-DD using a local cutover hour (e.g., 06:00 means 00:00-05:59 counts as previous day)
function formatDateYmdWithCutover(localDate: Date, cutoverHour = 6): string {
  const d = new Date(localDate)
  if (d.getHours() < cutoverHour) {
    d.setDate(d.getDate() - 1)
  }
  return formatLocalDateYmd(d)
}

export function useAccountStreak() {
  const [currentStreak, setCurrentStreak] = useState(0)
  const [lastPlayDateYmd, setLastPlayDateYmd] = useState<string | null>(null)

  const computeStreakFromDates = (playedDatesYmd: Set<string>) => {
    const now = new Date()
    const todayYmd = formatDateYmdWithCutover(now)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayYmd = formatDateYmdWithCutover(yesterday)

    // Determine anchor: today if played today; else yesterday if played yesterday; else 0
    let anchor = null as Date | null
    if (playedDatesYmd.has(todayYmd)) {
      anchor = now
    } else if (playedDatesYmd.has(yesterdayYmd)) {
      anchor = yesterday
    } else {
      setCurrentStreak(0)
      setLastPlayDateYmd(null)
      return
    }

    // Count consecutive days from anchor backwards
    let count = 0
    const iter = new Date(anchor)
    while (true) {
      const ymd = formatDateYmdWithCutover(iter)
      if (!playedDatesYmd.has(ymd)) break
      count += 1
      iter.setDate(iter.getDate() - 1)
    }
    setCurrentStreak(count)
    setLastPlayDateYmd(formatDateYmdWithCutover(anchor))
  }

  const recomputeStreak = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCurrentStreak(0)
        setLastPlayDateYmd(null)
        return
      }

      // Get sessions from 30 days ago to ensure we have enough data for streak calculation
      // This covers streaks up to 30 days, which should be sufficient
      const now = new Date()
      const daysBack = new Date(now)
      daysBack.setDate(daysBack.getDate() - 30)
      daysBack.setHours(6, 0, 0, 0)
      const sinceIso = daysBack.toISOString()

      const { data, error } = await supabase
        .from('game_sessions')
        .select('finished_at')
        .eq('student_id', user.id)
        .not('finished_at', 'is', null)
        .gte('finished_at', sinceIso)
        .order('finished_at', { ascending: false })

      if (error) {
        // On error, do not break UI
        return
      }

      const playedDates = new Set<string>()
      for (const row of (data || [])) {
        const dt = new Date((row as any).finished_at)
        playedDates.add(formatDateYmdWithCutover(dt))
      }
      computeStreakFromDates(playedDates)
    } catch (_) {
      // no-op
    }
  }, [])

  useEffect(() => {
    void recomputeStreak()
  }, [recomputeStreak])

  useEffect(() => {
    // Subscribe to realtime changes for this user's sessions to keep streak fresh
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !(supabase as any).channel) return
      const channel = (supabase as any).channel(`game_sessions_${user.id}`)
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `student_id=eq.${user.id}`
        }, () => { void recomputeStreak() })
        .subscribe()
      return () => { try { (supabase as any).removeChannel?.(channel) } catch {} }
    })()
  }, [recomputeStreak])

  return {
    currentStreak,
    lastPlayDateYmd,
    recomputeStreak,
  }
}



