'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugTeacherDashboard() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Check teacher profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // Check classes
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('id, name, teacher_id')
          .eq('teacher_id', user.id)

        // Check class students
        let classStudents: any[] = []
        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id)
          const { data: cs, error: csError } = await supabase
            .from('class_students')
            .select('student_id, class_id, classes(id, name)')
            .in('class_id', classIds)
          
          classStudents = cs || []
        }

        // Check student profiles
        let students: any[] = []
        if (classStudents.length > 0) {
          const studentIds = classStudents.map(cs => cs.student_id)
          const { data: s, error: sError } = await supabase
            .from('profiles')
            .select('id, email, user_metadata, last_active, role, created_at')
            .in('id', studentIds)
            .eq('role', 'student')
          
          students = s || []
        }

        // Check student progress
        let progress: any[] = []
        if (students.length > 0) {
          const studentIds = students.map(s => s.id)
          const { data: p, error: pError } = await supabase
            .from('student_progress')
            .select('student_id, last_played_at, points, accuracy')
            .in('student_id', studentIds)
            .not('last_played_at', 'is', null)
            .order('last_played_at', { ascending: false })
            .limit(10)
          
          progress = p || []
        }

        setDebugInfo({
          teacher: {
            id: user.id,
            email: user.email,
            profile: profile,
            profileError: profileError?.message
          },
          classes: {
            count: classes?.length || 0,
            data: classes,
            error: classesError?.message
          },
          classStudents: {
            count: classStudents.length,
            data: classStudents,
            error: null
          },
          students: {
            count: students.length,
            data: students.map(s => ({
              id: s.id,
              email: s.email,
              username: s.user_metadata?.username,
              last_active: s.last_active,
              role: s.role,
              created_at: s.created_at
            })),
            error: null
          },
          progress: {
            count: progress.length,
            data: progress,
            error: null
          }
        })

      } catch (error) {
        console.error('Debug error:', error)
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    loadDebugInfo()
  }, [])

  if (loading) {
    return <div className="p-8">Loading debug info...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teacher Dashboard Debug</h1>
      
      <div className="space-y-6">
        {/* Teacher Info */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Teacher Profile</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo.teacher, null, 2)}
          </pre>
        </div>

        {/* Classes */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Classes ({debugInfo.classes?.count || 0})</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo.classes, null, 2)}
          </pre>
        </div>

        {/* Class Students */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Class Students ({debugInfo.classStudents?.count || 0})</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo.classStudents, null, 2)}
          </pre>
        </div>

        {/* Students */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Students ({debugInfo.students?.count || 0})</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo.students, null, 2)}
          </pre>
        </div>

        {/* Progress */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Student Progress ({debugInfo.progress?.count || 0})</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo.progress, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
