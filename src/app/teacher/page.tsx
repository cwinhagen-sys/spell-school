'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Plus, LogOut, Home, Calendar, FileText, Users, Clock, Gamepad2, LogIn, Trophy, Star } from 'lucide-react'
import { Homework } from '@/types'

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [wordSets, setWordSets] = useState<any[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])
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

  const loadStudentActivity = async () => {
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
      
      if (classError) throw classError
      
      if (!classStudents || classStudents.length === 0) {
        setStudentActivity([])
        return
      }
      
      // Get student profiles with recent activity
      const studentIds = classStudents.map(cs => cs.student_id)
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, email, last_active, created_at')
        .in('id', studentIds)
        .eq('role', 'student')
        .order('last_active', { ascending: false })
        .limit(10) // Get top 10 most recent activities
      
      if (studentsError) {
        console.error('Error loading student activity:', studentsError)
        setStudentActivity([])
        return
      }
      
      // Get student progress data for game activity
      const { data: progressData, error: progressError } = await supabase
        .from('student_progress')
        .select('student_id, last_played_at, points, accuracy')
        .in('student_id', studentIds)
        .not('last_played_at', 'is', null)
        .order('last_played_at', { ascending: false })
        .limit(20)
      
      if (progressError) {
        console.log('Progress data not available:', progressError)
      }
      
      // Combine profile activity and game activity
      const activities: any[] = []
      
      // Add profile login activity
      students?.forEach(student => {
        if (student.last_active) {
          activities.push({
            type: 'login',
            student_id: student.id,
            student_name: student.email?.split('@')[0] || 'Student',
            student_email: student.email,
            timestamp: student.last_active,
            description: 'Logged in'
          })
        }
      })
      
      // Add game activity
      progressData?.forEach(progress => {
        activities.push({
          type: 'game',
          student_id: progress.student_id,
            student_name: students?.find(s => s.id === progress.student_id)?.email?.split('@')[0] || 'Student',
          student_email: students?.find(s => s.id === progress.student_id)?.email || '',
          timestamp: progress.last_played_at,
          description: `Played game (${progress.points} points, ${Math.round(progress.accuracy * 100)}% accuracy)`,
          points: progress.points,
          accuracy: progress.accuracy
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
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Word Sets</p>
                  <p className="text-3xl font-bold text-gray-900">{wordSets.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{homeworks.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Active students */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Students Currently Playing</h3>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="font-medium">{activeStudents.length}</span>
              </div>
            </div>
            
            {activeStudents.length > 0 ? (
              <div className="space-y-2">
                {activeStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {student.email?.split('@')[0] || 'Student'}
                        </p>
                        <p className="text-xs text-gray-600">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-green-600">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Playing now</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No students currently playing</p>
              </div>
            )}
          </div>

          {/* Latest student activity */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Latest Student Activity</h3>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>Live updates</span>
              </div>
            </div>
            
            {studentActivity.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {studentActivity.map((activity, index) => (
                  <div key={`${activity.student_id}-${activity.timestamp}-${index}`} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-shrink-0 mr-3">
                      {activity.type === 'login' && (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <LogIn className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      {activity.type === 'game' && (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Gamepad2 className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800 truncate">
                          {activity.student_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      {activity.type === 'game' && activity.points && (
                        <div className="flex items-center mt-2 space-x-4">
                          <div className="flex items-center text-xs text-gray-500">
                            <Star className="w-3 h-3 mr-1" />
                            <span>{activity.points} points</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Trophy className="w-3 h-3 mr-1" />
                            <span>{Math.round(activity.accuracy * 100)}% accuracy</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No recent student activity</p>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Overview</h3>
            <div className="space-y-3">
              {classes.length > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  <span>Latest class: <span className="font-medium">{classes[0]?.name}</span></span>
                </div>
              )}
              {wordSets.length > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full mr-3"></div>
                  <span>Latest word set: <span className="font-medium">{wordSets[0]?.title}</span></span>
                </div>
              )}
              {homeworks.length > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <span>Latest assignment: <span className="font-medium">{homeworks[0]?.word_sets?.title || 'Unknown'}</span></span>
                </div>
              )}
              {classes.length === 0 && wordSets.length === 0 && homeworks.length === 0 && (
                <p className="text-sm text-gray-500 italic">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
