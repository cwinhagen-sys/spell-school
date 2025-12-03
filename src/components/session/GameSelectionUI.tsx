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

  const totalGames = enabledGames.length + (quizEnabled ? 1 : 0)
  const completedGames = enabledGames.filter((game) => {
    const gameProgress = progress.find(p => p.game_name === game)
    const requiredRounds = gameRounds[game] || 1
    const roundsCompleted = gameProgress?.rounds_completed || 0
    return roundsCompleted >= requiredRounds
  }).length + (quizResult ? 1 : 0)
  const progressPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col relative overflow-hidden">
      {/* Aurora background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-violet-900/30 via-cyan-900/20 to-fuchsia-900/30 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ 
        backgroundImage: 'linear-gradient(to right, #ffffff1a 1px, transparent 1px), linear-gradient(to bottom, #ffffff1a 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }} />
      
      {/* Header */}
      <div className="bg-[#12122a]/80 backdrop-blur-xl border-b border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl blur-lg opacity-50" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">Aktiviteter</h1>
                  {allGamesCompleted && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full">
                      <Trophy className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-semibold text-green-400">Allt klart!</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">Spela spelen i ordning för att låsa upp nästa</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onChangeBlocks}
                className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-sm"
              >
                Byt block
              </button>
              <button
                onClick={onExitSession}
                className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/20 hover:text-red-300 transition-all text-sm"
              >
                Avsluta
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-white">
                  {completedGames} av {totalGames} klara
                </div>
                {allGamesCompleted && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Session klar</span>
                  </div>
                )}
              </div>
              <div className="text-lg font-bold text-white">{progressPercentage}%</div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  allGamesCompleted 
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500' 
                    : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500'
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
                  className={`group relative bg-[#12122a]/60 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                    isLocked 
                      ? 'opacity-50 border-white/5' 
                      : isCurrent
                        ? 'border-white/20 shadow-xl'
                        : isCompleted
                          ? 'border-green-500/30 shadow-lg shadow-green-500/10'
                          : 'border-white/10 hover:border-white/20 hover:shadow-xl'
                  }`}
                >
                  {/* Current game indicator */}
                  {isCurrent && !isCompleted && (
                    <div className="absolute -inset-px bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 rounded-2xl" />
                  )}
                  
                  <div className="relative p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      {/* Game Icon */}
                      <div className="relative">
                        <div 
                          className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                          style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
                        />
                        <div 
                          className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{ 
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                            boxShadow: `0 8px 24px ${gradient.shadow}`
                          }}
                        >
                          <GameIcon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      {isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">Klar</span>
                        </div>
                      )}
                      {isLocked && !isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                          <Lock className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-semibold text-gray-500">Låst</span>
                        </div>
                      )}
                      {isCurrent && !isCompleted && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-full animate-pulse">
                          <Play className="w-4 h-4 text-violet-400" />
                          <span className="text-xs font-semibold text-violet-400">Nästa</span>
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
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rundor</span>
                        </div>
                        <span className="text-sm font-bold text-white">{roundsCompleted} / {requiredRounds}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(roundsCompleted / requiredRounds) * 100}%`,
                            background: isCompleted 
                              ? 'linear-gradient(90deg, #22c55e, #10b981)' 
                              : `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`
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
                      className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                        isCompleted
                          ? 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
                          : isLocked
                          ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                          : 'text-white shadow-lg transform hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      style={
                        !isLocked && !isCompleted
                          ? { 
                              background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                              boxShadow: `0 8px 24px ${gradient.shadow}`
                            }
                          : undefined
                      }
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
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-violet-500/20 rounded-3xl blur-xl" />
                
                {quizSubmitted ? (
                  quizGraded && quizResult ? (
                    // Quiz graded - show result
                    <div 
                      className="relative bg-[#12122a]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 cursor-pointer hover:border-purple-500/30 transition-all"
                      onClick={() => onQuizDetailsClick()}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl blur-lg opacity-50" />
                          <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <BarChart3 className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1">Quiz - Resultat</h3>
                          <p className="text-sm text-gray-400">Tryck för att se detaljer</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-lg font-bold ${
                          quizResult.percentage >= 80 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : quizResult.percentage >= 60 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {quizResult.percentage}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Poäng</div>
                          <div className="text-2xl font-bold text-white">{quizResult.score}/{quizResult.total}</div>
                        </div>
                        <div className="text-center border-x border-white/10">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Procent</div>
                          <div className={`text-2xl font-bold ${
                            quizResult.percentage >= 80 ? 'text-green-400' :
                            quizResult.percentage >= 60 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {quizResult.percentage}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Betyg</div>
                          <div className={`text-lg font-bold ${
                            quizResult.percentage >= 80 ? 'text-green-400' :
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
                    <div className="relative bg-[#12122a]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 opacity-75">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1">Quiz</h3>
                          <p className="text-sm text-gray-400">Väntar på att läraren ska rätta</p>
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
                  <div className="relative bg-[#12122a]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl blur-lg opacity-50" />
                        <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <BarChart3 className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">Quiz</h3>
                        <p className="text-sm text-gray-400">Testa dina kunskaper på de valda orden</p>
                      </div>
                    </div>
                    <button
                      onClick={onQuizClick}
                      className="w-full py-4 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play className="w-5 h-5" />
                      Starta Quiz
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quiz Details Modal */}
          {showQuizDetails && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-violet-500/20 rounded-3xl blur-xl" />
                
                <div className="relative bg-[#12122a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                  <div className="sticky top-0 bg-[#12122a] border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Quiz Detaljer</h2>
                    </div>
                    <button
                      onClick={onCloseQuizDetails}
                      className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
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
