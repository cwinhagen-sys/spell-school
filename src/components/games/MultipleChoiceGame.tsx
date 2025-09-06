'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, updateStudentProgress, type TrackingContext } from '@/lib/tracking'

interface MultipleChoiceGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (pointsGained: number, newTotal?: number) => void
}

type MCQuestion = {
  prompt: string
  correct: string
  options: string[]
}

export default function MultipleChoiceGame({ words, translations = {}, onClose, trackingContext, themeColor, onScoreUpdate }: MultipleChoiceGameProps) {
  const [questions, setQuestions] = useState<MCQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [locked, setLocked] = useState(false)
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null)

  const maxQuestions = 12 // typical 8–12 → target 5–15 points at 1p/correct

  const vocabulary = useMemo(() => {
    const pairs: Array<{ en: string; sv: string }> = []
    for (const w of words || []) {
      if (typeof w !== 'string') continue
      const tr = translations[w?.toLowerCase?.()]
      if (tr) pairs.push({ en: w, sv: tr })
    }
    return pairs
  }, [words, translations])

  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)

  useEffect(() => {
    // Build question set: random direction per item, 4 options (1 correct + 3 distractors)
    const pool = shuffle(vocabulary)
    const take = pool.slice(0, Math.min(maxQuestions, pool.length))
    const qs: MCQuestion[] = []
    for (const p of take) {
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
    setQuestions(qs)
    setIndex(0)
    setScore(0)
  }, [vocabulary])

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('choice', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  }, [trackingContext])

  const answer = (opt: string, idx: number) => {
    if (finished || locked) return
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
        setFinished(true)
        const duration = startedAtRef.current ? Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)) : undefined
        const totalQs = questions.length || 1
        const accuracyPct = Math.round((nextScore / totalQs) * 100)
        void endGameSession(sessionId, 'choice', { score: nextScore, durationSec: duration, accuracyPct, details: { questions: questions.length } })
        ;(async () => {
          const newTotal = await updateStudentProgress(nextScore, 'choice', trackingContext)
          onScoreUpdate?.(nextScore, newTotal)
        })()
      } else {
        setIndex(next)
      }
    }, isCorrect ? 450 : 400)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[1000]">
      <div className="rounded-2xl p-8 max-w-xl w-full shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Multiple Choice</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl transition-colors">×</button>
        </div>

        {!finished ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-300">Question {index + 1} / {questions.length}</div>
            <div className="text-xl font-semibold">{questions[index]?.prompt}</div>
            <div className="grid grid-cols-1 gap-3 mt-4">
              {questions[index]?.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answer(opt, i)}
                  disabled={locked}
                  className={[
                    'w-full text-left px-4 py-3 rounded-lg border transition-transform',
                    'bg-white/5 border-white/10 hover:bg-white/10',
                    locked && feedbackIdx !== i ? 'opacity-60' : '',
                    locked && feedbackIdx === i && feedbackType === 'correct' ? 'bg-emerald-600/20 border-emerald-400 text-emerald-200 animate-hop' : '',
                    locked && feedbackIdx === i && feedbackType === 'wrong' ? 'bg-red-600/20 border-red-400 text-red-200 animate-burr' : ''
                  ].join(' ')}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-4 text-gray-300">Score: <span className="text-white font-semibold">{score}</span></div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2">Round finished</h3>
            <p className="text-gray-300 mb-6">Your score: {score} / {questions.length}</p>
            <button onClick={onClose} className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/15">Close</button>
          </div>
        )}
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


