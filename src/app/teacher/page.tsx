'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Calendar, FileText, Users, Clock, ArrowRight, Plus, TrendingUp, Activity, Gamepad2 } from 'lucide-react'
import Link from 'next/link'
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
  const [sessionsCount, setSessionsCount] = useState<number>(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/'
        return
      }

      setUser(user)

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
      await fetchHomeworks()
      await loadSessionsCount()
    }
    init()
    
    const interval = setInterval(() => {
      loadActiveStudents()
      loadStudentActivity()
    }, 30000)
    
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
        .is('deleted_at', null)
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
        setActiveStudents([])
        return
      }
      
      const studentIds = classStudents.map(cs => cs.student_id)
      
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, email, last_active, role, username')
        .in('id', studentIds)
        .eq('role', 'student')
        .order('last_active', { ascending: false })
      
      if (studentsError) {
        console.error('Error loading students:', studentsError)
        setActiveStudents([])
        return
      }
      
      const now = new Date()
      const activeStudents = (students || []).filter(student => {
        if (!student.last_active) return false
        const lastActive = new Date(student.last_active)
        const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60)
        return diffMinutes <= 2
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
      
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id, class_id, classes!inner(teacher_id, name)')
        .eq('classes.teacher_id', user.id)
      
      if (!classStudents || classStudents.length === 0) {
        setStudentActivity([])
        return
      }
      
      const studentIds = classStudents.map(cs => cs.student_id)
      // Type assertion needed because Supabase join returns nested structure
      const classMap = new Map(classStudents.map(cs => {
        const classes = (cs as any).classes
        return [cs.student_id, classes?.name]
      }))
      
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('student_id, game_type, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', studentIds)
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
      
      const activity = (sessions || []).map(session => {
        const profile = profileMap.get(session.student_id)
        return {
          student_id: session.student_id,
          student_name: profile?.username || profile?.email?.split('.')[0] || 'Student',
          student_class: classMap.get(session.student_id),
          game_type: session.game_type,
          timestamp: session.created_at,
          type: 'game'
        }
      })
      
      setStudentActivity(activity)
    } catch (error) {
      console.error('Error loading student activity:', error)
      setStudentActivity([])
    }
  }

  const fetchHomeworks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
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
          word_sets!inner(id, title, teacher_id)
        `)
        .eq('word_sets.teacher_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setHomeworks(data || [])
    } catch (error) {
      console.error('Error fetching homeworks:', error)
    }
  }

  const loadSessionsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { count, error } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
      
      if (error) throw error
      setSessionsCount(count || 0)
    } catch (error) {
      console.error('Error loading sessions count:', error)
      setSessionsCount(0)
    }
  }

  const formatGameType = (type: string) => {
    const gameNames: Record<string, string> = {
      flashcards: 'Flashcards',
      memory: 'Memory',
      typing: 'Typing Challenge',
      translate: 'Translate',
      pronunciation: 'Pronunciation',
      sentence_gap: 'Sentence Gap',
      word_roulette: 'Word Roulette'
    }
    return gameNames[type] || type
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      {/* Welcome section for new teachers */}
      {classes.length === 0 && wordSets.length === 0 && (
          <div className="text-center py-16 mb-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl p-8 shadow-md border border-gray-200">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Välkommen, {user?.email?.split('@')[0] || 'Lärare'}!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Kom igång genom att skapa din första klass och ordlista för att börja lära ut glosor.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/teacher/classes"
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
                >
                  Skapa din första klass
                </Link>
                <Link
                  href="/teacher/word-sets"
                  className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Skapa ordlista
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard overview for existing teachers */}
        {(classes.length > 0 || wordSets.length > 0) && (
          <>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Välkommen tillbaka, {user?.email?.split('@')[0] || 'Lärare'}!
              </h2>
              <p className="text-gray-600">Här är en översikt av din verksamhet</p>
            </div>
            
            {/* Main Stats Grid - Symmetrical 3x2 layout */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Link
                href="/teacher/classes"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-teal-300 transition-all group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-1">Classes</p>
                    <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                  </div>
                </div>
                <div className="flex items-center text-teal-600 font-medium text-sm">
                  Manage classes <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <Link
                href="/teacher/word-sets"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-teal-300 transition-all group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-1">Word Sets</p>
                    <p className="text-3xl font-bold text-gray-900">{wordSets.length}</p>
                  </div>
                </div>
                <div className="flex items-center text-blue-600 font-medium text-sm">
                  Create vocabulary <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <Link
                href="/teacher/assign"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-teal-300 transition-all group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-1">Assignments</p>
                    <p className="text-3xl font-bold text-gray-900">{homeworks.length}</p>
                  </div>
                </div>
                <div className="flex items-center text-green-600 font-medium text-sm">
                  Assign vocabulary <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Now</p>
                    <p className="text-3xl font-bold text-gray-900">{activeStudents.length}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Students playing</p>
              </div>

              <Link
                href="/teacher/sessions"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-teal-300 transition-all group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <Gamepad2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-1">Sessions</p>
                    <p className="text-3xl font-bold text-gray-900">{sessionsCount}</p>
                  </div>
                </div>
                <div className="flex items-center text-purple-600 font-medium text-sm">
                  Manage sessions <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <Link
                href="/teacher/students"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-teal-300 transition-all group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-1">Progress</p>
                    <p className="text-3xl font-bold text-gray-900">—</p>
                  </div>
                </div>
                <div className="flex items-center text-indigo-600 font-medium text-sm">
                  View analytics <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>
            </div>

            {/* Activity Feed - Unified section */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-500" />
                  Recent Activity
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{activeStudents.length} active</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Active Students */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Currently Playing</h4>
                  {activeStudents.length > 0 ? (
                    <div className="space-y-2">
                      {activeStudents.slice(0, 5).map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors">
                          <span className="text-sm text-gray-800 truncate">
                            {student.username || student.email?.split('.')[0] || 'Student'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            Now
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No students playing right now</p>
                  )}
                </div>

                {/* Latest Activity */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Latest Games</h4>
                  {studentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {studentActivity.slice(0, 5).map((activity, index) => (
                        <div key={`${activity.student_id}-${activity.timestamp}-${index}`} className="p-2.5 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-800 truncate">
                              {activity.student_name}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {activity.game_type && (
                            <p className="text-xs text-gray-500">
                              {formatGameType(activity.game_type)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      {/* Save Status Indicator */}
      <SaveStatusIndicator />
    </>
  )
}
