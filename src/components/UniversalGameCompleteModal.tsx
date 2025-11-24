'use client'

import { RotateCcw, ArrowLeft, Star, Trophy, Target, Clock, Gamepad2, CheckCircle, Award, Keyboard, AlertTriangle, BookOpen, CheckSquare, Brain, Scissors, FileText, Globe, Mic, Target as TargetIcon, Sparkles, BarChart3 } from 'lucide-react'

interface GameCompleteModalProps {
  // Core game data
  score: number
  pointsAwarded: number
  gameType: string
  
  // Optional detailed stats
  accuracy?: number
  time?: string
  details?: {
    correctAnswers?: number
    totalQuestions?: number
    wrongAttempts?: number
    finalScore?: number
    time?: string
    streak?: number
    sessions?: number
    efficiency?: number
    wordCount?: number
    kpm?: number
    failureReason?: string
    [key: string]: any
  }
  
  // Actions
  onPlayAgain: () => void
  onBackToDashboard: () => void
  onViewLeaderboard?: () => void // Optional callback for leaderboard button
  
  // Styling
  themeColor?: string
  
  // Level up info (if applicable)
  levelUp?: {
    level: number
    title: string
    image: string
    description: string
  }
}

export default function UniversalGameCompleteModal({
  score,
  pointsAwarded,
  gameType,
  accuracy,
  time,
  details = {},
  onPlayAgain,
  onBackToDashboard,
  onViewLeaderboard,
  themeColor,
  levelUp
}: GameCompleteModalProps) {
  
  const getGameIcon = () => {
    switch (gameType) {
      case 'flashcards': return BookOpen
      case 'match': return Brain
      case 'typing': return Keyboard
      case 'translate': return Globe
      case 'connect': return TargetIcon
      case 'storygap': return FileText
      case 'roulette': return TargetIcon
      case 'choice': return CheckSquare
      case 'spellcasting': return Sparkles
      case 'quiz': return BarChart3
      default: return Gamepad2
    }
  }

  const getGameTitle = () => {
    switch (gameType) {
      case 'flashcards': return 'Flashcard Training'
      case 'match': return 'Word Matching'
      case 'typing': return 'Typing Challenge'
      case 'translate': return 'Translation Game'
      case 'connect': return 'Line Matching'
      case 'storygap': return 'Story Gap Fill'
      case 'roulette': return 'Word Roulette'
      case 'choice': return 'Multiple Choice'
      case 'spellcasting': return 'Spell Casting'
      case 'quiz': return 'Quiz Challenge'
      default: return 'Game Complete'
    }
  }

  const getTrophyColor = () => {
    if (accuracy !== undefined) {
      if (accuracy >= 100) return 'text-yellow-500'
      if (accuracy >= 90) return 'text-yellow-400'
      if (accuracy >= 80) return 'text-gray-400'
      if (accuracy >= 70) return 'text-orange-400'
    }
    if (pointsAwarded >= 20) return 'text-yellow-500'
    if (pointsAwarded >= 15) return 'text-yellow-400'
    if (pointsAwarded >= 10) return 'text-gray-400'
    if (pointsAwarded >= 5) return 'text-orange-400'
    return 'text-gray-300'
  }

  const getScoreColor = () => {
    if (accuracy !== undefined) {
      if (accuracy >= 90) return 'text-green-400'
      if (accuracy >= 80) return 'text-blue-400'
      if (accuracy >= 70) return 'text-yellow-400'
      if (accuracy >= 60) return 'text-orange-400'
      return 'text-red-400'
    }
    if (pointsAwarded >= 15) return 'text-green-400'
    if (pointsAwarded >= 10) return 'text-blue-400'
    if (pointsAwarded >= 5) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-green-400'
    if (acc >= 75) return 'text-green-500'
    if (acc >= 60) return 'text-yellow-400'
    if (acc >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const GameIconComponent = getGameIcon()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="rounded-xl p-8 max-w-md w-full text-center shadow-xl relative bg-white text-gray-800 border border-gray-200">
        {/* Top Progress Bar */}
        <div className="h-1 rounded-md mb-4 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
        
        {/* Level Up Notification */}
        {levelUp && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-yellow-700 mb-1">Level Up!</h3>
            <p className="text-yellow-800">You reached level {levelUp.level}</p>
            <p className="text-sm text-yellow-700 mt-1">{levelUp.title}</p>
          </div>
        )}
        
        {/* Trophy Icon and Title */}
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <Trophy className={`w-16 h-16 ${getTrophyColor()}`} />
          </div>
          <h2 className="text-2xl font-bold mb-2">{getGameTitle()}</h2>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <GameIconComponent className="w-5 h-5" />
            <span>Game Complete!</span>
          </p>
        </div>

        {/* Points Awarded */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className={`w-6 h-6 ${getScoreColor()}`} />
            <span className={`text-2xl font-bold ${getScoreColor()}`}>+{pointsAwarded} XP</span>
          </div>
          <p className="text-sm text-gray-600">Points awarded for your performance</p>
        </div>

        {/* Game Statistics */}
        <div className="space-y-2 mb-6 text-sm text-gray-600">
          {details.failureReason === 'too_many_errors' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-left flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <span className="text-red-700">
                The game ended after three errors. Try again to get a result.
              </span>
            </div>
          )}
          {accuracy !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Accuracy:</span>
              </div>
              <span className={getAccuracyColor(accuracy)}>{accuracy}%</span>
            </div>
          )}
          
          {details.correctAnswers !== undefined && details.totalQuestions !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Correct Answers:</span>
              </div>
              <span>{details.correctAnswers}/{details.totalQuestions}</span>
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

          {details.streak !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Best Streak:</span>
              </div>
              <span>{details.streak}</span>
            </div>
          )}

          {details.efficiency !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Efficiency:</span>
              </div>
              <span>{details.efficiency}%</span>
            </div>
          )}

          {details.wordCount !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                <span>Words Used:</span>
              </div>
              <span>{details.wordCount}</span>
            </div>
          )}

          {details.kpm !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                <span>Typing Speed:</span>
              </div>
              <span>{details.kpm} KPM</span>
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
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onViewLeaderboard && (
            <button
              onClick={onViewLeaderboard}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Trophy className="w-4 h-4" />
              <span>View Leaderboard</span>
            </button>
          )}
          <button
            onClick={onPlayAgain}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
          <button
            onClick={onBackToDashboard}
            className="w-full bg-gray-100 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
