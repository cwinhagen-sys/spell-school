'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { SESSION_GAMES, sortGamesByRecommendedOrder } from '@/lib/session-games'

interface WordSet {
  id: string
  title: string
}

export default function CreateSessionPage() {
  const router = useRouter()
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [sessionName, setSessionName] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [gameRounds, setGameRounds] = useState<{ [key: string]: number }>({}) // Number of rounds per game
  const [quizEnabled, setQuizEnabled] = useState(false)
  const [quizGradingType, setQuizGradingType] = useState<'ai' | 'manual'>('ai')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWordSets()
  }, [])

  const loadWordSets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('word_sets')
        .select('id, title')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWordSets(data || [])
    } catch (error) {
      console.error('Error loading word sets:', error)
      setError('Could not load word sets')
    }
  }

  const toggleGame = (gameId: string) => {
    setSelectedGames(prev => {
      if (prev.includes(gameId)) {
        // Remove game and its rounds setting
        const newRounds = { ...gameRounds }
        delete newRounds[gameId]
        setGameRounds(newRounds)
        return prev.filter(id => id !== gameId)
      } else {
        // Add game with default 1 round
        setGameRounds(prev => ({ ...prev, [gameId]: 1 }))
        return [...prev, gameId]
      }
    })
  }

  const updateGameRounds = (gameId: string, rounds: number) => {
    if (rounds < 1) rounds = 1
    if (rounds > 10) rounds = 10
    setGameRounds(prev => ({ ...prev, [gameId]: rounds }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedWordSet) {
      setError('Select a word set')
      setLoading(false)
      return
    }

    if (!sessionName.trim()) {
      setError('Enter a name for the session')
      setLoading(false)
      return
    }

    if (!dueDate) {
      setError('Select a due date')
      setLoading(false)
      return
    }

    if (selectedGames.length === 0) {
      setError('Select at least one game')
      setLoading(false)
      return
    }

    // Validate due date (max 2 weeks, but allow today for testing)
    const due = new Date(dueDate)
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Set to start of today for comparison
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)

    // Allow today and future dates up to 2 weeks (for testing, allow today)
    if (due < now || due > maxDate) {
      // Check if it's within 1 hour of today (for testing purposes)
      const todayStart = new Date(now)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)
      
      if (due >= todayStart && due <= todayEnd) {
        // Allow today for testing
      } else if (due > maxDate) {
        setError('Due date must be within 2 weeks from today')
        setLoading(false)
        return
      } else {
        // Allow dates in the past for testing (just warn)
        console.warn('⚠️ Creating session with past due date (for testing)')
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You are not logged in')
        setLoading(false)
        return
      }

      // Generate session code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_session_code')

      if (codeError) throw codeError

      const sessionCode = codeData

      // Build game_rounds object (default to 1 if not specified)
      // Sort games by recommended order before saving
      const sortedGames = sortGamesByRecommendedOrder(selectedGames)
      const roundsObj: { [key: string]: number } = {}
      sortedGames.forEach(gameId => {
        roundsObj[gameId] = gameRounds[gameId] || 1
      })

      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          teacher_id: user.id,
          word_set_id: selectedWordSet,
          session_name: sessionName.trim(),
          session_code: sessionCode,
          due_date: due.toISOString(),
          enabled_games: sortedGames, // Save in recommended order
          game_rounds: roundsObj,
          quiz_enabled: quizEnabled,
          quiz_grading_type: quizEnabled ? quizGradingType : 'ai',
          is_active: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/teacher/sessions/${data.id}`)
    } catch (error: any) {
      console.error('Error creating session:', error)
      setError(error.message || 'Could not create session')
    } finally {
      setLoading(false)
    }
  }

  const getMinDate = () => {
    // Allow today and past dates for testing
    const today = new Date()
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 7) // Allow up to 7 days in the past for testing
    return pastDate.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)
    return maxDate.toISOString().split('T')[0]
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

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create new session</h1>
        <p className="text-gray-600 mb-8">Select word set, date, and games for the session</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-6">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session name *
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="E.g. 'English vocabulary week 42'"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Word Set Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select word set *
            </label>
            {wordSets.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                You don't have any word sets yet. <Link href="/teacher/word-sets" className="underline font-medium">Create a word set first</Link>
              </div>
            ) : (
              <select
                value={selectedWordSet}
                onChange={(e) => setSelectedWordSet(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select word set...</option>
                {wordSets.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due date * (max 2 weeks)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Game Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select games * (at least one)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Games are sorted by recommended order. You can select any of them.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {SESSION_GAMES.map((game) => (
                <div
                  key={game.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedGames.includes(game.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleGame(game.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {selectedGames.includes(game.id) && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                          )}
                          <span className="text-xl">{game.icon}</span>
                          <h3 className="font-semibold text-gray-900">{game.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{game.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {game.keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Recommended position: {game.recommendedOrder}
                        </p>
                      </div>
                    </div>
                  </button>
                  {selectedGames.includes(game.id) && (
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Number of rounds (1-10):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={gameRounds[game.id] || 1}
                          onChange={(e) => updateGameRounds(game.id, parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-xs text-gray-500">
                          {(gameRounds[game.id] || 1) === 1 ? 'round' : 'rounds'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quiz Options */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                id="quizEnabled"
                checked={quizEnabled}
                onChange={(e) => {
                  setQuizEnabled(e.target.checked)
                  if (!e.target.checked) {
                    setQuizGradingType('ai')
                  }
                }}
                className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label htmlFor="quizEnabled" className="block text-sm font-medium text-gray-700 cursor-pointer">
                  Quiz on due date
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Students can take a quiz when the session expires
                </p>
              </div>
            </div>

            {quizEnabled && (
              <div className="ml-8 space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grading method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="quizGradingType"
                      value="ai"
                      checked={quizGradingType === 'ai'}
                      onChange={(e) => setQuizGradingType(e.target.value as 'ai' | 'manual')}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Automatic grading (AI)</span>
                      <p className="text-xs text-gray-500">Quiz is automatically graded with AI</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="quizGradingType"
                      value="manual"
                      checked={quizGradingType === 'manual'}
                      onChange={(e) => setQuizGradingType(e.target.value as 'ai' | 'manual')}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Manual grading</span>
                      <p className="text-xs text-gray-500">You grade the quiz yourself and see exactly what students wrote</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Link
              href="/teacher/sessions"
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || wordSets.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? 'Creating...' : 'Create session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

