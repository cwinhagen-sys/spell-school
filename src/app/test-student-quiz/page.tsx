'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestStudentQuizPage() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')

  const addDebugInfo = (info: string) => {
    console.log('Student Quiz Test:', info)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      addDebugInfo('Loading students from classes...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addDebugInfo('No user found')
        return
      }

      addDebugInfo(`User ID: ${user.id}`)

      // Get teacher's classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id)

      if (classesError) {
        addDebugInfo(`Classes error: ${JSON.stringify(classesError, null, 2)}`)
        return
      }

      addDebugInfo(`Classes found: ${classes?.length || 0}`)
      if (classes) {
        classes.forEach((cls, idx) => {
          addDebugInfo(`Class ${idx + 1}: ${cls.name} (${cls.id})`)
        })
      }

      if (!classes || classes.length === 0) {
        addDebugInfo('No classes found')
        return
      }

      const classIds = classes.map(c => c.id)
      addDebugInfo(`Class IDs: ${classIds.join(', ')}`)
      
      // First, try to get just student IDs
      const { data: classStudents, error: studentsError } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds)

      if (studentsError) {
        addDebugInfo(`Students error: ${JSON.stringify(studentsError, null, 2)}`)
        return
      }

      addDebugInfo(`Raw class students data: ${JSON.stringify(classStudents, null, 2)}`)

      if (!classStudents || classStudents.length === 0) {
        addDebugInfo('No students found in classes')
        return
      }

      const studentIds = classStudents.map(cs => cs.student_id)
      addDebugInfo(`Student IDs: ${studentIds.join(', ')}`)

      // Now get profile information for these students
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username, display_alias')
        .in('id', studentIds)

      if (profilesError) {
        addDebugInfo(`Profiles error: ${JSON.stringify(profilesError, null, 2)}`)
        return
      }

      addDebugInfo(`Profiles found: ${profiles?.length || 0}`)
      addDebugInfo(`Raw profiles data: ${JSON.stringify(profiles, null, 2)}`)

      const studentList = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        username: profile.username,
        display_alias: profile.display_alias
      })) || []

      addDebugInfo(`Processed student list: ${JSON.stringify(studentList, null, 2)}`)
      setStudents(studentList)
      addDebugInfo(`Found ${studentList.length} students`)

    } catch (e) {
      addDebugInfo(`Exception: ${e}`)
    }
  }

  const createStudentQuizResult = async () => {
    try {
      if (!selectedStudent) {
        addDebugInfo('Please select a student first')
        return
      }

      addDebugInfo(`Creating quiz result for student: ${selectedStudent}`)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        addDebugInfo('No user found')
        return
      }

      // Get a word set owned by the teacher
      const { data: wordSets, error: wordSetsError } = await supabase
        .from('word_sets')
        .select('id, title')
        .eq('teacher_id', user.id)
        .limit(1)

      if (wordSetsError) {
        addDebugInfo(`Word sets error: ${JSON.stringify(wordSetsError, null, 2)}`)
        return
      }

      if (!wordSets || wordSets.length === 0) {
        addDebugInfo('No word sets found for teacher')
        return
      }

      const wordSetId = wordSets[0].id
      addDebugInfo(`Using word set: ${wordSets[0].title} (${wordSetId})`)

      // Create quiz result for the selected student
      const quizData = {
        student_id: selectedStudent,
        word_set_id: wordSetId,
        homework_id: null,
        last_quiz_score: Math.floor(Math.random() * 8) + 3, // Random score 3-10
        last_quiz_at: new Date().toISOString(),
        last_quiz_total: 10,
        last_game_type: 'quiz',
        total_points: Math.floor(Math.random() * 8) + 3,
        games_played: 1
      }

      addDebugInfo(`Creating quiz result: ${JSON.stringify(quizData, null, 2)}`)

      const { data, error } = await supabase
        .from('student_progress')
        .insert(quizData)
        .select()

      if (error) {
        addDebugInfo(`ERROR: ${JSON.stringify(error, null, 2)}`)
      } else {
        addDebugInfo(`SUCCESS: Quiz result created for student`)
        addDebugInfo(`Result: ${JSON.stringify(data, null, 2)}`)
      }

    } catch (e) {
      addDebugInfo(`Exception: ${e}`)
    }
  }

  const testTeacherView = async () => {
    try {
      addDebugInfo('Testing teacher view query...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get teacher's classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)

      if (!classes || classes.length === 0) {
        addDebugInfo('No classes found')
        return
      }

      const classIds = classes.map(c => c.id)
      
      // Get students from classes
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds)

      const studentIds = classStudents?.map(cs => cs.student_id) || []
      addDebugInfo(`Students in classes: ${studentIds.length}`)

      // Query quiz results
      const { data: quizResults, error } = await supabase
        .from('student_progress')
        .select('id, student_id, word_set_id, last_quiz_score, last_quiz_at, last_quiz_total')
        .not('last_quiz_score', 'is', null)
        .not('last_quiz_at', 'is', null)
        .not('word_set_id', 'is', null)
        .in('student_id', studentIds)

      if (error) {
        addDebugInfo(`Query error: ${JSON.stringify(error, null, 2)}`)
        return
      }

      addDebugInfo(`Teacher view found: ${quizResults?.length || 0} quiz results`)
      if (quizResults) {
        quizResults.forEach((result, idx) => {
          addDebugInfo(`Result ${idx + 1}: Student ${result.student_id}, Score ${result.last_quiz_score}/${result.last_quiz_total}`)
        })
      }

    } catch (e) {
      addDebugInfo(`Exception: ${e}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Student Quiz Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Controls</h2>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white"
              >
                <option value="" className="text-black">Choose a student...</option>
                {students.map(student => (
                  <option key={student.id} value={student.id} className="text-black">
                    {student.display_alias || student.username || student.email || student.id}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={createStudentQuizResult}
              disabled={!selectedStudent}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg"
            >
              Create Quiz Result for Selected Student
            </button>
            
            <button
              onClick={testTeacherView}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              Test Teacher View Query
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
