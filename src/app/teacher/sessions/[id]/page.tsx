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
  }[]
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
      
      // Transform data to match Session interface
      // word_sets comes as an array from Supabase join
      const transformedData: Session = {
        ...data,
        word_sets: Array.isArray(data.word_sets) ? data.word_sets : []
      }
      
      setSession(transformedData)
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-red-400">Session hittades inte</p>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/teacher/sessions"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Tillbaka till sessioner
      </Link>

      {/* Session Info */}
      <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-3">
              {session.session_name || (session.word_sets && session.word_sets.length > 0 ? session.word_sets[0].title : 'Session')}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Slutdatum: {formatDate(session.due_date)}</span>
                {isExpired() && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs font-medium">
                    Passerat
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Gamepad2 className="w-4 h-4 text-cyan-400" />
                <span>{session.enabled_games.length} spel</span>
              </div>
              {session.quiz_enabled && (
                <div className="flex items-center gap-2 text-gray-400">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span>Quiz: {session.quiz_grading_type === 'ai' ? 'AI-rättning' : 'Manuell'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-sm text-gray-400 mb-2">Sessionskod</div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={copySessionCode}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20"
              >
                <span className="text-xl font-bold font-mono">{session.session_code}</span>
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={copyJoinSessionLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/10"
                title="Kopiera länk för Google Classroom"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Kopiera länk</span>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {copied && (
                <p className="text-xs text-emerald-400">Kopierat!</p>
              )}
              {linkCopied && (
                <p className="text-xs text-emerald-400">Länk kopierad!</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dela länken i Google Classroom
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        {canExport() && session.quiz_enabled && (
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Exportera data:</span>
              <button
                onClick={() => handleExport('quiz')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl transition-all text-sm font-medium shadow-lg shadow-amber-500/20"
              >
                Exportera quizresultat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Participants View */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-white">
            Deltagare ({participants.length})
          </h2>
          {participants.length > 0 && (
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'grid'
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Rutnät
                </button>
              </div>
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'progress' | 'blocks' | 'quiz' | 'name')}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none cursor-pointer"
                >
                  <option value="name" className="bg-[#1a1a2e]">Sortera på namn</option>
                  <option value="progress" className="bg-[#1a1a2e]">Sortera på framsteg</option>
                  <option value="blocks" className="bg-[#1a1a2e]">Sortera på färgblock</option>
                  {session.quiz_enabled && <option value="quiz" className="bg-[#1a1a2e]">Sortera på quizresultat</option>}
                </select>
              </div>
            </div>
          )}
        </div>

        {participants.length === 0 ? (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">Inga deltagare ännu. Dela sessionskoden med elever.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {/* List Header */}
            <div className="bg-white/5 border-b border-white/10 px-6 py-3">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    Namn
                    {sortBy === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-3">
                  <button
                    onClick={() => handleSort('blocks')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    Färgblock
                    {sortBy === 'blocks' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {session.quiz_enabled && (
                  <div className="col-span-2">
                    <button
                      onClick={() => handleSort('quiz')}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                      Quizpoäng
                      {sortBy === 'quiz' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
                <div className={session.quiz_enabled ? "col-span-3" : "col-span-5"}>
                  <button
                    onClick={() => handleSort('progress')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                  >
                    Framsteg
                    {sortBy === 'progress' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-white/5">
              {sortedParticipants.map((participant) => {
                const completedCount = getCompletedGamesCount(participant)
                const totalGames = session.enabled_games.length
                const progressPercentage = getProgressPercentage(participant)
                const initials = getInitials(participant.student_name)

                return (
                  <div
                    key={participant.id}
                    className="px-6 py-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Full Name Column */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-amber-500/20">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {participant.student_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Gick med {new Date(participant.joined_at).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Color Blocks Column */}
                      <div className="col-span-3">
                        {participant.blocksCount !== undefined && participant.blocksCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-gray-300 font-medium">
                              {participant.blocksCount} {participant.blocksCount === 1 ? 'block' : 'block'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Inga block valda</span>
                        )}
                      </div>

                      {/* Quiz Score Column */}
                      {session.quiz_enabled && (
                        <div className="col-span-2">
                          {participant.quizResult ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">
                                {participant.quizResult.score}/{participant.quizResult.total}
                              </span>
                              {session.quiz_grading_type === 'manual' && isExpired() && (
                                <button
                                  onClick={() => router.push(`/teacher/sessions/${sessionId}/quiz/${participant.id}`)}
                                  className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                                >
                                  {participant.quizGraded ? 'Visa' : 'Rätta'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Ej klar</span>
                          )}
                        </div>
                      )}

                      {/* Progress Column */}
                      <div className={session.quiz_enabled ? "col-span-3" : "col-span-5"}>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{completedCount} / {totalGames} spel</span>
                            <span className="text-gray-400 font-medium">{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                progressPercentage === 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                  : progressPercentage >= 67
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  : progressPercentage >= 34
                                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                                  : 'bg-gradient-to-r from-red-500 to-rose-500'
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
                  className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 hover:bg-white/10 transition-all"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-white">
                        {participant.student_name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {participant.blocksCount !== undefined && participant.blocksCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-lg font-medium">
                            {participant.blocksCount} block
                          </span>
                        )}
                        {participant.quizResult && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-lg font-medium">
                            Quiz: {participant.quizResult.score}/{participant.quizResult.total}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Gick med: {new Date(participant.joined_at).toLocaleDateString('sv-SE')}
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
                        className="w-full px-4 py-2 bg-white/5 text-gray-500 rounded-xl cursor-default text-sm font-medium flex items-center justify-center gap-2 border border-white/10"
                      >
                        <FileText className="w-4 h-4" />
                        Quiz rättat
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Open quiz grading page
                          router.push(`/teacher/sessions/${sessionId}/quiz/${participant.id}`)
                        }}
                        className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        <FileText className="w-4 h-4" />
                        Rätta quiz
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

