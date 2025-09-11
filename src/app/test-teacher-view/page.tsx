'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestTeacherViewPage() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const addDebugInfo = (info: string) => {
    console.log('Teacher View Test:', info)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  useEffect(() => {
    checkUserAndProfile()
  }, [])

  const checkUserAndProfile = async () => {
    try {
      addDebugInfo('Checking user and profile...')
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        addDebugInfo(`User error: ${JSON.stringify(userError, null, 2)}`)
        return
      }
      
      if (!user) {
        addDebugInfo('No user found')
        return
      }
      
      setUser(user)
      addDebugInfo(`User found: ${user.id}`)
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        addDebugInfo(`Profile error: ${JSON.stringify(profileError, null, 2)}`)
        return
      }
      
      setProfile(profile)
      addDebugInfo(`Profile found: ${JSON.stringify(profile, null, 2)}`)
      
    } catch (e) {
      addDebugInfo(`Exception: ${e}`)
    }
  }

  const testQuizResultsQuery = async () => {
    try {
      addDebugInfo('Testing quiz results query...')
      
      if (!user) {
        addDebugInfo('No user found for query test')
        return
      }
      
      // First, get all students for this teacher
      const { data: teacherClasses, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
      
      if (classesError) {
        addDebugInfo(`Classes error: ${JSON.stringify(classesError, null, 2)}`)
        return
      }
      
      addDebugInfo(`Teacher classes: ${teacherClasses?.length || 0}`)
      
      if (!teacherClasses || teacherClasses.length === 0) {
        addDebugInfo('No classes found for teacher')
        return
      }
      
      const classIds = teacherClasses.map(c => c.id)
      const { data: classStudents, error: studentsError } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds)
      
      if (studentsError) {
        addDebugInfo(`Students error: ${JSON.stringify(studentsError, null, 2)}`)
        return
      }
      
      const studentIds = classStudents?.map(cs => cs.student_id) || []
      addDebugInfo(`Students in classes: ${studentIds.length}`)
      
      // Now query quiz results
      const { data: quizResults, error: quizError } = await supabase
        .from('student_progress')
        .select('id, student_id, word_set_id, last_quiz_score, last_quiz_at, last_quiz_total')
        .not('last_quiz_score', 'is', null)
        .not('last_quiz_at', 'is', null)
        .not('word_set_id', 'is', null)
        .in('student_id', studentIds)
      
      if (quizError) {
        addDebugInfo(`Quiz results error: ${JSON.stringify(quizError, null, 2)}`)
        return
      }
      
      addDebugInfo(`Quiz results found: ${quizResults?.length || 0}`)
      if (quizResults) {
        quizResults.forEach((result, idx) => {
          addDebugInfo(`Result ${idx + 1}: Student ${result.student_id}, Score ${result.last_quiz_score}/${result.last_quiz_total}, Word Set ${result.word_set_id}`)
        })
      }
      
    } catch (e) {
      addDebugInfo(`Query exception: ${e}`)
    }
  }

  const testAllQuizResults = async () => {
    try {
      addDebugInfo('Testing all quiz results (no filters)...')
      
      const { data: allResults, error: allError } = await supabase
        .from('student_progress')
        .select('*')
        .not('last_quiz_score', 'is', null)
        .not('last_quiz_at', 'is', null)
        .order('last_quiz_at', { ascending: false })
        .limit(10)
      
      if (allError) {
        addDebugInfo(`All results error: ${JSON.stringify(allError, null, 2)}`)
        return
      }
      
      addDebugInfo(`All quiz results found: ${allResults?.length || 0}`)
      if (allResults) {
        allResults.forEach((result, idx) => {
          addDebugInfo(`Result ${idx + 1}: Student ${result.student_id}, Score ${result.last_quiz_score}/${result.last_quiz_total}, Word Set ${result.word_set_id}`)
        })
      }
      
    } catch (e) {
      addDebugInfo(`All results exception: ${e}`)
    }
  }

  const checkWordSetOwnership = async () => {
    try {
      addDebugInfo('Checking word set ownership...')
      
      if (!user) {
        addDebugInfo('No user found for word set check')
        return
      }
      
      const { data: wordSets, error: wordSetsError } = await supabase
        .from('word_sets')
        .select('id, title, teacher_id')
        .eq('teacher_id', user.id)
      
      if (wordSetsError) {
        addDebugInfo(`Word sets error: ${JSON.stringify(wordSetsError, null, 2)}`)
        return
      }
      
      addDebugInfo(`Teacher's word sets: ${wordSets?.length || 0}`)
      if (wordSets) {
        wordSets.forEach((ws, idx) => {
          addDebugInfo(`Word set ${idx + 1}: ${ws.title} (${ws.id})`)
        })
      }
      
    } catch (e) {
      addDebugInfo(`Word sets exception: ${e}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teacher View Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Controls</h2>
            
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">User Info</h3>
              <p className="text-sm text-gray-300">
                User: {user ? user.id : 'Not found'}
              </p>
              <p className="text-sm text-gray-300">
                Role: {profile?.role || 'Unknown'}
              </p>
            </div>
            
            <button
              onClick={testQuizResultsQuery}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Test Quiz Results Query
            </button>
            
            <button
              onClick={testAllQuizResults}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              Test All Quiz Results
            </button>
            
            <button
              onClick={checkWordSetOwnership}
              className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
            >
              Check Word Set Ownership
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
      </div>
    </div>
  )
}

