'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Gamepad2, Plus, Users, Calendar, CheckCircle2, Circle, Clock, Trash2, X } from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  session_code: string
  session_name?: string
  due_date: string
  enabled_games: string[]
  is_active: boolean
  created_at: string
  word_sets: {
    id: string
    title: string
  }
  _count?: {
    participants: number
  }
}

export default function TeacherSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadSessions()
    // Update time every minute to refresh countdown
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          session_name,
          due_date,
          enabled_games,
          is_active,
          created_at,
          word_sets(id, title)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get participant counts
      const sessionsWithCounts = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('session_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)

          return {
            ...session,
            _count: { participants: count || 0 }
          }
        })
      )

      setSessions(sessionsWithCounts as Session[])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const getHoursUntilDeletion = (dueDate: string) => {
    const due = new Date(dueDate)
    const deletionTime = new Date(due)
    deletionTime.setHours(deletionTime.getHours() + 48) // 48 hours after due date
    const diffMs = deletionTime.getTime() - currentTime.getTime()
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
    return diffHours
  }

  const formatTimeUntilDeletion = (dueDate: string) => {
    const hours = getHoursUntilDeletion(dueDate)
    if (hours === 0) {
      return 'Deleting soon'
    }
    return `Deletes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this session? All data will be permanently deleted.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      // Reload sessions
      loadSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Could not delete session. Please try again.')
    }
  }

  const handleDeactivateSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', sessionId)

      if (error) throw error

      // Reload sessions
      loadSessions()
    } catch (error) {
      console.error('Error deactivating session:', error)
      alert('Could not end session. Please try again.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Session Mode
          </h1>
          <p className="text-gray-600">Create sessions that students can join with a code</p>
        </div>
        <Link
          href="/teacher/sessions/create"
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create new session
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No sessions yet</h2>
          <p className="text-gray-600 mb-6">Create your first session to get started</p>
          <Link
            href="/teacher/sessions/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Create session
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-teal-300 transition-all p-6 group relative"
            >
              <Link
                href={`/teacher/sessions/${session.id}`}
                className="block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                        <Gamepad2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 truncate">
                          {session.session_name || session.word_sets?.title || 'No word set'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Code: <span className="font-mono font-medium text-gray-700">{session.session_code}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {isExpired(session.due_date) ? (
                      <span className={`font-medium ${
                        getHoursUntilDeletion(session.due_date) < 12 
                          ? 'text-red-600' 
                          : getHoursUntilDeletion(session.due_date) < 24 
                          ? 'text-orange-600' 
                          : 'text-gray-600'
                      }`}>
                        {formatTimeUntilDeletion(session.due_date)}
                      </span>
                    ) : (
                      <span>Due: {formatDate(session.due_date)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{session._count?.participants || 0} participants</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Gamepad2 className="w-4 h-4 text-gray-400" />
                    <span>{session.enabled_games?.length || 0} games</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-teal-600 font-medium text-sm group-hover:text-teal-700 transition-colors">
                    View details
                    <span className="ml-auto">→</span>
                  </div>
                </div>
              </Link>
              
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {session.is_active && (
                  <button
                    onClick={(e) => handleDeactivateSession(session.id, e)}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                    title="End session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                  title="Delete session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

