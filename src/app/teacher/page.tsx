'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isUserEmailVerified } from '@/lib/email-verification'
import { BookOpen, FileText, Users, Clock, ArrowRight, Gamepad2, BarChart3, ChevronDown, Play } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

interface SessionProgress {
  id: string
  session_code: string
  session_name: string | null
  due_date: string
  // For class-based sessions
  isClassSession: boolean
  className?: string
  classId?: string
  // Progress calculation
  totalGamesRequired: number // Total games × students (or rounds × students)
  gamesCompleted: number // Individual games completed by all students
  studentCount: number
  // For non-class sessions (legacy display)
  completedCount: number
  totalParticipants: number
  wordSetTitle: string
}

interface CurrentlyPlaying {
  id: string
  name: string
  game: string
  startedAt: Date
}

interface ActivityDay {
  label: string
  games: number
}

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [teacherName, setTeacherName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [hasClasses, setHasClasses] = useState<boolean>(false)
  
  // Session progress
  const [sessions, setSessions] = useState<SessionProgress[]>([])
  
  // Currently playing
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying[]>([])
  
  // Activity data
  const [activityData, setActivityData] = useState<ActivityDay[]>([])
  const [totalGamesInPeriod, setTotalGamesInPeriod] = useState(0)
  const [activityFilter, setActivityFilter] = useState<'7days' | '30days' | '90days'>('7days')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/'
        return
      }

      setUser(user)

      if (!isUserEmailVerified(user)) {
        window.location.href = '/?message=Please verify your email address before accessing teacher features. Check your inbox for the verification link.'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'teacher') {
        window.location.href = '/student'
        return
      }
      
      setTeacherName(profile.name || user.email?.split('@')[0] || 'Teacher')
      
      // Check if teacher has any classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .limit(1)
      
      const hasAnyClasses = (classes && classes.length > 0) || false
      setHasClasses(hasAnyClasses)
      
      // Only load dashboard data if teacher has classes
      if (hasAnyClasses) {
        await Promise.all([
          loadSessions(),
          loadCurrentlyPlaying(),
          loadActivity()
        ])
      }
      
      setLoading(false)
    }
    init()
    
    // Refresh currently playing every 30 seconds
    const interval = setInterval(() => {
      loadCurrentlyPlaying()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get sessions with their linked classes
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          session_name,
          due_date,
          enabled_games,
          game_rounds,
          word_sets(title)
        `)
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6)

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([])
        return
      }

      // Get class associations for all sessions
      const sessionIds = sessionsData.map(s => s.id)
      const { data: sessionClassLinks } = await supabase
        .from('session_classes')
        .select('session_id, class_id, classes(id, name)')
        .in('session_id', sessionIds)

      // Build a map of session_id -> class info
      const classMap: { [sessionId: string]: { classId: string; className: string }[] } = {}
      sessionClassLinks?.forEach(link => {
        if (!classMap[link.session_id]) {
          classMap[link.session_id] = []
        }
        const classData = Array.isArray(link.classes) ? link.classes[0] : link.classes
        if (classData) {
          classMap[link.session_id].push({
            classId: classData.id,
            className: classData.name
          })
        }
      })

      const sessionsWithProgress = await Promise.all(
        sessionsData.map(async (session) => {
          const linkedClasses = classMap[session.id] || []
          const isClassSession = linkedClasses.length > 0
          const totalGamesInSession = session.enabled_games?.length || 1
          const gameRounds = session.game_rounds || {}

          // Calculate total rounds required per student
          let totalRoundsPerStudent = 0
          session.enabled_games?.forEach((gameName: string) => {
            totalRoundsPerStudent += (gameRounds[gameName] || 1)
          })

          if (isClassSession) {
            // CLASS-BASED SESSION: Calculate progress based on individual games
            const classIds = linkedClasses.map(c => c.classId)
            
            // Get students in the linked classes
            const { data: classStudents } = await supabase
              .from('class_students')
              .select('student_id')
              .in('class_id', classIds)
              .is('deleted_at', null)

            const uniqueStudentIds = [...new Set(classStudents?.map(cs => cs.student_id) || [])]
            const studentCount = uniqueStudentIds.length

            // Get all progress records for this session
            const { data: progressData } = await supabase
              .from('session_progress')
              .select('participant_id, game_name, rounds_completed')
              .eq('session_id', session.id)

            // Calculate total games completed (sum of all rounds_completed across all participants)
            let gamesCompleted = 0
            progressData?.forEach(p => {
              gamesCompleted += (p.rounds_completed || 0)
            })

            // Total games required = total rounds per student × number of students
            const totalGamesRequired = totalRoundsPerStudent * studentCount

            // Get participants count for this session
          const { data: participants } = await supabase
            .from('session_participants')
              .select('id')
            .eq('session_id', session.id)

            const wordSets = Array.isArray(session.word_sets) ? session.word_sets : (session.word_sets ? [session.word_sets] : [])

            return {
              id: session.id,
              session_code: session.session_code,
              session_name: session.session_name,
              due_date: session.due_date,
              isClassSession: true,
              className: linkedClasses.map(c => c.className).join(', '),
              classId: linkedClasses[0]?.classId,
              totalGamesRequired,
              gamesCompleted,
              studentCount,
              completedCount: 0,
              totalParticipants: participants?.length || 0,
              wordSetTitle: wordSets[0]?.title || 'Session'
            }
          } else {
            // NON-CLASS SESSION: Legacy calculation based on participants
            const { data: participants } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', session.id)

          const { data: progressData } = await supabase
            .from('session_progress')
              .select('participant_id, game_name, rounds_completed')
            .eq('session_id', session.id)

            let completedCount = 0
            let gamesCompleted = 0
            
            participants?.forEach(p => {
              const pProgress = progressData?.filter(pr => pr.participant_id === p.id) || []
              let participantGamesCompleted = 0
              
            const completedGames = session.enabled_games?.filter((gameName: string) => {
              const gameProgress = pProgress.find(pr => pr.game_name === gameName)
              if (!gameProgress) return false
              const requiredRounds = gameRounds[gameName] || 1
              const roundsCompleted = gameProgress.rounds_completed || 0
                participantGamesCompleted += roundsCompleted
              return roundsCompleted >= requiredRounds
            }).length || 0

              gamesCompleted += participantGamesCompleted
              if (completedGames === totalGamesInSession) completedCount++
            })

            const wordSets = Array.isArray(session.word_sets) ? session.word_sets : (session.word_sets ? [session.word_sets] : [])
            const studentCount = participants?.length || 0
            const totalGamesRequired = totalRoundsPerStudent * studentCount
            
            return {
              id: session.id,
              session_code: session.session_code,
              session_name: session.session_name,
              due_date: session.due_date,
              isClassSession: false,
              totalGamesRequired,
              gamesCompleted,
              studentCount,
              completedCount,
              totalParticipants: participants?.length || 0,
              wordSetTitle: wordSets[0]?.title || 'Session'
            }
          }
        })
      )

      setSessions(sessionsWithProgress)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const loadCurrentlyPlaying = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all classes for this teacher
      const { data: teacherClasses, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)

      if (classesError || !teacherClasses || teacherClasses.length === 0) {
        console.log('No classes found for teacher')
        setCurrentlyPlaying([])
        return
      }

      const classIds = teacherClasses.map(c => c.id)

      // Get student IDs for these classes
      const { data: classStudents, error: studentsError } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds)
        .is('deleted_at', null)

      if (studentsError || !classStudents || classStudents.length === 0) {
        console.log('No students found in teacher classes')
        setCurrentlyPlaying([])
        return
      }

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))]
      console.log('Found students in classes:', studentIds.length)

      // Get students who were active in the last 5 minutes (increased window)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      
      const { data: activeStudents, error: activeError } = await supabase
        .from('profiles')
        .select('id, name, username, last_active')
        .in('id', studentIds)
        .gte('last_active', fiveMinutesAgo)

      console.log('Active students query:', { 
        studentIds: studentIds.length, 
        fiveMinutesAgo,
        activeStudents: activeStudents?.length || 0,
        activeError
      })

      if (!activeStudents || activeStudents.length === 0) {
        setCurrentlyPlaying([])
        return
      }

      // Get their most recent game session
      const { data: recentGames } = await supabase
        .from('game_sessions')
        .select('student_id, game_type, created_at')
        .in('student_id', activeStudents.map(s => s.id))
        .order('created_at', { ascending: false })
        .limit(50)

      const playingNow: CurrentlyPlaying[] = activeStudents.map(student => {
        const recentGame = recentGames?.find(g => g.student_id === student.id)
        return {
          id: student.id,
          name: student.username || student.name || 'Student',
          game: recentGame ? formatGameType(recentGame.game_type) : 'Active',
          startedAt: recentGame ? new Date(recentGame.created_at) : new Date()
        }
      }).slice(0, 8)

      setCurrentlyPlaying(playingNow)
    } catch (error) {
      console.error('Error loading currently playing:', error)
    }
  }

  const loadActivity = async (filter: '7days' | '30days' | '90days' = activityFilter) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all classes for this teacher
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)

      if (!teacherClasses || teacherClasses.length === 0) {
        setActivityData([])
        setTotalGamesInPeriod(0)
        return
      }

      const classIds = teacherClasses.map(c => c.id)

      // Get student IDs for these classes
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds)
        .is('deleted_at', null)

      if (!classStudents || classStudents.length === 0) {
        setActivityData([])
        setTotalGamesInPeriod(0)
        return
      }

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))]
      console.log('Activity - students found:', studentIds.length)
      
      const days = filter === '7days' ? 7 : filter === '30days' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
          startDate.setHours(0, 0, 0, 0)

      const { data: games, error: gamesError } = await supabase
        .from('game_sessions')
        .select('created_at')
        .in('student_id', studentIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      console.log('Activity - games found:', { 
        count: games?.length || 0, 
        filter, 
        startDate: startDate.toISOString(),
        error: gamesError 
      })

      setTotalGamesInPeriod(games?.length || 0)

      // Build activity data
      if (filter === '7days') {
        // Daily breakdown
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const dailyCounts: { [key: string]: number } = {}
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          dailyCounts[key] = 0
        }
        
        games?.forEach(game => {
          const date = new Date(game.created_at)
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          if (key in dailyCounts) {
            dailyCounts[key]++
          }
        })

        const activity: ActivityDay[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          activity.push({
            label: dayLabels[date.getDay()],
            games: dailyCounts[key] || 0
          })
        }
        setActivityData(activity)

      } else if (filter === '30days') {
        // Weekly breakdown
        const weeks: { [key: string]: number } = { 'W1': 0, 'W2': 0, 'W3': 0, 'W4': 0 }
        const now = new Date()
        
        games?.forEach(game => {
          const date = new Date(game.created_at)
          const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          if (daysAgo < 7) weeks['W1']++
          else if (daysAgo < 14) weeks['W2']++
          else if (daysAgo < 21) weeks['W3']++
          else weeks['W4']++
        })

        setActivityData([
          { label: 'This week', games: weeks['W1'] },
          { label: 'Last week', games: weeks['W2'] },
          { label: '2 weeks ago', games: weeks['W3'] },
          { label: '3 weeks ago', games: weeks['W4'] }
        ])

      } else {
        // Monthly breakdown for 90 days
        const months: { [key: string]: number } = {}
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        for (let i = 2; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const key = monthNames[date.getMonth()]
          months[key] = 0
        }

        games?.forEach(game => {
          const date = new Date(game.created_at)
          const key = monthNames[date.getMonth()]
          if (key in months) {
            months[key]++
          }
        })

        setActivityData(Object.entries(months).map(([label, games]) => ({ label, games })))
      }
    } catch (error) {
      console.error('Error loading activity:', error)
    }
  }

  const formatGameType = (type: string) => {
    const names: { [key: string]: string } = {
      flashcard: 'Flashcards',
      memory: 'Memory',
      quiz: 'Quiz',
      typing: 'Typing',
      translate: 'Translate',
      story_gap: 'Sentence Gap',
      scramble: 'Scramble',
      roulette: 'Roulette',
      multiple_choice: 'Multiple Choice',
      line_matching: 'Line Match'
    }
    return names[type] || 'Playing'
  }

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays}d left`
  }

  const getMaxGames = () => {
    if (activityData.length === 0) return 1
    return Math.max(...activityData.map(a => a.games), 1)
  }

  const handleFilterChange = (filter: '7days' | '30days' | '90days') => {
    setActivityFilter(filter)
    setShowFilterDropdown(false)
    loadActivity(filter)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Show welcome screen for new teachers without classes
  if (!hasClasses) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161622] border border-white/[0.10] rounded-2xl p-8 md:p-12 text-center"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Users className="w-10 h-10 text-amber-400" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Welcome to Spell School, {teacherName}!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto"
          >
            Get started by creating your first class. Once you have a class, you can add students, create word lists, and start sessions.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/teacher/classes"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl"
            >
              <Users className="w-5 h-5" />
            Create Your First Class
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 pt-8 border-t border-white/10"
          >
            <p className="text-sm text-gray-500 mb-4">What's next?</p>
            <div className="grid md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">1. Create a Class</h3>
                <p className="text-xs text-gray-500">Set up your first class to organize your students</p>
              </div>
              
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">2. Add Students</h3>
                <p className="text-xs text-gray-500">Invite students to join your class</p>
              </div>
              
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">3. Start Sessions</h3>
                <p className="text-xs text-gray-500">Create sessions and assign word lists to your class</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white">{teacherName}</h1>
        </div>
            <Link
          href="/teacher/sessions/create"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all"
        >
          <Gamepad2 className="w-4 h-4" />
          New Session
            </Link>
      </div>

      {/* Session Progress - Boxed section */}
      <section className="bg-[#161622] border border-white/[0.10] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-white flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            Active Sessions
          </h2>
          <Link href="/teacher/sessions" className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
        {sessions.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, i) => {
              // Calculate progress percentage based on individual games
              const progress = session.totalGamesRequired > 0 
                ? Math.round((session.gamesCompleted / session.totalGamesRequired) * 100) 
                : 0
              const isComplete = progress >= 100
              
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/teacher/sessions/${session.id}`}
                    className="block bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-500/30 rounded-xl p-4 transition-all group"
                  >
                    {session.isClassSession ? (
                      // CLASS SESSION: Show class name prominently
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                              <Users className="w-4 h-4 text-amber-400" />
                            </div>
                            <h3 className="font-semibold text-white text-lg">
                              {session.className}
                        </h3>
                          </div>
                          <span className="text-xs font-mono text-amber-500/70 bg-amber-500/10 px-2 py-0.5 rounded">
                            {session.session_code}
                          </span>
                        </div>
                        
                        {session.session_name && (
                          <p className="text-xs text-gray-500 mb-2 truncate">{session.session_name}</p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Clock className="w-3 h-3" />
                          <span>{formatDueDate(session.due_date)}</span>
                          <span className="text-gray-600">•</span>
                          <span>{session.studentCount} students</span>
                    </div>
                    
                        {/* Progress bar for class */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Progress</span>
                            <span className={isComplete ? 'text-amber-400 font-medium' : 'text-gray-400'}>
                              {Math.min(progress, 100)}% finished
                            </span>
                          </div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                isComplete 
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-amber-600/80 to-orange-500/80'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progress, 100)}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      />
                    </div>
                        </div>
                      </>
                    ) : (
                      // NON-CLASS SESSION: Original display
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">
                              {session.session_name || session.wordSetTitle}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {formatDueDate(session.due_date)}
                            </p>
                          </div>
                          <span className="text-xs font-mono text-amber-500/70 bg-amber-500/10 px-2 py-0.5 rounded">
                            {session.session_code}
                        </span>
                    </div>
                    
                        {/* Simple progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Progress</span>
                            <span className={isComplete ? 'text-amber-400 font-medium' : 'text-gray-400'}>
                              {session.totalParticipants > 0 
                                ? Math.round((session.completedCount / session.totalParticipants) * 100) 
                                : 0}% finished
                            </span>
                          </div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                session.completedCount === session.totalParticipants && session.totalParticipants > 0
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-amber-600/80 to-orange-500/80'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${session.totalParticipants > 0 
                                  ? (session.completedCount / session.totalParticipants) * 100 
                                  : 0}%` 
                              }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-10 h-10 bg-white/[0.04] rounded-lg flex items-center justify-center mx-auto mb-3">
              <Gamepad2 className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm mb-3">No active sessions</p>
            <Link 
              href="/teacher/sessions/create"
              className="text-sm text-amber-500 hover:text-amber-400"
            >
              Create your first session
            </Link>
          </div>
        )}
      </section>

      {/* Two column layout for Currently Playing and Activity - Equal height boxes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Currently Playing */}
        <section className="bg-[#161622] border border-white/[0.10] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <h2 className="text-base font-medium text-white">Currently Playing</h2>
          </div>

          <div className="flex-1 flex flex-col">
            {currentlyPlaying.length > 0 ? (
              <div 
                className={`space-y-2 ${currentlyPlaying.length > 3 ? 'overflow-y-auto pr-2 custom-scrollbar' : ''}`}
                style={{
                  maxHeight: currentlyPlaying.length > 3 ? '240px' : 'none'
                }}
              >
                {currentlyPlaying.map((student, i) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.game}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500">No students playing right now</p>
              </div>
            )}
          </div>
        </section>

        {/* Activity Grid */}
        <section className="bg-[#161622] border border-white/[0.10] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-medium text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Activity
            </h2>
            
            {/* Time filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] transition-all"
              >
                {activityFilter === '7days' ? '7 days' : activityFilter === '30days' ? '30 days' : '90 days'}
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a1a2e] border border-white/[0.12] rounded-lg shadow-xl overflow-hidden">
                    {(['7days', '30days', '90days'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => handleFilterChange(option)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          activityFilter === option
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-gray-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        {option === '7days' ? 'Last 7 days' : option === '30days' ? 'Last 30 days' : 'Last 90 days'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <p className="text-3xl font-semibold text-white">{totalGamesInPeriod.toLocaleString()}</p>
              <p className="text-sm text-gray-500">games played</p>
            </div>
            
            {activityData.length > 0 ? (
              <div className="flex items-end gap-2 flex-1 min-h-[80px] relative">
                {activityData.map((day, i) => (
                  <div 
                    key={i} 
                    className="flex-1 flex flex-col items-center gap-1.5 h-full relative group"
                    onMouseEnter={() => setHoveredBarIndex(i)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Tooltip */}
                    {hoveredBarIndex === i && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-[#1a1a2e] border border-white/[0.15] rounded-lg shadow-xl whitespace-nowrap">
                        <div className="text-xs font-semibold text-white">{day.label}</div>
                        <div className="text-xs text-amber-400 mt-0.5">
                          {day.games} {day.games === 1 ? 'game' : 'games'}
                        </div>
                        {/* Tooltip arrow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                          <div className="w-2 h-2 bg-[#1a1a2e] border-r border-b border-white/[0.15] transform rotate-45"></div>
                        </div>
                      </div>
                    )}
                    
                    <div 
                      className="w-full bg-white/[0.04] rounded overflow-hidden flex items-end flex-1 cursor-pointer transition-all group-hover:bg-white/[0.06]"
                    >
                      <motion.div 
                        className={`w-full bg-gradient-to-t from-amber-600 to-orange-400 rounded-sm transition-all ${
                          hoveredBarIndex === i ? 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-[#161622]' : ''
                        }`}
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.games / getMaxGames()) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        style={{ minHeight: day.games > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className={`text-[10px] transition-colors ${
                      hoveredBarIndex === i ? 'text-amber-400 font-medium' : 'text-gray-500'
                    }`}>
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500">No activity data</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick Links - Also boxed */}
      <section className="bg-[#161622] border border-white/[0.10] rounded-2xl p-6">
        <h2 className="text-base font-medium text-white mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/teacher/classes', icon: Users, label: 'Classes' },
          { href: '/teacher/word-sets', icon: FileText, label: 'Word Lists' },
            { href: '/teacher/students', icon: BookOpen, label: 'Students' },
          { href: '/teacher/sessions', icon: Gamepad2, label: 'Sessions' },
          ].map((link) => (
          <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-amber-500/20 transition-all group"
            >
              <link.icon className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{link.label}</span>
          </Link>
        ))}
        </div>
      </section>

      <SaveStatusIndicator />
    </div>
  )
}
