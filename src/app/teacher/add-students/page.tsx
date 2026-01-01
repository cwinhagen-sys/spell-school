'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Users, Plus, Trash2, Check, X, UserPlus, ArrowLeft } from 'lucide-react'
import { canAddStudentsToClass } from '@/lib/subscription'
import Link from 'next/link'

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
      setMessage({ type: 'error', text: 'Could not load classes' })
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
      errors.push('Select a class')
    }

    students.forEach((student, index) => {
      const row = index + 1
      if (!student.username.trim()) errors.push(`Row ${row}: Username required`)
      if (!student.password.trim()) errors.push(`Row ${row}: Password required`)
    })

    // Check for duplicate usernames
    // Preserve Swedish characters (å, ä, ö) - only trim whitespace
    const usernames = students.map(s => s.username.trim())
    const duplicates = usernames.filter((username, index) => usernames.indexOf(username) !== index)
    if (duplicates.length > 0) {
      errors.push(`Duplicate usernames: ${[...new Set(duplicates)].join(', ')}`)
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

      // Check subscription limits
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Not logged in' })
        return
      }

      // Get current student count for this class
      const { data: currentStudents } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', selectedClass)
        .is('deleted_at', null)

      const currentStudentCount = new Set(currentStudents?.map(cs => cs.student_id) || []).size
      const canAdd = await canAddStudentsToClass(user.id, selectedClass, currentStudentCount)

      if (!canAdd.allowed) {
        setMessage({ type: 'error', text: canAdd.reason || 'Subscription limit reached' })
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Not logged in' })
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
        const errorText = result?.error || 'Could not create students'
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: result?.error,
          debug: result?.debug
        })
        
        setMessage({ type: 'error', text: errorText })
        return
      }

      const { successCount = 0, errorCount = 0, results = [] } = result

      if (successCount > 0) {
        setMessage({
          type: 'success',
          text: `${successCount} student${successCount === 1 ? '' : 's'} created!`
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
          text: `Could not create ${errorCount} student${errorCount === 1 ? '' : 's'}: ${errorMessages}`
        })
      } else if (successCount === 0) {
        setMessage({
          type: 'error',
          text: 'No students created'
        })
      }

    } catch (error: any) {
      console.error('Error creating students:', error)
      setMessage({ type: 'error', text: error.message || 'Could not create students' })
    } finally {
      setLoading(false)
    }
  }

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || ''

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to classes
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur opacity-30" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Add students</h1>
          <p className="text-gray-400">Create student accounts for your class</p>
        </div>
      </div>

      {/* Class Selection */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Select class</h2>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer"
        >
          <option value="" className="bg-[#161622]">Select a class...</option>
          {classes.map(c => (
            <option key={c.id} value={c.id} className="bg-[#161622]">{c.name}</option>
          ))}
        </select>
        {selectedClass && (
          <p className="mt-2 text-sm text-amber-400">
            Adding students to: <span className="font-semibold">{selectedClassName}</span>
          </p>
        )}
      </div>

      {/* Student Form */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Student information ({students.length} {students.length === 1 ? 'student' : 'students'})
          </h2>
          <button
            onClick={addStudentRow}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 mb-4 pb-3 border-b border-white/10">
          <div className="col-span-5 text-sm font-medium text-gray-400">Username</div>
          <div className="col-span-5 text-sm font-medium text-gray-400">Password</div>
          <div className="col-span-2 text-sm font-medium text-gray-400"></div>
        </div>

        {/* Student Rows */}
        <div className="space-y-3">
          {students.map((student, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5">
                <input
                  type="text"
                  value={student.username}
                  onChange={(e) => updateStudent(index, 'username', e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={student.password}
                  onChange={(e) => updateStudent(index, 'password', e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                {students.length > 1 && (
                  <button
                    onClick={() => removeStudentRow(index)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom Add Button */}
        <div ref={bottomButtonRef} className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              addStudentRow()
              setTimeout(() => {
                bottomButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
              }, 100)
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-colors border-2 border-dashed border-white/10"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Add more students</span>
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <Link
          href="/teacher/classes"
          className="flex-1 px-6 py-3.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium text-center"
        >
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading || students.length === 0 || !selectedClass}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
        >
          {loading ? 'Creating students...' : `Create ${students.length} ${students.length === 1 ? 'student' : 'students'}`}
        </button>
      </div>
    </div>
  )
}
