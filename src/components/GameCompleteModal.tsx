'use client'

import { RotateCcw, ArrowLeft, Star, Trophy, Target, Clock, Gamepad2, XCircle, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

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
    if (score >= 100) return 'text-amber-400'
    if (score >= 60) return 'text-emerald-400'
    if (score >= 30) return 'text-cyan-400'
    return 'text-orange-400'
  }

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-emerald-400'
    if (acc >= 75) return 'text-green-400'
    if (acc >= 60) return 'text-amber-400'
    if (acc >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="relative w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/30 via-cyan-500/20 to-fuchsia-500/30 rounded-3xl blur-xl" />
        
        <div className="relative rounded-2xl p-8 text-center shadow-2xl bg-[#12122a] border border-white/10">
          {themeColor && <div className="h-1.5 rounded-md mb-6 bg-gradient-to-r from-violet-500 to-cyan-500"></div>}
          
          {/* Trophy Icon */}
          <motion.div 
            className="mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="text-6xl mb-4">{getTrophyIcon()}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {gameType === 'flashcards' && details.testMode 
                ? 'Test klart!' 
                : gameType === 'flashcards' 
                ? 'Träning klar!' 
                : 'Spel klart!'}
            </h2>
            <p className="text-gray-400">
              {gameType === 'flashcards' && details.testMode
                ? `Du har klarat ${details.correctWords || 0} av ${details.totalWords || 0} ord!`
                : gameType === 'flashcards' 
                ? `Du har gått igenom alla ${details.wordsReviewed || 0} ord!`
                : `Du fick ${score} poäng!`
              }
            </p>
          </motion.div>

          {/* Score Highlight */}
          {gameType !== 'flashcards' && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-xl border border-white/10">
                <Star className={`w-6 h-6 ${getScoreColor()}`} />
                <span className={`text-2xl font-bold ${getScoreColor()}`}>{score} poäng</span>
              </div>
            </motion.div>
          )}
          
          {/* XP Earned Highlight for Test Mode */}
          {gameType === 'flashcards' && details.testMode && details.xpEarned !== undefined && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                <Zap className="w-6 h-6 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{details.xpEarned} XP</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">2 XP per klarat ord</p>
            </motion.div>
          )}
          
          {gameType === 'flashcards' && !details.testMode && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                <Star className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-400">Träningsläge</span>
              </div>
            </motion.div>
          )}

          {/* Game Statistics */}
          <motion.div 
            className="grid grid-cols-2 gap-3 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {accuracy !== undefined && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Target className="w-3 h-3" />
                  <span>Träffsäkerhet</span>
                </div>
                <span className={`text-xl font-bold ${getAccuracyColor(accuracy)}`}>{accuracy}%</span>
              </div>
            )}
            
            {time && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  <span>Tid</span>
                </div>
                <span className="text-xl font-bold text-white">{time}</span>
              </div>
            )}

            {details.wrongAttempts !== undefined && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <XCircle className="w-3 h-3" />
                  <span>Fel försök</span>
                </div>
                <span className="text-xl font-bold text-orange-400">{details.wrongAttempts}</span>
              </div>
            )}

            {details.streak !== undefined && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>Bästa streak</span>
                </div>
                <span className="text-xl font-bold text-violet-400">{details.streak}</span>
              </div>
            )}

            {details.correctAnswers !== undefined && details.totalAttempts !== undefined && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Gamepad2 className="w-3 h-3" />
                  <span>Rätta svar</span>
                </div>
                <span className="text-xl font-bold text-emerald-400">{details.correctAnswers}/{details.totalAttempts}</span>
              </div>
            )}

            {details.xpEarned !== undefined && !details.testMode && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span>XP intjänat</span>
                </div>
                <span className="text-xl font-bold text-amber-400">{details.xpEarned}</span>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {gameType === 'flashcards' && details.testMode && details.failedWordsCount && details.failedWordsCount > 0 && onRedoFailed ? (
              <>
                <button
                  onClick={onRedoFailed}
                  className="w-full relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 px-6 rounded-xl font-semibold flex items-center justify-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    <span>Gör om {details.failedWordsCount} ord</span>
                  </div>
                </button>
                <button
                  onClick={onBackToDashboard}
                  className="w-full bg-white/5 border border-white/10 text-gray-400 py-3.5 px-6 rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Tillbaka till startsidan</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onPlayAgain}
                  className="w-full relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-gradient-to-r from-violet-500 to-cyan-500 text-white py-3.5 px-6 rounded-xl font-semibold flex items-center justify-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    <span>{gameType === 'flashcards' ? 'Träna igen' : 'Spela igen'}</span>
                  </div>
                </button>
                <button
                  onClick={onBackToDashboard}
                  className="w-full bg-white/5 border border-white/10 text-gray-400 py-3.5 px-6 rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Tillbaka till startsidan</span>
                </button>
              </>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
