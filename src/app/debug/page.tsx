'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [user, setUser] = useState<any>(null)
  const [wordSets, setWordSets] = useState<any[]>([])
  const [assignedWordSets, setAssignedWordSets] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }
        setUser(user)

        // Fetch all data for debugging
        await Promise.all([
          fetchWordSets(),
          fetchAssignedWordSets(),
          fetchClasses(),
          fetchClassStudents()
        ])
      } catch (error) {
        console.error('Debug init error:', error)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const fetchWordSets = async () => {
    try {
      const { data, error } = await supabase
        .from('word_sets')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setWordSets(data || [])
    } catch (error) {
      console.error('Error fetching word sets:', error)
    }
  }

  const fetchAssignedWordSets = async () => {
    try {
      const { data, error } = await supabase
        .from('assigned_word_sets')
        .select(`
          *,
          word_sets (*),
          classes (name),
          profiles (email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAssignedWordSets(data || [])
    } catch (error) {
      console.error('Error fetching assigned word sets:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchClassStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          *,
          classes (name),
          profiles (email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClassStudents(data || [])
    } catch (error) {
      console.error('Error fetching class students:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading debug data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Information</h1>
        
        <div className="grid gap-8">
          {/* User Info */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Current User</h2>
            <pre className="bg-black/20 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* Word Sets */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Word Sets ({wordSets.length})</h2>
            {wordSets.length === 0 ? (
              <p className="text-gray-400">No word sets found</p>
            ) : (
              <div className="space-y-4">
                {wordSets.map((ws) => (
                  <div key={ws.id} className="bg-black/20 p-4 rounded">
                    <div className="font-medium">{ws.title}</div>
                    <div className="text-sm text-gray-400">ID: {ws.id}</div>
                    <div className="text-sm text-gray-400">Teacher: {ws.teacher_id}</div>
                    <div className="text-sm text-gray-400">Words: {JSON.stringify(ws.words)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Word Sets */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Assigned Word Sets ({assignedWordSets.length})</h2>
            {assignedWordSets.length === 0 ? (
              <p className="text-gray-400">No assignments found</p>
            ) : (
              <div className="space-y-4">
                {assignedWordSets.map((assignment) => (
                  <div key={assignment.id} className="bg-black/20 p-4 rounded">
                    <div className="font-medium">Assignment ID: {assignment.id}</div>
                    <div className="text-sm text-gray-400">
                      Word Set: {assignment.word_sets?.title || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Class: {assignment.classes?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Student: {assignment.profiles?.email || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Classes */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Classes ({classes.length})</h2>
            {classes.length === 0 ? (
              <p className="text-gray-400">No classes found</p>
            ) : (
              <div className="space-y-4">
                {classes.map((cls) => (
                  <div key={cls.id} className="bg-black/20 p-4 rounded">
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-sm text-gray-400">ID: {cls.id}</div>
                    <div className="text-sm text-gray-400">Teacher: {cls.teacher_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class Students */}
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Class Students ({classStudents.length})</h2>
            {classStudents.length === 0 ? (
              <p className="text-gray-400">No class memberships found</p>
            ) : (
              <div className="space-y-4">
                {classStudents.map((cs) => (
                  <div key={cs.id} className="bg-black/20 p-4 rounded">
                    <div className="font-medium">Class: {cs.classes?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-400">Student: {cs.profiles?.email || 'N/A'}</div>
                    <div className="text-sm text-gray-400">Class ID: {cs.class_id}</div>
                    <div className="text-sm text-gray-400">Student ID: {cs.student_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

























