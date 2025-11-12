'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Plus, LogOut, Home, Calendar, FileText, Users, Clock, Gamepad2, LogIn, Trophy, Star } from 'lucide-react'
import { Homework } from '@/types'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

interface Assignment {
  id: string
  student_id: string | null
  class_id: string | null
  word_set_id: string
  created_at: string
  due_date: string | null
  quiz_unlocked: boolean
  word_sets: {
    id: string
    title: string
    teacher_id: string
  }[]
}

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [wordSets, setWordSets] = useState<any[]>([])
  const [homeworks, setHomeworks] = useState<Assignment[]>([])
  const [activeStudents, setActiveStudents] = useState<any[]>([])
  const [studentActivity, setStudentActivity] = useState<any[]>([])
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    vocabulary_words: '',
    due_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', description: '', due_date: '', vocabulary: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/'
        return
      }

      setUser(user)

      // Ensure only teachers can access
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'teacher') {
        window.location.href = '/student'
        return
      }
      await loadClasses()
      await loadWordSets()
      await loadActiveStudents()
      await loadStudentActivity()
      fetchHomeworks()
      // Optional: aggregate teacher points from students (future). For now remains 0.
    }
    init()
    
    // Set up auto-refresh for active students and activity every 30 seconds
    const interval = setInterval(() => {
      loadActiveStudents()
      loadStudentActivity()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, created_at')
        .eq('teacher_id', user.id)
        .is('deleted_at', null) // Only show non-deleted classes
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }

  const loadWordSets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('word_sets')
        .select('id, title, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setWordSets(data || [])
    } catch (error) {
      console.error('Error loading word sets:', error)
    }
  }

  const loadActiveStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Get all students from teacher's classes
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select(`
          student_id,
          class_id,
          classes!class_students_class_id_fkey(
            id,
            teacher_id
          )
        `)
        .eq('classes.teacher_id', user.id)
      
      console.log('Class students debug:', {
        classStudentsCount: classStudents?.length || 0,
        classStudents: classStudents,
        error: classError?.message
      })
      
      if (classError) throw classError
      
      if (!classStudents || classStudents.length === 0) {
        console.log('No class students found for teacher')
        setActiveStudents([])
        return
      }
      
      // Get student profiles with last_active
      const studentIds = classStudents.map(cs => cs.student_id)
      console.log('Student IDs to fetch:', studentIds)
      
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, email, last_active, role')
        .in('id', studentIds)
        .eq('role', 'student')
        .order('last_active', { ascending: false })
      
      console.log('Students debug:', {
        studentIds: studentIds,
        studentsCount: students?.length || 0,
        students: students,
        error: studentsError?.message
      })
      
      if (studentsError) {
        console.error('Error loading students:', studentsError)
        setActiveStudents([])
        return
      }
      
      // Filter for currently active students (within last 2 minutes)
      const now = new Date()
      const activeStudents = (students || []).filter(student => {
        if (!student.last_active) return false
        const lastActive = new Date(student.last_active)
        const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60)
        return diffMinutes <= 2
      })
      
      console.log('Active students debug:', {
        totalStudents: students?.length || 0,
        studentsWithLastActive: students?.filter(s => s.last_active).length || 0,
        activeStudents: activeStudents.length,
        studentData: students?.map(s => ({
          name: s.email?.split('@')[0],
          last_active: s.last_active,
          diffMinutes: s.last_active ? Math.floor((now.getTime() - new Date(s.last_active).getTime()) / (1000 * 60)) : 'N/A'
        }))
      })
      
      setActiveStudents(activeStudents)
    } catch (error) {
      console.error('Error loading active students:', error)
      setActiveStudents([])
    }
  }

  const formatGameType = (gameType: string): string => {
    const gameTypeMap: Record<string, string> = {
      'flashcards': 'Flashcards',
      'match': 'Memory Game',
      'typing': 'Typing Challenge',
      'translate': 'Translation',
      'connect': 'Line Matching',
      'storygap': 'Story Gap',
      'roulette': 'Word Roulette',
      'choice': 'Multiple Choice',
      'spellcasting': 'Spell Casting',
      'quiz': 'Quiz'
    }
    return gameTypeMap[gameType] || gameType
  }

  const loadStudentActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Get all students from teacher's classes
      // First, get all classes for this teacher
      const { data: teacherClasses, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
      
      if (classesError) {
        console.error('Error loading teacher classes:', classesError)
        setStudentActivity([])
        return
      }
      
      if (!teacherClasses || teacherClasses.length === 0) {
        setStudentActivity([])
        return
      }
      
      const classIds = teacherClasses.map(c => c.id)
      
      // Then get all students in those classes
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select('student_id, class_id')
        .in('class_id', classIds)
        .is('deleted_at', null)
      
      if (classError) {
        console.error('Error loading class students:', classError)
        setStudentActivity([])
        return
      }
      
      if (!classStudents || classStudents.length === 0) {
        setStudentActivity([])
        return
      }
      
      // Get student profiles with recent activity
      const studentIds = classStudents.map(cs => cs.student_id)
      
      if (!studentIds || studentIds.length === 0) {
        setStudentActivity([])
        return
      }
      
      // Get student progress data for game activity first (FIXED: use game_sessions for accuracy)
      const { data: recentSessions, error: sessionsError } = await supabase
        .from('game_sessions')
        .select('student_id, finished_at, score, accuracy_pct, game_type')
        .in('student_id', studentIds)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(20)
      
      if (sessionsError) {
        console.log('Game sessions not available:', sessionsError)
      }
      
      // Get all unique student IDs from both login activity and game sessions
      const allStudentIds = [...new Set([
        ...studentIds,
        ...(recentSessions?.map(s => s.student_id) || [])
      ])]
      
      // Use empty array if students is null/undefined
      let studentsList: any[] = []
      
      // Get all student profiles (not just top 10) so we have usernames for game sessions
      if (allStudentIds.length > 0) {
        try {
          const { data: students, error: studentsError } = await supabase
            .from('profiles')
            .select('id, email, username, name, last_active, created_at')
            .in('id', allStudentIds)
            .eq('role', 'student')
          
          if (studentsError) {
            console.warn('Error loading student profiles, trying fallback:', studentsError)
            // Try fallback: get students one by one or use studentIds only
            if (studentIds.length > 0) {
              const { data: fallbackStudents, error: fallbackError } = await supabase
                .from('profiles')
                .select('id, email, username, name, last_active, created_at')
                .in('id', studentIds)
                .eq('role', 'student')
              
              if (!fallbackError && fallbackStudents) {
                studentsList = fallbackStudents
              } else if (fallbackError) {
                console.warn('Fallback query also failed:', fallbackError)
              }
            }
          } else {
            studentsList = students || []
          }
        } catch (err) {
          console.error('Exception loading student profiles:', err)
        }
      }
      
      console.log('Loaded students list:', {
        count: studentsList.length,
        students: studentsList.map(s => ({
          id: s.id,
          email: s.email,
          username: s.username,
          name: s.name
        }))
      })
      
      // Get class names from classes table (we already have classIds from above)
      const studentClassMap: Record<string, string> = {}
      if (classIds.length > 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .eq('teacher_id', user.id)
        
        if (!classesError && classesData) {
          classStudents?.forEach(cs => {
            const classInfo = classesData.find(c => c.id === cs.class_id)
            if (classInfo) {
              studentClassMap[cs.student_id] = classInfo.name
            }
          })
        }
      }
      
      // Get student usernames from profiles
      const studentUsernameMap: Record<string, string> = {}
      studentsList.forEach(student => {
        // Try multiple sources for username: username -> name -> email prefix
        let username = student.username || student.name
        if (!username && student.email) {
          // Extract username from email (before @ or before first dot)
          const emailPrefix = student.email.split('@')[0]
          username = emailPrefix.split('.')[0] // Take part before first dot if email is like "username.classcode@local.local"
        }
        username = username || 'Student'
        studentUsernameMap[student.id] = username
        
        // Debug logging for students without proper username
        if (!student.username && !student.name) {
          console.log('Student without username/name:', {
            id: student.id,
            email: student.email,
            username: student.username,
            name: student.name,
            finalUsername: username
          })
        }
      })
      
      // Combine profile activity and game activity
      const activities: any[] = []
      
      // Helper function to get username from student data
      const getUsernameFromStudent = (student: any): string => {
        if (!student) return 'Student'
        return student.username || student.name || 
               (student.email ? student.email.split('@')[0].split('.')[0] : 'Student')
      }
      
      // Add profile login activity
      studentsList.forEach(student => {
        if (student.last_active) {
          const className = studentClassMap[student.id] || ''
          const username = studentUsernameMap[student.id] || getUsernameFromStudent(student)
          activities.push({
            type: 'login',
            student_id: student.id,
            student_name: username,
            student_class: className,
            student_email: student.email,
            timestamp: student.last_active,
            description: 'Logged in'
          })
        }
      })
      
      // Add game activity from game_sessions (FIXED)
      recentSessions?.forEach(session => {
        const studentProfile = studentsList.find(s => s.id === session.student_id)
        const className = studentClassMap[session.student_id] || ''
        // Use username from map, or extract from profile, or from email
        let username = studentUsernameMap[session.student_id]
        if (!username) {
          username = getUsernameFromStudent(studentProfile)
        }
        activities.push({
          type: 'game',
          student_id: session.student_id,
          student_name: username,
          student_class: className,
          student_email: studentProfile?.email || '',
          timestamp: session.finished_at,
          game_type: session.game_type,
          description: `Played ${session.game_type} (${session.score || 0} points, ${session.accuracy_pct || 0}% accuracy)`,
          points: session.score || 0,
          accuracy: (session.accuracy_pct || 0) / 100  // Convert from percentage to decimal
        })
      })
      
      // Sort by timestamp and take most recent
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      console.log('Student activity debug:', {
        totalActivities: activities.length,
        loginActivities: activities.filter(a => a.type === 'login').length,
        gameActivities: activities.filter(a => a.type === 'game').length,
        activities: activities.slice(0, 5).map(a => ({
          type: a.type,
          student: a.student_name,
          timestamp: a.timestamp,
          description: a.description
        }))
      })
      
      setStudentActivity(activities.slice(0, 10))
      
    } catch (error) {
      console.error('Error loading student activity:', error)
      setStudentActivity([])
    }
  }

  const fetchHomeworks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get assignments for word sets created by this teacher
      const { data, error } = await supabase
        .from('assigned_word_sets')
        .select(`
          id,
          student_id,
          class_id,
          word_set_id,
          created_at,
          due_date,
          quiz_unlocked,
          word_sets!inner(
            id,
            title,
            teacher_id
          )
        `)
        .eq('word_sets.teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched assignments:', data)
      setHomeworks(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user logged in')

      const vocabularyArray = newHomework.vocabulary_words
        .split(',')
        .map(word => word.trim())
        .filter(word => word.length > 0)

      const { error } = await supabase
        .from('homeworks')
        .insert({
          title: newHomework.title,
          description: newHomework.description,
          vocabulary_words: vocabularyArray,
          due_date: newHomework.due_date,
          teacher_id: user.id
        })

      if (error) throw error

      setMessage('✅ Assignment created successfully!')
      setNewHomework({ title: '', description: '', vocabulary_words: '', due_date: '' })
      fetchHomeworks()
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'An error occurred'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHomework = async (id: string) => {
    try {
      const { error } = await supabase.from('homeworks').delete().eq('id', id)
      if (error) throw error
      setHomeworks(hws => hws.filter(h => h.id !== id))
      setMessage('✅ Assignment deleted')
    } catch (e) {
      setMessage('Error: Failed to delete assignment')
    }
  }

  const handleUpdateHomework = async (id: string) => {
    try {
      const vocabularyArray = editDraft.vocabulary
        .split(',')
        .map(w => w.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('homeworks')
        .update({ title: editDraft.title, description: editDraft.description, due_date: editDraft.due_date, vocabulary_words: vocabularyArray })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      await fetchHomeworks()
      setMessage('✅ Assignment updated')
    } catch (e) {
      setMessage('Error: Failed to update assignment')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Quiz unlock handlers now moved to /teacher/quiz

  return (
    <div>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm mb-6">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
            </div>
                 <div className="flex items-center space-x-4">
                   <span className="text-sm text-gray-600">
                     Logged in as {user?.email?.split('@')[0] || 'Teacher'}
                   </span>
                 </div>
          </div>
        </div>
      </div>

      {/* Welcome section for new teachers */}
      {classes.length === 0 && wordSets.length === 0 && (
        <div className="text-center py-12 mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Welcome, {user?.email?.split('@')[0] || 'Teacher'}!
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Get started by creating your first class and word sets to begin teaching vocabulary.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/teacher/classes"
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                Create Your First Class
              </a>
              <a
                href="/teacher/word-sets"
                className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                Create Word Sets
              </a>
              <a
                href="/teacher/add-students"
                className="px-8 py-4 bg-white border-2 border-green-600 text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Add Students
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard overview for existing teachers */}
      {(classes.length > 0 || wordSets.length > 0) && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Welcome back, {user?.email?.split('@')[0] || 'Teacher'}!
          </h2>
          
          {/* Stats overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Word Sets</p>
                  <p className="text-3xl font-bold text-gray-900">{wordSets.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{homeworks.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

          </div>

          {/* Active students and Latest activity - side by side in smaller grids */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Students Currently Playing */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">Currently Playing</h3>
                <div className="flex items-center text-xs text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span className="font-medium">{activeStudents.length}</span>
                </div>
              </div>
              
              {activeStudents.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeStudents.map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all">
                      <span className="font-medium text-sm text-gray-800 truncate">
                        {student.username || student.email?.split('.')[0] || 'Student'}
                      </span>
                      <span className="text-xs text-gray-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Now
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-500">No students playing</p>
                </div>
              )}
            </div>

            {/* Latest Student Activity */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">Latest Activity</h3>
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Live</span>
                </div>
              </div>
              
              {studentActivity.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {studentActivity.slice(0, 8).map((activity, index) => (
                    <div key={`${activity.student_id}-${activity.timestamp}-${index}`} className="flex flex-col p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-800 truncate">
                          {activity.student_name}{activity.student_class ? ` (${activity.student_class})` : ''}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(activity.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {activity.type === 'game' && activity.game_type && (
                        <span className="text-xs text-gray-500 mt-1">
                          Played {formatGameType(activity.game_type)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Status Indicator - Visar när det är säkert att logga ut */}
      <SaveStatusIndicator />
    </div>
  )
}
