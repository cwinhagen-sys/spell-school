'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, type TrackingContext, updateStudentProgress } from '@/lib/tracking'

interface StoryGapGameProps {
  words: string[]
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (points: number, newTotal?: number) => void
}

type GapMeta = { index: number; correct: string; why_unique: string; rejects: Array<{ word: string; reason: string }> }

export default function StoryGapGame({ words, onClose, trackingContext, themeColor, onScoreUpdate }: StoryGapGameProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gapText, setGapText] = useState('')
  const [solutionText, setSolutionText] = useState('')
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [gapsMeta, setGapsMeta] = useState<GapMeta[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [checked, setChecked] = useState(false)
  const [correctMap, setCorrectMap] = useState<Record<number, boolean>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(1)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<'green' | 'yellow' | 'red' | null>(null)

  const shuffle = (arr: string[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Fallback: create gaps from a full solution if API returns no blanks
  const makeFallbackGaps = (solution: string, pool: string[], maxGaps = 3): { gap: string; meta: GapMeta[] } => {
    const lowerPool = (pool || []).map(w => String(w).trim()).filter(Boolean)
    if (!solution || lowerPool.length === 0) {
      return { gap: solution, meta: [] }
    }
    // Prefer longer words first to avoid partial matches; cap to maxGaps unique words present in text
    const ordered = [...new Set(lowerPool.map(w => w.toLowerCase()))].sort((a, b) => b.length - a.length)
    let working = solution
    const meta: GapMeta[] = []
    let index = 1
    for (const word of ordered) {
      if (index > maxGaps) break
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\]/g, r => `\\${r}`)}\\b`, 'i')
      if (re.test(working)) {
        working = working.replace(re, '______')
        meta.push({ index, correct: word, why_unique: 'fallback', rejects: [] })
        index += 1
      }
    }
    return { gap: working, meta }
  }

  // Pick random subset (cap 8) once from words
  useEffect(() => {
    const pool = Array.isArray(words) ? words.slice() : []
    const pick = shuffle(pool).slice(0, Math.min(8, pool.length))
    setSelectedWords(pick)
  }, [words])

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(async () => {
      const session = await startGameSession('story_gap', trackingContext)
      setSessionId(session?.id ?? null)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 30000)
        const res = await fetch('/api/story-gap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordSet: selectedWords, difficulty }),
          signal: controller.signal,
        })
        let data: any
        if (!res.ok) {
          // Try to parse JSON body to recover last_output on 4xx/5xx
          let parsedBody: any = null
          try { parsedBody = await res.json() } catch { parsedBody = null }
          const fallback = parsedBody?.last_output || (parsedBody?.details && parsedBody.details.gap_text && parsedBody.details.solution_text ? {
            gap_text: parsedBody.details.gap_text,
            solution_text: parsedBody.details.solution_text,
            used_words: parsedBody.details.used || [],
            gaps_meta: [],
          } : null)
          if (fallback && fallback.gap_text && fallback.solution_text) {
            data = fallback
          } else {
            const t = typeof parsedBody === 'object' ? JSON.stringify(parsedBody) : (await res.text())
            throw new Error(`Story generation failed (${res.status}): ${t || 'unknown error'}`)
          }
        } else {
          data = await res.json()
        }
        const incomingGap = String(data.gap_text || '')
        const incomingSolution = String(data.solution_text || '')
        // If API returned no blanks, build a fallback from the solution and selected words
        let finalGap = incomingGap
        let finalMeta: GapMeta[] = Array.isArray(data.gaps_meta) ? data.gaps_meta : []
        if (!incomingGap || (incomingGap.match(/______+/g) || []).length === 0) {
          const fb = makeFallbackGaps(incomingSolution, selectedWords, 3)
          finalGap = fb.gap
          if (finalGap && (finalGap.match(/______+/g) || []).length > 0) {
            finalMeta = fb.meta
          }
        }
        setGapText(finalGap)
        setSolutionText(incomingSolution)
        // Show available words in random order (decoupled from sentence order)
        setUsedWords(shuffle(selectedWords))
        setGapsMeta(finalMeta)
        // Prepare answer slots based on number of blanks
        const blanksCount = (String(finalGap || '').match(/______+/g) || []).length
        const init: Record<number, string> = {}
        for (let i = 1; i <= blanksCount; i++) init[i] = ''
        setAnswers(init)
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          setError('Genereringen tog för lång tid. Försök igen eller välj en annan nivå.')
        } else {
          setError(e?.message || 'Failed to generate story.')
        }
      } finally {
        setLoading(false)
      }
    }
    if (selectedWords.length >= 2 && difficulty) run()
  }, [selectedWords, difficulty])

  const blanks = useMemo(() => (gapText.match(/______+/g) || []).length, [gapText])

  const allAnswered = useMemo(() => {
    for (let i = 1; i <= blanks; i++) {
      if (!answers[i] || !answers[i].trim()) return false
    }
    return true
  }, [answers, blanks])

  const allCorrect = useMemo(() => {
    if (!checked) return false
    for (let i = 1; i <= blanks; i++) {
      if (!correctMap[i]) return false
    }
    return true
  }, [checked, correctMap, blanks])

  const checkAnswersVisual = () => {
    const map: Record<number, boolean> = {}
    for (const meta of gapsMeta) {
      const user = String(answers[meta.index] || '').trim().toLowerCase()
      const correct = String(meta.correct || '').trim().toLowerCase()
      map[meta.index] = !!user && user === correct
    }
    setCorrectMap(map)
    setChecked(true)
  }

  const submit = async () => {
    if (submitted) return
    // Score: +2 per correct, 0 otherwise
    let pts = 0
    for (const meta of gapsMeta) {
      const user = (answers[meta.index] || '').trim().toLowerCase()
      const correct = String(meta.correct || '').trim().toLowerCase()
      if (user && user === correct) pts += 2
    }
    setScore(pts)
    setSubmitted(true)
    
    // Calculate accuracy percentage
    const totalGaps = gapsMeta.length
    const correctAnswers = Object.values(correctMap).filter(Boolean).length
    const accuracyPct = totalGaps > 0 ? Math.round((correctAnswers / totalGaps) * 100) : 0
    
    const newTotal = await updateStudentProgress(pts, 'story_gap', trackingContext)
    if (onScoreUpdate) onScoreUpdate(pts, newTotal)
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'story_gap', { 
        score: pts, 
        durationSec: duration, 
        accuracyPct: accuracyPct,
        details: { blanks, correctAnswers, totalGaps } 
      })
    } else {
      void endGameSession(sessionId, 'story_gap', { 
        score: pts, 
        accuracyPct: accuracyPct,
        details: { blanks, correctAnswers, totalGaps } 
      })
    }
  }

  const usedByIndex = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [k, v] of Object.entries(answers)) {
      const val = String(v || '').trim().toLowerCase()
      if (!val) continue
      map[val] = Number(k)
    }
    return map
  }, [answers])

  const handlePickWord = (word: string) => {
    if (!activeIndex) return
    const lower = String(word).toLowerCase()
    const prevIndex = usedByIndex[lower]
    setAnswers(prev => {
      const next = { ...prev }
      // clear previous usage of this word in another blank
      if (prevIndex && prevIndex !== activeIndex) next[prevIndex] = ''
      next[activeIndex] = word
      return next
    })
  }

  const renderGapSentences = () => {
    const sents = String(gapText || '').split(/(?<=[.!?])\s+/).filter(Boolean)
    let counter = 0
    return (
      <div className="space-y-3">
        {sents.map((sentence, si) => {
          const parts = sentence.split(/(______+)/)
          let rendered: React.ReactNode[] = []
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (/^_{6,}$/.test(part)) {
              counter += 1
              const idx = counter
              rendered.push(
                <input
                  key={`gap-${si}-${i}`}
                  type="text"
                  autoComplete="off"
                  value={answers[idx] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                  onFocus={() => setActiveIndex(idx)}
                  placeholder={`#${idx}`}
                  className="inline-block align-baseline mx-1 px-2 py-0.5 rounded bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-400"
                  style={{ minWidth: '7ch', maxWidth: '22ch' }}
                />
              )
            } else {
              rendered.push(<span key={`t-${si}-${i}`}>{part}</span>)
            }
          }
          const currentIdx = counter
          const isCorrect = checked ? !!correctMap[currentIdx] : null
          const frameClass = isCorrect === null
            ? ''
            : isCorrect
              ? 'border border-emerald-500/70 bg-emerald-900/10'
              : 'border border-rose-500/70 bg-rose-900/10'
          return (
            <div key={`s-${si}`} className="flex items-start gap-2">
              <div className="text-xs text-gray-400 pt-1">{si + 1}.</div>
              <div className={`whitespace-pre-wrap leading-7 flex-1 rounded-md px-2 ${frameClass}`}>{rendered}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading && difficulty) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-md w-full shadow-2xl relative bg-gray-900 text-white border border-white/10 text-center">
          <div className="mx-auto mb-4 w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
            <img src="/assets/wizard/wizard_book.png" alt="Loading" className="w-16 h-16 animate-bounce" />
          </div>
          <div className="text-lg">Conjuring your story…</div>
          <div className="mt-2 text-sm text-gray-300">Shuffling words and crafting gaps</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative bg-gray-900 text-white border border-white/10">
          <div className="text-red-300 mb-2">{error}</div>
          <button onClick={onClose} className="mt-2 bg-white/10 border border-white/10 text-white px-4 py-2 rounded hover:bg-white/15">Close</button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-md w-full shadow-2xl relative bg-gray-900 text-white border border-white/10 text-center">
          {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
          <h2 className="text-2xl font-bold mb-2">Sentence Gap</h2>
          <div className="text-lg">Poäng: {score} / {blanks * 2}</div>
          <div className="mt-2 text-sm text-gray-300">Rätt: {Math.floor(score / 2)} / {blanks}</div>
          <div className="mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 rounded-lg">Stäng</button>
          </div>
        </div>
      </div>
    )
  }

  const sentences = solutionText.split(/(?<=[.!?])\s+/).filter(Boolean)

  // Difficulty pre-selection screen
  if (!difficulty) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-md w-full shadow-2xl relative bg-gray-900 text-white border border-white/10 text-center">
          {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
          <h2 className="text-xl font-semibold mb-2">Välj svårighetsgrad</h2>
          <p className="text-sm text-gray-300 mb-4">Texten genereras först efter att du valt nivå.</p>
          <div className="flex items-center justify-center gap-2">
            <button className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500" onClick={() => setDifficulty('green')}>Green</button>
            <button className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-500" onClick={() => setDifficulty('yellow')}>Yellow</button>
            <button className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500" onClick={() => setDifficulty('red')}>Red</button>
          </div>
          <button onClick={onClose} className="mt-4 text-gray-300 hover:text-white">Avbryt</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-auto shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Sentence Gap</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">×</button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-300">
            {difficulty ? '' : 'Välj svårighetsgrad för att generera meningarna.'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-300">Level:</span>
            <button
              className={`px-2 py-1 rounded ${difficulty==='green'?'bg-emerald-600 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}
              onClick={() => setDifficulty('green')}
              title="Simple, student-friendly"
            >Green</button>
            <button
              className={`px-2 py-1 rounded ${difficulty==='yellow'?'bg-amber-600 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}
              onClick={() => setDifficulty('yellow')}
              title="Moderate complexity"
            >Yellow</button>
            <button
              className={`px-2 py-1 rounded ${difficulty==='red'?'bg-rose-600 text-white':'bg-white/10 text-gray-200 hover:bg-white/15'}`}
              onClick={() => setDifficulty('red')}
              title="More advanced"
            >Red</button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              {renderGapSentences()}
            </div>
            <div className="mt-3 text-xs text-gray-400">Active blank: {activeIndex ?? '—'}</div>
            {/* Hints removed per requirements */}
          </div>

          <div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-sm font-semibold mb-3">Available words</div>
              <div className="flex flex-wrap gap-2">
                {usedWords.map((w, i) => {
                  const key = String(w).toLowerCase()
                  const isUsed = !!usedByIndex[key]
                  return (
                    <span
                      key={`${w}-${i}`}
                      className={`select-none px-3 py-1 rounded-full border text-sm ${isUsed ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/10 border-white/20 text-white'}`}
                      title={isUsed ? 'Used in a blank' : 'Not used yet'}
                    >
                      {w}
                    </span>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-gray-400">Type the words into the blanks. Used words stay blue.</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">Blanks: {blanks} • Filled: {Object.values(answers).filter(v => String(v || '').trim()).length}</div>
          <div className="flex gap-2">
            <button onClick={checkAnswersVisual} disabled={!allAnswered || submitted} className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg disabled:bg-gray-600">Check</button>
            <button onClick={submit} disabled={!allCorrect || submitted} className="px-4 py-2 bg-blue-600 rounded-lg disabled:bg-gray-600">Submit</button>
            <button onClick={onClose} className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg">Close</button>
          </div>
        </div>

        {submitted && (
          <div className="mt-4 text-right text-gray-200">Rätt: {Math.floor(score / 2)} / {blanks} • Poäng: {score} / {blanks * 2}</div>
        )}

        {/* Facit removed per requirements */}
      </div>
    </div>
  )
}


