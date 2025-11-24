'use client'

import { CheckCircle2, X, BookOpen, CheckSquare, Brain, Scissors, FileText, Globe, Mic, Target, Lock, Trophy, BarChart3, Star } from 'lucide-react'
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
  onChangeBlocks: () => void
  onExitSession: () => void
  onSelectGame: (gameIndex: number, gameId: string) => void
  onQuizClick: () => void
  onQuizDetailsClick: () => Promise<void> // Async callback to load quiz details
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

/**
 * Game Selection UI Component
 * 
 * This component displays the game selection screen in session mode.
 * All business logic (state management, API calls, game completion checks) 
 * is handled by the parent component.
 * 
 * Props:
 * - enabledGames: Array of game IDs that are enabled for this session
 * - progress: Array of game progress objects
 * - gameRounds: Optional object mapping game IDs to required rounds
 * - quizEnabled: Whether quiz is enabled for this session
 * - quizResult: Quiz result if completed, null otherwise
 * - quizDetails: Array of quiz answer details
 * - showQuizDetails: Whether to show quiz details modal
 * - allGamesCompleted: Whether all games are completed
 * - isQuizUnlocked: Whether quiz is unlocked (can be taken)
 * - onChangeBlocks: Callback to change selected blocks
 * - onExitSession: Callback to exit the session
 * - onSelectGame: Callback when a game is selected (gameIndex, gameId)
 * - onQuizClick: Callback when quiz button is clicked
 * - onQuizDetailsClick: Callback when quiz result card is clicked
 * - onCloseQuizDetails: Callback to close quiz details modal
 */
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
  onChangeBlocks,
  onExitSession,
  onSelectGame,
  onQuizClick,
  onQuizDetailsClick,
  onCloseQuizDetails
}: GameSelectionUIProps) {
  // Helper functions
  const getGameName = (gameId: string): string => {
    const metadata = getGameMetadata(gameId)
    return metadata?.name || gameId
  }

  // Find first incomplete game
  const firstIncompleteIndex = enabledGames.findIndex(
    (game, index) => {
      const gameProgress = progress.find(p => p.game_name === game)
      if (!gameProgress) return true
      const requiredRounds = gameRounds[game] || 1
      const roundsCompleted = gameProgress.rounds_completed || 0
      return roundsCompleted < requiredRounds
    }
  )

  // Calculate total progress
  const totalGames = enabledGames.length + (quizEnabled ? 1 : 0)
  const completedGames = enabledGames.filter((game) => {
    const gameProgress = progress.find(p => p.game_name === game)
    const requiredRounds = gameRounds[game] || 1
    const roundsCompleted = gameProgress?.rounds_completed || 0
    return roundsCompleted >= requiredRounds
  }).length + (quizResult ? 1 : 0)
  const progressPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0

  // Get game icon gradients (inspired by the image)
  const getGameIconGradient = (gameIndex: number) => {
    const gradients = [
      'from-pink-400 to-yellow-400', // Flashcards - pink/yellow
      'from-purple-300 to-purple-400', // Multiple Choice - purple
      'from-teal-300 to-teal-400', // Memory - teal
      'from-blue-300 to-blue-400', // Word Scramble - blue
      'from-green-300 to-green-400', // Sentence Gap - green
      'from-indigo-300 to-indigo-400', // Translate - indigo
      'from-orange-300 to-orange-400', // Flashcards Test - orange
      'from-rose-300 to-rose-400', // Word Roulette - rose
    ]
    return gradients[gameIndex % gradients.length]
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
              {allGamesCompleted && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                  <Trophy className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">All Complete</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onChangeBlocks}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Change Blocks
              </button>
              <button
                onClick={onExitSession}
                className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
              >
                Exit Session
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-700">
                {completedGames} / {totalGames} COMPLETED
              </div>
              {allGamesCompleted && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Session Complete</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">{progressPercentage}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden relative">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                allGamesCompleted 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-r from-teal-500 to-emerald-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
            {allGamesCompleted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="w-3 h-3 text-white opacity-80" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Games Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {enabledGames.map((game, index) => {
              const gameProgress = progress.find(p => p.game_name === game)
              const requiredRounds = gameRounds[game] || 1
              const roundsCompleted = gameProgress?.rounds_completed || 0
              const isCompleted = gameProgress && roundsCompleted >= requiredRounds
              const isLocked = firstIncompleteIndex !== -1 && index > firstIncompleteIndex
              const isAvailable = firstIncompleteIndex === -1 || index === firstIncompleteIndex || isCompleted
              const GameIcon = getGameIconComponent(game)
              const gameMetadata = getGameMetadata(game)
              const highestScore = gameProgress?.score || 0

              return (
                <div
                  key={game}
                  className={`bg-white rounded-xl shadow-md border border-gray-200 p-6 transition-all hover:shadow-lg ${
                    isLocked ? 'opacity-60' : ''
                  }`}
                >
                  {/* Game Icon */}
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGameIconGradient(index)} flex items-center justify-center mb-4 shadow-sm`}>
                    <GameIcon className="w-8 h-8 text-white" />
                  </div>

                  {/* Game Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {getGameName(game)}
                  </h3>

                  {/* Description */}
                  {gameMetadata?.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {gameMetadata.description}
                    </p>
                  )}

                  {/* Progress Indicator */}
                  <div className="mb-4">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase">Completed Sections</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {roundsCompleted} / {requiredRounds}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isCompleted && (
                    <div className="mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Completed</span>
                    </div>
                  )}
                  {isLocked && !isCompleted && (
                    <div className="mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Locked</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      if (isAvailable || isCompleted) {
                        onSelectGame(index, game)
                      }
                    }}
                    disabled={isLocked}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                      isCompleted
                        ? 'bg-teal-500 hover:bg-teal-600 text-white'
                        : isLocked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    }`}
                  >
                    {isCompleted ? 'View Details' : isLocked ? 'Locked' : 'Play Now'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Quiz Section */}
          {isQuizUnlocked && (
            <div className="mt-8">
              {quizResult ? (
                <div 
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => onQuizDetailsClick()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Quiz</h3>
                      <p className="text-sm text-gray-600">Click to view details</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Score</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {quizResult.score} / {quizResult.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Accuracy</div>
                      <div className={`text-2xl font-bold ${
                        quizResult.percentage >= 80 ? 'text-green-600' :
                        quizResult.percentage >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {quizResult.percentage}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Grade</div>
                      <div className={`text-lg font-semibold ${
                        quizResult.percentage >= 80 ? 'text-green-600' :
                        quizResult.percentage >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {quizResult.percentage >= 80 ? 'Excellent!' : 
                         quizResult.percentage >= 60 ? 'Good Job!' : 
                         'Keep Practicing!'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Quiz</h3>
                      <p className="text-sm text-gray-600">Complete the quiz based on your selected color blocks</p>
                    </div>
                  </div>
                  <button
                    onClick={onQuizClick}
                    className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-all"
                  >
                    Play Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quiz Details Modal */}
          {showQuizDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Quiz Details</h2>
                  <button
                    onClick={onCloseQuizDetails}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {quizDetails.map((detail, index) => {
                      const points = detail.score === 100 ? 2 : detail.score === 50 ? 1 : 0
                      const colorClass = detail.score === 100 ? 'bg-green-50 border-green-200' :
                                        detail.score === 50 ? 'bg-yellow-50 border-yellow-200' :
                                        'bg-red-50 border-red-200'
                      const textColor = detail.score === 100 ? 'text-green-700' :
                                       detail.score === 50 ? 'text-yellow-700' :
                                       'text-red-700'
                      
                      return (
                        <div key={index} className={`p-4 rounded-lg border ${colorClass}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">{detail.word_sv}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-semibold text-gray-900">{detail.word_en}</span>
                              </div>
                              <div className="mt-1">
                                <span className="text-xs text-gray-500 uppercase">Your answer: </span>
                                <span className={`text-sm font-medium ${
                                  detail.student_answer.trim() === '' 
                                    ? 'text-gray-400 italic' 
                                    : 'text-gray-900'
                                }`}>
                                  {detail.student_answer.trim() || '(empty)'}
                                </span>
                              </div>
                            </div>
                            <div className={`ml-4 px-3 py-1 rounded-full text-sm font-semibold ${textColor} bg-white border ${colorClass.replace('bg-', 'border-')}`}>
                              {points} pts
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

