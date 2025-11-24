'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Calendar, Gamepad2, CheckCircle2, Circle, Copy, ChevronLeft, Download, FileText, X, ArrowUpDown, ChevronUp, ChevronDown, Palette, List, Grid3x3, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import ProgressBarWithCheckpoints from '@/components/ProgressBarWithCheckpoints'

interface Participant {
  id: string
  student_name: string
  joined_at: string
  selected_blocks?: string[] | null
  blocksCount?: number
  progress: {
    game_name: string
    completed: boolean
    score: number
    rounds_completed?: number
  }[]
  quizResult?: { score: number; total: number } | null
  quizGraded?: boolean
}

interface Session {
  id: string
  session_code: string
  session_name?: string
  due_date: string
  enabled_games: string[]
  game_rounds?: { [key: string]: number }
  quiz_enabled: boolean
  quiz_grading_type: 'ai' | 'manual'
  is_active: boolean
  word_sets: {
    id: string
    title: string
  }
}

const GAME_NAMES: Record<string, string> = {
  flashcards: 'Flashcards',
  multiple_choice: 'Multiple Choice',
  memory: 'Memory',
  word_roulette: 'Word Roulette',
  sentence_gap: 'Sentence Gap',
  pronunciation: 'Pronunciation',
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sortBy, setSortBy] = useState<'progress' | 'blocks' | 'quiz' | 'name'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (sessionId) {
      loadSession()
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionId && session) {
      loadParticipants()
    }
  }, [sessionId, session])

  const loadSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          session_name,
          due_date,
          enabled_games,
          game_rounds,
          quiz_enabled,
          quiz_grading_type,
          is_active,
          word_sets(id, title)
        `)
        .eq('id', sessionId)
        .single()

      if (error) throw error
      setSession(data as Session)
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const loadParticipants = async () => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select('id, student_name, joined_at, selected_blocks')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: false })

      if (participantsError) throw participantsError

      // Load progress for each participant
      const participantsWithProgress = await Promise.all(
        (participantsData || []).map(async (participant) => {
          const { data: progressData } = await supabase
            .from('session_progress')
            .select('game_name, completed, score, rounds_completed')
            .eq('session_id', sessionId)
            .eq('participant_id', participant.id)

          // Calculate blocks count from selected_blocks
          // Filter to only count valid blocks
          const validBlocks = Array.isArray(participant.selected_blocks) 
            ? participant.selected_blocks.filter((blockId: string) => {
                return typeof blockId === 'string' && blockId.length > 0
              }).length
            : 0
          const blocksCount = validBlocks

          // Load quiz result if quiz is enabled
          let quizResult = null
          let quizGraded = false
          if (session?.quiz_enabled) {
            const { data: quizResponses } = await supabase
              .from('session_quiz_responses')
              .select('score, graded_at')
              .eq('session_id', sessionId)
              .eq('participant_id', participant.id)
            
            if (quizResponses && quizResponses.length > 0) {
              // Check if quiz is graded (for manual grading)
              if (session.quiz_grading_type === 'manual') {
                quizGraded = quizResponses.some(r => r.graded_at !== null)
              } else {
                // For AI grading, consider it graded if responses exist
                quizGraded = true
              }
              
              // For manual grading, only show result if graded
              // For AI grading, show if responses exist
              const hasGradedResponses = session.quiz_grading_type === 'manual'
                ? quizGraded
                : true
              
              if (hasGradedResponses) {
                const totalPoints = quizResponses.reduce((sum, r) => {
                  const points = r.score === 100 ? 2 : r.score === 50 ? 1 : 0
                  return sum + points
                }, 0)
                const totalPossible = quizResponses.length * 2
                quizResult = { score: totalPoints, total: totalPossible }
              }
            }
          }

          return {
            ...participant,
            progress: progressData || [],
            blocksCount,
            quizResult,
            quizGraded
          }
        })
      )

      setParticipants(participantsWithProgress as Participant[])
    } catch (error) {
      console.error('Error loading participants:', error)
    } finally {
      setLoading(false)
    }
  }

  const copySessionCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.session_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getJoinSessionLink = () => {
    if (typeof window !== 'undefined' && session) {
      return `${window.location.origin}/session/join?code=${session.session_code}`
    }
    return ''
  }

  const copyJoinSessionLink = () => {
    const link = getJoinSessionLink()
    if (link) {
      navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const getCompletedGamesCount = (participant: Participant) => {
    if (!session) return 0
    
    // Check each game to see if it's actually completed based on rounds
    return session.enabled_games.filter(gameName => {
      const gameProgress = participant.progress.find(p => p.game_name === gameName)
      if (!gameProgress) return false
      
      // Check if completed based on rounds
      const requiredRounds = session.game_rounds?.[gameName] || 1
      const roundsCompleted = gameProgress.rounds_completed || 0
      
      // Game is completed if rounds_completed >= requiredRounds
      return roundsCompleted >= requiredRounds
    }).length
  }

  // Sort participants based on selected sort option
  const sortedParticipants = useMemo(() => {
    if (!session) return participants
    
    const sorted = [...participants]
    
    switch (sortBy) {
      case 'progress':
        sorted.sort((a, b) => {
          const aProgress = getCompletedGamesCount(a) / session.enabled_games.length
          const bProgress = getCompletedGamesCount(b) / session.enabled_games.length
          return sortDirection === 'asc' ? aProgress - bProgress : bProgress - aProgress
        })
        break
      case 'blocks':
        sorted.sort((a, b) => {
          const aBlocks = a.blocksCount || 0
          const bBlocks = b.blocksCount || 0
          return sortDirection === 'asc' ? aBlocks - bBlocks : bBlocks - aBlocks
        })
        break
      case 'quiz':
        sorted.sort((a, b) => {
          const aQuiz = a.quizResult ? a.quizResult.score / a.quizResult.total : 0
          const bQuiz = b.quizResult ? b.quizResult.score / b.quizResult.total : 0
          return sortDirection === 'asc' ? aQuiz - bQuiz : bQuiz - aQuiz
        })
        break
      case 'name':
      default:
        sorted.sort((a, b) => {
          const comparison = a.student_name.localeCompare(b.student_name)
          return sortDirection === 'asc' ? comparison : -comparison
        })
        break
    }
    
    return sorted
  }, [participants, sortBy, sortDirection, session])

  const handleSort = (column: 'progress' | 'blocks' | 'quiz' | 'name') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getProgressPercentage = (participant: Participant) => {
    if (!session) return 0
    const completedCount = getCompletedGamesCount(participant)
    const totalGames = session.enabled_games.length
    return totalGames > 0 ? Math.round((completedCount / totalGames) * 100) : 0
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isExpired = () => {
    if (!session) return false
    const dueDate = new Date(session.due_date)
    const now = new Date()
    return now > dueDate
  }

  const canExport = () => {
    if (!session) return false
    const dueDate = new Date(session.due_date)
    const exportDeadline = new Date(dueDate)
    exportDeadline.setHours(exportDeadline.getHours() + 48) // 48 hours after due date
    const now = new Date()
    return now <= exportDeadline
  }

  const handleExport = async (type: 'progress' | 'quiz') => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/export?type=${type}`)
      if (!response.ok) throw new Error('Export failed')

      if (type === 'quiz') {
        // For quiz, we get HTML that can be printed/converted to PDF
        const htmlContent = await response.text()
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-${type}-${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Also open in new window for printing
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          // Wait a bit then show print dialog
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
      } else {
        // For progress, download CSV as before
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Could not export data. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  if (!session) {
    return <div className="text-center py-12 text-red-600">Session not found</div>
  }

  return (
    <div>
      <Link
        href="/teacher/sessions"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to sessions
      </Link>

      {/* Session Info */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {session.session_name || session.word_sets?.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Due: {formatDate(session.due_date)}</span>
                {isExpired() && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                    Expired
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Gamepad2 className="w-4 h-4" />
                <span>{session.enabled_games.length} games</span>
              </div>
              {session.quiz_enabled && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>Quiz: {session.quiz_grading_type === 'ai' ? 'Automatic' : 'Manual'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right ml-6">
            <div className="text-sm text-gray-600 mb-2">Session code</div>
            <div className="flex items-center gap-3">
              <button
                onClick={copySessionCode}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                <span className="text-xl font-bold font-mono">{session.session_code}</span>
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={copyJoinSessionLink}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                title="Copy join session link for Google Classroom"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Copy link</span>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {copied && (
                <p className="text-xs text-gray-600">Copied!</p>
              )}
              {linkCopied && (
                <p className="text-xs text-gray-600">Link copied!</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share the link in Google Classroom
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        {canExport() && session.quiz_enabled && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Export data:</span>
              <button
                onClick={() => handleExport('quiz')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Export quiz results
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Participants View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Participants ({participants.length})
          </h2>
          {participants.length > 0 && (
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </button>
              </div>
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-600" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'progress' | 'blocks' | 'quiz' | 'name')}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="name">Sort by name</option>
                  <option value="progress">Sort by progress</option>
                  <option value="blocks">Sort by color blocks</option>
                  {session.quiz_enabled && <option value="quiz">Sort by quiz results</option>}
                </select>
              </div>
            </div>
          )}
        </div>

        {participants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No participants yet. Share the session code with students.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* List Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Full Name
                    {sortBy === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-3">
                  <button
                    onClick={() => handleSort('blocks')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Color Blocks
                    {sortBy === 'blocks' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {session.quiz_enabled && (
                  <div className="col-span-2">
                    <button
                      onClick={() => handleSort('quiz')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      Quiz Score
                      {sortBy === 'quiz' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
                <div className={session.quiz_enabled ? "col-span-3" : "col-span-5"}>
                  <button
                    onClick={() => handleSort('progress')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Progress
                    {sortBy === 'progress' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {sortedParticipants.map((participant) => {
                const completedCount = getCompletedGamesCount(participant)
                const totalGames = session.enabled_games.length
                const progressPercentage = getProgressPercentage(participant)
                const initials = getInitials(participant.student_name)

                return (
                  <div
                    key={participant.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Full Name Column */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {participant.student_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Joined {new Date(participant.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Color Blocks Column */}
                      <div className="col-span-3">
                        {participant.blocksCount !== undefined && participant.blocksCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 font-medium">
                              {participant.blocksCount} {participant.blocksCount === 1 ? 'block' : 'blocks'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No blocks selected</span>
                        )}
                      </div>

                      {/* Quiz Score Column */}
                      {session.quiz_enabled && (
                        <div className="col-span-2">
                          {participant.quizResult ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {participant.quizResult.score}/{participant.quizResult.total}
                              </span>
                              {session.quiz_grading_type === 'manual' && isExpired() && (
                                <button
                                  onClick={() => router.push(`/teacher/sessions/${sessionId}/quiz/${participant.id}`)}
                                  className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded hover:bg-teal-100 transition-colors"
                                >
                                  {participant.quizGraded ? 'View' : 'Grade'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not completed</span>
                          )}
                        </div>
                      )}

                      {/* Progress Column */}
                      <div className={session.quiz_enabled ? "col-span-3" : "col-span-5"}>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{completedCount} / {totalGames} games</span>
                            <span className="text-gray-600 font-medium">{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                progressPercentage === 100
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : progressPercentage >= 67
                                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                                  : progressPercentage >= 34
                                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                  : 'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Grid View - Original detailed view */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedParticipants.map((participant) => {
              const completedCount = getCompletedGamesCount(participant)
              const totalGames = session.enabled_games.length

              return (
                <div
                  key={participant.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {participant.student_name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {participant.blocksCount !== undefined && participant.blocksCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                            {participant.blocksCount} color blocks
                          </span>
                        )}
                        {participant.quizResult && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                            Quiz: {participant.quizResult.score}/{participant.quizResult.total}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(participant.joined_at).toLocaleDateString('en-US')}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <ProgressBarWithCheckpoints
                      completed={completedCount}
                      total={totalGames}
                      height="md"
                    />
                  </div>

                  {/* Quiz Button - Only show if quiz is enabled, manual grading, and due date has passed */}
                  {session.quiz_enabled && session.quiz_grading_type === 'manual' && isExpired() && (
                    participant.quizGraded ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-default text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Quiz graded
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Open quiz grading page
                          router.push(`/teacher/sessions/${sessionId}/quiz/${participant.id}`)
                        }}
                        className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Grade Quiz
                      </button>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

