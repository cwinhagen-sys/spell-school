'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Gamepad2, Plus, Users, Calendar, Trash2, X, Lock, ArrowRight, Sparkles, Clock } from 'lucide-react'
import Link from 'next/link'
import { hasSessionModeAccess, getUserSubscriptionTier } from '@/lib/subscription'
import PaymentWallModal from '@/components/PaymentWallModal'

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
  }[]
  _count?: {
    participants: number
  }
}

export default function TeacherSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [showPaymentWall, setShowPaymentWall] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const access = await hasSessionModeAccess(user.id)
          setHasAccess(access)
          if (!access) {
            const tier = await getUserSubscriptionTier(user.id)
            if (tier === 'free') {
              setShowPaymentWall(true)
            }
          }
        }
      } catch (error) {
        console.error('Error checking session mode access:', error)
      } finally {
        setCheckingAccess(false)
      }
    }
    checkAccess()
    loadSessions()
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    
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

      const sessionsWithCounts = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('session_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)

          return {
            ...session,
            word_sets: Array.isArray(session.word_sets) ? session.word_sets : [],
            _count: { participants: count || 0 }
          }
        })
      )

      // Filter out sessions that are more than 48 hours past due_date
      // This gives teachers time to save results after the due date
      const now = new Date()
      const activeSessions = sessionsWithCounts.filter((session) => {
        const dueDate = new Date(session.due_date)
        dueDate.setHours(0, 0, 0, 0)
        // Add 48 hours to due_date to allow time for saving results
        const deletionDate = new Date(dueDate)
        deletionDate.setHours(deletionDate.getHours() + 48)
        // Keep session if it hasn't reached the 48-hour deletion threshold
        return deletionDate >= now
      }) as Session[]

      setSessions(activeSessions)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sv-SE', {
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
    deletionTime.setHours(deletionTime.getHours() + 48)
    const diffMs = deletionTime.getTime() - currentTime.getTime()
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
    return diffHours
  }

  const formatTimeUntilDeletion = (dueDate: string) => {
    const hours = getHoursUntilDeletion(dueDate)
    if (hours === 0) {
      return 'Raderas snart'
    }
    return `Raderas om ${hours} ${hours === 1 ? 'timme' : 'timmar'}`
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Är du säker på att du vill ta bort denna session? All data kommer att raderas permanent.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
      loadSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Kunde inte ta bort sessionen. Försök igen.')
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
      loadSessions()
    } catch (error) {
      console.error('Error deactivating session:', error)
      alert('Kunde inte avsluta sessionen. Försök igen.')
    }
  }

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Kontrollerar åtkomst...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Session Mode</h1>
                <p className="text-gray-400">Create sessions that students can join with a code</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-amber-500/30 p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Session Mode requires Premium or Pro</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Session Mode is only available for Premium and Pro plans. Upgrade your plan to create sessions.
            </p>
            <Link
              href="/teacher/account"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-5 h-5" />
              View subscription plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <PaymentWallModal
          isOpen={showPaymentWall}
          onClose={() => setShowPaymentWall(false)}
          feature="Session Mode"
          currentLimit={null}
          upgradeTier="premium"
          upgradeMessage="Session Mode is only available for Premium and Pro plans. Upgrade to create structured homework chains that students must complete in sequence."
        />
      </>
    )
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Session Mode</h1>
            <p className="text-gray-400">Skapa sessioner som elever kan gå med i med en kod</p>
          </div>
        </div>
        <Link
          href="/teacher/sessions/create"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Skapa session
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Laddar sessioner...</p>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <Gamepad2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Inga sessioner ännu</h2>
          <p className="text-gray-400 mb-8">Skapa din första session för att komma igång</p>
          <Link
            href="/teacher/sessions/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            Skapa session
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all p-6 group relative shadow-xl"
            >
              <Link
                href={`/teacher/sessions/${session.id}`}
                className="block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        session.is_active 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20' 
                          : 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-500/10'
                      }`}>
                        <Gamepad2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1 truncate">
                          {session.session_name || (session.word_sets && session.word_sets.length > 0 ? session.word_sets[0].title : 'Ingen ordlista')}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Kod: <span className="font-mono font-medium text-emerald-400">{session.session_code}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {isExpired(session.due_date) ? (
                      <span className={`font-medium ${
                        getHoursUntilDeletion(session.due_date) < 12 
                          ? 'text-red-400' 
                          : getHoursUntilDeletion(session.due_date) < 24 
                          ? 'text-amber-400' 
                          : 'text-gray-400'
                      }`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatTimeUntilDeletion(session.due_date)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Förfaller: {formatDate(session.due_date)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{session._count?.participants || 0} deltagare</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Gamepad2 className="w-4 h-4 text-gray-500" />
                    <span>{session.enabled_games?.length || 0} spel</span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  session.is_active 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${session.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  {session.is_active ? 'Aktiv' : 'Inaktiv'}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center text-emerald-400 font-medium text-sm group-hover:text-emerald-300 transition-colors">
                    Visa detaljer
                    <span className="ml-auto">→</span>
                  </div>
                </div>
              </Link>
              
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {session.is_active && (
                  <button
                    onClick={(e) => handleDeactivateSession(session.id, e)}
                    className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all border border-white/10"
                    title="Avsluta session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/10"
                  title="Ta bort session"
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

