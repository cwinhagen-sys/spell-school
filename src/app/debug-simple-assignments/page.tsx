'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DebugSimpleAssignmentsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setErrors([])
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setErrors(prev => [...prev, `User Error: ${userError.message}`])
      }
      setUser(user)

      if (!user) {
        setErrors(prev => [...prev, 'No user found'])
        setLoading(false)
        return
      }

      console.log('Debug - User ID:', user.id)

      // Try to get class memberships
      const { data: classStudentsData, error: classStudentsError } = await supabase
        .from('class_students')
        .select('class_id, student_id')
        .eq('student_id', user.id)

      if (classStudentsError) {
        setErrors(prev => [...prev, `Class Students Error: ${classStudentsError.message}`])
        console.error('Class students error:', classStudentsError)
      } else {
        setClassStudents(classStudentsData || [])
        console.log('Debug - Class students:', classStudentsData)
      }

      // Try to get individual assignments
      const { data: individualAssignments, error: individualError } = await supabase
        .from('assigned_word_sets')
        .select('*')
        .eq('student_id', user.id)

      if (individualError) {
        setErrors(prev => [...prev, `Individual Assignments Error: ${individualError.message}`])
        console.error('Individual assignments error:', individualError)
      } else {
        console.log('Debug - Individual assignments:', individualError)
      }

      // Try to get class assignments
      const classIds = (classStudentsData || []).map(cs => cs.class_id)
      let classAssignments: any[] = []
      
      if (classIds.length > 0) {
        const { data: classAssignmentsData, error: classAssignmentsError } = await supabase
          .from('assigned_word_sets')
          .select('*')
          .in('class_id', classIds)
          .is('student_id', null)

        if (classAssignmentsError) {
          setErrors(prev => [...prev, `Class Assignments Error: ${classAssignmentsError.message}`])
          console.error('Class assignments error:', classAssignmentsError)
        } else {
          classAssignments = classAssignmentsData || []
          console.log('Debug - Class assignments:', classAssignmentsData)
        }
      }

      // Combine all assignments
      const allAssignments = [
        ...(individualAssignments || []),
        ...classAssignments
      ]
      
      setAssignments(allAssignments)
      console.log('Debug - All assignments:', allAssignments)

    } catch (error: any) {
      setErrors(prev => [...prev, `General Error: ${error.message}`])
      console.error('General error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4">Laddar...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Assignment Debug</h1>

      {errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Errors:</strong>
          <ul className="list-disc ml-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User Info</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Class Memberships ({classStudents.length})</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(classStudents, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Assignments ({assignments.length})</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(assignments, null, 2)}
          </pre>
        </div>
      </div>

      <button
        onClick={loadData}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Refresh
      </button>
    </div>
  )
}












