'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Search, Mail, Trash2, Eye, RefreshCw, ChevronLeft } from 'lucide-react'
import StudentDetailsModal from '@/components/StudentDetailsModal'

interface Student {
  id: string
  email: string
  name: string
  class_name: string
  class_id: string
  created_at: string
  last_sign_in_at: string | null
  total_points: number
  level: number
  last_activity: string
  is_active: boolean
}

interface StudentDetailedStats {
  id: string
  email: string
  name: string
  created_at: string
  last_active: string
  total_xp: number
  level: number
  progress_to_next: number
  next_level_delta: number
  current_streak: number
  longest_streak: number
  last_play_date: string | null
  total_badges: number
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    category: string
    rarity: string
    unlocked_at: string
  }>
  games_played: number
  total_time_played: number
  average_accuracy: number
  game_stats: Array<{
    game_type: string
    plays: number
    average_score: number
    best_score: number
    last_played: string
  }>
  quiz_results: Array<{
    quiz_id: string
    word_set_title: string
    word_set_id: string | null
    score: number
    total: number
    accuracy: number
    completed_at: string
    word_details?: Array<{
      prompt: string
      expected: string
      given: string
      verdict: 'correct' | 'partial' | 'wrong' | 'empty'
    }>
  }>
  missed_words: Array<{
    word: string
    translation: string
    attempts: number
    correct: number
    accuracy: number
    last_attempt: string
  }>
  activity_log: Array<{
    game_type: string
    score: number
    accuracy: number
    played_at: string
    duration: number
    word_set_title?: string
  }>
}

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'class_name' | 'total_points' | 'level' | 'last_activity'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showStudentDetails, setShowStudentDetails] = useState(false)
  const [studentDetails, setStudentDetails] = useState<StudentDetailedStats | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'games' | 'activity'>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', session.user.id)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
      setMessage({ type: 'error', text: 'Failed to load classes' })
    }
  }

  const loadStudents = async (classFilter?: string) => {
    try {
      setLoading(true)
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch('/api/teacher/students', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        let allStudents = data.students || []
        
        // Filter students based on selected class
        if (classFilter) {
          if (classFilter === 'unassigned') {
            allStudents = allStudents.filter((s: Student) => s.class_name === 'Unassigned')
          } else {
            allStudents = allStudents.filter((s: Student) => s.class_id === classFilter)
          }
        }
        
        setStudents(allStudents)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load students' })
      }
    } catch (error) {
      console.error('Error loading students:', error)
      setMessage({ type: 'error', text: 'Failed to load students' })
    } finally {
      setLoading(false)
    }
  }

  const loadStudentDetails = async (studentId: string) => {
    try {
      setDetailsLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch(`/api/teacher/student-details?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      console.log('📊 Student Details API Response:', {
        ok: response.ok,
        status: response.status,
        quiz_results_count: data.quiz_results?.length || 0
      })
      
      if (data.quiz_results && data.quiz_results.length > 0) {
        console.log('📊 Quiz Results Details:', data.quiz_results.map((q: any) => ({
          word_set_title: q.word_set_title,
          score: q.score,
          total: q.total,
          accuracy: q.accuracy,
          completed_at: q.completed_at,
          has_word_details: !!(q.word_details && q.word_details.length > 0),
          word_details_count: q.word_details?.length || 0,
          word_details: q.word_details || null
        })))
      } else {
        console.log('📊 No quiz results found')
      }

      if (response.ok) {
        setStudentDetails(data)
      } else {
        console.error('📊 Student Details API Error:', data)
        setMessage({ type: 'error', text: data.error || 'Failed to load student details' })
      }
    } catch (error) {
      console.error('Error loading student details:', error)
      setMessage({ type: 'error', text: 'Failed to load student details' })
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId)
    setStudents([]) // Clear current students
    if (classId) {
      await loadStudents(classId)
    }
  }

  const handleAction = async (action: string, student: Student) => {
    try {
      setActionLoading(student.id)
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }
      
      // Handle password reset separately
      if (action === 'reset_password') {
        const newPassword = prompt(`Enter new password for ${student.name}:\n\n(Minimum 6 characters)`)
        
        if (!newPassword) {
          setActionLoading(null)
          return // User cancelled
        }
        
        if (newPassword.length < 6) {
          setMessage({ type: 'error', text: 'Password must be at least 6 characters long' })
          setActionLoading(null)
          return
        }
        
        const response = await fetch('/api/teacher/reset-student-password', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            studentId: student.id,
            newPassword
          })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          setMessage({ type: 'success', text: `Password updated! ${student.name} can now login with username "${data.student.username}" and the new password.` })
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to reset password' })
        }
        
        setActionLoading(null)
        return
      }
      
      // Handle other actions (remove from class, etc.)
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action,
          studentId: student.id,
          studentEmail: student.email
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        if (action === 'remove_from_class') {
          // Reload students to update the list with current filter
          await loadStudents(selectedClass)
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch (error) {
      console.error('Error performing action:', error)
      setMessage({ type: 'error', text: 'Action failed' })
    } finally {
      setActionLoading(null)
    }
  }

  const filteredStudents = students
    .filter(student => {
      // Search filter only (class filtering is now handled in loadStudents)
      return student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]
      
      if (sortBy === 'last_activity') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a 
                href="/teacher" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to dashboard"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </a>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Progress Report</h1>
                <p className="text-sm text-gray-600">Track student progress and performance</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students by name or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select class to view students</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="unassigned">Unassigned Students</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="name">Sort by Name</option>
                <option value="class_name">Sort by Class</option>
                <option value="total_points">Sort by Points</option>
                <option value="level">Sort by Level</option>
                <option value="last_activity">Sort by Last Activity</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {!selectedClass ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Select a class to view students
              </h3>
              <p className="text-gray-500">
                Choose a class from the dropdown above to see its students
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? 'No students found' : 'No students in this class'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'No students have joined this class yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('name')
                          setSortOrder('asc')
                        }
                      }}
                    >
                      Student {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (sortBy === 'class_name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('class_name')
                          setSortOrder('asc')
                        }
                      }}
                    >
                      Class {sortBy === 'class_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (sortBy === 'total_points') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('total_points')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      Points {sortBy === 'total_points' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (sortBy === 'level') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('level')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      Level {sortBy === 'level' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        if (sortBy === 'last_activity') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('last_activity')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      Last Activity {sortBy === 'last_activity' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.class_name === 'Unassigned'
                            ? 'bg-gray-100 text-gray-600 border border-gray-300'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {student.class_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {student.total_points} XP
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          Level {student.level}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(student.last_activity)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.class_name === 'Unassigned'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : student.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.class_name === 'Unassigned' ? 'No Class' : student.is_active ? 'In Class' : 'In Class'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStudent(student)
                              setShowStudentDetails(true)
                              loadStudentDetails(student.id)
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction('reset_password', student)}
                            disabled={actionLoading === student.id}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                            title="Reset password"
                          >
                            <RefreshCw className={`w-4 h-4 ${actionLoading === student.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              const isUnassigned = student.class_name === 'Unassigned'
                              const confirmMessage = isUnassigned
                                ? `Are you sure you want to permanently delete ${student.name}? This cannot be undone.`
                                : `Are you sure you want to remove ${student.name} from ${student.class_name}?`
                              
                              if (confirm(confirmMessage)) {
                                handleAction('remove_from_class', student)
                              }
                            }}
                            disabled={actionLoading === student.id}
                            className={`p-2 transition-colors disabled:opacity-50 ${
                              student.class_name === 'Unassigned'
                                ? 'text-red-400 hover:text-red-700'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                            title={student.class_name === 'Unassigned' ? 'Delete student permanently' : 'Remove from class'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <StudentDetailsModal
          student={{
            id: selectedStudent.id,
            name: selectedStudent.name,
            email: selectedStudent.email,
            class_name: selectedStudent.class_name
          }}
          details={studentDetails}
          loading={detailsLoading}
          onClose={() => {
            setShowStudentDetails(false)
            setStudentDetails(null)
          }}
        />
      )}
    </div>
  )
}