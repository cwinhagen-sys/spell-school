'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, X, Trash2, Plus, Users, FileText, ChevronLeft, Check } from 'lucide-react'
import Link from 'next/link'

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

interface StudentData {
  username: string
  password: string
}

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedClassStudents, setSelectedClassStudents] = useState<ProfileRow[]>([])
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [classToDelete, setClassToDelete] = useState<ClassRow | null>(null)
  
  // Create class modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMethod, setCreateMethod] = useState<'manual' | 'google'>('manual')
  const [newClassStudents, setNewClassStudents] = useState<StudentData[]>([{ username: '', password: '' }])
  const [pasteText, setPasteText] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)
  const bottomButtonRef = useRef<HTMLDivElement>(null)
  
  // Google Classroom states
  const [googleClassroomCourses, setGoogleClassroomCourses] = useState<any[]>([])
  const [selectedGoogleCourse, setSelectedGoogleCourse] = useState<string | null>(null)
  const [googleClassroomStudents, setGoogleClassroomStudents] = useState<any[]>([])
  const [loadingGoogleCourses, setLoadingGoogleCourses] = useState(false)
  const [googleClassroomConnected, setGoogleClassroomConnected] = useState(false)

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
      
      // Check for Google Classroom callback messages
      const urlParams = new URLSearchParams(window.location.search)
      const googleClassroomConnected = urlParams.get('googleClassroomConnected')
      const error = urlParams.get('error')
      
      if (googleClassroomConnected === 'true') {
        setMessage({ type: 'success', text: 'Google Classroom anslutning lyckades!' })
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname)
      } else if (error) {
        setMessage({ type: 'error', text: decodeURIComponent(error) })
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname)
      }
      
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
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClasses(data || [])
    } catch (e) {
      console.error('Failed to load classes:', e)
      setMessage({ type: 'error', text: 'Kunde inte ladda klasser' })
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

  const addStudentRow = () => {
    setNewClassStudents([...newClassStudents, { username: '', password: '' }])
  }

  const removeStudentRow = (index: number) => {
    if (newClassStudents.length > 1) {
      setNewClassStudents(newClassStudents.filter((_, i) => i !== index))
    }
  }

  const updateStudent = (index: number, field: keyof StudentData, value: string) => {
    const updated = [...newClassStudents]
    updated[index][field] = value
    setNewClassStudents(updated)
  }

  const handlePasteStudents = () => {
    if (!pasteText.trim()) {
      setMessage({ type: 'error', text: 'Vänligen klistra in elevdata' })
      return
    }

    try {
      const lines = pasteText.split('\n').filter(line => line.trim())
      const parsedStudents: StudentData[] = []

      lines.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) return

        let parts: string[] = []
        if (trimmed.includes('\t')) {
          parts = trimmed.split('\t').map(p => p.trim())
        } else if (trimmed.includes(',')) {
          parts = trimmed.split(',').map(p => p.trim())
        } else {
          parts = [trimmed, '']
        }

        if (parts.length >= 1 && parts[0]) {
          parsedStudents.push({
            username: parts[0],
            password: parts[1] || `${parts[0]}123`
          })
        }
      })

      if (parsedStudents.length === 0) {
        setMessage({ type: 'error', text: 'Ingen giltig elevdata hittades. Format: användarnamn,lösenord (en per rad)' })
        return
      }

      setNewClassStudents([...newClassStudents, ...parsedStudents])
      setPasteText('')
      setMessage({ type: 'success', text: `Lade till ${parsedStudents.length} elev(ar) från klistring` })
      
      setTimeout(() => {
        bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    } catch (error: any) {
      setMessage({ type: 'error', text: `Fel vid parsning av klistrad data: ${error.message}` })
    }
  }

  const connectGoogleClassroom = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad. Vänligen logga in igen.' })
        return
      }

      const response = await fetch('/api/auth/google-classroom/authorize', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ 
          type: 'error', 
          text: data.message || 'Kunde inte initiera Google Classroom-anslutning.' 
        })
        return
      }

      // Redirect to Google OAuth
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Fel: ${error.message || 'Kunde inte ansluta till Google Classroom'}` 
      })
    }
  }

  const loadGoogleClassroomCourses = async () => {
    try {
      setLoadingGoogleCourses(true)
      setMessage(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad. Vänligen logga in igen.' })
        return
      }

      const response = await fetch('/api/google-classroom/courses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.configured === false) {
          setMessage({ 
            type: 'error', 
            text: 'Google Classroom-integration är inte konfigurerad ännu. Kontakta support.' 
          })
        } else if (data.connected === false) {
          // Not connected, show connect button
          setGoogleClassroomConnected(false)
          setGoogleClassroomCourses([])
        } else {
          setMessage({ 
            type: 'error', 
            text: data.message || 'Kunde inte hämta Google Classroom-kurser.' 
          })
        }
        return
      }

      if (data.error === 'Not connected') {
        setGoogleClassroomConnected(false)
        setGoogleClassroomCourses([])
        return
      }

      setGoogleClassroomConnected(true)
      setGoogleClassroomCourses(data.courses || [])

      if (data.courses && data.courses.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'Inga aktiva kurser hittades i Google Classroom.' 
        })
      }

    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Fel: ${error.message || 'Kunde inte hämta Google Classroom-kurser'}` 
      })
    } finally {
      setLoadingGoogleCourses(false)
    }
  }

  const handleGoogleClassroomImport = async () => {
    await loadGoogleClassroomCourses()
  }

  const selectGoogleCourse = async (courseId: string) => {
    try {
      setSelectedGoogleCourse(courseId)
      setMessage(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad. Vänligen logga in igen.' })
        return
      }

      const response = await fetch(`/api/google-classroom/students?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ 
          type: 'error', 
          text: data.message || 'Kunde inte hämta elever från Google Classroom.' 
        })
        return
      }

      setGoogleClassroomStudents(data.students || [])

      if (data.students && data.students.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'Inga elever hittades i denna kurs.' 
        })
      }

    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Fel: ${error.message || 'Kunde inte hämta elever'}` 
      })
    }
  }

  const importGoogleClassroomStudents = () => {
    if (!selectedGoogleCourse || googleClassroomStudents.length === 0) {
      setMessage({ type: 'error', text: 'Välj en kurs och vänta tills elever laddas.' })
      return
    }

    // Convert Google Classroom students to StudentData format
    const students: StudentData[] = googleClassroomStudents.map((student: any) => {
      const email = student.profile?.emailAddress || ''
      const name = student.profile?.name || ''
      
      // Generate username from email or name
      let username = ''
      if (email) {
        username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      } else if (name) {
        username = name.toLowerCase().replace(/[^a-z0-9]/g, '')
      } else {
        username = `student${student.userId.slice(0, 8)}`
      }

      // Generate password (can be changed later)
      const password = `${username}123`

      return { username, password }
    })

    // Add to newClassStudents
    setNewClassStudents([...newClassStudents.filter(s => s.username.trim() && s.password.trim()), ...students])
    setMessage({ type: 'success', text: `Importerade ${students.length} elev(ar) från Google Classroom.` })
    
    // Scroll to bottom
    setTimeout(() => {
      bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
  }

  const createClassWithStudents = async () => {
    if (!newClassName.trim()) {
      setMessage({ type: 'error', text: 'Klassnamn krävs' })
      return
    }

    setCreatingClass(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Inte autentiserad' })
        return
      }

      // Create class
      const joinCode = generateJoinCode(6)
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({ name: newClassName.trim(), teacher_id: user.id, join_code: joinCode })
        .select()
        .single()

      if (classError) throw classError

      // Add students if any
      const validStudents = newClassStudents.filter(s => s.username.trim() && s.password.trim())
      if (validStudents.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setMessage({ type: 'error', text: 'Inte autentiserad' })
          return
        }

        const response = await fetch('/api/teacher/create-students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            classId: newClass.id,
            students: validStudents.map(student => ({
              username: student.username.trim(),
              password: student.password
            }))
          })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || 'Kunde inte skapa elever')
        }
      }

      setMessage({ type: 'success', text: `Klass "${newClassName}" skapad${validStudents.length > 0 ? ` med ${validStudents.length} elev(ar)` : ''}!` })
      setNewClassName('')
      setNewClassStudents([{ username: '', password: '' }])
      setShowCreateModal(false)
      setCreateMethod('manual')
      await fetchClasses()
      setSelectedClassId(newClass.id)
      await fetchClassStudents(newClass.id)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Kunde inte skapa klass' })
    } finally {
      setCreatingClass(false)
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
      setMessage({ type: 'success', text: `Klass "${classToDelete.name}" har raderats` })
    } catch {
      setMessage({ type: 'error', text: 'Kunde inte radera klass' })
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
    setMessage(null)
    await fetchClassStudents(id)
  }

  const fetchClassStudents = async (classId: string) => {
    try {
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', classId)
        .is('deleted_at', null)
      
      if (classError) throw classError
      
      if (!classStudents || classStudents.length === 0) {
        setSelectedClassStudents([])
        return
      }
      
      const studentIds = classStudents.map(cs => cs.student_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds)
        .eq('role', 'student')
      
      if (profilesError) throw profilesError
      
      const students: ProfileRow[] = (profiles || []).map(profile => {
        const username = profile.username || profile.name || profile.user_name
        const displayName = username || profile.email.split('.')[0] || profile.email
        
        return {
          id: profile.id,
          email: profile.email,
          username: username,
          displayName: displayName
        }
      })
      
      setSelectedClassStudents(students)
    } catch (e: any) {
      console.error('Failed to load students', e)
      setMessage({ type: 'error', text: `Kunde inte ladda elever: ${e.message || ''}` })
      setSelectedClassStudents([])
    }
  }

  const removeStudent = async (studentId: string) => {
    if (!selectedClassId) return
    try {
      const { error } = await supabase
        .from('class_students')
        .update({ deleted_at: new Date().toISOString() })
        .match({ class_id: selectedClassId, student_id: studentId })
      if (error) throw error
      fetchClassStudents(selectedClassId)
      setMessage({ type: 'success', text: 'Elev borttagen' })
    } catch {
      setMessage({ type: 'error', text: 'Kunde inte ta bort elev' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Klasser</h1>
                <p className="text-sm text-gray-600">Hantera dina klasser och elever</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              Skapa klass
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              {message.text}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Classes List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Dina klasser</h2>
              <div className="space-y-2">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      selectedClassId === c.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => openClass(c.id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-800">{c.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Join code: <span className="font-mono font-semibold">{c.join_code ?? '—'}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => confirmDeleteClass(c)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                        title="Radera klass"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Inga klasser ännu</p>
                    <p className="text-xs mt-1">Klicka på "Skapa klass" för att börja</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Class Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedClassId ? 'Elever i klassen' : 'Välj en klass'}
                </h2>
                {selectedClassId && (
                  <Link
                    href={`/teacher/add-students?class=${selectedClassId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Lägg till elever
                  </Link>
                )}
              </div>
              
              {!selectedClassId ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Välj en klass för att se elever</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedClassStudents.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                      <div>
                        <div className="font-medium text-sm text-gray-800">{s.displayName}</div>
                        {(!/@local\.local$/i.test(s.email)) && (
                          <div className="text-gray-500 text-xs">{s.email}</div>
                        )}
                      </div>
                      <button 
                        onClick={() => removeStudent(s.id)} 
                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                        title="Ta bort elev"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {selectedClassStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Inga elever i denna klass</p>
                      <Link
                        href={`/teacher/add-students?class=${selectedClassId}`}
                        className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Lägg till elever
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Skapa ny klass</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewClassName('')
                    setNewClassStudents([{ username: '', password: '' }])
                    setCreateMethod('manual')
                    setPasteText('')
                    setGoogleClassroomCourses([])
                    setSelectedGoogleCourse(null)
                    setGoogleClassroomStudents([])
                    setGoogleClassroomConnected(false)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Class Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Klassnamn *
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="t.ex. 5A, Engelska A, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Import Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Lägg till elever (valfritt)
                </label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={() => setCreateMethod('manual')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      createMethod === 'manual'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Plus className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                    <div className="font-medium text-gray-800 text-sm">Manuellt</div>
                  </button>
                  <button
                    onClick={() => {
                      setCreateMethod('google')
                      setGoogleClassroomCourses([])
                      setSelectedGoogleCourse(null)
                      setGoogleClassroomStudents([])
                      handleGoogleClassroomImport()
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      createMethod === 'google'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                    <div className="font-medium text-gray-800 text-sm">Google Classroom</div>
                  </button>
                </div>

                {/* Paste Area */}
                {createMethod === 'manual' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Klistra in elevlista (format: användarnamn,lösenord - en per rad)
                    </label>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="alice,lösenord123&#10;bob,lösenord456&#10;charlie,lösenord789"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                      rows={4}
                    />
                    <button
                      onClick={handlePasteStudents}
                      className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      Importera elever
                    </button>
                  </div>
                )}

                {/* Google Classroom Import */}
                {createMethod === 'google' && (
                  <div className="mt-4 space-y-4">
                    {!googleClassroomConnected ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-gray-600 mb-4">
                          Anslut ditt Google Classroom-konto för att importera elever
                        </p>
                        <button
                          onClick={connectGoogleClassroom}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                          Anslut Google Classroom
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">
                            Välj Google Classroom-kurs
                          </label>
                          <button
                            onClick={loadGoogleClassroomCourses}
                            disabled={loadingGoogleCourses}
                            className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {loadingGoogleCourses ? 'Laddar...' : 'Uppdatera'}
                          </button>
                        </div>
                        
                        {loadingGoogleCourses ? (
                          <div className="text-center py-4 text-gray-500">
                            <p>Laddar kurser...</p>
                          </div>
                        ) : googleClassroomCourses.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <p>Inga kurser hittades</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {googleClassroomCourses.map((course: any) => (
                              <button
                                key={course.id}
                                onClick={() => selectGoogleCourse(course.id)}
                                className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                                  selectedGoogleCourse === course.id
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                                }`}
                              >
                                <div className="font-medium text-sm text-gray-800">{course.name}</div>
                                {course.section && (
                                  <div className="text-xs text-gray-500 mt-1">{course.section}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedGoogleCourse && googleClassroomStudents.length > 0 && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 mb-2">
                              {googleClassroomStudents.length} elev(ar) hittades i denna kurs
                            </p>
                            <button
                              onClick={importGoogleClassroomStudents}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              Importera elever
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Manual Entry */}
                {createMethod === 'manual' && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Elever ({newClassStudents.length})
                      </label>
                      <button
                        onClick={addStudentRow}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Lägg till
                      </button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {newClassStudents.map((student, index) => (
                        <div key={index} className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={student.username}
                            onChange={(e) => updateStudent(index, 'username', e.target.value)}
                            placeholder="Användarnamn"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={student.password}
                              onChange={(e) => updateStudent(index, 'password', e.target.value)}
                              placeholder="Lösenord"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                            {newClassStudents.length > 1 && (
                              <button
                                onClick={() => removeStudentRow(index)}
                                className="p-2 text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Add Button */}
                    <div ref={bottomButtonRef} className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          addStudentRow()
                          setTimeout(() => {
                            bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
                          }, 100)
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border-2 border-dashed border-indigo-300"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="font-medium text-sm">Lägg till fler elever</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewClassName('')
                    setNewClassStudents([{ username: '', password: '' }])
                    setCreateMethod('manual')
                    setPasteText('')
                    setGoogleClassroomCourses([])
                    setSelectedGoogleCourse(null)
                    setGoogleClassroomStudents([])
                    setGoogleClassroomConnected(false)
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Avbryt
                </button>
                <button
                  onClick={createClassWithStudents}
                  disabled={creatingClass || !newClassName.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {creatingClass ? 'Skapar...' : 'Skapa klass'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && classToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Radera klass</h3>
                <p className="text-sm text-gray-600">Denna åtgärd kan inte ångras</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Är du säker på att du vill radera klassen <strong>"{classToDelete.name}"</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Varning: Detta kommer att radera:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• All elevframsteg och poäng</li>
                  <li>• Alla tilldelningar för denna klass</li>
                  <li>• Alla elev-klass-kopplingar</li>
                  <li>• Klassens join-kod och inställningar</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={deleteClass}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Radera klass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
