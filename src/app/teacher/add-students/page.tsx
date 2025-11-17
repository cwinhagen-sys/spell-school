'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Users, Plus, Trash2, Check, X, FileText, Clipboard } from 'lucide-react'

interface StudentData {
  username: string
  password: string
}

export default function AddStudentsPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [students, setStudents] = useState<StudentData[]>([
    { username: '', password: '' }
  ])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([])
  const [importMethod, setImportMethod] = useState<'manual' | 'paste' | 'google'>('manual')
  const [pasteText, setPasteText] = useState('')
  const [showGoogleClassroom, setShowGoogleClassroom] = useState(false)
  const bottomButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadClasses()
    
    // Check for class parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const classParam = urlParams.get('class')
    if (classParam) {
      setSelectedClass(classParam)
    }
  }, [])

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
      setMessage({ type: 'error', text: 'Failed to load classes' })
    }
  }

  const addStudentRow = () => {
    setStudents([...students, { username: '', password: '' }])
  }

  const removeStudentRow = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index))
    }
  }

  const updateStudent = (index: number, field: keyof StudentData, value: string) => {
    const updated = [...students]
    updated[index][field] = value
    setStudents(updated)
  }

  const handlePasteStudents = () => {
    if (!pasteText.trim()) {
      setMessage({ type: 'error', text: 'Please paste student data' })
      return
    }

    try {
      // Parse pasted text - support multiple formats:
      // 1. Tab-separated: username\tpassword
      // 2. Comma-separated: username,password
      // 3. Newline-separated: username\npassword
      // 4. Mixed: username,password\nusername2,password2
      const lines = pasteText.split('\n').filter(line => line.trim())
      const parsedStudents: StudentData[] = []

      lines.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) return

        // Try tab-separated first
        let parts: string[] = []
        if (trimmed.includes('\t')) {
          parts = trimmed.split('\t').map(p => p.trim())
        } else if (trimmed.includes(',')) {
          parts = trimmed.split(',').map(p => p.trim())
        } else {
          // Single value - treat as username, generate password
          parts = [trimmed, '']
        }

        if (parts.length >= 1 && parts[0]) {
          parsedStudents.push({
            username: parts[0],
            password: parts[1] || generateDefaultPassword(parts[0])
          })
        }
      })

      if (parsedStudents.length === 0) {
        setMessage({ type: 'error', text: 'No valid student data found. Format: username,password (one per line)' })
        return
      }

      // Add to existing students or replace
      setStudents([...students, ...parsedStudents])
      setPasteText('')
      setImportMethod('manual')
      setMessage({ type: 'success', text: `Added ${parsedStudents.length} student(s) from paste` })
      
      // Scroll to bottom to show new students
      setTimeout(() => {
        bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error parsing pasted data: ${error.message}` })
    }
  }

  const generateDefaultPassword = (username: string): string => {
    // Generate a simple default password based on username
    return `${username}123`
  }

  const handleGoogleClassroomImport = async () => {
    try {
      setLoading(true)
      setMessage(null)

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Inte autentiserad. Vänligen logga in igen.' })
        return
      }

      // Fetch available Google Classroom courses
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
            text: 'Google Classroom-integration är inte konfigurerad ännu. Kontakta support eller använd alternativet "Klistra in lista" för nu.' 
          })
        } else {
          setMessage({ 
            type: 'error', 
            text: data.message || 'Kunde inte hämta Google Classroom-kurser. Kontrollera att din skola har godkänt Spell School.' 
          })
        }
        return
      }

      if (data.error === 'Not implemented') {
        setMessage({ 
          type: 'error', 
          text: 'Google Classroom-integration kommer snart! För nu kan du exportera dina elever från Google Classroom och klistra in dem här.' 
        })
        return
      }

      // If we get here, courses are available (future implementation)
      setMessage({ 
        type: 'error', 
        text: 'Funktionen är under utveckling. Använd alternativet "Klistra in lista" för nu.' 
      })

    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Fel: ${error.message || 'Kunde inte ansluta till Google Classroom'}` 
      })
    } finally {
      setLoading(false)
    }
  }


  const validateStudents = (): string[] => {
    const errors: string[] = []
    
    if (!selectedClass) {
      errors.push('Please select a class')
    }

    students.forEach((student, index) => {
      const row = index + 1
      if (!student.username.trim()) errors.push(`Row ${row}: Username is required`)
      if (!student.password.trim()) errors.push(`Row ${row}: Password is required`)
    })

    // Check for duplicate usernames
    const usernames = students.map(s => s.username.trim().toLowerCase())
    const duplicates = usernames.filter((username, index) => usernames.indexOf(username) !== index)
    if (duplicates.length > 0) {
      errors.push(`Duplicate usernames found: ${[...new Set(duplicates)].join(', ')}`)
    }

    return errors
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const errors = validateStudents()
      if (errors.length > 0) {
        setMessage({ type: 'error', text: errors.join('. ') })
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch('/api/teacher/create-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          classId: selectedClass,
          students: students.map(student => ({
            username: student.username.trim(),
            password: student.password
          }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        const errorText = result?.error || 'Failed to create students'
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: result?.error,
          debug: result?.debug
        })
        
        // Show detailed error message
        let errorMessage = errorText
        if (result?.debug) {
          const debug = result.debug
          const missingKeys = []
          if (!debug.hasSupabaseUrl) missingKeys.push('NEXT_PUBLIC_SUPABASE_URL')
          if (!debug.hasServiceRoleKey) missingKeys.push('SUPABASE_SERVICE_ROLE_KEY')
          
          if (missingKeys.length > 0) {
            errorMessage += `\n\nMissing environment variables: ${missingKeys.join(', ')}`
            errorMessage += `\n\nPlease check Vercel Dashboard → Settings → Environment Variables`
            errorMessage += `\n\nAvailable Supabase keys: ${debug.allSupabaseKeys?.join(', ') || 'none'}`
          }
        }
        
        setMessage({ type: 'error', text: errorMessage })
        return
      }

      const { successCount = 0, errorCount = 0, results = [] } = result

      if (successCount > 0) {
        setMessage({
          type: 'success',
          text: `Successfully created ${successCount} student(s)`
        })
        setStudents([{ username: '', password: '' }])
      }

      if (errorCount > 0) {
        const errorMessages = results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.username || 'Student'}: ${r.message}`)
          .join(', ')

        setMessage({
          type: 'error',
          text: `Failed to create ${errorCount} student(s): ${errorMessages}`
        })
      } else if (successCount === 0) {
        setMessage({
          type: 'error',
          text: 'No students were created'
        })
      }

    } catch (error: any) {
      console.error('Error creating students:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to create students' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a 
                href="/teacher/classes" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to classes"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </a>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Lägg till elever</h1>
                <p className="text-sm text-gray-600">Skapa elevkonton för din klass</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Class Selection */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Välj klass</h2>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Välj en klass...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Import Method Selection */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Importmetod</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setImportMethod('manual')}
              className={`p-4 rounded-lg border-2 transition-all ${
                importMethod === 'manual'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Plus className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
              <div className="font-medium text-gray-800">Manuellt</div>
              <div className="text-sm text-gray-600 mt-1">Lägg till elever en och en</div>
            </button>
            <button
              onClick={() => setImportMethod('paste')}
              className={`p-4 rounded-lg border-2 transition-all ${
                importMethod === 'paste'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Clipboard className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
              <div className="font-medium text-gray-800">Klistra in lista</div>
              <div className="text-sm text-gray-600 mt-1">Klistra in flera elever</div>
            </button>
            <button
              onClick={() => {
                setImportMethod('google')
                setShowGoogleClassroom(true)
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                importMethod === 'google'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
              <div className="font-medium text-gray-800">Google Classroom</div>
              <div className="text-sm text-gray-600 mt-1">Importera från Classroom</div>
            </button>
          </div>

          {/* Paste Text Area */}
          {importMethod === 'paste' && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Klistra in elevlista (format: användarnamn,lösenord - en per rad)
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="alice,lösenord123&#10;bob,lösenord456&#10;charlie,lösenord789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                rows={6}
              />
              <div className="mt-2 text-xs text-gray-500">
                Stödjer: användarnamn,lösenord (kommaseparerat) eller användarnamn	lösenord (tabsseparerat)
              </div>
              <button
                onClick={handlePasteStudents}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Importera elever
              </button>
            </div>
          )}

          {/* Google Classroom */}
          {importMethod === 'google' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Google Classroom-integration</h3>
              <p className="text-sm text-blue-700 mb-4">
                Anslut ditt Google Classroom-konto för att automatiskt importera elever.
              </p>
              <button
                onClick={handleGoogleClassroomImport}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Anslut Google Classroom
              </button>
              <p className="text-xs text-blue-600 mt-3">
                Obs: Denna funktion kräver Google Classroom API-inställningar. För nu kan du exportera dina elever från Google Classroom och använda alternativet "Klistra in lista".
              </p>
            </div>
          )}
        </div>

        {/* Student Form */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Elevinformation ({students.length} elev{students.length !== 1 ? 'ar' : ''})</h2>
            <button
              onClick={addStudentRow}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Lägg till elev
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 mb-4 pb-2 border-b border-gray-200">
            <div className="col-span-5 font-medium text-gray-700">Användarnamn</div>
            <div className="col-span-5 font-medium text-gray-700">Lösenord</div>
            <div className="col-span-2 font-medium text-gray-700">Åtgärder</div>
          </div>

          {/* Student Rows */}
          {students.map((student, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-center">
              <div className="col-span-5">
                <input
                  type="text"
                  value={student.username}
                  onChange={(e) => updateStudent(index, 'username', e.target.value)}
                  placeholder="Användarnamn"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={student.password}
                  onChange={(e) => updateStudent(index, 'password', e.target.value)}
                  placeholder="Lösenord"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                {students.length > 1 && (
                  <button
                    onClick={() => removeStudentRow(index)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    title="Ta bort elev"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Bottom Add Button */}
          <div ref={bottomButtonRef} className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                addStudentRow()
                setTimeout(() => {
                  bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
                }, 100)
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border-2 border-dashed border-indigo-300"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Lägg till fler elever</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleSubmit}
            disabled={loading || students.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {loading ? 'Skapar elever...' : `Skapa ${students.length} elev${students.length !== 1 ? 'ar' : ''}`}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
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
      </div>
    </div>
  )
}
