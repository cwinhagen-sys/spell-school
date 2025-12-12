'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateMultipleChoiceScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'
import { CheckSquare, X, Loader2, Trophy } from 'lucide-react'

interface MultipleChoiceGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (pointsGained: number, newTotal?: number, gameType?: string) => void
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
}

type MCQuestion = {
  prompt: string
  correct: string
  options: string[]
}

export default function MultipleChoiceGame({ words, translations = {}, onClose, trackingContext, themeColor, onScoreUpdate, gridConfig, sessionMode = false }: MultipleChoiceGameProps) {
  // Skip grid selector in session mode
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode)
  const [selectedGrids, setSelectedGrids] = useState<Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>>([])
  const [questions, setQuestions] = useState<MCQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false) // Prevent double-click on finish button
  const [gameFinished, setGameFinished] = useState(false) // Show game complete modal
  const [finalScore, setFinalScore] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Don't auto-initialize from gridConfig - always show grid selector for user to choose blocks
  // gridConfig will be passed to ColorGridSelector to show the correct blocks

  const vocabulary = useMemo(() => {
    console.log('📋 Multiple Choice vocabulary useMemo:', {
      showGridSelector,
      selectedGridsLength: selectedGrids.length,
      gridConfigLength: gridConfig?.length,
      wordsLength: words?.length,
      sessionMode
    })
    
    // In session mode, use words and translations directly
    // words is an array of English words, translations is an object with English words as keys
    if (sessionMode && words && words.length > 0) {
      console.log('📋 Multiple Choice: Building vocabulary from words array (session mode)', words.length, 'words')
      const pairs: Array<{ en: string; sv: string }> = []
      
      words.forEach((word: string) => {
        // word is English, find Swedish translation
        const tr = translations?.[word.toLowerCase()] || translations?.[word]
        if (tr && tr !== `[${word}]`) {
          pairs.push({ en: word, sv: tr })
        } else {
          console.log(`📋 No translation found for "${word}", skipping`)
        }
      })
      
      console.log('📋 Multiple Choice vocabulary: built', pairs.length, 'pairs from words array')
      return pairs
    }
    
    if (showGridSelector || selectedGrids.length === 0) {
      console.log('📋 Multiple Choice vocabulary: empty due to', { showGridSelector, selectedGridsLength: selectedGrids.length })
      return []
    }
    
    console.log('📋 Multiple Choice: Building vocabulary from', selectedGrids.length, 'selected grids')
    
    // IMPORTANT: Use selectedGrids (user's selected blocks), not entire gridConfig
    const pairs: Array<{ en: string; sv: string }> = []
    
    // Use selectedGrids which only contains the blocks the user selected
    selectedGrids.forEach((grid, gridIdx) => {
      console.log(`📋 Selected Grid ${gridIdx}:`, grid.words.length, 'words')
      
      grid.words.forEach((word: string) => {
        // word is a string (Swedish), find English translation
        const tr = grid.translations[word.toLowerCase()] || translations?.[word.toLowerCase()]
        if (tr && tr !== `[${word}]`) {
          pairs.push({ en: tr, sv: word })
        } else {
          // No translation found, skip this word
          console.log(`📋 No translation found for "${word}", skipping`)
        }
      })
    })
    
    console.log('📋 Multiple Choice vocabulary: built', pairs.length, 'pairs')
    return pairs
  }, [words, translations, selectedGrids, showGridSelector, sessionMode])

  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)

  useEffect(() => {
    if (showGridSelector) {
      setQuestions([])
      return
    }
    
    if (vocabulary.length === 0) {
      console.log('⚠️ Multiple Choice: vocabulary is empty', { showGridSelector, selectedGrids: selectedGrids.length, vocabulary })
      setQuestions([])
      return
    }
    
    console.log('✅ Multiple Choice: Building questions from vocabulary', { vocabularyLength: vocabulary.length })
    
    // Build question set: random direction per item, 4 options (1 correct + 3 distractors)
    // Use all vocabulary items (no limit) since user can select unlimited grids
    const pool = shuffle(vocabulary)
    const qs: MCQuestion[] = []
    for (const p of pool) {
      const flip = Math.random() < 0.5
      const prompt = flip ? p.en : p.sv
      const correct = flip ? p.sv : p.en
      // distractors from same side as correct
      const sameSide = pool
        .filter(x => (flip ? x.sv !== correct : x.en !== correct))
        .map(x => (flip ? x.sv : x.en))
      const distractors = shuffle(sameSide).slice(0, 3)
      const options = shuffle([correct, ...distractors])
      qs.push({ prompt, correct, options })
    }
    console.log('✅ Multiple Choice: Built questions', { count: qs.length })
    setQuestions(qs)
    setIndex(0)
    setScore(0)
  }, [vocabulary, showGridSelector, selectedGrids.length])

  useEffect(() => {
    startedAtRef.current = Date.now()
    console.log('🎮 Multiple Choice: Game started (session will be created server-side)')
    setSessionId(null)
  }, [trackingContext])

  // Count-up timer
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  const answer = (opt: string, idx: number) => {
    if (locked) return
    const q = questions[index]
    if (!q) return
    const isCorrect = opt === q.correct
    const nextScore = isCorrect ? score + 1 : score
    setLocked(true)
    setFeedbackIdx(idx)
    setFeedbackType(isCorrect ? 'correct' : 'wrong')

    window.setTimeout(() => {
      const next = index + 1
      setFeedbackIdx(null)
      setFeedbackType(null)
      setLocked(false)
      if (isCorrect) setScore(nextScore)

      if (next >= questions.length) {
        // Go directly to UniversalGameCompleteModal - skip the old finish screen
        setIndex(questions.length)
        setGameFinished(true)
        
        // Use the new universal scoring system
        const scoreResult = calculateMultipleChoiceScore(nextScore, questions.length, questions.length - nextScore)
        setFinalScore(scoreResult.pointsAwarded)
        
        console.log('Multiple Choice finished with new scoring:', { 
          score: nextScore, 
          questionsLength: questions.length,
          scoreResult
        })
        
        // INSTANT UI UPDATE: Call onScoreUpdate immediately for instant feedback
        if (onScoreUpdate) {
          if (sessionMode) {
            // In session mode, pass correctAnswers and totalQuestions for percentage calculation
            onScoreUpdate(nextScore, questions.length, 'choice')
            // Automatically close after a brief delay in session mode
            setTimeout(() => {
              onClose()
            }, 300)
          } else {
            console.log('Multiple Choice: Calling onScoreUpdate with', { 
              accuracy: scoreResult.accuracy, 
              pointsToAward: scoreResult.pointsAwarded
            })
            onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'choice')
          }
        }
        
        // BACKGROUND SYNC: Update XP progress in database (only if not in session mode)
        if (!sessionMode) {
          const duration = startedAtRef.current ? Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)) : undefined
          const totalQs = questions.length || 1
          const accuracyPct = Math.round((nextScore / totalQs) * 100)
          console.log('🎮 Multiple Choice: About to call endGameSession with sessionId:', sessionId)
          void endGameSession(sessionId, 'choice', { score: nextScore, durationSec: duration, accuracyPct, details: { questions: questions.length } })
        }
      } else {
        setIndex(next)
      }
    }, isCorrect ? 450 : 400)
  }

  // Grid selector
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={(grids) => {
          console.log('✅ Multiple Choice: Grids selected', grids.length)
          setSelectedGrids(grids)
          setShowGridSelector(false)
        }}
        onClose={onClose}
        minGrids={1}
        maxGrids={undefined}
        wordsPerGrid={6}
        title="Select Color Grids"
        description="Choose any number of color grids to practice with"
        gridConfig={gridConfig}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-[1000] overflow-y-auto">
      {/* Aurora background effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative bg-[#12122a] rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Flerval</h2>
              <p className="text-sm text-gray-400">Välj rätt svar</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Loading questions...</h3>
            <p className="text-gray-400">Förbereder ditt quiz</p>
          </div>
        ) : index < questions.length && !gameFinished ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                <span className="font-medium">Fråga {index + 1} av {questions.length}</span>
                <span className="font-medium text-amber-400">{Math.round(((index + 1) / questions.length) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-orange-500"
                  style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-white/10">
              <div className="text-xl font-bold text-white text-center">{questions[index]?.prompt}</div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-4">
              {questions[index]?.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answer(opt, i)}
                  disabled={locked}
                  className={[
                    'w-full text-left px-6 py-4 rounded-xl border transition-all duration-300 font-medium text-lg',
                    locked && feedbackIdx === i && feedbackType === 'correct' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/20' : '',
                    locked && feedbackIdx === i && feedbackType === 'wrong' ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/20' : '',
                    !locked || feedbackIdx !== i ? 'bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-white hover:shadow-lg' : '',
                    locked && feedbackIdx !== i ? 'opacity-40' : ''
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className={[
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      locked && feedbackIdx === i && feedbackType === 'correct' ? 'bg-emerald-500 text-white' : '',
                      locked && feedbackIdx === i && feedbackType === 'wrong' ? 'bg-red-500 text-white' : '',
                      !locked || feedbackIdx !== i ? 'bg-white/10 text-gray-300' : ''
                    ].join(' ')}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span>{opt}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Score Display */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 px-6 py-3 rounded-xl border border-amber-500/30">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-amber-400">Score: {score} / {questions.length}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Game Complete Modal - don't show in session mode */}
        {gameFinished && !sessionMode && (
          <UniversalGameCompleteModal
            score={finalScore}
            pointsAwarded={finalScore}
            gameType="choice"
            accuracy={Math.round((score / questions.length) * 100)}
            time={`${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`}
            details={{
              correctAnswers: score,
              totalQuestions: questions.length,
              wrongAttempts: questions.length - score,
              efficiency: Math.round((score / questions.length) * 100)
            }}
            onPlayAgain={() => {
              setGameFinished(false)
              setScore(0)
              setIndex(0)
              setLocked(false)
              setFeedbackIdx(null)
              setFeedbackType(null)
              startedAtRef.current = Date.now()
              // Restart the game session (server-side)
              console.log('🎮 Multiple Choice: Game restarted (session will be created server-side)')
              setSessionId(null)
            }}
            onBackToDashboard={onClose}
            themeColor={themeColor}
          />
        )}
        
        {/* In session mode, don't render anything when finished (will close automatically) */}
        {gameFinished && sessionMode && null}
      </div>
      <style jsx>{`
        @keyframes hop {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-6px) scale(1.03); }
          60% { transform: translateY(0) scale(1); }
          80% { transform: translateY(-2px) scale(1.01); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-hop { animation: hop 450ms ease-out; }

        @keyframes burr {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-burr { animation: burr 400ms ease-in-out; }
      `}</style>
    </div>
  )
}


