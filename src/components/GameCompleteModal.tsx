'use client'

import { RotateCcw, ArrowLeft, Star, Trophy, Target, Clock, Gamepad2, XCircle } from 'lucide-react'

interface GameCompleteModalProps {
  score: number
  accuracy?: number
  time?: string
  details?: {
    wrongAttempts?: number
    finalScore?: number
    time?: string
    streak?: number
    correctAnswers?: number
    totalAttempts?: number
    sessions?: number
    failedWordsCount?: number
    [key: string]: any
  }
  onPlayAgain: () => void
  onRedoFailed?: () => void
  onBackToDashboard: () => void
  gameType?: string
  themeColor?: string
}

export default function GameCompleteModal({
  score,
  accuracy,
  time,
  details = {},
  onPlayAgain,
  onRedoFailed,
  onBackToDashboard,
  gameType,
  themeColor
}: GameCompleteModalProps) {
  const getTrophyIcon = () => {
    if (gameType === 'flashcards') return '🎯'
    if (score >= 100) return '🏆'
    if (score >= 60) return '🥈'
    if (score >= 30) return '🥉'
    return '🎯'
  }

  const getScoreColor = () => {
    if (score >= 100) return 'text-yellow-400'
    if (score >= 60) return 'text-green-400'
    if (score >= 30) return 'text-blue-400'
    return 'text-orange-400'
  }

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-green-400'
    if (acc >= 75) return 'text-green-500'
    if (acc >= 60) return 'text-yellow-400'
    if (acc >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        
        {/* Trophy Icon */}
        <div className="mb-6">
          <div className="text-6xl mb-4">{getTrophyIcon()}</div>
          <h2 className="text-2xl font-bold mb-2">
            {gameType === 'flashcards' && details.testMode 
              ? 'Test Complete!' 
              : gameType === 'flashcards' 
              ? 'Training Complete!' 
              : 'Game Complete!'}
          </h2>
          <p className="text-gray-300">
            {gameType === 'flashcards' && details.testMode
              ? `Du har klarat ${details.correctWords || 0} av ${details.totalWords || 0} ord!`
              : gameType === 'flashcards' 
              ? `You've reviewed all ${details.wordsReviewed || 0} vocabulary words!`
              : `You scored ${score} points!`
            }
          </p>
        </div>

        {/* Score Highlight */}
        {gameType !== 'flashcards' && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className={`w-6 h-6 ${getScoreColor()}`} />
              <span className={`text-2xl font-bold ${getScoreColor()}`}>{score} points</span>
            </div>
          </div>
        )}
        
        {/* XP Earned Highlight for Test Mode */}
        {gameType === 'flashcards' && details.testMode && details.xpEarned !== undefined && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{details.xpEarned} XP</span>
            </div>
            <p className="text-sm text-gray-400">2 XP per klarat ord</p>
          </div>
        )}
        
        {gameType === 'flashcards' && !details.testMode && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-6 h-6 text-blue-500" />
              <span className="text-lg font-semibold text-blue-300">Training Mode</span>
            </div>
          </div>
        )}

        {/* Game Statistics */}
        <div className="space-y-2 mb-6 text-sm text-gray-300">
          {accuracy !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Accuracy:</span>
              </div>
              <span className={getAccuracyColor(accuracy)}>{accuracy}%</span>
            </div>
          )}
          
          {time && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Time:</span>
              </div>
              <span>{time}</span>
            </div>
          )}

          {details.wrongAttempts !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Wrong Attempts:</span>
              </div>
              <span>{details.wrongAttempts}</span>
            </div>
          )}

          {details.streak !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Best Streak:</span>
              </div>
              <span>{details.streak}</span>
            </div>
          )}

          {details.correctAnswers !== undefined && details.totalAttempts !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                <span>Correct Answers:</span>
              </div>
              <span>{details.correctAnswers}/{details.totalAttempts}</span>
            </div>
          )}

          {details.incorrectWords !== undefined && details.testMode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span>Incorrect Words:</span>
              </div>
              <span className="text-red-400">{details.incorrectWords}</span>
            </div>
          )}

          {details.blocksCompleted !== undefined && details.totalBlocks !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Blocks Completed:</span>
              </div>
              <span>{details.blocksCompleted}/{details.totalBlocks}</span>
            </div>
          )}

          {details.xpEarned !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>XP Earned:</span>
              </div>
              <span className="text-yellow-400 font-bold">{details.xpEarned} XP</span>
            </div>
          )}

          {details.finalScore !== undefined && details.finalScore !== score && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>Final Score:</span>
              </div>
              <span>{details.finalScore} points</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {gameType === 'flashcards' && details.testMode && details.failedWordsCount && details.failedWordsCount > 0 && onRedoFailed ? (
            <>
              <button
                onClick={onRedoFailed}
                className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Gör om de {details.failedWordsCount} orden du inte klarade</span>
              </button>
              <button
                onClick={onBackToDashboard}
                className="w-full bg-white/10 border border-white/10 text-white py-3 px-6 rounded-lg font-medium hover:bg-white/15 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Gå tillbaka till dashboard</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onPlayAgain}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{gameType === 'flashcards' ? 'Practice Again' : 'Play Again'}</span>
              </button>
              <button
                onClick={onBackToDashboard}
                className="w-full bg-white/10 border border-white/10 text-white py-3 px-6 rounded-lg font-medium hover:bg-white/15 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
