'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Users, Plus, Trash2, Check, X } from 'lucide-react'

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
        setMessage({ type: 'error', text: errorText })
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
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
                <h1 className="text-2xl font-bold text-gray-800">Add Students</h1>
                <p className="text-sm text-gray-600">Create multiple student accounts for your class</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Class Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Class</h2>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Choose a class...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Student Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Student Information</h2>
            <button
              onClick={addStudentRow}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 mb-4 pb-2 border-b border-gray-200">
            <div className="col-span-5 font-medium text-gray-700">Username</div>
            <div className="col-span-5 font-medium text-gray-700">Password</div>
            <div className="col-span-2 font-medium text-gray-700">Actions</div>
          </div>

          {/* Student Rows */}
          {students.map((student, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-center">
              <div className="col-span-5">
                <input
                  type="text"
                  value={student.username}
                  onChange={(e) => updateStudent(index, 'username', e.target.value)}
                  placeholder="Username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={student.password}
                  onChange={(e) => updateStudent(index, 'password', e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                {students.length > 1 && (
                  <button
                    onClick={() => removeStudentRow(index)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    title="Remove student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg"
          >
            {loading ? 'Creating Students...' : 'Create Students'}
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
