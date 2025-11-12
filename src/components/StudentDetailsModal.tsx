'use client'

import { useState } from 'react'
import { Trophy, Target, Award, Clock, BarChart3, X, Flame, Star, Calendar, Zap, BookOpen } from 'lucide-react'

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

interface Props {
  student: {
    id: string
    name: string
    email: string
    class_name: string
  }
  details: StudentDetailedStats | null
  loading: boolean
  onClose: () => void
  onAction?: (action: string) => void
  actionLoading?: boolean
}

export default function StudentDetailsModal({
  student,
  details,
  loading,
  onClose
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quiz'>('overview')
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'bg-gray-100 text-gray-700',
      uncommon: 'bg-green-100 text-green-700',
      rare: 'bg-blue-100 text-blue-700',
      epic: 'bg-purple-100 text-purple-700',
      legendary: 'bg-yellow-100 text-yellow-700'
    }
    return colors[rarity] || colors.common
  }

  const getGameName = (gameType: string) => {
    const names: Record<string, string> = {
      flashcards: 'Flashcards',
      match: 'Memory Game',
      typing: 'Typing Challenge',
      translate: 'Translate Game',
      connect: 'Line Matching',
      choice: 'Multiple Choice',
      story_gap: 'Sentence Gap',
      roulette: 'Word Roulette',
      spellcasting: 'Spell Slinger',
      spellslinger: 'Spell Slinger'
    }
    return names[gameType] || gameType
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
        {/* Modern Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Star className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-600">{student.email}</span>
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{student.class_name}</span>
                {details && (
                  <>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <span className="text-sm font-semibold text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 text-white px-3 py-1 rounded-lg">Level {details.level}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex border-b border-gray-200 bg-white shrink-0">
          {[
            { id: 'overview', label: 'Allmän Info', icon: BarChart3 },
            { id: 'quiz', label: 'Quiz', icon: BookOpen }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 font-medium transition-all text-sm border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto bg-slate-50">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Loading student details...</p>
            </div>
          ) : !details ? (
            <div className="text-center py-16">
              <p className="text-slate-600 font-medium">Failed to load student details</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB - Minimalist General Info */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Stats - Minimalist Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Overall Accuracy */}
                    <div className="bg-white rounded-lg p-5 border-2 border-green-200 hover:border-green-300 transition-all">
                      <div className="text-sm text-gray-600 mb-1 font-medium">Overall Accuracy</div>
                      <div className="text-3xl font-bold text-gray-900">{details.average_accuracy}%</div>
                    </div>

                    {/* Total Sessions */}
                    <div className="bg-white rounded-lg p-5 border-2 border-blue-200 hover:border-blue-300 transition-all">
                      <div className="text-sm text-gray-600 mb-1 font-medium">Total Sessions</div>
                      <div className="text-3xl font-bold text-gray-900">{details.games_played}</div>
                    </div>

                    {/* Level */}
                    <div className="bg-white rounded-lg p-5 border-2 border-purple-200 hover:border-purple-300 transition-all">
                      <div className="text-sm text-gray-600 mb-1 font-medium">Level</div>
                      <div className="text-3xl font-bold text-gray-900">{details.level}</div>
                    </div>

                    {/* Total XP */}
                    <div className="bg-white rounded-lg p-5 border-2 border-orange-200 hover:border-orange-300 transition-all">
                      <div className="text-sm text-gray-600 mb-1 font-medium">Total XP</div>
                      <div className="text-3xl font-bold text-gray-900">{details.total_xp.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Recent Sessions (Latest 3) */}
                  {details.activity_log.length > 0 && (
                    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Senaste Sessions</h3>
                      <div className="space-y-3">
                        {details.activity_log.slice(0, 3).map((session, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                                   style={{ backgroundColor: index === 0 ? '#3B82F6' : index === 1 ? '#10B981' : '#8B5CF6' }}>
                                {getGameName(session.game_type).charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{getGameName(session.game_type)}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(session.played_at)}
                                </div>
                              </div>
                            </div>
                            <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                              session.accuracy >= 80 ? 'bg-green-100 text-green-700 border border-green-200' :
                              session.accuracy >= 60 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                              'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {session.accuracy}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ TAB - Minimalist with Expandable Details */}
              {activeTab === 'quiz' && (
                <div className="h-full">
                  {details.quiz_results.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-semibold text-lg mb-2">Inga quiz slutförda ännu</p>
                      <p className="text-gray-500 text-sm">Quiz-resultat kommer att visas här</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {details.quiz_results.map((quiz, index) => {
                        // Use unique id combining word_set_id and completed_at for expand functionality
                        const quizUniqueId = quiz.quiz_id || `${quiz.word_set_id || 'unknown'}-${quiz.completed_at}`
                        const isExpanded = expandedQuiz === quizUniqueId
                        const hasDetails = quiz.word_details && quiz.word_details.length > 0
                        
                        // Debug logging
                        if (index === 0) {
                          console.log('📊 Quiz Details Debug - First Quiz:', {
                            quiz_id: quiz.quiz_id,
                            word_set_title: quiz.word_set_title,
                            score: quiz.score,
                            total: quiz.total,
                            has_word_details: !!quiz.word_details,
                            word_details_length: quiz.word_details?.length || 0,
                            word_details_type: typeof quiz.word_details,
                            word_details_is_array: Array.isArray(quiz.word_details),
                            word_details_sample: quiz.word_details?.[0] || null,
                            full_quiz_object: quiz
                          })
                        }
                        
                        // Categorize words
                        const correctWords = hasDetails ? quiz.word_details.filter(w => w.verdict === 'correct') : []
                        const partialWords = hasDetails ? quiz.word_details.filter(w => w.verdict === 'partial') : []
                        const wrongWords = hasDetails ? quiz.word_details.filter(w => w.verdict === 'wrong') : []
                        const emptyWords = hasDetails ? quiz.word_details.filter(w => w.verdict === 'empty') : []
                        
                        return (
                          <div
                            key={quizUniqueId}
                            className={`bg-white rounded-lg border-2 transition-all ${
                              hasDetails 
                                ? 'border-indigo-200 hover:border-indigo-400 hover:shadow-md cursor-pointer' 
                                : 'border-gray-200 cursor-default'
                            }`}
                            onClick={() => {
                              if (hasDetails) {
                                setExpandedQuiz(isExpanded ? null : quizUniqueId)
                              }
                            }}
                          >
                            {/* Quiz Header - Always Visible */}
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">{quiz.word_set_title}</h4>
                                <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                                  quiz.accuracy >= 80 ? 'bg-green-100 text-green-700 border border-green-200' :
                                  quiz.accuracy >= 60 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                  'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {quiz.accuracy}%
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="text-sm text-gray-600 mb-1">Poäng</div>
                                  <div className="text-2xl font-bold text-gray-900">{quiz.score}/{quiz.total}</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="text-sm text-gray-600 mb-1">Accuracy</div>
                                  <div className="text-2xl font-bold text-gray-900">{quiz.accuracy}%</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="text-sm text-gray-600 mb-1">Datum</div>
                                  <div className="text-xs font-medium text-gray-900">{formatDate(quiz.completed_at)}</div>
                                </div>
                              </div>
                              
                              {/* Expand Button for Details */}
                              {hasDetails && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedQuiz(isExpanded ? null : quizUniqueId)
                                  }}
                                  className="w-full py-3 text-sm font-semibold text-indigo-700 hover:text-white border-2 border-indigo-300 rounded-lg hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md"
                                >
                                  {isExpanded ? '▲ Dölj detaljer' : '▼ Visa detaljer per ord'}
                                </button>
                              )}
                              {!hasDetails && (
                                <div className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                                  Ingen detaljerad feedback tillgänglig för detta quiz
                                </div>
                              )}
                            </div>
                            
                            {/* Expanded Word Details */}
                            {isExpanded && hasDetails && (
                              <div className="border-t-2 border-indigo-100 p-5 bg-gray-50">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                  <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-lg font-bold text-green-700">{correctWords.length}</div>
                                    <div className="text-xs text-green-600">Rätt</div>
                                  </div>
                                  <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="text-lg font-bold text-yellow-700">{partialWords.length}</div>
                                    <div className="text-xs text-yellow-600">Nästan</div>
                                  </div>
                                  <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                                    <div className="text-lg font-bold text-red-700">{wrongWords.length}</div>
                                    <div className="text-xs text-red-600">Fel</div>
                                  </div>
                                  <div className="text-center p-2 bg-gray-100 rounded-lg border border-gray-300">
                                    <div className="text-lg font-bold text-gray-700">{emptyWords.length}</div>
                                    <div className="text-xs text-gray-600">Tomt</div>
                                  </div>
                                </div>
                                
                                {/* Word-by-word List */}
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {quiz.word_details.map((word, wordIndex) => (
                                    <div
                                      key={wordIndex}
                                      className={`p-3 rounded-lg border-2 ${
                                        word.verdict === 'correct' ? 'bg-green-50 border-green-200' :
                                        word.verdict === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                                        word.verdict === 'wrong' ? 'bg-red-50 border-red-200' :
                                        'bg-gray-50 border-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="font-semibold text-gray-900 mb-1">{word.prompt}</div>
                                          <div className="text-sm text-gray-600">
                                            <span className="font-medium">Förväntat: </span>
                                            <span className="text-gray-900">{word.expected}</span>
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            <span className="font-medium">Svar: </span>
                                            <span className={word.given ? 'text-gray-900' : 'text-gray-400 italic'}>
                                              {word.given || '(tomt)'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className={`text-xs font-semibold px-2 py-1 rounded ${
                                          word.verdict === 'correct' ? 'bg-green-100 text-green-700' :
                                          word.verdict === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                          word.verdict === 'wrong' ? 'bg-red-100 text-red-700' :
                                          'bg-gray-200 text-gray-700'
                                        }`}>
                                          {word.verdict === 'correct' ? 'Rätt' :
                                           word.verdict === 'partial' ? 'Nästan' :
                                           word.verdict === 'wrong' ? 'Fel' : 'Tomt'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>

      </div>
    </div>
  )
}

