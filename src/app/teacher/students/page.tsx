'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Search, Eye, ChevronLeft, Lock, LayoutGrid, List, TrendingUp, Award, Target, Clock, ArrowUpDown, BookOpen, Brain, Keyboard, Globe, BarChart3, Gamepad2, FileText, CheckSquare, Sparkles, GripVertical } from 'lucide-react'
import StudentDetailsModal from '@/components/StudentDetailsModal'
import { hasProgressStatsAccess, hasQuizStatsAccess, getUserSubscriptionTier } from '@/lib/subscription'
import { titleForLevel } from '@/lib/wizardTitles'
import { getStudentTTSAccess, setStudentTTSAccess } from '@/lib/tts-access'
import Link from 'next/link'

interface Student {
  id: string
  email: string
  name: string
  class_name: string
  class_id: string
  created_at: string
  last_sign_in_at: string | null
  total_points: number
  level: number
  last_activity: string
  is_active: boolean
  average_accuracy?: number
  games_played?: number
  recent_quiz_results?: Array<{
    word_set_title: string
    score: number
    total: number
    accuracy: number
    completed_at: string
  }>
  latest_games?: Array<{
    game_type: string
    played_at: string
    accuracy: number
  }>
}

interface StudentDetailedStats {
  id: string
  email: string
  name: string
  created_at: string
  last_active: string
  total_xp: number
  level: number
  progress_to_next: number
  next_level_delta: number
  current_streak: number
  longest_streak: number
  last_play_date: string | null
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
  games_played: number
  total_time_played: number
  average_accuracy: number
  game_stats: Array<{
    game_type: string
    plays: number
    average_score: number
    best_score: number
    last_played: string
  }>
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
  missed_words: Array<{
    word: string
    translation: string
    attempts: number
    correct: number
    accuracy: number
    last_attempt: string
  }>
  activity_log: Array<{
    game_type: string
    score: number
    accuracy: number
    played_at: string
    duration: number
    word_set_title?: string
  }>
}

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'total_points' | 'average_accuracy' | 'games_played' | 'last_activity'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showStudentDetails, setShowStudentDetails] = useState(false)
  const [studentDetails, setStudentDetails] = useState<StudentDetailedStats | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([])
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days' | 'all' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState<string | null>(null)
  const [customEndDate, setCustomEndDate] = useState<string | null>(null)
  const [showCustomCalendar, setShowCustomCalendar] = useState(false)
  const [hasProgressAccess, setHasProgressAccess] = useState(false)
  const [hasQuizAccess, setHasQuizAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isProTeacher, setIsProTeacher] = useState(false)
  const [studentTTSAccess, setStudentTTSAccessState] = useState<Map<string, boolean>>(new Map())
  const [updatingTTS, setUpdatingTTS] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('compact')
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    student: 200,
    xp: 120,
    accuracy: 120,
    games: 100,
    latestGame: 150,
    quizzes: 300
  })
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set())
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const progressAccess = await hasProgressStatsAccess(user.id)
          const quizAccess = await hasQuizStatsAccess(user.id)
          const tier = await getUserSubscriptionTier(user.id)
          setHasProgressAccess(progressAccess)
          setHasQuizAccess(quizAccess)
          setIsProTeacher(tier === 'pro')
        }
      } catch (error) {
        console.error('Error checking access:', error)
      } finally {
        setCheckingAccess(false)
      }
    }
    checkAccess()
    // loadClasses will automatically load students for the selected class
    loadClasses()
  }, [])

  // Reload students when time filter changes
  useEffect(() => {
    if (classes.length > 0) {
      loadStudents(selectedClass || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, customStartDate, customEndDate])

  
  // Load TTS access status for all students
  const loadTTSAccess = async (studentIds: string[]) => {
    if (!isProTeacher) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const accessMap = new Map<string, boolean>()
      await Promise.all(
        studentIds.map(async (studentId) => {
          const hasAccess = await getStudentTTSAccess(studentId, user.id)
          accessMap.set(studentId, hasAccess)
        })
      )
      setStudentTTSAccessState(accessMap)
    } catch (error) {
      console.error('Error loading TTS access:', error)
    }
  }
  
  // Toggle TTS access for a student
  const toggleTTSAccess = async (studentId: string) => {
    if (!isProTeacher) return
    
    setUpdatingTTS(prev => new Set(prev).add(studentId))
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const currentAccess = studentTTSAccess.get(studentId) || false
      const result = await setStudentTTSAccess(studentId, user.id, !currentAccess)
      
      if (result.success) {
        setStudentTTSAccessState(prev => {
          const newMap = new Map(prev)
          newMap.set(studentId, !currentAccess)
          return newMap
        })
        setMessage({
          type: 'success',
          text: `TTS access ${!currentAccess ? 'enabled' : 'disabled'} for ${students.find(s => s.id === studentId)?.name || 'student'}`
        })
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Could not update TTS access'
        })
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Ett fel uppstod'
      })
    } finally {
      setUpdatingTTS(prev => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
    }
  }

  const loadClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', session.user.id)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      
      setClasses(data || [])
      
      // Auto-select first class or last selected class
      if (data && data.length > 0) {
        const lastSelectedClassId = localStorage.getItem('teacher_last_selected_class')
        const classToSelect = lastSelectedClassId && data.find(c => c.id === lastSelectedClassId)
          ? lastSelectedClassId
          : data[0].id
        
        setSelectedClass(classToSelect)
        await loadStudents(classToSelect)
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      setMessage({ type: 'error', text: 'Could not load classes' })
    }
  }

  const loadStudents = async (classFilter?: string) => {
    try {
      setLoading(true)
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      // Build query string with time filter
      const params = new URLSearchParams()
      if (classFilter) {
        params.append('classId', classFilter)
      }
      if (timeFilter !== 'all') {
        if (timeFilter === 'today') {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          params.append('dateFrom', today.toISOString())
        } else if (timeFilter === '7days') {
          const dateFrom = new Date()
          dateFrom.setDate(dateFrom.getDate() - 7)
          dateFrom.setHours(0, 0, 0, 0)
          params.append('dateFrom', dateFrom.toISOString())
        } else if (timeFilter === '30days') {
          const dateFrom = new Date()
          dateFrom.setDate(dateFrom.getDate() - 30)
          dateFrom.setHours(0, 0, 0, 0)
          params.append('dateFrom', dateFrom.toISOString())
        } else if (timeFilter === 'custom' && customStartDate) {
          const dateFrom = new Date(customStartDate)
          dateFrom.setHours(0, 0, 0, 0)
          params.append('dateFrom', dateFrom.toISOString())
          if (customEndDate) {
            const dateTo = new Date(customEndDate)
            dateTo.setHours(23, 59, 59, 999)
            params.append('dateTo', dateTo.toISOString())
          }
        }
      }

      const queryString = params.toString()
      const response = await fetch(`/api/teacher/students${queryString ? `?${queryString}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        // API already filters by class and date, so we can use students directly
        let allStudents = data.students || []
        
        // Load additional stats for each student
        const studentsWithStats = await Promise.all(
          allStudents.map(async (student: Student) => {
            try {
              const detailsResponse = await fetch(`/api/teacher/student-details?studentId=${student.id}`, {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              })
              
              if (detailsResponse.ok) {
                const details = await detailsResponse.json()
                return {
                  ...student,
                  average_accuracy: details.average_accuracy || 0,
                  games_played: details.games_played || 0,
                  recent_quiz_results: details.quiz_results || [],
                  latest_games: (details.activity_log || []).slice(0, 5) // Get latest 5 games
                }
              }
            } catch (error) {
              console.error(`Error loading stats for student ${student.id}:`, error)
            }
            
            return {
              ...student,
              average_accuracy: 0,
              games_played: 0,
              recent_quiz_results: [],
              latest_games: []
            }
          })
        )

        setStudents(studentsWithStats)
        
        // Load TTS access for all students (if PRO teacher)
        if (isProTeacher && studentsWithStats.length > 0) {
          loadTTSAccess(studentsWithStats.map(s => s.id))
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Could not load students' })
      }
    } catch (error) {
      console.error('Error loading students:', error)
      setMessage({ type: 'error', text: 'Could not load students' })
    } finally {
      setLoading(false)
    }
  }

  const loadStudentDetails = async (studentId: string) => {
    try {
      setDetailsLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch(`/api/teacher/student-details?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      console.log('📊 Student Details API Response:', {
        ok: response.ok,
        status: response.status,
        quiz_results_count: data.quiz_results?.length || 0
      })
      
      if (data.quiz_results && data.quiz_results.length > 0) {
        console.log('📊 Quiz Results Details:', data.quiz_results.map((q: any) => ({
          word_set_title: q.word_set_title,
          score: q.score,
          total: q.total,
          accuracy: q.accuracy,
          completed_at: q.completed_at,
          has_word_details: !!(q.word_details && q.word_details.length > 0),
          word_details_count: q.word_details?.length || 0,
          word_details: q.word_details || null
        })))
      } else {
        console.log('📊 No quiz results found')
      }

      if (response.ok) {
        setStudentDetails(data)
      } else {
        console.error('📊 Student Details API Error:', data)
        setMessage({ type: 'error', text: data.error || 'Could not load student details' })
      }
    } catch (error) {
      console.error('Error loading student details:', error)
      setMessage({ type: 'error', text: 'Could not load student details' })
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId)
    setStudents([]) // Clear current students
    // Save selected class to localStorage
    if (classId) {
      localStorage.setItem('teacher_last_selected_class', classId)
      await loadStudents(classId)
    } else {
      localStorage.removeItem('teacher_last_selected_class')
    }
  }


  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleResizeStart = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault()
    setResizingColumn(column)
    const startX = e.clientX
    const startWidth = columnWidths[column]

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newWidth = Math.max(100, startWidth + diff) // Minimum width 100px
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [columnWidths])

  const getGameIcon = (gameType: string) => {
    // Normalize game type names (handle variations)
    const normalized = gameType?.toLowerCase().trim()
    
    switch (normalized) {
      case 'flashcards': return BookOpen
      case 'match':
      case 'matching': return Brain
      case 'typing': return Keyboard
      case 'translate': return Globe
      case 'connect': return Target
      case 'storygap':
      case 'story_gap':
      case 'story':
      case 'sentence_gap': return FileText
      case 'roulette': return Target
      case 'choice':
      case 'multiple_choice': return CheckSquare
      case 'spellcasting':
      case 'spell_slinger': return Sparkles
      case 'quiz': return BarChart3
      case 'daily_quest': return Award
      case 'pronunciation': return Users
      default: return Gamepad2
    }
  }

  const getGameName = (gameType: string) => {
    // Normalize game type names (handle variations)
    const normalized = gameType?.toLowerCase().trim()
    
    switch (normalized) {
      case 'flashcards': return 'Flashcards'
      case 'match':
      case 'matching': return 'Word Match'
      case 'typing': return 'Typing Challenge'
      case 'translate': return 'Translation'
      case 'connect': return 'Line Match'
      case 'storygap':
      case 'story_gap':
      case 'story':
      case 'sentence_gap': return 'Story Gap'
      case 'roulette': return 'Word Roulette'
      case 'choice':
      case 'multiple_choice': return 'Multiple Choice'
      case 'spellcasting':
      case 'spell_slinger': return 'Spell Casting'
      case 'quiz': return 'Quiz'
      case 'daily_quest': return 'Daily Quest'
      case 'pronunciation': return 'Pronunciation'
      default: return gameType || 'Game'
    }
  }

  const getGameColor = (gameType: string) => {
    // Normalize game type names (handle variations)
    const normalized = gameType?.toLowerCase().trim()
    
    switch (normalized) {
      case 'flashcards': return 'bg-blue-100 text-blue-700'
      case 'match':
      case 'matching': return 'bg-purple-100 text-purple-700'
      case 'typing': return 'bg-green-100 text-green-700'
      case 'translate': return 'bg-indigo-100 text-indigo-700'
      case 'connect': return 'bg-orange-100 text-orange-700'
      case 'storygap':
      case 'story_gap':
      case 'story':
      case 'sentence_gap': return 'bg-pink-100 text-pink-700'
      case 'roulette': return 'bg-yellow-100 text-yellow-700'
      case 'choice':
      case 'multiple_choice': return 'bg-cyan-100 text-cyan-700'
      case 'spellcasting':
      case 'spell_slinger': return 'bg-rose-100 text-rose-700'
      case 'quiz': return 'bg-teal-100 text-teal-700'
      case 'daily_quest': return 'bg-amber-100 text-amber-700'
      case 'pronunciation': return 'bg-violet-100 text-violet-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredStudents = students
    .filter(student => {
      // Search filter only (class filtering is now handled in loadStudents)
      return student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      let aValue: any
      let bValue: any
      
      if (sortBy === 'last_activity') {
        aValue = new Date(a.last_activity).getTime()
        bValue = new Date(b.last_activity).getTime()
      } else if (sortBy === 'average_accuracy') {
        aValue = a.average_accuracy || 0
        bValue = b.average_accuracy || 0
      } else if (sortBy === 'games_played') {
        aValue = a.games_played || 0
        bValue = b.games_played || 0
      } else {
        aValue = a[sortBy]
        bValue = b[sortBy]
      }
      
      // Handle null/undefined values
      if (aValue == null) aValue = sortBy === 'name' ? '' : 0
      if (bValue == null) bValue = sortBy === 'name' ? '' : 0
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Progress</h1>
              <p className="text-gray-400">Track student progress and performance</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400">
            {students.length} {students.length !== 1 ? 'students' : 'student'}
          </div>
        </div>
        
        {checkingAccess ? null : (!hasProgressAccess || !hasQuizAccess) && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <Lock className="w-4 h-4" />
              <span>
                {!hasProgressAccess && !hasQuizAccess 
                  ? 'Progress and Quiz statistics require Pro plan.'
                  : !hasProgressAccess 
                  ? 'Progress statistics require Pro plan.'
                  : 'Quiz statistics require Pro plan.'}
              </span>
              <Link href="/pricing" className="font-semibold text-amber-300 hover:text-amber-200 ml-1">
                Upgrade →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/[0.12] rounded-xl text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/[0.12] rounded-xl text-white focus:border-amber-500/50 focus:outline-none transition-all appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="" className="bg-[#161622]">All active classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#161622]">{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => setViewMode(viewMode === 'compact' ? 'expanded' : 'compact')}
                className="px-4 py-3 bg-white/5 border border-white/[0.12] rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                title={`Switch to ${viewMode === 'compact' ? 'expanded' : 'compact'} view`}
              >
                {viewMode === 'compact' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Time Period</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setTimeFilter('today'); setShowCustomCalendar(false) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeFilter === 'today'
                    ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => { setTimeFilter('7days'); setShowCustomCalendar(false) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeFilter === '7days'
                    ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => { setTimeFilter('30days'); setShowCustomCalendar(false) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeFilter === '30days'
                    ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => { setTimeFilter('all'); setShowCustomCalendar(false) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeFilter === 'all'
                    ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => { setTimeFilter('custom'); setShowCustomCalendar(!showCustomCalendar) }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeFilter === 'custom'
                    ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Custom
              </button>
            </div>
          </div>
          {timeFilter === 'custom' && showCustomCalendar && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate || ''}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate || ''}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border backdrop-blur-sm ${
          message.type === 'success' 
            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
            : 'bg-red-500/20 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              {searchTerm ? 'No students found' : selectedClass ? 'No students in this class' : 'Select a class to see students'}
            </h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search' 
                : selectedClass
                ? 'No students have joined this class yet'
                : 'Select a class from the list above to see its students'
              }
            </p>
          </div>
        ) : viewMode === 'compact' ? (
          <div className="overflow-hidden">
            <table ref={tableRef} className="w-full border-collapse" style={{ tableLayout: 'auto', width: '100%' }}>
              <thead className="bg-white/5 border-b border-white/[0.12]">
                <tr>
                    {/* Student Column */}
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider relative select-none cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ width: columnWidths.student, minWidth: 150 }}
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Student</span>
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        {sortBy === 'name' && (
                          <span className="text-xs font-bold text-amber-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${resizingColumn === 'student' ? 'bg-amber-500' : 'hover:bg-amber-400'}`}
                        onMouseDown={(e) => handleResizeStart('student', e)}
                      />
                    </th>
                    
                    {/* XP / Level Column */}
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider relative select-none cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ width: columnWidths.xp, minWidth: 100 }}
                      onClick={() => handleSort('total_points')}
                    >
                      <div className="flex items-center gap-2">
                        <span>XP / Level</span>
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        {sortBy === 'total_points' && (
                          <span className="text-xs font-bold text-amber-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${resizingColumn === 'xp' ? 'bg-amber-500' : 'hover:bg-amber-400'}`}
                        onMouseDown={(e) => handleResizeStart('xp', e)}
                      />
                    </th>
                    
                    {/* Accuracy Column */}
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider relative select-none cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ width: columnWidths.accuracy, minWidth: 100 }}
                      onClick={() => handleSort('average_accuracy')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Accuracy</span>
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        {sortBy === 'average_accuracy' && (
                          <span className="text-xs font-bold text-amber-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${resizingColumn === 'accuracy' ? 'bg-amber-500' : 'hover:bg-amber-400'}`}
                        onMouseDown={(e) => handleResizeStart('accuracy', e)}
                      />
                    </th>
                    
                    {/* Games Played Column */}
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider relative select-none cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ width: columnWidths.games, minWidth: 80 }}
                      onClick={() => handleSort('games_played')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Games</span>
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                        {sortBy === 'games_played' && (
                          <span className="text-xs font-bold text-amber-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${resizingColumn === 'games' ? 'bg-amber-500' : 'hover:bg-amber-400'}`}
                        onMouseDown={(e) => handleResizeStart('games', e)}
                      />
                    </th>
                    
                    {/* Latest Game Column */}
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider relative select-none hover:bg-white/5 transition-colors"
                      style={{ width: columnWidths.latestGame, minWidth: 120 }}
                    >
                      <span>Latest Game</span>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${resizingColumn === 'latestGame' ? 'bg-amber-500' : 'hover:bg-amber-400'}`}
                        onMouseDown={(e) => handleResizeStart('latestGame', e)}
                      />
                    </th>
                    
                    {/* Quizzes Column - Expandable */}
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider relative select-none hover:bg-white/5 transition-colors"
                      style={{ width: columnWidths.quizzes, minWidth: 200 }}
                    >
                      <span>Latest Quiz</span>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${resizingColumn === 'quizzes' ? 'bg-amber-500' : 'hover:bg-amber-400'}`}
                        onMouseDown={(e) => handleResizeStart('quizzes', e)}
                      />
                    </th>
                    
                    {/* Actions Column */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((student) => {
                    const isQuizzesExpanded = expandedQuizzes.has(student.id)
                    const quizzesToShow = isQuizzesExpanded 
                      ? (student.recent_quiz_results || [])
                      : (student.recent_quiz_results || []).slice(0, 3)
                    
                    return (
                      <tr key={student.id} className="hover:bg-white/5 transition-colors border-b border-white/5">
                        {/* Student */}
                        <td className="px-4 py-4" style={{ width: columnWidths.student }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500">
                              {(() => {
                                const wizard = titleForLevel(student.level)
                                return wizard.image ? (
                                  <img 
                                    src={wizard.image} 
                                    alt={wizard.title || 'Wizard'} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to initial if image fails to load
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const parent = target.parentElement
                                      if (parent) {
                                        parent.innerHTML = `<span class="text-white font-semibold">${student.name.charAt(0).toUpperCase()}</span>`
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-white font-semibold">{student.name.charAt(0).toUpperCase()}</span>
                                )
                              })()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{student.name}</div>
                              <div className="text-xs text-gray-500">{formatDate(student.last_activity)}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* XP / Level */}
                        <td className="px-4 py-4" style={{ width: columnWidths.xp }}>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white">{student.total_points.toLocaleString()} XP</div>
                              <div className="text-xs text-gray-500">Level {student.level}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Accuracy */}
                        <td className="px-4 py-4" style={{ width: columnWidths.accuracy }}>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <div className="text-sm font-semibold text-white">
                              {student.average_accuracy || 0}%
                            </div>
                          </div>
                        </td>
                        
                        {/* Games Played */}
                        <td className="px-4 py-4" style={{ width: columnWidths.games }}>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <div className="text-sm font-semibold text-white">
                              {student.games_played || 0}
                            </div>
                          </div>
                        </td>
                        
                        {/* Latest Games */}
                        <td className="px-4 py-4" style={{ width: columnWidths.latestGame }}>
                          <div className="flex gap-1.5 flex-wrap">
                            {student.latest_games && student.latest_games.length > 0 ? (
                              student.latest_games.slice(0, 3).map((game, idx) => {
                                const gameType = game.game_type || 'unknown'
                                const Icon = getGameIcon(gameType)
                                const gameName = getGameName(gameType)
                                const gameColor = getGameColor(gameType)
                                
                                // Debug logging for missing game types
                                if (!game.game_type || gameType === 'unknown' || gameName === (gameType || 'Game')) {
                                  console.warn('⚠️ Unknown or missing game type in latest games:', {
                                    gameType: game.game_type,
                                    game,
                                    student: student.name
                                  })
                                }
                                
                                return (
                                  <div
                                    key={idx}
                                    className={`relative group ${gameColor} rounded-lg p-1.5 flex items-center justify-center cursor-help`}
                                    title={`${gameName} - ${game.accuracy || 0}% accuracy`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                )
                              })
                            ) : (
                              <span className="text-xs text-gray-400">No games</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Quizzes - Expandable */}
                        <td className="px-4 py-4" style={{ width: columnWidths.quizzes }}>
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1 flex-wrap">
                              {quizzesToShow.length > 0 ? (
                                quizzesToShow.map((quiz, idx) => (
                                  <div
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      quiz.accuracy >= 80
                                        ? 'bg-emerald-500/20 text-orange-400'
                                        : quiz.accuracy >= 60
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}
                                    title={`${quiz.word_set_title}: ${quiz.score}/${quiz.total} (${quiz.accuracy}%)`}
                                  >
                                    {quiz.accuracy}%
                                  </div>
                                ))
                              ) : (
                              <span className="text-xs text-gray-400">No quizzes</span>
                              )}
                            </div>
                            {student.recent_quiz_results && student.recent_quiz_results.length > 3 && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedQuizzes)
                                  if (isQuizzesExpanded) {
                                    newExpanded.delete(student.id)
                                  } else {
                                    newExpanded.add(student.id)
                                  }
                                  setExpandedQuizzes(newExpanded)
                                }}
                                className="text-xs text-amber-400 hover:text-amber-300 mt-1 self-start"
                              >
                                {isQuizzesExpanded 
                                  ? `Show less (${student.recent_quiz_results.length - 3} hidden)`
                                  : `Show ${student.recent_quiz_results.length - 3} more`
                                }
                              </button>
                            )}
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedStudent(student)
                                setShowStudentDetails(true)
                                loadStudentDetails(student.id)
                              }}
                              className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="Show details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-white/5 rounded-xl border border-white/[0.12] p-6 hover:bg-white/10 hover:border-white/[0.20] transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedStudent(student)
                    setShowStudentDetails(true)
                    loadStudentDetails(student.id)
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500">
                        {(() => {
                          const wizard = titleForLevel(student.level)
                          return wizard.image ? (
                            <img 
                              src={wizard.image} 
                              alt={wizard.title || 'Wizard'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to initial if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  parent.innerHTML = `<span class="text-white font-bold text-lg">${student.name.charAt(0).toUpperCase()}</span>`
                                }
                              }}
                            />
                          ) : (
                            <span className="text-white font-bold text-lg">{student.name.charAt(0).toUpperCase()}</span>
                          )
                        })()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{student.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 mt-1">
                          {student.class_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-gray-500">XP</span>
                      </div>
                      <div className="text-xl font-bold text-white">{student.total_points}</div>
                      <div className="text-xs text-gray-500">Level {student.level}</div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-gray-500">Accuracy</span>
                      </div>
                      <div className="text-xl font-bold text-white">{student.average_accuracy || 0}%</div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-gray-500">Games</span>
                      </div>
                      <div className="text-xl font-bold text-white">{student.games_played || 0}</div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-gray-500">Last active</span>
                      </div>
                      <div className="text-xs font-semibold text-white">{formatDate(student.last_activity)}</div>
                    </div>
                  </div>
                  
                  {student.recent_quiz_results && student.recent_quiz_results.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.12]">
                      <div className="text-xs font-semibold text-gray-400 mb-2">Latest Quiz</div>
                      <div className="flex flex-wrap gap-2">
                        {student.recent_quiz_results.map((quiz, idx) => (
                          <div
                            key={idx}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              quiz.accuracy >= 80
                                ? 'bg-emerald-500/20 text-orange-400'
                                : quiz.accuracy >= 60
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                            title={`${quiz.word_set_title}: ${quiz.score}/${quiz.total} (${quiz.accuracy}%)`}
                          >
                            <div className="font-semibold">{quiz.accuracy}%</div>
                            <div className="text-xs opacity-75 truncate max-w-[80px]">{quiz.word_set_title}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <StudentDetailsModal
          student={{
            id: selectedStudent.id,
            name: selectedStudent.name,
            email: selectedStudent.email,
            class_name: selectedStudent.class_name
          }}
          details={studentDetails}
          loading={detailsLoading}
          onClose={() => {
            setShowStudentDetails(false)
            setStudentDetails(null)
          }}
        />
      )}
    </div>
  )
}