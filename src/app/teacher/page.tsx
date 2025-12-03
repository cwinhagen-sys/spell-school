'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Calendar, FileText, Users, Clock, ArrowRight, Plus, TrendingUp, Activity, Gamepad2, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
  const [loading, setLoading] = useState(true)

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
      
      await Promise.all([
        loadClasses(),
        loadWordSets(),
        loadActiveStudents(),
        loadStudentActivity(),
        fetchHomeworks(),
        loadSessionsCount()
      ])
      setLoading(false)
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
      typing: 'Typing',
      translate: 'Translate',
      pronunciation: 'Uttal',
      sentence_gap: 'Luckor',
      word_roulette: 'Roulette',
      match: 'Memory',
      connect: 'Connect',
      choice: 'Flerval',
      quiz: 'Quiz'
    }
    return gameNames[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Welcome section for new teachers */}
      {classes.length === 0 && wordSets.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="max-w-2xl mx-auto">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl flex items-center justify-center mx-auto">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-amber-500 to-rose-500 rounded-3xl blur-xl opacity-40" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              Välkommen, {user?.email?.split('@')[0] || 'Lärare'}!
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-lg mx-auto">
              Kom igång genom att skapa din första klass och gloslista för att börja undervisa.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/teacher/classes"
                className="group relative inline-flex items-center justify-center gap-2"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="relative bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg inline-flex items-center gap-2 hover:from-amber-400 hover:to-orange-500 transition-all">
                  <Plus className="w-5 h-5" />
                  Skapa din första klass
                </span>
              </Link>
              
              <Link
                href="/teacher/word-sets"
                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
              >
                <FileText className="w-5 h-5" />
                Skapa gloslista
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dashboard overview for existing teachers */}
      {(classes.length > 0 || wordSets.length > 0) && (
        <>
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              Välkommen tillbaka, {user?.email?.split('@')[0] || 'Lärare'}!
            </h2>
            <p className="text-gray-400">Här är en översikt av din verksamhet</p>
          </motion.div>
          
          {/* Main Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { href: '/teacher/classes', icon: Users, label: 'Klasser', value: classes.length, gradient: 'from-teal-500 to-emerald-500', action: 'Hantera klasser' },
              { href: '/teacher/word-sets', icon: FileText, label: 'Gloslistor', value: wordSets.length, gradient: 'from-blue-500 to-cyan-500', action: 'Skapa glosor' },
              { href: '/teacher/assign', icon: Calendar, label: 'Tilldelningar', value: homeworks.length, gradient: 'from-green-500 to-emerald-500', action: 'Tilldela glosor' },
              { href: null, icon: Activity, label: 'Aktiva nu', value: activeStudents.length, gradient: 'from-orange-500 to-amber-500', action: null, pulse: true },
              { href: '/teacher/sessions', icon: Gamepad2, label: 'Sessions', value: sessionsCount, gradient: 'from-purple-500 to-indigo-500', action: 'Hantera sessions' },
              { href: '/teacher/students', icon: TrendingUp, label: 'Progress', value: '—', gradient: 'from-rose-500 to-pink-500', action: 'Se statistik' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className="group block h-full"
                  >
                    <div className="relative h-full bg-[#12122a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all overflow-hidden">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          {item.pulse && (
                            <span className="flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-1">{item.label}</p>
                        <p className="text-3xl font-bold text-white mb-3">{item.value}</p>
                        
                        {item.action && (
                          <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                            {item.action}
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="relative h-full bg-[#12122a] border border-white/5 rounded-2xl p-6 overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.gradient} opacity-10 blur-2xl`} />
                    
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        {item.pulse && (
                          <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-1">{item.label}</p>
                      <p className="text-3xl font-bold text-white mb-3">{item.value}</p>
                      <p className="text-xs text-gray-500">Elever som spelar just nu</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Activity Feed */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#12122a] border border-white/5 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Senaste aktivitet
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>{activeStudents.length} aktiva</span>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Active Students */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Spelar just nu
                </h4>
                {activeStudents.length > 0 ? (
                  <div className="space-y-2">
                    {activeStudents.slice(0, 5).map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                            {(student.username || student.email)?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm text-white">
                            {student.username || student.email?.split('.')[0] || 'Elev'}
                          </span>
                        </div>
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Nu
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500">Inga elever spelar just nu</p>
                  </div>
                )}
              </div>

              {/* Latest Activity */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-500" />
                  Senaste spel
                </h4>
                {studentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {studentActivity.slice(0, 5).map((activity, index) => (
                      <div key={`${activity.student_id}-${activity.timestamp}-${index}`} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white truncate">
                            {activity.student_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {formatGameType(activity.game_type)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500">Ingen aktivitet ännu</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Save Status Indicator */}
      <SaveStatusIndicator />
    </>
  )
}
