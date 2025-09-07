'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ClassRow = {
  id: string
  teacher_id: string
  name: string
  created_at: string
  join_code?: string | null
}

type ProfileRow = {
  id: string
  email: string
  username: string | null
  displayName: string
}

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedClassStudents, setSelectedClassStudents] = useState<ProfileRow[]>([])
  const [studentEmail, setStudentEmail] = useState('')
  const [selectedClassJoinCode, setSelectedClassJoinCode] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'teacher') { window.location.href = '/student'; return }
      await fetchClasses()
      setLoading(false)
    }
    init()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('classes')
        .select('id, teacher_id, name, created_at, join_code')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setClasses(data || [])
    } catch (e) {
      setMessage('Failed to load classes')
    }
  }

  const createClass = async () => {
    if (!newClassName.trim()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const join = generateJoinCode(6)
      const { error } = await supabase
        .from('classes')
        .insert({ name: newClassName.trim(), teacher_id: user.id, join_code: join })
      if (error) throw error
      setNewClassName('')
      fetchClasses()
    } catch (e: any) {
      setMessage(`Failed to create class${e?.message ? `: ${e.message}` : ''}`)
    }
  }

  const deleteClass = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id)
      if (error) throw error
      if (selectedClassId === id) {
        setSelectedClassId(null)
        setSelectedClassStudents([])
      }
      fetchClasses()
    } catch {
      setMessage('Failed to delete class')
    }
  }

  const openClass = async (id: string) => {
    setSelectedClassId(id)
    setMessage('') // Clear any previous error messages
    const found = classes.find(c => c.id === id)
    setSelectedClassJoinCode(found?.join_code ?? null)
    await fetchClassStudents(id)
  }

  const fetchClassStudents = async (classId: string) => {
    try {
      console.log('Debug - Fetching students for class:', classId)
      
      // First, get all class_students records for this class
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classId)
      
      if (classError) {
        console.error('Error fetching class students:', classError)
        throw classError
      }
      
      console.log('Debug - Class students found:', classStudents)
      
      if (!classStudents || classStudents.length === 0) {
        setSelectedClassStudents([])
        return
      }
      
      // Then, get the profile information for each student
      const studentIds = classStudents.map(cs => cs.student_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')  // Get all columns to see what's available
        .in('id', studentIds)
        .eq('role', 'student')
      
      if (profilesError) {
        console.error('Error fetching student profiles:', profilesError)
        throw profilesError
      }
      
      console.log('Debug - Student profiles loaded:', profiles)
      console.log('Debug - Profile structure:', profiles?.[0] ? Object.keys(profiles[0]) : 'No profiles')
      
      const students: ProfileRow[] = (profiles || []).map(profile => {
        // Try to find username from various possible column names
        let username = null
        if (profile.username) username = profile.username
        else if (profile.name) username = profile.name
        else if (profile.user_name) username = profile.user_name
        
        // Create a display name: username if available, otherwise email prefix
        const displayName = username || profile.email.split('@')[0] || profile.email
        
        return {
          id: profile.id,
          email: profile.email,
          username: username,
          displayName: displayName
        }
      })
      
      setSelectedClassStudents(students)
      setMessage('') // Clear any previous error messages
      console.log('Debug - Final students array:', students)
    } catch (e: any) {
      console.error('Failed to load students', e)
      setMessage(`Failed to load students${e?.message ? `: ${e.message}` : ''}`)
      setSelectedClassStudents([])
    }
  }

  const generateJoinCode = (length = 6) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return result
  }

  const setOrRegenerateJoinCode = async (classId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const newCode = generateJoinCode(6)
      const { error } = await supabase
        .from('classes')
        .update({ join_code: newCode })
        .eq('id', classId)
        .eq('teacher_id', user.id)
      if (error) throw error
      setSelectedClassJoinCode(newCode)
      await fetchClasses()
    } catch {
      setMessage('Failed to set join code (ensure DB column and policy exist)')
    }
  }

  const addStudentByEmail = async () => {
    if (!studentEmail.trim() || !selectedClassId) return
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id,email')
        .eq('email', studentEmail.trim())
        .single()
      if (!profile) { setMessage('Student not found'); return }
      const { error } = await supabase
        .from('class_students')
        .insert({ class_id: selectedClassId, student_id: profile.id })
      if (error) throw error
      setStudentEmail('')
      fetchClassStudents(selectedClassId)
    } catch {
      setMessage('Failed to add student (ensure the student exists and RLS allows it)')
    }
  }

  const removeStudent = async (studentId: string) => {
    if (!selectedClassId) return
    try {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .match({ class_id: selectedClassId, student_id: studentId })
      if (error) throw error
      fetchClassStudents(selectedClassId)
    } catch {
      setMessage('Failed to remove student (check permissions and that the relation exists)')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Classes</h1>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex gap-3">
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="New class name"
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
              />
              <button onClick={createClass} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Create</button>
            </div>
          </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold text-white mb-4">Your Classes</h2>
            <div className="space-y-3">
              {classes.map((c) => (
                <div key={c.id} className={`p-4 border rounded-lg ${selectedClassId===c.id?'border-indigo-500 bg-white/10':'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => openClass(c.id)} className="text-left font-medium text-white hover:text-indigo-300">{c.name}</button>
                    <button onClick={() => deleteClass(c.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </div>
                  <div className="mt-2 text-sm text-gray-300">
                    Join code: <span className="font-mono font-semibold text-white">{c.join_code ?? '—'}</span>
                  </div>
                </div>
              ))}
              {classes.length === 0 && <div className="text-gray-300">No classes yet.</div>}
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold text-white mb-2">Class Students</h2>
            {!selectedClassId && <div className="text-gray-300">Select a class to manage students.</div>}
            {selectedClassId && (
              <>
                <div className="mb-4 p-3 rounded-lg bg-white/10 border border-white/10">
                  <div className="text-sm text-gray-300">Share this code with your students so they can join your class:</div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="px-3 py-1 rounded bg-gray-800 border border-white/10 font-mono font-semibold text-white">{selectedClassJoinCode ?? '—'}</div>
                    <button
                      onClick={() => selectedClassId && setOrRegenerateJoinCode(selectedClassId)}
                      className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                    >
                      {selectedClassJoinCode ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 mb-4">
                  <input
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@email.com"
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
                  />
                  <button onClick={addStudentByEmail} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Add student</button>
                </div>
                <div className="space-y-3">
                  {selectedClassStudents.map(s => (
                    <div key={s.id} className="p-3 border border-white/10 rounded-lg flex items-center justify-between bg-white/5">
                      <div>
                        <div className="font-medium text-white">{s.displayName}</div>
                        {(!/@local\.local$/i.test(s.email)) && (
                          <div className="text-gray-300 text-sm">{s.email}</div>
                        )}
                      </div>
                      <button onClick={() => removeStudent(s.id)} className="text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  ))}
                  {selectedClassStudents.length === 0 && <div className="text-gray-300">No students in this class.</div>}
                </div>
              </>
            )}
          </div>
        </div>

        {message && <div className="mt-6 p-3 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">{message}</div>}
        {loading && <div className="mt-4 text-gray-400">Loading…</div>}
      </div>
    </div>
  )
}


