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
    return new Date(dateString).toLocaleDateString('en-US', {
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
      common: 'bg-gray-500/20 text-gray-400',
      uncommon: 'bg-emerald-500/20 text-emerald-400',
      rare: 'bg-blue-500/20 text-blue-400',
      epic: 'bg-purple-500/20 text-purple-400',
      legendary: 'bg-amber-500/20 text-amber-400'
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
    }
    return names[gameType] || gameType
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 pt-24">
      <div className="bg-[#161622] rounded-3xl max-w-6xl w-full h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-white/[0.12]">
        {/* Modern Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.12] bg-[#161622] shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Star className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{student.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm font-medium text-gray-300 bg-white/5 px-2 py-1 rounded-lg">{student.class_name}</span>
                {details && (
                  <>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    <span className="text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1 rounded-lg">Level {details.level}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 border border-white/[0.12]"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex border-b border-white/[0.12] bg-[#161622] shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'quiz', label: 'Quiz', icon: BookOpen }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 font-medium transition-all text-sm border-b-2 ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto bg-[#161622] custom-scrollbar">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-500/30 border-t-amber-500 mx-auto mb-4"></div>
              <p className="text-gray-400 font-medium">Loading student details...</p>
            </div>
          ) : !details ? (
            <div className="text-center py-16">
              <p className="text-gray-400 font-medium">Could not load student details</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB - Minimalist General Info */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Stats - Dark Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Overall Accuracy */}
                    <div className="bg-white/5 rounded-xl p-5 border border-emerald-500/30 hover:border-emerald-500/50 transition-all">
                      <div className="text-sm text-gray-400 mb-1 font-medium">Accuracy</div>
                      <div className="text-3xl font-bold text-emerald-400">{details.average_accuracy}%</div>
                    </div>

                    {/* Total Sessions */}
                    <div className="bg-white/5 rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/50 transition-all">
                      <div className="text-sm text-gray-400 mb-1 font-medium">Total Sessions</div>
                      <div className="text-3xl font-bold text-cyan-400">{details.games_played}</div>
                    </div>

                    {/* Level */}
                    <div className="bg-white/5 rounded-xl p-5 border border-violet-500/30 hover:border-violet-500/50 transition-all">
                      <div className="text-sm text-gray-400 mb-1 font-medium">Level</div>
                      <div className="text-3xl font-bold text-violet-400">{details.level}</div>
                    </div>

                    {/* Total XP */}
                    <div className="bg-white/5 rounded-xl p-5 border border-amber-500/30 hover:border-amber-500/50 transition-all">
                      <div className="text-sm text-gray-400 mb-1 font-medium">Total XP</div>
                      <div className="text-3xl font-bold text-amber-400">{details.total_xp.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Recent Sessions (Latest 3) */}
                  {details.activity_log.length > 0 && (
                    <div className="bg-white/5 rounded-xl border border-white/[0.12] p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
                      <div className="space-y-3">
                        {details.activity_log.slice(0, 3).map((session, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                                   style={{ backgroundColor: index === 0 ? '#3B82F6' : index === 1 ? '#10B981' : '#8B5CF6' }}>
                                {getGameName(session.game_type).charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{getGameName(session.game_type)}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(session.played_at)}
                                </div>
                              </div>
                            </div>
                            <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                              session.accuracy >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                              session.accuracy >= 60 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
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
                      <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/[0.12]">
                        <BookOpen className="w-12 h-12 text-gray-500" />
                      </div>
                      <p className="text-white font-semibold text-lg mb-2">No quizzes completed yet</p>
                      <p className="text-gray-500 text-sm">Quiz results will be displayed here</p>
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
                        const correctWords = hasDetails && quiz.word_details ? quiz.word_details.filter(w => w.verdict === 'correct') : []
                        const partialWords = hasDetails && quiz.word_details ? quiz.word_details.filter(w => w.verdict === 'partial') : []
                        const wrongWords = hasDetails && quiz.word_details ? quiz.word_details.filter(w => w.verdict === 'wrong') : []
                        const emptyWords = hasDetails && quiz.word_details ? quiz.word_details.filter(w => w.verdict === 'empty') : []
                        
                        return (
                          <div
                            key={quizUniqueId}
                            className={`bg-white/5 rounded-xl border transition-all ${
                              hasDetails 
                                ? 'border-amber-500/30 hover:border-amber-500/50 cursor-pointer' 
                                : 'border-white/[0.12] cursor-default'
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
                                <h4 className="text-lg font-semibold text-white">{quiz.word_set_title}</h4>
                                <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                                  quiz.accuracy >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                  quiz.accuracy >= 60 ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {quiz.accuracy}%
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                  <div className="text-sm text-gray-400 mb-1">Score</div>
                                  <div className="text-2xl font-bold text-white">{quiz.score}/{quiz.total}</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                  <div className="text-sm text-gray-400 mb-1">Accuracy</div>
                                  <div className="text-2xl font-bold text-white">{quiz.accuracy}%</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                  <div className="text-sm text-gray-400 mb-1">Date</div>
                                  <div className="text-xs font-medium text-white">{formatDate(quiz.completed_at)}</div>
                                </div>
                              </div>
                              
                              {/* Expand Button for Details */}
                              {hasDetails && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedQuiz(isExpanded ? null : quizUniqueId)
                                  }}
                                  className="w-full py-3 text-sm font-semibold text-amber-400 hover:text-white border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all"
                                >
                                  {isExpanded ? '▲ Hide details' : '▼ Show details per word'}
                                </button>
                              )}
                              {!hasDetails && (
                                <div className="text-xs text-gray-500 text-center py-3 bg-white/5 rounded-xl border border-white/5">
                                  No detailed feedback available for this quiz
                                </div>
                              )}
                            </div>
                            
                            {/* Expanded Word Details */}
                            {isExpanded && hasDetails && quiz.word_details && (
                              <div className="border-t border-white/[0.12] p-5 bg-white/5">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                  <div className="text-center p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <div className="text-lg font-bold text-emerald-400">{correctWords.length}</div>
                                    <div className="text-xs text-emerald-500">Correct</div>
                                  </div>
                                  <div className="text-center p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <div className="text-lg font-bold text-amber-400">{partialWords.length}</div>
                                    <div className="text-xs text-amber-500">Partial</div>
                                  </div>
                                  <div className="text-center p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <div className="text-lg font-bold text-red-400">{wrongWords.length}</div>
                                    <div className="text-xs text-red-500">Wrong</div>
                                  </div>
                                  <div className="text-center p-2 bg-white/5 rounded-xl border border-white/10">
                                    <div className="text-lg font-bold text-gray-400">{emptyWords.length}</div>
                                    <div className="text-xs text-gray-500">Empty</div>
                                  </div>
                                </div>
                                
                                {/* Word-by-word List */}
                                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                  {quiz.word_details.map((word, wordIndex) => (
                                    <div
                                      key={wordIndex}
                                      className={`p-3 rounded-xl border ${
                                        word.verdict === 'correct' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                        word.verdict === 'partial' ? 'bg-amber-500/10 border-amber-500/20' :
                                        word.verdict === 'wrong' ? 'bg-red-500/10 border-red-500/20' :
                                        'bg-white/5 border-white/10'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="font-semibold text-white mb-1">{word.prompt}</div>
                                          <div className="text-sm text-gray-400">
                                            <span className="font-medium">Expected: </span>
                                            <span className="text-gray-300">{word.expected}</span>
                                          </div>
                                          <div className="text-sm text-gray-400">
                                            <span className="font-medium">Answer: </span>
                                            <span className={word.given ? 'text-gray-300' : 'text-gray-500 italic'}>
                                              {word.given || '(empty)'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                          word.verdict === 'correct' ? 'bg-emerald-500/20 text-emerald-400' :
                                          word.verdict === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                                          word.verdict === 'wrong' ? 'bg-red-500/20 text-red-400' :
                                          'bg-white/10 text-gray-400'
                                        }`}>
                                          {word.verdict === 'correct' ? 'Correct' :
                                           word.verdict === 'partial' ? 'Partial' :
                                           word.verdict === 'wrong' ? 'Wrong' : 'Empty'}
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

