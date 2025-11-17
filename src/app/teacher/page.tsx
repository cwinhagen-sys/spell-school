'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Calendar, FileText, Users, Clock, ArrowRight, Plus, TrendingUp, Activity } from 'lucide-react'
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
      fetchHomeworks()
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Lärardashboard</h1>
                <p className="text-sm text-gray-600">Översikt och snabbåtkomst</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.email?.split('@')[0] || 'Lärare'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logga ut
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
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
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Välkommen tillbaka, {user?.email?.split('@')[0] || 'Lärare'}!
              </h2>
              <p className="text-gray-600">Här är en översikt av din verksamhet</p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Link
                href="/teacher/classes"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{classes.length}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Klasser</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  Hantera klasser <ArrowRight className="w-3 h-3" />
                </p>
              </Link>

              <Link
                href="/teacher/word-sets"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{wordSets.length}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Ordlistor</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  Skapa glosor <ArrowRight className="w-3 h-3" />
                </p>
              </Link>

              <Link
                href="/teacher/assign"
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{homeworks.length}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Tilldelningar</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  Tilldela glosor <ArrowRight className="w-3 h-3" />
                </p>
              </Link>

              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{activeStudents.length}</span>
                </div>
                <p className="text-sm font-medium text-gray-600">Aktiva elever</p>
                <p className="text-xs text-gray-500 mt-1">Spelar just nu</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Link
                href="/teacher/classes"
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 hover:border-indigo-400 transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Skapa klass</h3>
                    <p className="text-sm text-gray-600">Lägg till en ny klass</p>
                  </div>
                </div>
                <div className="flex items-center text-indigo-600 font-medium text-sm">
                  Kom igång <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <Link
                href="/teacher/word-sets"
                className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Skapa ordlista</h3>
                    <p className="text-sm text-gray-600">Lägg till nya glosor</p>
                  </div>
                </div>
                <div className="flex items-center text-blue-600 font-medium text-sm">
                  Kom igång <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>

              <Link
                href="/teacher/assign"
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 hover:border-green-400 transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Tilldela glosor</h3>
                    <p className="text-sm text-gray-600">Tilldela ordlistor till elever</p>
                  </div>
                </div>
                <div className="flex items-center text-green-600 font-medium text-sm">
                  Kom igång <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>
            </div>

            {/* Active students and Latest activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Students Currently Playing */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Aktiva elever
                  </h3>
                  <div className="flex items-center text-xs text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                    <span className="font-medium">{activeStudents.length}</span>
                  </div>
                </div>
                
                {activeStudents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                        <span className="font-medium text-sm text-gray-800 truncate">
                          {student.username || student.email?.split('.')[0] || 'Student'}
                        </span>
                        <span className="text-xs text-gray-600 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Nu
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Inga elever spelar just nu</p>
                  </div>
                )}
              </div>

              {/* Latest Student Activity */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Senaste aktivitet
                  </h3>
                  <div className="flex items-center text-xs text-gray-600">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Live</span>
                  </div>
                </div>
                
                {studentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {studentActivity.slice(0, 10).map((activity, index) => (
                      <div key={`${activity.student_id}-${activity.timestamp}-${index}`} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
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
                            Spelade {formatGameType(activity.game_type)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ingen senaste aktivitet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save Status Indicator */}
      <SaveStatusIndicator />
    </div>
  )
}
