'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface QuizResponse {
  id: string
  word_en: string
  word_sv: string
  student_answer: string
  is_correct: boolean | null
  score: number | null
  graded_by: string | null
}

export default function QuizGradingPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const participantId = params.participantId as string
  const [responses, setResponses] = useState<QuizResponse[]>([])
  const [participantName, setParticipantName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sessionId && participantId) {
      loadData()
    }
  }, [sessionId, participantId])

  const loadData = async () => {
    try {
      // Load participant name
      const { data: participantData } = await supabase
        .from('session_participants')
        .select('student_name')
        .eq('id', participantId)
        .single()

      if (participantData) {
        setParticipantName(participantData.student_name)
      }

      // Load quiz responses
      const { data: responsesData, error } = await supabase
        .from('session_quiz_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('participant_id', participantId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setResponses(responsesData || [])
    } catch (error) {
      console.error('Error loading quiz data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGrade = (responseId: string) => {
    setResponses(prev => prev.map(resp => {
      if (resp.id !== responseId) return resp
      
      // Cycle through: null -> correct (2p) -> partial (1p) -> wrong (0p) -> null
      const currentScore = resp.score
      const currentCorrect = resp.is_correct
      
      if (currentScore === null || currentCorrect === null) {
        // First click: 2 points (green)
        return { ...resp, is_correct: true, score: 100 }
      } else if (currentScore === 100) {
        // Second click: 1 point (yellow)
        return { ...resp, is_correct: false, score: 50 }
      } else if (currentScore === 50) {
        // Third click: 0 points (red)
        return { ...resp, is_correct: false, score: 0 }
      } else {
        // Fourth click: back to null (ungraded)
        return { ...resp, is_correct: null, score: null }
      }
    }))
  }

  const saveGrades = async () => {
    setSaving(true)
    try {
      // Update all responses
      for (const response of responses) {
        const { error } = await supabase
          .from('session_quiz_responses')
          .update({
            is_correct: response.is_correct,
            score: response.score,
            graded_by: 'manual',
            graded_at: response.is_correct !== null ? new Date().toISOString() : null,
            feedback: response.score === 100 ? 'Correct!' : response.score === 50 ? 'Almost correct' : response.score === 0 ? 'Wrong' : null
          })
          .eq('id', response.id)

        if (error) {
          console.error('Error updating response:', error)
        }
      }

      alert('Grades saved!')
      router.push(`/teacher/sessions/${sessionId}`)
    } catch (error) {
      console.error('Error saving grades:', error)
      alert('Could not save grades. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getGradeColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 border-gray-300'
    if (score === 100) return 'bg-green-100 border-green-500'
    if (score === 50) return 'bg-yellow-100 border-yellow-500'
    return 'bg-red-100 border-red-500'
  }

  const getGradeIcon = (score: number | null) => {
    if (score === null) return null
    if (score === 100) return <CheckCircle2 className="w-5 h-5 text-green-600" />
    if (score === 50) return <AlertCircle className="w-5 h-5 text-yellow-600" />
    return <XCircle className="w-5 h-5 text-red-600" />
  }

  const getGradeText = (score: number | null) => {
    if (score === null) return 'Click to grade'
    if (score === 100) return '2 points'
    if (score === 50) return '1 point'
    return '0 points'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/teacher/sessions/${sessionId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to session
        </Link>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Grade Quiz - {participantName}
          </h1>
          <p className="text-gray-600">
            Click on each word to grade: 1 click = green (2p), 2 clicks = yellow (1p), 3 clicks = red (0p)
          </p>
        </div>

        {responses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No quiz responses found for this participant.</p>
            <p className="text-sm text-gray-500">
              The student hasn't taken the quiz yet, or the quiz is not unlocked (due date has not passed).
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {responses.map((response) => (
                <div
                  key={response.id}
                  onClick={() => toggleGrade(response.id)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${getGradeColor(response.score)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {response.word_en}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {response.word_sv}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Student's answer: </span>
                        <span className={`text-sm font-medium ${
                          response.student_answer.trim() === '' 
                            ? 'text-gray-400 italic' 
                            : 'text-gray-900'
                        }`}>
                          {response.student_answer.trim() || '(empty)'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getGradeIcon(response.score)}
                      <span className={`text-sm font-medium ${
                        response.score === 100 ? 'text-green-700' :
                        response.score === 50 ? 'text-yellow-700' :
                        response.score === 0 ? 'text-red-700' :
                        'text-gray-600'
                      }`}>
                        {getGradeText(response.score)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveGrades}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save grades'}
              </button>
              <Link
                href={`/teacher/sessions/${sessionId}`}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

