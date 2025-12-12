'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Gamepad2, Plus, Users, Calendar, Trash2, X, Lock, ArrowRight, Sparkles } from 'lucide-react'
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

      // Show all sessions - don't filter by due_date
      // Teachers should be able to see all their sessions
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

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this session? All data will be permanently removed.')) {
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
      loadSessions()
    } catch (error) {
      console.error('Error deactivating session:', error)
      alert('Could not deactivate session. Please try again.')
    }
  }

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <>
        <div className="relative z-10 max-w-4xl mx-auto py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Session Mode</h1>
                <p className="text-gray-400">Create sessions that students can join with a code</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#0c0c14] rounded-xl border border-amber-500/20 p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Session Mode requires Premium or Pro</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Session Mode is only available for Premium and Pro plans. Upgrade your plan to create sessions.
            </p>
            <Link
              href="/teacher/account"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all"
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
    <div className="relative z-10 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Session Mode</h1>
            <p className="text-gray-400">Create sessions that students can join with a code</p>
          </div>
        </div>
        <Link
          href="/teacher/sessions/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Session
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading sessions...</p>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-[#0c0c14] rounded-xl border border-white/[0.08] p-12 text-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <Gamepad2 className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">No sessions yet</h2>
          <p className="text-gray-400 mb-8">Create your first session to get started</p>
          <Link
            href="/teacher/sessions/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Session
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-[#0c0c14] rounded-xl border border-white/[0.08] hover:border-amber-500/30 transition-all p-5 group relative"
            >
              <Link
                href={`/teacher/sessions/${session.id}`}
                className="block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        session.is_active 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                          : 'bg-gray-700'
                      }`}>
                        <Gamepad2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white mb-0.5 truncate">
                          {session.session_name || (session.word_sets && session.word_sets.length > 0 ? session.word_sets[0].title : 'No word list')}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Code: <span className="font-mono font-medium text-amber-400">{session.session_code}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className={isExpired(session.due_date) ? 'text-gray-500' : 'text-gray-400'}>
                      {isExpired(session.due_date) ? 'Ended: ' : 'Due: '}{formatDate(session.due_date)}
                      </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{session._count?.participants || 0} participants</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Gamepad2 className="w-4 h-4 text-gray-500" />
                    <span>{session.enabled_games?.length || 0} games</span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  session.is_active 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${session.is_active ? 'bg-amber-400 animate-pulse' : 'bg-gray-500'}`} />
                  {session.is_active ? 'Active' : 'Inactive'}
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center text-amber-400 font-medium text-sm group-hover:text-amber-300 transition-colors">
                    View details
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </div>
                </div>
              </Link>
              
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {session.is_active && (
                  <button
                    onClick={(e) => handleDeactivateSession(session.id, e)}
                    className="p-2 bg-white/[0.04] text-gray-400 rounded-lg hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.08]"
                    title="End session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="p-2 bg-white/[0.04] text-gray-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/[0.08]"
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
