'use client'

import { CheckCircle2, X, BookOpen, CheckSquare, Brain, Scissors, FileText, Globe, Mic, Target, Lock, Trophy, BarChart3, Star, Sparkles, Play, RotateCcw } from 'lucide-react'
import { getGameMetadata } from '@/lib/session-games'

interface GameMetadata {
  name: string
  icon: string
  keywords?: string[]
}

interface GameProgress {
  game_name: string
  completed: boolean
  score: number
  rounds_completed?: number
}

interface QuizResult {
  score: number
  total: number
  percentage: number
}

interface QuizDetail {
  word_en: string
  word_sv: string
  student_answer: string
  score: number
}

interface GameSelectionUIProps {
  enabledGames: string[]
  progress: GameProgress[]
  gameRounds?: { [key: string]: number }
  quizEnabled: boolean
  quizResult: QuizResult | null
  quizDetails: QuizDetail[]
  showQuizDetails: boolean
  allGamesCompleted: boolean
  isQuizUnlocked: boolean
  quizSubmitted?: boolean
  quizGraded?: boolean
  onChangeBlocks: () => void
  onExitSession: () => void
  onSelectGame: (gameIndex: number, gameId: string) => void
  onQuizClick: () => void
  onQuizDetailsClick: () => Promise<void>
  onCloseQuizDetails: () => void
}

// Map game IDs to Lucide icons
const getGameIconComponent = (gameId: string) => {
  switch (gameId) {
    case 'flashcards':
      return BookOpen
    case 'multiple_choice':
      return CheckSquare
    case 'memory':
      return Brain
    case 'word_scramble':
      return Scissors
    case 'sentence_gap':
      return FileText
    case 'translate':
      return Globe
    case 'flashcards_test':
      return Mic
    case 'word_roulette':
      return Target
    default:
      return BookOpen
  }
}

// Get vibrant gradient for each game
const getGameGradient = (gameIndex: number) => {
  const gradients = [
    { from: '#ec4899', to: '#f59e0b', shadow: '#ec489950' }, // pink to amber
    { from: '#8b5cf6', to: '#6366f1', shadow: '#8b5cf650' }, // violet to indigo
    { from: '#14b8a6', to: '#06b6d4', shadow: '#14b8a650' }, // teal to cyan
    { from: '#3b82f6', to: '#2563eb', shadow: '#3b82f650' }, // blue
    { from: '#22c55e', to: '#10b981', shadow: '#22c55e50' }, // green to emerald
    { from: '#f97316', to: '#ef4444', shadow: '#f9731650' }, // orange to red
    { from: '#a855f7', to: '#d946ef', shadow: '#a855f750' }, // purple to fuchsia
    { from: '#0ea5e9', to: '#6366f1', shadow: '#0ea5e950' }, // sky to indigo
  ]
  return gradients[gameIndex % gradients.length]
}

