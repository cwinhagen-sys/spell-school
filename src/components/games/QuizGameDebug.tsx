'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, logWordAttempt, type TrackingContext } from '@/lib/tracking'
import { supabase } from '@/lib/supabase'

interface QuizGameDebugProps {
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

export default function QuizGameDebug({ words, translations = {}, onClose, trackingContext, themeColor, onSubmitScore }: QuizGameDebugProps) {
  const [items, setItems] = useState<QuizItem[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [score, setScore] = useState(0)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (info: string) => {
    console.log('Quiz Debug:', info)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  useEffect(() => {
    addDebugInfo('QuizGameDebug initialized')
    addDebugInfo(`Words: ${words.length}, Translations: ${Object.keys(translations).length}`)
    addDebugInfo(`Tracking context: ${JSON.stringify(trackingContext)}`)
    
    // Randomize direction and cap total prompts to 20
    const shuffledWords = [...(words || [])].sort(() => Math.random() - 0.5)
    const cap = Math.min(20, shuffledWords.length)
    const minQuizSize = Math.min(5, cap)
    const base = shuffledWords.slice(0, Math.max(minQuizSize, cap))
    const quiz: QuizItem[] = []
    
    for (const w of base) {
      const tr = translations[w?.toLowerCase?.()] || ''
      if (!w || !tr) continue
      const flip = Math.random() < 0.5
      if (flip) {
        quiz.push({ prompt: w, answer: tr })
      } else {
        quiz.push({ prompt: tr, answer: w })
      }
    }
    
    setItems(quiz)
    setAnswers(new Array(quiz.length).fill(''))
    addDebugInfo(`Created ${quiz.length} quiz items`)
  }, [words, translations, trackingContext])

  const handleChange = (idx: number, val: string) => {
    setAnswers(prev => prev.map((a, i) => (i === idx ? val : a)))
  }

  const submitQuiz = async () => {
    addDebugInfo('Submitting quiz...')
    
    const evals: Evaluation[] = []
    let total = 0
    
    items.forEach((q, i) => {
      const given = (answers[i] || '').trim()
      const expected = (q.answer || '').trim()
      let gained = 0
      let verdict: Verdict = 'wrong'
      
      if (given.toLowerCase() === expected.toLowerCase()) {
        gained = 2
        verdict = 'correct'
      } else if (given.length > 0) {
        gained = 1
        verdict = 'partial'
      }
      
      total += gained
      evals.push({ prompt: q.prompt, expected: q.answer, given, verdict })
    })
    
    setScore(total)
    setSubmitted(true)
    addDebugInfo(`Quiz submitted with score: ${total}/${items.length * 2}`)
    
    // Try to save the result
    await saveQuizResult(total)
  }

  const saveQuizResult = async (finalScore: number) => {
    try {
      addDebugInfo('Attempting to save quiz result...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addDebugInfo('ERROR: No user found')
        return
      }
      
      addDebugInfo(`User found: ${user.id}`)
      addDebugInfo(`Tracking context: ${JSON.stringify(trackingContext)}`)
      
      const now = new Date().toISOString()
      const quizData = {
        student_id: user.id,
        word_set_id: trackingContext?.wordSetId || null,
        homework_id: trackingContext?.homeworkId || null,
        last_quiz_score: finalScore,
        last_quiz_at: now,
        last_quiz_total: items.length * 2,
        last_game_type: 'quiz',
        total_points: finalScore,
        games_played: 1
      }
      
      // Remove null values that might cause issues with unique constraint
      const cleanQuizData = Object.fromEntries(
        Object.entries(quizData).filter(([_, value]) => value !== null)
      )
      
      addDebugInfo(`Saving data: ${JSON.stringify(cleanQuizData, null, 2)}`)
      
      const { data, error } = await supabase
        .from('student_progress')
        .upsert(cleanQuizData, { 
          onConflict: 'student_id,word_set_id,homework_id' 
        })
        .select()
      
      if (error) {
        addDebugInfo(`ERROR saving quiz result: ${JSON.stringify(error, null, 2)}`)
        console.error('Quiz save error:', error)
      } else {
        addDebugInfo(`SUCCESS: Quiz result saved: ${JSON.stringify(data, null, 2)}`)
        console.log('Quiz saved successfully:', data)
      }
      
    } catch (e) {
      addDebugInfo(`EXCEPTION saving quiz result: ${e}`)
      console.error('Quiz save exception:', e)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[1000]">
      <div className="rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl relative bg-gray-900 text-white border border-white/10">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Quiz Debug</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quiz Form */}
          <div>
            {!submitted ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quiz Questions</h3>
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
                <button 
                  onClick={submitQuiz} 
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Submit Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quiz Results</h3>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 mb-2">
                      {score} / {items.length * 2}
                    </div>
                    <div className="text-sm text-gray-300">
                      {Math.round((score / (items.length * 2)) * 100)}% correct
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Debug Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
            <div className="bg-black/20 p-4 rounded-lg max-h-96 overflow-auto">
              <div className="space-y-2 text-sm">
                {debugInfo.map((info, idx) => (
                  <div key={idx} className="text-gray-300 font-mono">
                    {info}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
