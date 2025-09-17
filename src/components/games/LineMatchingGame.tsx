'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, ArrowLeft, Star, Link2 } from 'lucide-react'
import { startGameSession, endGameSession, updateStudentProgress, logWordAttempt, type TrackingContext, previewDiminishedPoints } from '@/lib/tracking'
import { scalePoints, normalizeBySetSize } from '@/lib/scoring'
import GameCompleteModal from '@/components/GameCompleteModal'

interface LineMatchingGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number) => void
  trackingContext?: TrackingContext
  themeColor?: string
}

type Pair = { en: string; sv: string }

export default function LineMatchingGame({ words, translations, onClose, onScoreUpdate, trackingContext, themeColor }: LineMatchingGameProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [pairs, setPairs] = useState<Pair[]>([])
  const [left, setLeft] = useState<string[]>([])
  const [right, setRight] = useState<string[]>([])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [connections, setConnections] = useState<Array<{ left: string; right: string; correct: boolean }>>([])
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [awardedPoints, setAwardedPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Build and shuffle pairs once with robust normalization
  const shuffledPairs = useMemo(() => {
    const built: Pair[] = []
    const lowerMap: Record<string, string> = {}
    const reverseMap: Record<string, string> = {}
    
    // Build translation maps
    for (const [k, v] of Object.entries(translations || {})) {
      const key = String(k ?? '').trim().toLowerCase()
      const val = String(v ?? '').trim()
      if (!key || !val) continue
      lowerMap[key] = val
      reverseMap[val.toLowerCase()] = k
    }
    
    const sourceWords = (words && words.length > 0)
      ? words.filter(w => typeof w === 'string' && String(w).trim().length > 0)
      : Object.keys(lowerMap).length > 0
        ? Object.keys(lowerMap)
        : Object.keys(reverseMap)
    
    // Create unique pairs, handling duplicate translations
    const usedPairs = new Set<string>()
    const translationCount: Record<string, number> = {}
    
    for (const w of sourceWords) {
      const wStr = String(w ?? '')
      const wTrim = wStr.trim()
      const wl = wTrim.toLowerCase()
      
      let pair: Pair | null = null
      
      // Prefer sv->en mapping if available; else try en->sv and flip
      if (lowerMap[wl]) {
        pair = { sv: wTrim, en: lowerMap[wl] }
      } else if (reverseMap[wl]) {
        pair = { sv: reverseMap[wl], en: wTrim }
      } else {
        // Fallback: assume w is Swedish; mirror to English if mapping missing
        pair = { sv: wTrim, en: wTrim }
      }
      
      if (pair) {
        // Create unique identifier for this pair
        const pairKey = `${pair.sv.toLowerCase()}|${pair.en.toLowerCase()}`
        
        // Count how many times this Swedish translation appears
        const svKey = pair.sv.toLowerCase()
        translationCount[svKey] = (translationCount[svKey] || 0) + 1
        
        // Only add if we haven't seen this exact pair before
        if (!usedPairs.has(pairKey)) {
          built.push(pair)
          usedPairs.add(pairKey)
        }
      }
    }
    
    // Filter out pairs where Swedish translation appears multiple times
    // This prevents conflicts like "leaf" and "leaves" both mapping to "löv"
    const filteredPairs = built.filter(pair => {
      const svKey = pair.sv.toLowerCase()
      return translationCount[svKey] === 1
    })
    
    const shuffled = filteredPairs.sort(() => Math.random() - 0.5)
    // Limit to at most 10 pairs per session to keep rounds manageable
    return shuffled.slice(0, Math.min(10, shuffled.length))
  }, [words, translations])

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('connect', trackingContext)
      setSessionId(session?.id ?? null)
    })()
    // Populate columns (independently shuffled)
    setPairs(shuffledPairs)
    setLeft(shuffledPairs.map(p => p.sv).sort(() => Math.random() - 0.5))
    setRight(shuffledPairs.map(p => p.en).sort(() => Math.random() - 0.5))
  }, [shuffledPairs, trackingContext])

  // Timer tick
  useEffect(() => {
    if (gameFinished) return
    const id = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)))
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [gameFinished])

  const isLeftUsed = (w: string) => connections.some(c => c.left === w && c.correct)
  const isRightUsed = (w: string) => connections.some(c => c.right === w && c.correct)

  const tryConnect = (l: string, r: string) => {
    const isCorrect = pairs.some(p => p.sv.toLowerCase() === l.toLowerCase() && p.en.toLowerCase() === r.toLowerCase())
    setConnections(prev => [...prev, { left: l, right: r, correct: isCorrect }])
    if (isCorrect) {
      // +1 for correct match
      setScore(prev => prev + 1)
      setStreak(prev => {
        const next = prev + 1
        setMaxStreak(m => Math.max(m, next))
        return next
      })
      void logWordAttempt({ word: r, correct: true, gameType: 'connect', context: trackingContext })
    } else {
      // -2 for incorrect match (and temporarily highlight red handled by existing UI state)
      setScore(prev => Math.max(0, prev - 2))
      setStreak(0)
      void logWordAttempt({ word: r, correct: false, gameType: 'connect', context: trackingContext })
    }
    setSelectedLeft(null)
    setSelectedRight(null)
    // End when all left words are connected correctly at least once
    const nextConnections = [...connections, { left: l, right: r, correct: isCorrect }]
    const correctCount = nextConnections.filter(c => c.correct).length
    if (correctCount >= pairs.length) {
      void finishGame(correctCount, nextConnections.length)
    }
  }

  const selectLeft = (w: string) => {
    if (gameFinished) return
    if (isLeftUsed(w)) return
    if (selectedRight) {
      tryConnect(w, selectedRight)
    } else {
      setSelectedLeft(w)
    }
  }

  const selectRight = (w: string) => {
    if (gameFinished) return
    if (isRightUsed(w)) return
    if (selectedLeft) {
      tryConnect(selectedLeft, w)
    } else {
      setSelectedRight(w)
    }
  }

  const finishGame = async (finalCorrectOverride?: number, finalAttemptsOverride?: number) => {
    // accuracy = korrekta försök / alla försök (inkl. fel)
    const correct = typeof finalCorrectOverride === 'number' ? finalCorrectOverride : connections.filter(c => c.correct).length
    const attempts = typeof finalAttemptsOverride === 'number' ? finalAttemptsOverride : connections.length
    const total = pairs.length
    const accuracy = Math.round((correct / Math.max(1, attempts)) * 100)

    // New rule: use the running score (+5/-2), and apply diminishing returns for 'connect'
    const diminished = await previewDiminishedPoints(score, 'connect', trackingContext)
    setAwardedPoints(diminished)
    const newTotal = await updateStudentProgress(score, 'connect', trackingContext)
    onScoreUpdate(diminished, newTotal)

    const started = startedAtRef.current
    if (started) {
      const durationSec = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'connect', { score: diminished, durationSec, accuracyPct: accuracy, details: { pairs: total, correct, attempts, baseScore: score, awarded_points: diminished } })
    } else {
      void endGameSession(sessionId, 'connect', { score: diminished, accuracyPct: accuracy, details: { pairs: total, correct, attempts, baseScore: score, awarded_points: diminished } })
    }
    setGameFinished(true)
  }

  const restartGame = () => {
    setSelectedLeft(null)
    setSelectedRight(null)
    setConnections([])
    setScore(0)
    setGameFinished(false)
    setStreak(0)
    setMaxStreak(0)
    startedAtRef.current = Date.now()
    setElapsedSec(0)
    ;(async () => {
      const session = await startGameSession('connect', trackingContext)
      setSessionId(session?.id ?? null)
    })()
    setLeft(shuffledPairs.map(p => p.sv).sort(() => Math.random() - 0.5))
    setRight(shuffledPairs.map(p => p.en).sort(() => Math.random() - 0.5))
  }

  if (gameFinished) {
    const correct = connections.filter(c => c.correct).length
    const attempts = connections.length
    const total = pairs.length
    const accuracy = Math.round((correct / Math.max(1, attempts)) * 100)
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
      <GameCompleteModal
        score={awardedPoints}
        accuracy={accuracy}
        time={formatTime(elapsedSec)}
        details={{
          pairs: total,
          correct,
          attempts,
          baseScore: score
        }}
        onPlayAgain={restartGame}
        onBackToDashboard={onClose}
        gameType="connect"
        themeColor={themeColor}
      />
    )
  }

  if (left.length === 0 || right.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative bg-white text-gray-800 border border-gray-200">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Preparing words...</h2>
          <p className="text-gray-600">No words available for this set yet.</p>
          <div className="mt-6">
            <button onClick={onClose} className="bg-gray-100 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-6 md:p-8 max-w-3xl w-full max-h-[85vh] overflow-auto shadow-2xl relative bg-white text-gray-800 border border-gray-200">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Link2 className="w-6 h-6 mr-2 text-emerald-400" />
            Matching Pairs
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-2xl transition-colors">×</button>
        </div>

        {/* Sticky HUD + Actions to avoid scrolling for controls */}
        <div className="sticky top-0 z-10 bg-white pb-3">
          {/* HUD: Streak and Timer */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-gray-600">
              <span className="font-semibold">Streak:</span>
              <span className="text-emerald-600 font-bold">{streak}</span>
              <span className="text-gray-500">(Max {maxStreak})</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Time</div>
              <div className="text-lg font-semibold text-gray-800">{Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={restartGame} className="bg-gray-100 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>
            <button onClick={() => finishGame()} className="bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
              Finish
            </button>
          </div>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-gray-700 font-semibold mb-2">Swedish</h3>
            <div className="space-y-2">
              {left.map((w, idx) => (
                <button
                  key={`${w}-${idx}`}
                  onClick={() => !isLeftUsed(w) && selectLeft(w)}
                  disabled={isLeftUsed(w)}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    isLeftUsed(w)
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-800 cursor-not-allowed'
                      : selectedLeft === w
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-800'
                  }`}
                  style={{ 
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    hyphens: 'none'
                  }}
                >
                  {w?.trim() || '—'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-gray-700 font-semibold mb-2">English</h3>
            <div className="space-y-2">
              {right.map((w, idx) => (
                <button
                  key={`${w}-${idx}`}
                  onClick={() => !isRightUsed(w) && selectRight(w)}
                  disabled={isRightUsed(w)}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    isRightUsed(w)
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-800 cursor-not-allowed'
                      : selectedRight === w
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-800'
                  }`}
                  style={{ 
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                    hyphens: 'none'
                  }}
                >
                  {w?.trim() || '—'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  )
}


