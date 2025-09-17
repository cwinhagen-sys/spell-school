'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export default function DebugAssignmentsStudentPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [classMemberships, setClassMemberships] = useState<any[]>([])
  const [directAssignments, setDirectAssignments] = useState<any[]>([])
  const [classAssignments, setClassAssignments] = useState<any[]>([])
  const [wordSets, setWordSets] = useState<any[]>([])
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

      // Load class memberships
      const { data: classMembershipsData, error: classMembershipsError } = await supabase
        .from('class_students')
        .select('class_id, student_id')
        .eq('student_id', user?.id)
      if (classMembershipsError) newErrors.push(`Class Memberships Error: ${classMembershipsError.message}`)
      setClassMemberships(classMembershipsData || [])

      // Load direct assignments
      const { data: directAssignmentsData, error: directAssignmentsError } = await supabase
        .from('assigned_word_sets')
        .select('id, student_id, class_id, word_set_id, due_date, created_at')
        .eq('student_id', user?.id)
      if (directAssignmentsError) newErrors.push(`Direct Assignments Error: ${directAssignmentsError.message}`)
      setDirectAssignments(directAssignmentsData || [])

      // Load class assignments
      const classIds = (classMembershipsData || []).map((r: any) => r.class_id)
      let classAssignmentsData: any[] = []
      if (classIds.length > 0) {
        const { data: cls, error: classAssignmentsError } = await supabase
          .from('assigned_word_sets')
          .select('id, student_id, class_id, word_set_id, due_date, created_at')
          .in('class_id', classIds)
          .is('student_id', null)
        if (classAssignmentsError) newErrors.push(`Class Assignments Error: ${classAssignmentsError.message}`)
        classAssignmentsData = cls || []
      }
      setClassAssignments(classAssignmentsData)

      // Load word sets (try to get all)
      const { data: wordSetsData, error: wordSetsError } = await supabase
        .from('word_sets')
        .select('id, title, color, teacher_id')
        .limit(10)
      if (wordSetsError) newErrors.push(`Word Sets Error: ${wordSetsError.message}`)
      setWordSets(wordSetsData || [])

      setErrorMessages(newErrors)

    } catch (error: any) {
      setErrorMessages(prev => [...prev, `General Error: ${error.message}`])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4">Laddar debug-information...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Student Assignment Debug</h1>

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

      <h2 className="text-xl font-semibold mt-6 mb-2">Class Memberships ({classMemberships.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(classMemberships, null, 2)}</pre>

      <h2 className="text-xl font-semibold mt-6 mb-2">Direct Assignments ({directAssignments.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(directAssignments, null, 2)}</pre>

      <h2 className="text-xl font-semibold mt-6 mb-2">Class Assignments ({classAssignments.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(classAssignments, null, 2)}</pre>

      <h2 className="text-xl font-semibold mt-6 mb-2">Word Sets ({wordSets.length})</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(wordSets, null, 2)}</pre>

      <button
        onClick={loadData}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Refresh Data
      </button>
    </div>
  )
}
