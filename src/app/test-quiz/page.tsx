'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import QuizGameDebug from '@/components/games/QuizGameDebug'

export default function TestQuizPage() {
  const [testWords] = useState([
    'hello', 'world', 'test', 'quiz', 'debug'
  ])
  
  const [testTranslations] = useState({
    'hello': 'hej',
    'world': 'värld',
    'test': 'test',
    'quiz': 'quiz',
    'debug': 'felsök'
  })

  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [realWordSetId, setRealWordSetId] = useState<string | null>(null)

  const addDebugInfo = (info: string) => {
    console.log('Test Quiz:', info)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  const findRealWordSet = async () => {
    try {
      addDebugInfo('Looking for real word sets...')
      
      const { data, error } = await supabase
        .from('word_sets')
        .select('id, title')
        .limit(1)

      if (error) {
        addDebugInfo(`ERROR finding word sets: ${JSON.stringify(error, null, 2)}`)
      } else if (data && data.length > 0) {
        setRealWordSetId(data[0].id)
        addDebugInfo(`Found word set: ${data[0].title} (${data[0].id})`)
      } else {
        addDebugInfo('No word sets found')
      }

    } catch (e) {
      addDebugInfo(`EXCEPTION finding word sets: ${e}`)
    }
  }

  const testDirectSave = async () => {
    try {
      addDebugInfo('Testing direct save...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addDebugInfo('ERROR: No user found')
        return
      }

      addDebugInfo(`User: ${user.id}`)

      const testData = {
        student_id: user.id,
        word_set_id: null,
        homework_id: null,
        last_quiz_score: 8,
        last_quiz_at: new Date().toISOString(),
        last_quiz_total: 10,
        last_game_type: 'quiz',
        total_points: 8,
        games_played: 1
      }

      addDebugInfo(`Saving: ${JSON.stringify(testData, null, 2)}`)

      const { data, error } = await supabase
        .from('student_progress')
        .insert(testData)
        .select()

      if (error) {
        addDebugInfo(`ERROR: ${JSON.stringify(error, null, 2)}`)
      } else {
        addDebugInfo(`SUCCESS: ${JSON.stringify(data, null, 2)}`)
      }

    } catch (e) {
      addDebugInfo(`EXCEPTION: ${e}`)
    }
  }

  const testRead = async () => {
    try {
      addDebugInfo('Testing read...')
      
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .not('last_quiz_score', 'is', null)
        .order('last_quiz_at', { ascending: false })
        .limit(5)

      if (error) {
        addDebugInfo(`READ ERROR: ${JSON.stringify(error, null, 2)}`)
      } else {
        addDebugInfo(`READ SUCCESS: Found ${data?.length || 0} records`)
        if (data) {
          data.forEach((record, idx) => {
            addDebugInfo(`Record ${idx + 1}: ${record.last_quiz_score}/${record.last_quiz_total} at ${record.last_quiz_at}`)
          })
        }
      }

    } catch (e) {
      addDebugInfo(`READ EXCEPTION: ${e}`)
    }
  }

  const checkTableStructure = async () => {
    try {
      addDebugInfo('Checking table structure...')
      
      // Try to get one record to see what columns exist
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .limit(1)

      if (error) {
        addDebugInfo(`STRUCTURE ERROR: ${JSON.stringify(error, null, 2)}`)
      } else {
        addDebugInfo(`STRUCTURE SUCCESS: Table accessible`)
        if (data && data.length > 0) {
          const columns = Object.keys(data[0])
          addDebugInfo(`Available columns: ${columns.join(', ')}`)
        } else {
          addDebugInfo('Table is empty')
        }
      }

    } catch (e) {
      addDebugInfo(`STRUCTURE EXCEPTION: ${e}`)
    }
  }

  const [showQuiz, setShowQuiz] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Quiz Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Controls</h2>
            
            <button
              onClick={checkTableStructure}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Check Table Structure
            </button>
            
            <button
              onClick={testDirectSave}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              Test Direct Save
            </button>
            
            <button
              onClick={testRead}
              className="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg"
            >
              Test Read Results
            </button>
            
            <button
              onClick={findRealWordSet}
              className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
            >
              Find Real Word Set
            </button>
            
            <button
              onClick={() => setShowQuiz(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
            >
              Open Debug Quiz
            </button>
            
            <button
              onClick={() => setDebugInfo([])}
              className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
            >
              Clear Debug Info
            </button>
          </div>

          {/* Debug Output */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Debug Output</h2>
            <div className="bg-black/20 p-4 rounded-lg max-h-96 overflow-auto">
              <div className="space-y-1 text-sm">
                {debugInfo.map((info, idx) => (
                  <div key={idx} className="text-gray-300 font-mono">
                    {info}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Quiz Modal */}
        {showQuiz && (
          <QuizGameDebug
            words={testWords}
            translations={testTranslations}
            onClose={() => setShowQuiz(false)}
            trackingContext={{
              wordSetId: realWordSetId || undefined, // Use real word set ID if available
              homeworkId: undefined
            }}
            onSubmitScore={(score) => {
              addDebugInfo(`Quiz completed with score: ${score}`)
            }}
          />
        )}
      </div>
    </div>
  )
}
