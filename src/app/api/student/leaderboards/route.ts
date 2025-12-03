import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type LeaderboardPlayer = {
  id: string
  displayName?: string | null
  username?: string | null
  name?: string | null
  totalPoints: number
  badgeCount: number
  longestStreak: number
  bestKpm: number
  averageAccuracy: number
  sessionCount: number
}

const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

// Simple in-memory cache for leaderboard data
// In production, consider using Redis or Vercel KV
const leaderboardCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL_MS = 60000 // 60 seconds cache (increased for better performance)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice('Bearer '.length)
    const { classId } = await request.json()

    if (!classId || typeof classId !== 'string') {
      return NextResponse.json({ error: 'Missing classId' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Validate the requesting student using their access token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure the user belongs to the requested class
    const { data: membership, error: membershipError } = await supabaseClient
      .from('class_students')
      .select('student_id')
      .eq('student_id', user.id)
      .eq('class_id', classId)
      .is('deleted_at', null)
      .maybeSingle()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check cache first
    const cacheKey = `leaderboard_${classId}`
    const cached = leaderboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Return cached data with current user ID
      return NextResponse.json({
        ...cached.data,
        currentUserId: user.id
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: classStudents, error: classStudentsError } = await supabaseAdmin
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId)
      .is('deleted_at', null)

    if (classStudentsError) {
      console.error('Error fetching class students:', classStudentsError)
      return NextResponse.json({ error: 'Failed to load class data' }, { status: 500 })
    }

    if (!classStudents || classStudents.length === 0) {
      return NextResponse.json({ success: true, currentUserId: user.id, players: [] })
    }

    const studentIds = Array.from(new Set(classStudents.map((row: any) => row.student_id)))
    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, currentUserId: user.id, players: [] })
    }

    // Helper function to format date with cutover (same as useAccountStreak)
    const formatDateYmdWithCutover = (localDate: Date, cutoverHour = 6): string => {
      const d = new Date(localDate)
      if (d.getHours() < cutoverHour) {
        d.setDate(d.getDate() - 1)
      }
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    // Helper function to compute streak from played dates (same as useAccountStreak)
    const computeStreakFromDates = (playedDatesYmd: Set<string>): number => {
      const now = new Date()
      const todayYmd = formatDateYmdWithCutover(now)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayYmd = formatDateYmdWithCutover(yesterday)

      // Determine anchor: today if played today; else yesterday if played yesterday; else 0
      let anchor: Date | null = null
      if (playedDatesYmd.has(todayYmd)) {
        anchor = now
      } else if (playedDatesYmd.has(yesterdayYmd)) {
        anchor = yesterday
      } else {
        return 0
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
      return count
    }

    // Optimize: Combine game_sessions queries into one
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const [
      profilesRes,
      progressRes,
      badgeRes,
      gameSessionsRes,
      typingRes
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, username, name, email')
        .in('id', studentIds)
        .eq('role', 'student'),
      supabaseAdmin
        .from('student_progress')
        .select('student_id, total_points')
        .in('student_id', studentIds)
        .is('word_set_id', null)
        .is('homework_id', null)
        .is('deleted_at', null),
      supabaseAdmin
        .from('user_badges')
        .select('user_id')
        .in('user_id', studentIds),
      // Combined query: get both finished_at and accuracy_pct in one query
      supabaseAdmin
        .from('game_sessions')
        .select('student_id, finished_at, accuracy_pct')
        .in('student_id', studentIds)
        .not('finished_at', 'is', null)
        .gte('finished_at', thirtyDaysAgo),
      supabaseAdmin
        .from('typing_leaderboard')
        .select('student_id, kpm')
        .in('student_id', studentIds)
    ])

    const playersMap = new Map<string, LeaderboardPlayer>()

    const profiles = profilesRes?.data || []
    const progress = progressRes?.data || []
    const badges = badgeRes?.data || []
    const gameSessions = gameSessionsRes?.data || []
    const typing = typingRes?.data || []
    
    // Extract accuracy data from combined game_sessions query
    const accuracy = gameSessions.filter((session: any) => session.accuracy_pct !== null)

    // Aggregate badges by counting per user
    const badgeCounts = new Map<string, number>()
    badges.forEach((badge: any) => {
      const userId = badge.user_id
      badgeCounts.set(userId, (badgeCounts.get(userId) || 0) + 1)
    })

    // Aggregate typing leaderboard to get best KPM per student
    const bestKpmMap = new Map<string, number>()
    typing.forEach((entry: any) => {
      const studentId = entry.student_id
      const kpm = Number(entry.kpm) || 0
      const currentBest = bestKpmMap.get(studentId) || 0
      if (kpm > currentBest) {
        bestKpmMap.set(studentId, kpm)
      }
    })

    // Aggregate game sessions to count total sessions per student
    const sessionCountMap = new Map<string, number>()
    gameSessions.forEach((session: any) => {
      const studentId = session.student_id
      sessionCountMap.set(studentId, (sessionCountMap.get(studentId) || 0) + 1)
    })

    // Aggregate game sessions to get average accuracy per student
    const accuracyMap = new Map<string, { sum: number; count: number }>()
    accuracy.forEach((session: any) => {
      const studentId = session.student_id
      const acc = Number(session.accuracy_pct) || 0
      const current = accuracyMap.get(studentId) || { sum: 0, count: 0 }
      accuracyMap.set(studentId, {
        sum: current.sum + acc,
        count: current.count + 1
      })
    })

    // Calculate streaks from game_sessions (same logic as useAccountStreak)
    const streakMap = new Map<string, number>()
    const sessionsByStudent = new Map<string, Set<string>>()
    
    // Group sessions by student and extract unique play dates
    gameSessions.forEach((session: any) => {
      const studentId = session.student_id
      if (!sessionsByStudent.has(studentId)) {
        sessionsByStudent.set(studentId, new Set())
      }
      const dt = new Date(session.finished_at)
      const ymd = formatDateYmdWithCutover(dt)
      sessionsByStudent.get(studentId)!.add(ymd)
    })
    
    // Compute streak for each student
    sessionsByStudent.forEach((playedDates, studentId) => {
      const streak = computeStreakFromDates(playedDates)
      streakMap.set(studentId, streak)
    })

    studentIds.forEach(studentId => {
      const profile = profiles.find((p: any) => p.id === studentId)
      const displayName =
        profile?.username ||
        profile?.name ||
        (profile?.email ? profile.email.split('@')[0] : 'Elev')

      playersMap.set(studentId, {
        id: studentId,
        displayName,
        username: profile?.username || null,
        name: profile?.name || null,
        totalPoints: 0,
        badgeCount: 0,
        longestStreak: 0,
        bestKpm: 0,
        averageAccuracy: 0,
        sessionCount: 0
      })
    })

    progress.forEach((row: any) => {
      const player = playersMap.get(row.student_id)
      if (player) {
        player.totalPoints = row.total_points || 0
      }
    })

    // Set badge counts from aggregated map
    badgeCounts.forEach((count, userId) => {
      const player = playersMap.get(userId)
      if (player) {
        player.badgeCount = count
      }
    })

    // Set streaks from computed map
    streakMap.forEach((streak, studentId) => {
      const player = playersMap.get(studentId)
      if (player) {
        player.longestStreak = streak
      }
    })

    // Set best KPM from aggregated map
    bestKpmMap.forEach((kpm, studentId) => {
      const player = playersMap.get(studentId)
      if (player) {
        player.bestKpm = kpm
      }
    })

    // Set session counts from aggregated map
    sessionCountMap.forEach((count, studentId) => {
      const player = playersMap.get(studentId)
      if (player) {
        player.sessionCount = count
      }
    })

    // Set average accuracy from aggregated map
    accuracyMap.forEach((accData, studentId) => {
      const player = playersMap.get(studentId)
      if (player) {
        player.averageAccuracy = accData.count > 0 
          ? Math.round(accData.sum / accData.count) 
          : 0
      }
    })

    const players = Array.from(playersMap.values())

    const result = {
      success: true,
      currentUserId: user.id,
      players
    }

    // Cache the result (without currentUserId as it's user-specific)
    leaderboardCache.set(cacheKey, {
      data: { success: true, players },
      timestamp: Date.now()
    })

    // Clean up old cache entries (older than 5 minutes)
    const now = Date.now()
    for (const [key, value] of leaderboardCache.entries()) {
      if (now - value.timestamp > 300000) {
        leaderboardCache.delete(key)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in POST /api/student/leaderboards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

