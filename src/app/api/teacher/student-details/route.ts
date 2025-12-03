import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { levelForXp } from '@/lib/leveling'

// Supabase configuration (same as in lib/supabase.ts)
const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

interface StudentDetailedStats {
  // Basic Info
  id: string
  email: string
  name: string
  created_at: string
  last_active: string
  
  // Progress & Leveling
  total_xp: number
  level: number
  progress_to_next: number
  next_level_delta: number
  
  // Streak Data
  current_streak: number
  longest_streak: number
  last_play_date: string | null
  
  // Badges
  total_badges: number
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    category: string
    rarity: string
    unlocked_at: string
  }>
  
  // Game Stats
  games_played: number
  total_time_played: number // in seconds
  average_accuracy: number
  
  // Game-specific stats
  game_stats: Array<{
    game_type: string
    plays: number
    average_score: number
    best_score: number
    last_played: string
  }>
  
  // Quiz Results
  quiz_results: Array<{
    quiz_id: string
    word_set_title: string
    word_set_id: string | null
    score: number
    total: number
    accuracy: number
    completed_at: string
    word_details?: Array<{
      prompt: string
      expected: string
      given: string
      verdict: 'correct' | 'partial' | 'wrong' | 'empty'
    }>
  }>
  
  // Missed Words (words with low accuracy)
  missed_words: Array<{
    word: string
    translation: string
    attempts: number
    correct: number
    accuracy: number
    last_attempt: string
  }>
  
  // Activity Log (recent games/sessions)
  activity_log: Array<{
    game_type: string
    score: number
    accuracy: number
    played_at: string
    duration: number
    word_set_title?: string
  }>
}