export default function GameSelectionUI({
  enabledGames,
  progress,
  gameRounds = {},
  quizEnabled,
  quizResult,
  quizDetails,
  showQuizDetails,
  allGamesCompleted,
  isQuizUnlocked,
  quizSubmitted = false,
  quizGraded = false,
  onChangeBlocks,
  onExitSession,
  onSelectGame,
  onQuizClick,
  onQuizDetailsClick,
  onCloseQuizDetails
}: GameSelectionUIProps) {
  const getGameName = (gameId: string): string => {
    const metadata = getGameMetadata(gameId)
    return metadata?.name || gameId
  }

  const firstIncompleteIndex = enabledGames.findIndex((game, index) => {
    const gameProgress = progress.find(p => p.game_name === game)
    if (!gameProgress) return true
    const requiredRounds = gameRounds[game] || 1
    const roundsCompleted = gameProgress.rounds_completed || 0
    return roundsCompleted < requiredRounds
  })

  // Count only games, not quiz (quiz is shown separately)
  const totalGames = enabledGames.length
  const completedGames = enabledGames.filter((game) => {
    const gameProgress = progress.find(p => p.game_name === game)
    const requiredRounds = gameRounds[game] || 1
    const roundsCompleted = gameProgress?.rounds_completed || 0
    return roundsCompleted >= requiredRounds
  }).length
  const progressPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
      </div>
      
      {/* Header */}
      <div className="bg-[#0a0a12]/95 backdrop-blur-xl border-b border-white/[0.06] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#161622] border border-white/[0.08] rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">Aktiviteter</h1>
                  {allGamesCompleted && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">Allt klart!</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Spela spelen i ordning för att låsa upp nästa</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onChangeBlocks}
                className="px-4 py-2.5 bg-white/5 border border-white/[0.08] text-gray-400 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all text-sm"
              >
                Byt block
              </button>
              <button
                onClick={onExitSession}
                className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-all text-sm"
              >
                Avsluta
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-[#161622] rounded-xl p-4 border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-white">
                  {completedGames} av {totalGames} klara
                </div>
                {allGamesCompleted && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Session klar</span>
                  </div>
                )}
              </div>
              <div className="text-lg font-bold text-white">{progressPercentage}%</div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  allGamesCompleted 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Games Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {enabledGames.map((game, index) => {
              const gameProgress = progress.find(p => p.game_name === game)
              const requiredRounds = gameRounds[game] || 1
              const roundsCompleted = gameProgress?.rounds_completed || 0
              const isCompleted = gameProgress && roundsCompleted >= requiredRounds
              const isLocked = firstIncompleteIndex !== -1 && index > firstIncompleteIndex
              const isAvailable = firstIncompleteIndex === -1 || index === firstIncompleteIndex || isCompleted
              const isCurrent = index === firstIncompleteIndex
              const GameIcon = getGameIconComponent(game)
              const gameMetadata = getGameMetadata(game)
              const gradient = getGameGradient(index)

              return (
                <div
                  key={game}
                  className={`group relative bg-[#161622] rounded-2xl border transition-all duration-300 ${
                    isLocked 
                      ? 'opacity-50 border-white/[0.04]' 
                      : isCurrent
                        ? 'border-amber-500/30'
                        : isCompleted
                          ? 'border-emerald-500/20'
                          : 'border-white/[0.08] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="relative p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      {/* Game Icon - dark background with colored icon */}
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center border border-white/[0.08]"
                        style={{ backgroundColor: '#1a1a2e' }}
                      >
                        <GameIcon 
                          className="w-7 h-7" 
                          style={{ color: gradient.from }}
                        />
                      </div>
                      
                      {/* Status badge */}
                      {isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">Klar</span>
                        </div>
                      )}
                      {isLocked && !isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/[0.08] rounded-full">
                          <Lock className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-semibold text-gray-500">Låst</span>
                        </div>
                      )}
                      {isCurrent && !isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                          <Play className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400">Nästa</span>
                        </div>
                      )}
                    </div>

                    {/* Game Title */}
                    <h3 className="text-xl font-bold text-white mb-2">
                      {getGameName(game)}
                    </h3>

                    {/* Description */}
                    {gameMetadata?.description && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {gameMetadata.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rundor</span>
                        <span className="text-sm font-bold text-white">{roundsCompleted} / {requiredRounds}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(roundsCompleted / requiredRounds) * 100}%`,
                            background: isCompleted 
                              ? 'linear-gradient(90deg, #10b981, #14b8a6)' 
                              : 'linear-gradient(90deg, #f59e0b, #f97316)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        if (isAvailable || isCompleted) {
                          onSelectGame(index, game)
                        }
                      }}
                      disabled={isLocked}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                        isCompleted
                          ? 'bg-white/5 border border-white/[0.08] text-gray-300 hover:bg-white/10'
                          : isLocked
                          ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/[0.04]'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Spela igen
                        </>
                      ) : isLocked ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Låst
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Spela nu
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quiz Section */}
          {isQuizUnlocked && (
            <div className="mt-8">
              {quizSubmitted ? (
                quizGraded && quizResult ? (
                  // Quiz graded - show result
                  <div 
                    className="bg-[#161622] rounded-2xl border border-white/[0.08] p-6 cursor-pointer hover:border-purple-500/20 transition-all"
                    onClick={() => onQuizDetailsClick()}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-[#1a1a2e] border border-white/[0.08] rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-7 h-7 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">Quiz - Resultat</h3>
                        <p className="text-sm text-gray-500">Tryck för att se detaljer</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-lg font-bold ${
                        quizResult.percentage >= 80 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : quizResult.percentage >= 60 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {quizResult.percentage}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-white/[0.08]">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Poäng</div>
                        <div className="text-2xl font-bold text-white">{quizResult.score}/{quizResult.total}</div>
                      </div>
                      <div className="text-center border-x border-white/[0.08]">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Procent</div>
                        <div className={`text-2xl font-bold ${
                          quizResult.percentage >= 80 ? 'text-emerald-400' :
                          quizResult.percentage >= 60 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {quizResult.percentage}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Betyg</div>
                        <div className={`text-lg font-bold ${
                          quizResult.percentage >= 80 ? 'text-emerald-400' :
                          quizResult.percentage >= 60 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {quizResult.percentage >= 80 ? 'Toppen!' : 
                           quizResult.percentage >= 60 ? 'Bra!' : 
                           'Öva mer!'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Quiz submitted but not graded
                  <div className="bg-[#161622] rounded-2xl border border-white/[0.08] p-6 opacity-75">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#1a1a2e] border border-white/[0.08] rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-7 h-7 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">Quiz</h3>
                        <p className="text-sm text-gray-500">Waiting for teacher to grade</p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Lock className="w-5 h-5" />
                        <span className="text-sm font-medium">Inskickad</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Quiz not submitted
                <div className="bg-[#161622] rounded-2xl border border-white/[0.08] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-[#1a1a2e] border border-white/[0.08] rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-7 h-7 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">Quiz</h3>
                      <p className="text-sm text-gray-500">Testa dina kunskaper på de valda orden</p>
                    </div>
                  </div>
                  <button
                    onClick={onQuizClick}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Starta Quiz
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quiz Details Modal */}
          {showQuizDetails && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="relative bg-[#161622] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden">
                  <div className="sticky top-0 bg-[#161622] border-b border-white/[0.08] p-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1a1a2e] border border-white/[0.08] rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-purple-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Quiz Detaljer</h2>
                    </div>
                    <button
                      onClick={onCloseQuizDetails}
                      className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/[0.08]"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <div className="space-y-3">
                      {quizDetails.map((detail, index) => {
                        const points = detail.score === 100 ? 2 : detail.score === 50 ? 1 : 0
                        const isCorrect = detail.score === 100
                        const isPartial = detail.score === 50
                        
                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-xl border transition-all ${
                              isCorrect 
                                ? 'bg-green-500/10 border-green-500/30' 
                                : isPartial 
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-red-500/10 border-red-500/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-white">{detail.word_sv}</span>
                                  <span className="text-gray-500">→</span>
                                  <span className="font-semibold text-white">{detail.word_en}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 uppercase">Ditt svar:</span>
                                  <span className={`text-sm font-medium ${
                                    detail.student_answer.trim() === '' 
                                      ? 'text-gray-500 italic' 
                                      : 'text-white'
                                  }`}>
                                    {detail.student_answer.trim() || '(tomt)'}
                                  </span>
                                </div>
                              </div>
                              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                                isCorrect 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : isPartial 
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}>
                                {points}p
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
