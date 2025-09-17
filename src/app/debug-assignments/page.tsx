'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export default function DebugAssignmentsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setErrorMessages([])
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const newErrors: string[] = []

      // Load assignments for this student
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assigned_word_sets')
        .select(`
          id,
          class_id,
          student_id,
          word_set_id,
          created_at,
          due_date,
          quiz_unlocked,
          word_sets (
            id,
            title,
            words,
            color
          ),
          classes (
            id,
            name
          )
        `)
        .or(`student_id.eq.${user?.id},class_id.in.(${await getClassIds()})`)

      if (assignmentsError) {
        newErrors.push(`Assignments Error: ${assignmentsError.message}`)
        console.error('Assignments error:', assignmentsError)
      }
      setAssignments(assignmentsData || [])

      // Load class students for this user
      const { data: classStudentsData, error: classStudentsError } = await supabase
        .from('class_students')
        .select(`
          class_id,
          student_id,
          classes (
            id,
            name,
            teacher_id
          )
        `)
        .eq('student_id', user?.id)

      if (classStudentsError) {
        newErrors.push(`Class Students Error: ${classStudentsError.message}`)
        console.error('Class students error:', classStudentsError)
      }
      setClassStudents(classStudentsData || [])

      // Load classes this student belongs to
      const classIds = (classStudentsData || []).map(cs => cs.class_id)
      if (classIds.length > 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name, teacher_id')
          .in('id', classIds)

        if (classesError) {
          newErrors.push(`Classes Error: ${classesError.message}`)
          console.error('Classes error:', classesError)
        }
        setClasses(classesData || [])
      }

      setErrorMessages(newErrors)

    } catch (error: any) {
      setErrorMessages(prev => [...prev, `General Error: ${error.message}`])
    } finally {
      setLoading(false)
    }
  }

  const getClassIds = async () => {
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user?.id)
    
    return (classStudents || []).map(cs => cs.class_id).join(',')
  }

  if (loading) {
    return <div className="p-4">Laddar debug-information...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Assignments</h1>

      {errorMessages.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Errors:</strong>
          <ul className="list-disc ml-5">
            {errorMessages.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-2">Current User</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(user, null, 2)}</pre>

      <h2 className="text-xl font-semibold mt-6 mb-2">Class Students ({classStudents.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(classStudents, null, 2)}</pre>

      <h2 className="text-xl font-semibold mt-6 mb-2">Classes ({classes.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(classes, null, 2)}</pre>

      <h2 className="text-xl font-semibold mt-6 mb-2">Assignments ({assignments.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(assignments, null, 2)}</pre>

      <button
        onClick={loadData}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Refresh Data
      </button>
    </div>
  )
}
