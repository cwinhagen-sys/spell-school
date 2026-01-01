'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isUserEmailVerified } from '@/lib/email-verification'
import { BookOpen, Calendar, FileText, Users, Clock, ArrowRight, TrendingUp, AlertCircle, CheckCircle, Gamepad2, BarChart3, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

interface SessionWithProgress {
  id: string
  session_code: string
  session_name: string | null
  due_date: string
  is_active: boolean
  enabled_games: string[]
  game_rounds?: { [key: string]: number }
  word_sets: { id: string; title: string }[]
  participants: {
    id: string
    student_name: string
    joined_at: string
    progress: number // 0-100
    needsAttention: boolean
  }[]
  totalParticipants: number
  completedCount: number
  averageProgress: number
}

interface WeeklyActivity {
  day: string
  sessions: number
  games: number
}

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [teacherName, setTeacherName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // Core stats
  const [totalStudents, setTotalStudents] = useState<number>(0)
  const [totalClasses, setTotalClasses] = useState<number>(0)
  const [totalWordSets, setTotalWordSets] = useState<number>(0)
  const [activeSessions, setActiveSessions] = useState<number>(0)
  
  // Sessions with students needing attention
  const [sessionsWithProgress, setSessionsWithProgress] = useState<SessionWithProgress[]>([])
  
  // Activity data
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
  const [recentGames, setRecentGames] = useState<number>(0)
  const [activityFilter, setActivityFilter] = useState<'today' | '7days' | '30days' | 'all'>('7days')
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  
  // Students currently online
  const [onlineStudents, setOnlineStudents] = useState<number>(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/'
        return
      }

      setUser(user)

      // Check email verification (skip in development)
      if (!isUserEmailVerified(user)) {
        // Email not verified - redirect to home with message
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
      
      await Promise.all([
        loadCoreStats(),
        loadSessionsWithProgress(),
        loadActivity(),
        loadOnlineStudents()
      ])
      setLoading(false)
    }
    init()
    
    // Refresh online students every 30 seconds
    const interval = setInterval(() => {
      loadOnlineStudents()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadCoreStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load classes count
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
      setTotalClasses(classes?.length || 0)

      // Load word sets count
      const { data: wordSets } = await supabase
        .from('word_sets')
        .select('id')
        .eq('teacher_id', user.id)
      setTotalWordSets(wordSets?.length || 0)

      // Load active sessions count
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
      setActiveSessions(sessions?.length || 0)

      // Load total students
      const { data: classStudents } = await supabase
        .from('class_students')
        .select(`student_id, classes!class_students_class_id_fkey(teacher_id)`)
        .eq('classes.teacher_id', user.id)
      
      const uniqueStudents = new Set(classStudents?.map(cs => cs.student_id) || [])
      setTotalStudents(uniqueStudents.size)
    } catch (error) {
      console.error('Error loading core stats:', error)
    }
  }

  const loadSessionsWithProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get active sessions
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          session_name,
          due_date,
          is_active,
          enabled_games,
          game_rounds,
          word_sets(id, title)
        `)
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      if (!sessions || sessions.length === 0) {
        setSessionsWithProgress([])
        return
      }

      // For each session, load participants and their progress
      const sessionsWithData = await Promise.all(
        sessions.map(async (session) => {
          // Get participants
          const { data: participants } = await supabase
            .from('session_participants')
            .select('id, student_name, joined_at')
            .eq('session_id', session.id)

          if (!participants || participants.length === 0) {
            return {
              ...session,
              word_sets: Array.isArray(session.word_sets) ? session.word_sets : [],
              participants: [],
              totalParticipants: 0,
              completedCount: 0,
              averageProgress: 0
            }
          }

          // Get progress for all participants
          const { data: progressData } = await supabase
            .from('session_progress')
            .select('participant_id, game_name, completed, rounds_completed')
            .eq('session_id', session.id)

          const totalGames = session.enabled_games?.length || 1
          const gameRounds = session.game_rounds || {}

          // Calculate progress for each participant
          const participantsWithProgress = participants.map(p => {
            const pProgress = progressData?.filter(pr => pr.participant_id === p.id) || []
            
            // Calculate completed games based on rounds
            const completedGames = session.enabled_games?.filter((gameName: string) => {
              const gameProgress = pProgress.find(pr => pr.game_name === gameName)
              if (!gameProgress) return false
              const requiredRounds = gameRounds[gameName] || 1
              const roundsCompleted = gameProgress.rounds_completed || 0
              return roundsCompleted >= requiredRounds
            }).length || 0

            const progressPct = Math.round((completedGames / totalGames) * 100)
            
            return {
              id: p.id,
              student_name: p.student_name,
              joined_at: p.joined_at,
              progress: progressPct,
              needsAttention: progressPct < 50 // Less than 50% complete
            }
          })

          const completedCount = participantsWithProgress.filter(p => p.progress === 100).length
          const avgProgress = participantsWithProgress.length > 0
            ? Math.round(participantsWithProgress.reduce((sum, p) => sum + p.progress, 0) / participantsWithProgress.length)
            : 0

          return {
            ...session,
            word_sets: Array.isArray(session.word_sets) ? session.word_sets : [],
            participants: participantsWithProgress.filter(p => p.needsAttention).slice(0, 3),
            totalParticipants: participants.length,
            completedCount,
            averageProgress: avgProgress
          }
        })
      )

      setSessionsWithProgress(sessionsWithData)
    } catch (error) {
      console.error('Error loading sessions with progress:', error)
    }
  }

  const loadActivity = async (filter: 'today' | '7days' | '30days' | 'all' = activityFilter) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get student IDs for this teacher's classes
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id, classes!inner(teacher_id)')
        .eq('classes.teacher_id', user.id)

      if (!classStudents || classStudents.length === 0) {
        setWeeklyActivity([])
        setRecentGames(0)
        return
      }

      const studentIds = classStudents.map(cs => cs.student_id)
      
      // Calculate date range based on filter
      let daysToShow = 7
      let startDate: Date | null = new Date()
      
      switch (filter) {
        case 'today':
          daysToShow = 1
          startDate.setHours(0, 0, 0, 0)
          break
        case '7days':
          daysToShow = 7
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30days':
          daysToShow = 30
          startDate.setDate(startDate.getDate() - 30)
          break
        case 'all':
          daysToShow = 0
          startDate = null
          break
      }

      // Build query
      let query = supabase
        .from('game_sessions')
        .select('created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data: games } = await query

      setRecentGames(games?.length || 0)

      // Group by day for chart
      if (filter === 'today') {
        // For today, group by hour
        const hourlyActivity: { [key: string]: number } = {}
        for (let i = 0; i < 24; i += 4) {
          hourlyActivity[`${i.toString().padStart(2, '0')}:00`] = 0
        }
        
        games?.forEach(game => {
          const date = new Date(game.created_at)
          const hour = Math.floor(date.getHours() / 4) * 4
          const key = `${hour.toString().padStart(2, '0')}:00`
          if (key in hourlyActivity) {
            hourlyActivity[key]++
          }
        })

        const activity = Object.entries(hourlyActivity).map(([day, games]) => ({
          day,
          sessions: 0,
          games
        }))
        setWeeklyActivity(activity)
      } else if (filter === '7days') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const activityByDay: { [key: string]: number } = {}
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayKey = dayNames[date.getDay()]
        activityByDay[dayKey] = 0
      }

      games?.forEach(game => {
        const date = new Date(game.created_at)
        const dayKey = dayNames[date.getDay()]
        if (dayKey in activityByDay) {
          activityByDay[dayKey]++
        }
      })

      const activity = Object.entries(activityByDay).map(([day, games]) => ({
        day,
        sessions: 0,
        games
      }))
        setWeeklyActivity(activity)
      } else if (filter === '30days') {
        // Group by week for 30 days
        const weeklyData: { [key: string]: number } = {
          'Week 1': 0,
          'Week 2': 0,
          'Week 3': 0,
          'Week 4': 0
        }
        
        const now = new Date()
        games?.forEach(game => {
          const date = new Date(game.created_at)
          const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          if (daysAgo < 7) weeklyData['Week 1']++
          else if (daysAgo < 14) weeklyData['Week 2']++
          else if (daysAgo < 21) weeklyData['Week 3']++
          else weeklyData['Week 4']++
        })

        const activity = Object.entries(weeklyData).map(([day, games]) => ({
          day,
          sessions: 0,
          games
        }))
        setWeeklyActivity(activity)
      } else {
        // All time - group by month (last 6 months)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlyData: { [key: string]: number } = {}
        
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now)
          date.setMonth(date.getMonth() - i)
          const key = monthNames[date.getMonth()]
          monthlyData[key] = 0
        }

        games?.forEach(game => {
          const date = new Date(game.created_at)
          const key = monthNames[date.getMonth()]
          if (key in monthlyData) {
            monthlyData[key]++
          }
        })

        const activity = Object.entries(monthlyData).map(([day, games]) => ({
          day,
          sessions: 0,
          games
        }))
      setWeeklyActivity(activity)
      }
    } catch (error) {
      console.error('Error loading activity:', error)
    }
  }

  const handleActivityFilterChange = (filter: 'today' | '7days' | '30days' | 'all') => {
    setActivityFilter(filter)
    setShowActivityDropdown(false)
    loadActivity(filter)
  }

  const getActivityFilterLabel = () => {
    switch (activityFilter) {
      case 'today': return 'Today'
      case '7days': return 'Last 7 days'
      case '30days': return 'Last 30 days'
      case 'all': return 'All time'
    }
  }

  const loadOnlineStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: classStudents } = await supabase
        .from('class_students')
        .select(`student_id, classes!class_students_class_id_fkey(teacher_id)`)
        .eq('classes.teacher_id', user.id)

      if (!classStudents || classStudents.length === 0) {
        setOnlineStudents(0)
        return
      }

      const studentIds = classStudents.map(cs => cs.student_id)

      const { data: students } = await supabase
        .from('profiles')
        .select('id, last_active')
        .in('id', studentIds)
        .eq('role', 'student')

      const now = new Date()
      const onlineCount = (students || []).filter(s => {
        if (!s.last_active) return false
        const lastActive = new Date(s.last_active)
        const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60)
        return diffMinutes <= 2
      }).length

      setOnlineStudents(onlineCount)
    } catch (error) {
      console.error('Error loading online students:', error)
    }
  }

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays} days left`
  }

  const getMaxGames = () => {
    if (weeklyActivity.length === 0) return 1
    return Math.max(...weeklyActivity.map(a => a.games), 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // New teacher onboarding
  if (totalClasses === 0 && totalWordSets === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">
            Welcome, {teacherName}
          </h1>
          <p className="text-gray-400 mb-10 max-w-md mx-auto">
            Get started by creating your first class or word list.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/teacher/classes"
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:from-amber-400 hover:to-orange-500 transition-all inline-flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Create Class
            </Link>
            
            <Link
              href="/teacher/word-sets"
              className="bg-[#161622] hover:bg-white/[0.06] border border-white/[0.12] text-white px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Create Word List
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white">{teacherName}</h1>
        </div>
        {onlineStudents > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-sm text-amber-400">{onlineStudents} student{onlineStudents !== 1 ? 's' : ''} online</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Students', value: totalStudents, icon: Users, href: '/teacher/students' },
          { label: 'Classes', value: totalClasses, icon: BookOpen, href: '/teacher/classes' },
          { label: 'Word Lists', value: totalWordSets, icon: FileText, href: '/teacher/word-sets' },
          { label: 'Active Sessions', value: activeSessions, icon: Gamepad2, href: '/teacher/sessions' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={stat.href}
              className="block bg-[#161622] border border-white/[0.12] rounded-xl p-5 hover:border-amber-500/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.10] rounded-lg flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-2xl font-semibold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-300">{stat.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sessions Needing Attention */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-[#161622] border border-white/[0.12] rounded-xl"
        >
          <div className="px-5 py-4 border-b border-white/[0.12] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h2 className="font-medium text-white">Sessions to Follow Up</h2>
            </div>
            <Link 
              href="/teacher/sessions" 
              className="text-sm text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="p-5">
            {sessionsWithProgress.length > 0 ? (
              <div className="space-y-4">
                {sessionsWithProgress.map((session) => (
                  <Link
                    key={session.id}
                    href={`/teacher/sessions/${session.id}`}
                    className="block p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.10] hover:border-amber-500/30 rounded-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-white mb-1">
                          {session.session_name || session.word_sets[0]?.title || 'Session'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDueDate(session.due_date)}
                          </span>
                          <span className="font-mono text-amber-400/70">{session.session_code}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Simple completion bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          Completed: <span className="text-white font-medium">{session.completedCount}</span> / <span className="text-white font-medium">{session.totalParticipants}</span>
                        </span>
                        <span className="text-gray-400 text-xs">
                          {session.totalParticipants > 0 ? Math.round((session.completedCount / session.totalParticipants) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            session.completedCount === session.totalParticipants && session.totalParticipants > 0
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                              : session.completedCount > 0
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                              : 'bg-gray-500'
                          }`}
                          style={{ width: `${session.totalParticipants > 0 ? (session.completedCount / session.totalParticipants) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.10] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm mb-4">No active sessions right now</p>
                <Link 
                  href="/teacher/sessions"
                  className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Create a session
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Activity Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#161622] border border-white/[0.12] rounded-xl"
        >
          <div className="px-5 py-4 border-b border-white/[0.12] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <h2 className="font-medium text-white">Activity</h2>
            </div>
            {/* Time filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowActivityDropdown(!showActivityDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
              >
                {getActivityFilterLabel()}
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showActivityDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showActivityDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowActivityDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a1a2e] border border-white/[0.12] rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                    {[
                      { value: 'today', label: 'Today' },
                      { value: '7days', label: 'Last 7 days' },
                      { value: '30days', label: 'Last 30 days' },
                      { value: 'all', label: 'All time' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleActivityFilterChange(option.value as 'today' | '7days' | '30days' | 'all')}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          activityFilter === option.value
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="p-5">
            <div className="mb-4">
              <p className="text-3xl font-semibold text-white">{recentGames}</p>
              <p className="text-sm text-gray-300">games played</p>
            </div>
            
            {weeklyActivity.length > 0 ? (
              <div className="flex items-end gap-1 h-24">
                {weeklyActivity.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-white/[0.04] border border-white/[0.04] rounded-sm overflow-hidden h-16 flex items-end">
                      <div 
                        className="w-full bg-gradient-to-t from-amber-600 to-orange-400 rounded-sm transition-all"
                        style={{ height: `${(day.games / getMaxGames()) * 100}%`, minHeight: day.games > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{day.day}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center">
                <p className="text-sm text-gray-400">No data yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { href: '/teacher/classes', icon: Users, label: 'Manage Classes' },
          { href: '/teacher/word-sets', icon: FileText, label: 'Word Lists' },
          { href: '/teacher/assign', icon: Calendar, label: 'Assign Work' },
          { href: '/teacher/sessions', icon: Gamepad2, label: 'Sessions' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 px-4 py-3 bg-[#161622] border border-white/[0.12] rounded-lg hover:border-amber-500/30 transition-all group"
          >
            <action.icon className="w-5 h-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
            <span className="text-sm text-gray-200 group-hover:text-white transition-colors">{action.label}</span>
            <ArrowRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </motion.div>

      <SaveStatusIndicator />
    </div>
  )
}