// GET /api/teacher/student-details?studentId=xxx
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase client with teacher's token (uses RLS policies)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify teacher authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student ID from query params
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
    }

    console.log('📊 Fetching detailed stats for student:', studentId)
    console.log('📊 Teacher user ID:', user.id)
    console.log('📊 Teacher email:', user.email)

    // Verify teacher has access to this student
    const { data: teacherClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', user.id)
    
    console.log('📊 Teacher classes query result:', {
      count: teacherClasses?.length || 0,
      classes: teacherClasses,
      error: classesError
    })
    
    if (!teacherClasses || teacherClasses.length === 0) {
      return NextResponse.json({ error: 'No classes found' }, { status: 403 })
    }

    const classIds = teacherClasses.map(c => c.id)
    console.log('📊 Class IDs:', classIds)

    // Check if student is in any of teacher's classes
    const { data: studentInClass, error: studentInClassError } = await supabase
      .from('class_students')
      .select('*')
      .eq('student_id', studentId)
      .in('class_id', classIds)
      .is('deleted_at', null)
    
    console.log('📊 Student in class check:', {
      studentId,
      classIds,
      found: studentInClass?.length || 0,
      error: studentInClassError
    })
    
    if (!studentInClass || studentInClass.length === 0) {
      return NextResponse.json({ 
        error: 'Access denied - student not in your classes',
        debug: {
          studentId,
          teacherClassIds: classIds,
          studentClasses: studentInClass
        }
      }, { status: 403 })
    }

    // ===== 1. BASIC INFO =====
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, username, created_at, last_active')
      .eq('id', studentId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // ===== 2. PROGRESS & LEVELING =====
    // IMPORTANT: Fetch the GLOBAL progress record (word_set_id = null)
    // This is where total XP is stored
    const { data: progressData } = await supabase
      .from('student_progress')
      .select('total_points, games_played, last_played_at')
      .eq('student_id', studentId)
      .is('word_set_id', null)  // Global progress record
      .is('homework_id', null)   // Global progress record
      .is('deleted_at', null)
      .single()

    console.log('📊 Global progress data for student:', studentId, progressData)

    const totalXp = progressData?.total_points || 0
    const { level, progressToNext, nextDelta } = levelForXp(totalXp)
    
    // Calculate XP into current level (actual XP points, not percentage)
    // progressToNext is a decimal 0-1, so we need to convert to actual XP
    const xpIntoLevel = Math.round(progressToNext * nextDelta)
    
    console.log('📊 Calculated level:', { 
      totalXp, 
      level, 
      progressToNext: `${(progressToNext * 100).toFixed(1)}%`, 
      xpIntoLevel,
      nextDelta 
    })

    // ===== 3. STREAK DATA =====
    const { data: streakData } = await supabase
      .from('student_streaks')
      .select('current_streak, longest_streak, last_play_date')
      .eq('user_id', studentId)
      .single()

    // ===== 4. BADGES =====
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select(`
        unlocked_at,
        badges (
          id,
          name,
          description,
          icon,
          category,
          rarity
        )
      `)
      .eq('user_id', studentId)
      .order('unlocked_at', { ascending: false })

    const badges = userBadges?.map(ub => ({
      id: (ub.badges as any).id,
      name: (ub.badges as any).name,
      description: (ub.badges as any).description,
      icon: (ub.badges as any).icon,
      category: (ub.badges as any).category,
      rarity: (ub.badges as any).rarity,
      unlocked_at: ub.unlocked_at
    })) || []

    // ===== 5. GAME SESSIONS =====
    // Fetch game sessions with score, accuracy, and duration
    let gameSessions: any[] = []
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, game_type, score, accuracy_pct, duration_sec, started_at, finished_at, word_set_id, homework_id')
        .eq('student_id', studentId)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.log('⚠️ Error fetching game sessions:', error.message)
      } else {
        gameSessions = data || []
        console.log('📊 Game sessions found:', gameSessions.length)
        
        // DEBUG: Log accuracy values from database
        console.log('📊 First 5 sessions with accuracy from DB:', 
          gameSessions.slice(0, 5).map(s => ({
            game_type: s.game_type,
            accuracy_pct: s.accuracy_pct,
            score: s.score,
            finished_at: s.finished_at
          }))
        )
      }
    } catch (error) {
      console.log('⚠️ game_sessions table error:', error)
      gameSessions = []
    }

    // Calculate game-specific stats from sessions
    const gameStatsMap = new Map<string, {
      plays: number
      total_accuracy: number
      best_accuracy: number
      last_played: string
    }>()

    let totalTimePlayed = 0
    let totalAccuracySum = 0
    let accuracyCount = 0
    
    gameSessions?.forEach(session => {
      totalTimePlayed += session.duration_sec || 0
      
      // Track accuracy for average calculation
      if (session.accuracy_pct !== null && session.accuracy_pct >= 0) {
        totalAccuracySum += session.accuracy_pct
        accuracyCount++
      }
      
      const existing = gameStatsMap.get(session.game_type) || {
        plays: 0,
        total_accuracy: 0,
        best_accuracy: 0,
        last_played: session.finished_at
      }
      
      gameStatsMap.set(session.game_type, {
        plays: existing.plays + 1,
        total_accuracy: existing.total_accuracy + (session.accuracy_pct || 0),
        best_accuracy: Math.max(existing.best_accuracy, session.accuracy_pct || 0),
        last_played: session.finished_at > existing.last_played ? session.finished_at : existing.last_played
      })
    })

    const game_stats = Array.from(gameStatsMap.entries()).map(([game_type, stats]) => ({
      game_type,
      plays: stats.plays,
      average_score: Math.round(stats.total_accuracy / stats.plays),
      best_score: Math.round(stats.best_accuracy),
      last_played: stats.last_played
    }))

    // Calculate average accuracy from all sessions
    const average_accuracy = accuracyCount > 0
      ? Math.round(totalAccuracySum / accuracyCount)
      : 0
    
    console.log('📊 Accuracy calculation:', { totalAccuracySum, accuracyCount, average_accuracy })

    // ===== 6. QUIZ RESULTS =====
    // Get latest quiz result per word_set_id (only show latest per word set)
    const { data: allQuizResults } = await supabase
      .from('student_progress')
      .select(`
        last_quiz_score,
        last_quiz_total,
        last_quiz_at,
        word_set_id,
        homework_id,
        word_sets (title)
      `)
      .eq('student_id', studentId)
      .not('last_quiz_score', 'is', null)
      .not('last_quiz_total', 'is', null)
      .order('last_quiz_at', { ascending: false })

    // Also get session quiz results where student participated via dashboard (has student_id)
    let sessionQuizResults: any[] = []
    try {
      // Get session participants for this student
      const { data: sessionParticipants } = await supabase
        .from('session_participants')
        .select('id, student_name, session_id')
        .eq('student_id', studentId)
      
      if (sessionParticipants && sessionParticipants.length > 0) {
        const participantIds = sessionParticipants.map(sp => sp.id)
        
        // Get quiz responses for these participants
        const { data: sessionQuizResponses } = await supabase
          .from('session_quiz_responses')
          .select(`
            id,
            session_id,
            participant_id,
            score,
            graded_at,
            created_at,
            sessions!inner(
              id,
              word_set_id,
              word_sets (title)
            )
          `)
          .in('participant_id', participantIds)
          .order('created_at', { ascending: false })
        
        if (sessionQuizResponses && sessionQuizResponses.length > 0) {
          // Group by session_id and get latest per session
          const sessionQuizMap = new Map<string, any>()
          
          for (const response of sessionQuizResponses) {
            const sessionId = response.session_id
            const session = (response.sessions as any)
            const wordSetTitle = session?.word_sets?.title || 'Session Quiz'
            
            if (!sessionQuizMap.has(sessionId)) {
              // Calculate total score for this session
              const sessionResponses = sessionQuizResponses.filter(r => r.session_id === sessionId)
              const totalPoints = sessionResponses.reduce((sum, r) => {
                const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
                return sum + points
              }, 0)
              const totalPossible = sessionResponses.length * 2
              const accuracy = totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0
              
              // Get the latest graded_at or created_at
              const latestResponse = sessionResponses.sort((a, b) => {
                const aTime = a.graded_at || a.created_at || ''
                const bTime = b.graded_at || b.created_at || ''
                return new Date(bTime).getTime() - new Date(aTime).getTime()
              })[0]
              
              sessionQuizMap.set(sessionId, {
                quiz_id: `session_${sessionId}`,
                word_set_title: wordSetTitle,
                word_set_id: session?.word_set_id || null,
                score: totalPoints,
                total: totalPossible,
                accuracy: accuracy,
                completed_at: latestResponse?.graded_at || latestResponse?.created_at || new Date().toISOString(),
                is_session_quiz: true
              })
            }
          }
          
          sessionQuizResults = Array.from(sessionQuizMap.values())
        }
      }
    } catch (error) {
      console.error('Error fetching session quiz results:', error)
    }

    // Group by word_set_id and get only the latest one per word set
    const quizMap = new Map<string, any>()
    if (allQuizResults) {
      for (const qr of allQuizResults) {
        const wordSetId = qr.word_set_id || 'no-word-set'
        if (!quizMap.has(wordSetId) || new Date(qr.last_quiz_at) > new Date(quizMap.get(wordSetId).last_quiz_at)) {
          quizMap.set(wordSetId, qr)
        }
      }
    }

    // Also get quiz sessions with detailed evaluations from game_sessions
    const { data: quizSessions } = await supabase
      .from('game_sessions')
      .select('id, word_set_id, homework_id, score, accuracy_pct, finished_at, details')
      .eq('student_id', studentId)
      .eq('game_type', 'quiz')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
    
    console.log('📊 Quiz sessions found:', quizSessions?.length || 0)
    if (quizSessions && quizSessions.length > 0) {
      console.log('📊 First 3 quiz sessions sample:', quizSessions.slice(0, 3).map(s => {
        let details: any = null
        if (s.details) {
          if (typeof s.details === 'string') {
            try {
              details = JSON.parse(s.details)
            } catch (e) {
              details = null
            }
          } else {
            details = s.details
          }
        }
        return {
          id: s.id,
          word_set_id: s.word_set_id,
          homework_id: s.homework_id,
          finished_at: s.finished_at,
          has_details: !!s.details,
          details_type: typeof s.details,
          evaluations_count: details?.evaluations?.length || 0,
          details_keys: details ? Object.keys(details) : [],
          details_full: details // Full details object for debugging
        }
      }))
    }

    // Combine regular quiz results with session quiz results
    const regularQuizResults = Array.from(quizMap.values())
      .map(qr => {
        const score = qr.last_quiz_score || 0
        const total = qr.last_quiz_total || 0
        const accuracy = total > 0 ? Math.round((score / total) * 100) : 0
        
        // Find matching session for detailed feedback
        // Try multiple matching strategies with better time window
        let matchingSession = quizSessions?.find(s => {
          const timeDiff = Math.abs(new Date(s.finished_at).getTime() - new Date(qr.last_quiz_at).getTime())
          const withinTimeWindow = timeDiff < 600000 // Within 10 minutes (increased for better matching)
          
          // Strategy 1: Exact match on word_set_id and close time
          if (qr.word_set_id && s.word_set_id) {
            if (s.word_set_id === qr.word_set_id && withinTimeWindow) {
              return true
            }
          }
          
          // Strategy 2: Match by homework_id if available
          if (qr.homework_id && s.homework_id && qr.homework_id === s.homework_id && withinTimeWindow) {
            return true
          }
          
          // Strategy 3: Match by time and check if session has evaluations
          if (withinTimeWindow) {
            if (s.details) {
              let details: any = null
              if (typeof s.details === 'string') {
                try {
                  details = JSON.parse(s.details)
                } catch (e) {
                  details = null
                }
              } else if (typeof s.details === 'object') {
                details = s.details
              }
              
              if (details && details.evaluations && Array.isArray(details.evaluations) && details.evaluations.length > 0) {
                return true
              }
            }
          }
          
          return false
        })
        
        // Fallback: If no exact match, find the closest session by time (within 30 minutes)
        if (!matchingSession && quizSessions && quizSessions.length > 0) {
          const quizTime = new Date(qr.last_quiz_at).getTime()
          let closestSession: any = null
          let closestTimeDiff = Infinity
          
          for (const s of quizSessions) {
            const timeDiff = Math.abs(new Date(s.finished_at).getTime() - quizTime)
            if (timeDiff < 1800000 && timeDiff < closestTimeDiff) { // Within 30 minutes
              // Check if this session has evaluations
              let hasEvaluations = false
              if (s.details) {
                let details: any = null
                if (typeof s.details === 'string') {
                  try {
                    details = JSON.parse(s.details)
                  } catch (e) {
                    details = null
                  }
                } else if (typeof s.details === 'object') {
                  details = s.details
                }
                hasEvaluations = !!(details && details.evaluations && Array.isArray(details.evaluations) && details.evaluations.length > 0)
              }
              
              if (hasEvaluations) {
                closestSession = s
                closestTimeDiff = timeDiff
              }
            }
          }
          
          if (closestSession) {
            matchingSession = closestSession
            console.log('📊 Using fallback closest session match:', {
              timeDiff: closestTimeDiff / 1000 / 60, // in minutes
              session_id: closestSession.id
            })
          }
        }
        
        console.log('📊 Matching session for quiz:', {
          word_set_title: (qr.word_sets as any)?.title || 'Unknown',
          word_set_id: qr.word_set_id,
          homework_id: qr.homework_id,
          last_quiz_at: qr.last_quiz_at,
          found_match: !!matchingSession,
          match_id: matchingSession?.id,
          match_word_set_id: matchingSession?.word_set_id,
          match_homework_id: matchingSession?.homework_id,
          match_finished_at: matchingSession?.finished_at,
          match_has_evaluations: matchingSession?.details && typeof matchingSession.details === 'object' 
            ? !!(matchingSession.details as any).evaluations 
            : false,
          total_quiz_sessions: quizSessions?.length || 0
        })
        
        // Extract evaluations from session details
        let wordDetails: Array<{
          prompt: string
          expected: string
          given: string
          verdict: 'correct' | 'partial' | 'wrong' | 'empty'
        }> = []
        
        if (matchingSession?.details) {
          let details: any = null
          
          console.log('📊 Extracting from matching session:', {
            session_id: matchingSession.id,
            details_type: typeof matchingSession.details,
            details_is_null: matchingSession.details === null,
            details_is_undefined: matchingSession.details === undefined,
            details_string_length: typeof matchingSession.details === 'string' ? matchingSession.details.length : 'n/a'
          })
          
          // Handle different detail formats (object or JSON string)
          if (typeof matchingSession.details === 'string') {
            try {
              details = JSON.parse(matchingSession.details)
              console.log('📊 Parsed JSON details:', {
                has_evaluations: !!(details?.evaluations),
                evaluations_count: details?.evaluations?.length || 0,
                details_keys: Object.keys(details || {})
              })
            } catch (e) {
              console.error('📊 Failed to parse details JSON:', e)
              details = null
            }
          } else if (typeof matchingSession.details === 'object' && matchingSession.details !== null) {
            details = matchingSession.details
            console.log('📊 Using object details:', {
              has_evaluations: !!(details?.evaluations),
              evaluations_count: details?.evaluations?.length || 0,
              details_keys: Object.keys(details || {})
            })
          } else {
            console.log('📊 Details is not string or object:', {
              type: typeof matchingSession.details,
              value: matchingSession.details
            })
          }
          
          if (details && details.evaluations && Array.isArray(details.evaluations)) {
            wordDetails = details.evaluations.map((e: any) => ({
              prompt: e.prompt || '',
              expected: e.expected || '',
              given: e.given || '',
              verdict: !e.given || (typeof e.given === 'string' && e.given.trim() === '') 
                ? 'empty' 
                : (e.verdict || 'wrong')
            }))
            
            console.log('📊 Extracted word details:', {
              count: wordDetails.length,
              sample: wordDetails[0] || null
            })
          } else {
            console.log('📊 No evaluations found in details:', {
              has_matching_session: !!matchingSession,
              has_details: !!details,
              details_type: typeof details,
              details_keys: details ? Object.keys(details) : [],
              has_evaluations: details?.evaluations ? 'yes' : 'no',
              evaluations_type: details?.evaluations ? typeof details.evaluations : 'n/a',
              evaluations_is_array: Array.isArray(details?.evaluations),
              evaluations_value: details?.evaluations,
              full_details_object: details, // Full details for debugging
              raw_details_preview: typeof matchingSession?.details === 'string' 
                ? matchingSession.details.substring(0, 500) 
                : JSON.stringify(matchingSession?.details || {}, null, 2).substring(0, 500)
            })
          }
        } else {
          console.log('📊 No matching session details found:', {
            has_matching_session: !!matchingSession,
            session_has_details: !!(matchingSession?.details)
          })
        }
        
        return {
          quiz_id: matchingSession?.id || '',
          word_set_title: (qr.word_sets as any)?.title || 'Unknown',
          word_set_id: qr.word_set_id || null,
          score,
          total,
          accuracy,
          completed_at: qr.last_quiz_at || '',
          word_details: wordDetails.length > 0 ? wordDetails : undefined, // Only include if we have details
          is_session_quiz: false
        }
      })
    
    // Combine regular and session quiz results, sort by date
    const quiz_results = [...regularQuizResults, ...sessionQuizResults]
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

    // ===== 7. MISSED WORDS (if word_progress table exists) =====
    // This would require a word_progress table which we may not have yet
    const missed_words: any[] = []
    
    // TODO: When word_progress table is implemented, query it here
    // const { data: wordProgress } = await supabaseAdmin
    //   .from('word_progress')
    //   .select('*')
    //   .eq('student_id', studentId)
    //   .lt('accuracy', 70)
    //   .order('accuracy', { ascending: true })
    //   .limit(20)

    // ===== 8. ACTIVITY LOG =====
    // Use game_sessions for detailed activity (includes accuracy)
    // Only show non-quiz sessions (quiz is shown separately)
    const nonQuizSessions = gameSessions?.filter(s => s.game_type !== 'quiz') || []
    const activity_log = nonQuizSessions.slice(0, 3).map(session => {
      // Keep accuracy_pct as percentage (0-100) since UI expects percentage
      const accuracyPercent = session.accuracy_pct || 0
      
      console.log('📊 Mapping game session to activity_log:', {
        game_type: session.game_type,
        score: session.score,
        accuracy_pct_from_db: session.accuracy_pct,
        mapped_accuracy: accuracyPercent,
        note: 'Keeping as percentage for UI display'
      })
      
      return {
        game_type: session.game_type,
        score: session.score || 0,
        accuracy: accuracyPercent, // Keep as percentage (0-100)
        played_at: session.finished_at,
        duration: session.duration_sec || 0,
        word_set_title: undefined // TODO: Link to word sets if available
      }
    }) || []

    // ===== ASSEMBLE RESPONSE =====
    const studentDetails: StudentDetailedStats = {
      id: profile.id,
      email: profile.email || '',
      name: profile.username || profile.email?.split('@')[0] || 'Student',
      created_at: profile.created_at || '',
      last_active: profile.last_active || '',
      
      total_xp: totalXp,
      level,
      progress_to_next: xpIntoLevel,  // Use actual XP points (not decimal percentage)
      next_level_delta: nextDelta,
      
      current_streak: streakData?.current_streak || 0,
      longest_streak: streakData?.longest_streak || 0,
      last_play_date: streakData?.last_play_date || null,
      
      total_badges: badges.length,
      badges,
      
      games_played: gameSessions?.length || progressData?.games_played || 0,
      total_time_played: totalTimePlayed,
      average_accuracy,
      
      game_stats,
      quiz_results,
      missed_words,
      activity_log
    }

    console.log('✅ Successfully fetched student details:', {
      student_id: studentId,
      total_xp: totalXp,
      level,
      badges: badges.length,
      games_played: studentDetails.games_played
    })

    return NextResponse.json(studentDetails)

  } catch (error) {
    console.error('Error in GET /api/teacher/student-details:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

