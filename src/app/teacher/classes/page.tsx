'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, X, Trash2 } from 'lucide-react'

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
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [classToDelete, setClassToDelete] = useState<ClassRow | null>(null)

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
      if (!user) {
        console.log('No user found')
        return
      }
      console.log('Fetching classes for user:', user.id)
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, teacher_id, name, created_at, join_code')
        .eq('teacher_id', user.id)
        .is('deleted_at', null) // GDPR: Visa bara icke-raderade klasser
        .order('created_at', { ascending: false })
      
      console.log('Classes query result:', { data, error })
      
      if (error) {
        console.error('Error fetching classes:', error)
        throw error
      }
      setClasses(data || [])
    } catch (e) {
      console.error('Failed to load classes:', e)
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

  const confirmDeleteClass = (classToDelete: ClassRow) => {
    setClassToDelete(classToDelete)
    setShowDeleteWarning(true)
  }

  const deleteClass = async () => {
    if (!classToDelete) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // GDPR: Soft delete istället för hård radering
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', classToDelete.id)
        .eq('teacher_id', user.id)
      if (error) throw error
      if (selectedClassId === classToDelete.id) {
        setSelectedClassId(null)
        setSelectedClassStudents([])
      }
      fetchClasses()
      setMessage(`Class "${classToDelete.name}" has been deleted successfully`)
    } catch {
      setMessage('Failed to delete class')
    } finally {
      setShowDeleteWarning(false)
      setClassToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteWarning(false)
    setClassToDelete(null)
  }

  const openClass = async (id: string) => {
    setSelectedClassId(id)
    setMessage('') // Clear any previous error messages
    await fetchClassStudents(id)
  }

  const fetchClassStudents = async (classId: string) => {
    try {
      console.log('Debug - Fetching students for class:', classId)
      
      // First, get all class_students records for this class (excluding soft-deleted)
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classId)
        .is('deleted_at', null) // GDPR: Visa bara icke-raderade kopplingar
      
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
        
        // Create a display name: username if available, otherwise email prefix (before first dot)
        const displayName = username || profile.email.split('.')[0] || profile.email
        
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


  const removeStudent = async (studentId: string) => {
    if (!selectedClassId) return
    try {
      // GDPR: Soft delete istället för hård radering
      const { error } = await supabase
        .from('class_students')
        .update({ deleted_at: new Date().toISOString() })
        .match({ class_id: selectedClassId, student_id: studentId })
      if (error) throw error
      fetchClassStudents(selectedClassId)
    } catch {
      setMessage('Failed to remove student (check permissions and that the relation exists)')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Classes</h1>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
            <div className="flex gap-3">
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="New class name"
                className="flex-1 px-4 py-2 rounded-xl bg-white border-2 border-gray-200 text-gray-800 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button onClick={createClass} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 shadow-lg transition-all border-2 border-blue-600">Create</button>
            </div>
          </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Your Classes</h2>
            <div className="space-y-3">
              {classes.map((c) => (
                <div key={c.id} className={`p-4 rounded-xl border-2 transition-all ${selectedClassId===c.id?'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md':'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300'}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => openClass(c.id)} className="text-left font-medium text-gray-800 hover:text-blue-600 transition-colors">{c.name}</button>
                    <button onClick={() => confirmDeleteClass(c)} className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors">Delete</button>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Join code: <span className="font-mono font-semibold text-gray-800">{c.join_code ?? '—'}</span>
                  </div>
                </div>
              ))}
              {classes.length === 0 && <div className="text-gray-500">No classes yet.</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Class Students</h2>
              {selectedClassId && (
                <a 
                  href={`/teacher/add-students?class=${selectedClassId}`}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium hover:from-blue-600 hover:to-purple-600 shadow-lg transition-all border-2 border-blue-600"
                >
                  Add Students
                </a>
              )}
            </div>
            {!selectedClassId && <div className="text-gray-500 text-sm">Select a class to view students.</div>}
            {selectedClassId && (
              <div className="space-y-2">
                {selectedClassStudents.map(s => (
                  <div key={s.id} className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-800">{s.displayName}</div>
                      {(!/@local\.local$/i.test(s.email)) && (
                        <div className="text-gray-500 text-xs">{s.email}</div>
                      )}
                    </div>
                    <button 
                      onClick={() => removeStudent(s.id)} 
                      className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {selectedClassStudents.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No students in this class.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {message && <div className="mt-6 p-3 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">{message}</div>}
        {loading && <div className="mt-4 text-gray-400">Loading…</div>}
      </div>

      {/* Delete Warning Modal */}
      {showDeleteWarning && classToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete Class</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you sure you want to delete the class <strong>"{classToDelete.name}"</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Warning: This will permanently delete:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• All student progress and game scores</li>
                  <li>• All assignments for this class</li>
                  <li>• All student-class relationships</li>
                  <li>• The class join code and settings</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteClass}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


