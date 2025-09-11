'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface QuizResult {
  id: string
  student_id: string
  word_set_id: string | null
  homework_id: string | null
  last_quiz_score: number | null
  last_quiz_at: string | null
  last_quiz_total: number | null
  last_game_type: string | null
  total_points: number | null
  games_played: number | null
  created_at: string
  updated_at: string | null
}

export default function QuizResultsDebugPage() {
  const [results, setResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuizResults()
  }, [])

  const fetchQuizResults = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .not('last_quiz_score', 'is', null)
        .not('last_quiz_at', 'is', null)
        .order('last_quiz_at', { ascending: false })

      if (error) throw error
      setResults(data || [])
    } catch (err) {
      console.error('Error fetching quiz results:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testQuizSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in first')
        return
      }

      // Create a test quiz result
      const testResult = {
        student_id: user.id,
        word_set_id: null, // You can set this to a real word set ID if available
        homework_id: null,
        last_quiz_score: 8,
        last_quiz_at: new Date().toISOString(),
        last_quiz_total: 10,
        last_game_type: 'quiz',
        total_points: 8,
        games_played: 1
      }

      const { data, error } = await supabase
        .from('student_progress')
        .insert(testResult)
        .select()

      if (error) throw error

      alert('Test quiz result saved successfully!')
      await fetchQuizResults() // Refresh the list
    } catch (err) {
      console.error('Error saving test quiz result:', err)
      alert('Error saving test quiz result: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading quiz results...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Quiz Results Debug</h1>
          <button
            onClick={testQuizSave}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Save Test Quiz Result
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-200 border border-red-500/30">
            Error: {error}
          </div>
        )}

        <div className="bg-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quiz Results ({results.length})</h2>
          <p className="text-gray-400 mb-4">
            This page shows all quiz results stored in the student_progress table.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No quiz results found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try taking a quiz or use the "Save Test Quiz Result" button above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-semibold text-blue-400 mb-2">Student ID</h3>
                    <p className="text-sm text-gray-300">{result.student_id}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-green-400 mb-2">Quiz Score</h3>
                    <p className="text-sm text-gray-300">
                      {result.last_quiz_score}/{result.last_quiz_total || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-yellow-400 mb-2">Date</h3>
                    <p className="text-sm text-gray-300">
                      {result.last_quiz_at ? new Date(result.last_quiz_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-purple-400 mb-2">Word Set ID</h3>
                    <p className="text-sm text-gray-300">{result.word_set_id || 'None'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-orange-400 mb-2">Game Type</h3>
                    <p className="text-sm text-gray-300">{result.last_game_type || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-pink-400 mb-2">Total Points</h3>
                    <p className="text-sm text-gray-300">{result.total_points || 0}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                    <div>Created: {new Date(result.created_at).toLocaleString()}</div>
                    <div>Updated: {result.updated_at ? new Date(result.updated_at).toLocaleString() : 'Never'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">Debug Information:</h3>
          <ul className="text-blue-100 text-sm space-y-1">
            <li>• This page shows raw data from the student_progress table</li>
            <li>• Quiz results should have last_quiz_score, last_quiz_at, and last_quiz_total filled</li>
            <li>• If no results appear, the migration might not have been run yet</li>
            <li>• Use the test button to create a sample quiz result</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

