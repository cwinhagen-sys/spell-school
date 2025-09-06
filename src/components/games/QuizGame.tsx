'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, logWordAttempt, type TrackingContext } from '@/lib/tracking'
import { supabase } from '@/lib/supabase'

interface QuizGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onSubmitScore: (score: number) => Promise<void> | void
}

type QuizItem = { prompt: string; answer: string }
type Verdict = 'correct' | 'partial' | 'wrong'
type Evaluation = { prompt: string; expected: string; given: string; verdict: Verdict }

export default function QuizGame({ words, translations = {}, onClose, trackingContext, themeColor, onSubmitScore }: QuizGameProps) {
  const [items, setItems] = useState<QuizItem[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [score, setScore] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({})
  const [openExplainKey, setOpenExplainKey] = useState<string | null>(null)
  const autoSubmittedRef = useRef(false)
  const [aiTotal, setAiTotal] = useState<number | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  const fallbackExplanation = (e: Evaluation): string => {
    if (e.verdict === 'correct') return 'Bra! Ditt svar uttrycker samma betydelse. Full poäng.'
    if (e.verdict === 'partial') return 'Nästan rätt: betydelsen stämmer i stort, men det är en liten miss (stavning, form eller nyans).'
    return 'Inte riktigt: betydelsen skiljer sig från det förväntade. Jämför med rätt svar och försök igen.'
  }

  const norm = (s: unknown) => String(s ?? '').toLowerCase().trim()
  const makeKey = (prompt: string, given: string, expected: string) => `${norm(prompt)}||${norm(given)}||${norm(expected)}`

  useEffect(() => {
    // Randomize direction and cap total prompts to 20
    const shuffledWords = [...(words || [])].sort(() => Math.random() - 0.5)
    const cap = Math.min(20, shuffledWords.length)
    const minQuizSize = Math.min(5, cap) // ensure at least a few items if available
    const base = shuffledWords.slice(0, Math.max(minQuizSize, cap))
    const quiz: QuizItem[] = []
    for (const w of base) {
      const tr = translations[w?.toLowerCase?.()] || ''
      if (!w || !tr) continue
      const flip = Math.random() < 0.5
      if (flip) {
        quiz.push({ prompt: w, answer: tr }) // en -> sv
      } else {
        quiz.push({ prompt: tr, answer: w }) // sv -> en
      }
    }
    setItems(quiz)
    setAnswers(new Array(quiz.length).fill(''))
  }, [words, translations])

  useEffect(() => {
    startedAtRef.current = Date.now()
    // Quiz doesn't use game sessions - results are logged separately
  }, [trackingContext])

  // Animate loading bar to take ~10s to reach ~95%, then complete to 100% when AI is done
  useEffect(() => {
    let rafId: number | null = null
    let startTime = 0
    if (aiLoading) {
      startTime = performance.now()
      const tick = (now: number) => {
        const elapsed = Math.max(0, now - startTime)
        const target = Math.min(95, (elapsed / 10000) * 95)
        setLoadingProgress(target)
        if (aiLoading) {
          rafId = window.requestAnimationFrame(tick)
        }
      }
      rafId = window.requestAnimationFrame(tick)
    } else {
      // Complete the bar when AI finishes
      setLoadingProgress(100)
      // Optional reset a moment later so next run starts from 0
      window.setTimeout(() => setLoadingProgress(0), 400)
    }
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [aiLoading])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [submitted])

  // Removed auto-submit to prevent premature finish while typing last answer

  const handleChange = (idx: number, val: string) => {
    setAnswers(prev => prev.map((a, i) => (i === idx ? val : a)))
  }

  // Levenshtein distance for partial credit
  const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        )
      }
    }
    return dp[m][n]
  }

  const normalizeTokens = (s: string): string[] => {
    const lowered = (s || '').toLowerCase().trim()
      .replace(/[-_]/g, ' ')
      .replace(/[^a-zåäöéèüï\s]/gi, '')
      .replace(/\s+/g, ' ')
    const stopwords = new Set(['av','och','att','en','ett','det','som','för','på','i','till','från','de','du','vi','ni'])
    const roughStem = (t: string) => t.endsWith('et') ? t.slice(0, -2) : (t.endsWith('en') ? t.slice(0, -2) : t)
    return lowered.split(' ').filter(Boolean).filter(t => !stopwords.has(t)).map(roughStem)
  }

  const submitQuiz = async () => {
    const evals: Evaluation[] = []
    let total = 0
    items.forEach((q, i) => {
      const given = (answers[i] || '').trim()
      const aRaw = given.toLowerCase()
      const expected = (q.answer || '').trim().toLowerCase()
      let gained = 0
      let verdict: Verdict = 'wrong'
      if (aRaw.length > 0) {
        if (aRaw === expected) {
          gained = 2
          verdict = 'correct'
        } else {
          const isSingleExpected = expected.split(' ').length === 1
          const isSingleGiven = aRaw.split(' ').length === 1
          // Token-based comparison for multi-word paraphrases
          if (!(isSingleExpected && isSingleGiven)) {
            const gTokens = normalizeTokens(given)
            const eTokens = normalizeTokens(q.answer)
            if (gTokens.length > 0 && eTokens.length > 0) {
              const gSet = new Set(gTokens)
              const eSet = new Set(eTokens)
              const intersection = [...gSet].filter(t => eSet.has(t))
              const sameSets = gSet.size === eSet.size && intersection.length === gSet.size
              const overlapRatio = intersection.length / Math.max(1, eSet.size)
              if (sameSets) {
                gained = 2
                verdict = 'correct'
              } else if (intersection.length >= 2 || overlapRatio >= 0.6) {
                gained = 1
                verdict = 'partial'
              }
            }
          }
          // Fallback to edit distance for single-word cases
          if (gained === 0) {
            // Make short single words strict: length <= 3 -> no partial credit unless exact
            const shortSingleStrict = (isSingleExpected && isSingleGiven && expected.length <= 3)
            if (!shortSingleStrict) {
              const dist = levenshtein(aRaw, expected)
              const threshold = Math.max(1, Math.round(expected.length * 0.2))
              if (dist <= threshold) {
                gained = 1
                verdict = 'partial'
              }
            }
          }
        }
      }
      total += gained
      const correctAny = gained > 0
      evals.push({ prompt: q.prompt, expected: q.answer, given, verdict })
      void logWordAttempt({ word: q.prompt, correct: correctAny, gameType: 'quiz', context: trackingContext })
    })
    setEvaluations(evals)
    setScore(total)
    setSubmitted(true)
    // Start AI grading immediately using the freshly computed evaluations (avoids stale state)
    void finalizeSubmission(true, evals, total)
  }

  const finalizeSubmission = async (silent?: boolean, evalOverride?: Evaluation[], baseScore?: number) => {
    // Try AI grading first; fallback to local score if it fails
    let finalScore = typeof baseScore === 'number' ? baseScore : score
    try {
      setAiLoading(true)
      const payload = {
        items: (evalOverride ?? evaluations).map(e => ({ prompt: e.prompt, expected: e.expected, given: e.given })),
        sourceLanguage: 'auto',
        targetLanguage: 'auto'
      }
      const res = await fetch('/api/quiz-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data?.total === 'number') {
          finalScore = data.total
          setAiTotal(data.total)
        }
        if (Array.isArray(data?.results)) {
          const m: Record<string, string> = {}
          const pts: Record<string, number> = {}
          for (const r of data.results) {
            if (r?.prompt && r?.given !== undefined && r?.expected !== undefined && r?.explanation_sv) {
              const k = makeKey(r.prompt, r.given, r.expected)
              m[k] = String(r.explanation_sv)
            }
            if (r?.prompt && r?.given !== undefined && r?.expected !== undefined && typeof r?.points === 'number') {
              const k2 = makeKey(r.prompt, r.given, r.expected)
              pts[k2] = Math.max(0, Math.min(2, Number(r.points)))
            }
          }
          setAiExplanations(m)
          // Rebuild verdicts based on AI points so list-kolumner speglar AI‑bedömningen
          const rebuilt = (evalOverride ?? evaluations).map(e => {
            const k = makeKey(e.prompt, e.given, e.expected)
            const p = pts[k]
            if (p === 2) return { ...e, verdict: 'correct' as const }
            if (p === 1) return { ...e, verdict: 'partial' as const }
            if (p === 0) return { ...e, verdict: 'wrong' as const }
            return e
          })
          setEvaluations(rebuilt)
        }
      }
    } catch (_) {
      // keep local score
    }
    finally {
      setAiLoading(false)
    }
    setScore(finalScore)
    await Promise.resolve(onSubmitScore(finalScore))
    // Upsert latest quiz score in student_progress (only per word set, not global)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && trackingContext?.wordSetId) {
        const now = new Date().toISOString()
        // Only save per word set, not globally
        await supabase.from('student_progress').upsert({
          student_id: user.id,
          word_set_id: trackingContext.wordSetId,
          homework_id: trackingContext?.homeworkId ?? null,
          last_quiz_score: finalScore,
          last_quiz_at: now,
          last_quiz_total: items.length * 2, // Total possible points (2 points per word)
        }, { onConflict: 'student_id,word_set_id,homework_id' })
      }
    } catch (e) {
      // non-critical
    }
    // Quiz results are logged separately in student_progress, not as game sessions
    // No need to log to game_sessions for quiz
    if (!silent) setFinalized(true)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[1000]">
      <div className="rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Quiz</h2>
          {submitted ? (
            <span className="text-sm text-gray-400">Result registered</span>
          ) : (
            <span className="text-sm text-gray-400">Finish and submit to exit</span>
          )}
        </div>

        {!submitted ? (
          <div className="space-y-4">
            {items.map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm text-gray-300 mb-2">Translate:</div>
                <div className="text-xl font-semibold mb-3">{q.prompt}</div>
                <input
                  value={answers[idx]}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  placeholder="Type your translation..."
                  className="w-full px-4 py-2 rounded bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            ))}
            <div className="flex justify-end gap-3">
              <button onClick={submitQuiz} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Submit Quiz</button>
            </div>
          </div>
        ) : !finalized ? (
          <div className="space-y-4">
            {aiLoading ? (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4">
                <div className="text-sm text-blue-200">Rättar och genererar feedback…</div>
                <div className="mt-3 h-2 w-full bg-white/10 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400/70 via-blue-500/80 to-blue-400/70 rounded"
                       style={{ width: `${loadingProgress}%`, transition: 'width 0.08s linear' }} />
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <h3 className="text-lg font-semibold mb-3">Dina svar</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {evaluations.map((e, i) => {
                      const k = makeKey(e.prompt, e.given, e.expected)
                      const explanation = aiExplanations[k] ?? fallbackExplanation(e)
                      const open = openExplainKey === k
                      const colorBase = e.verdict === 'correct' ? 'emerald' : e.verdict === 'partial' ? 'amber' : 'red'
                      const boxClasses =
                        colorBase === 'emerald'
                          ? 'bg-emerald-500/15 border-emerald-400/30 hover:bg-emerald-500/20'
                          : colorBase === 'amber'
                            ? 'bg-amber-500/15 border-amber-400/30 hover:bg-amber-500/20'
                            : 'bg-red-500/15 border-red-400/30 hover:bg-red-500/20'
                      const textColor =
                        colorBase === 'emerald' ? 'text-emerald-200' : colorBase === 'amber' ? 'text-amber-200' : 'text-red-200'
                      return (
                        <div key={i}
                             className={`rounded-xl border p-4 cursor-pointer transition-colors ${boxClasses}`}
                             onClick={() => setOpenExplainKey(open ? null : k)}
                        >
                          <div className={`text-sm opacity-80 mb-1 ${textColor}`}>{e.prompt}</div>
                          <div className={`text-base font-semibold ${textColor}`}>{e.given || '—'}</div>
                          {open && (
                            <div className="mt-3 text-xs text-white/90 bg-white/5 border border-white/10 rounded p-2">
                              <div>{explanation}</div>
                              {e.verdict !== 'correct' && (
                                <div className="mt-2">
                                  <span className="opacity-80">Rätt svar: </span>
                                  <span className="font-semibold">{e.expected}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-300">Total points: <span className="font-semibold text-white">{aiTotal ?? score}</span> / {items.length * 2}</div>
                  <button onClick={onClose} className="px-4 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/15">Fortsätt</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2">Quiz submitted!</h3>
            <p className="text-gray-300 mb-6">Your score: {score} / {items.length * 2}</p>
            <button onClick={onClose} className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/15">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}


