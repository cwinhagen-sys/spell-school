'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BookOpen, Users, ArrowLeft, Gamepad2 } from 'lucide-react'

function JoinSessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'code' | 'name'>('code')
  const [sessionCode, setSessionCode] = useState('')
  const [studentName, setStudentName] = useState('')
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Check for code parameter in URL and auto-fill
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam && codeParam.length === 6) {
      const upperCode = codeParam.toUpperCase()
      setSessionCode(upperCode)
      // Auto-submit the form if code is provided
      const autoSubmit = async () => {
        setError('')
        setLoading(true)

        try {
          const { data, error: fetchError } = await supabase
            .from('sessions')
            .select(`
              id,
              session_code,
              due_date,
              enabled_games,
              is_active,
              word_sets(id, title)
            `)
            .eq('session_code', upperCode)
            .eq('is_active', true)
            .single()

          if (fetchError || !data) {
            throw new Error('Session not found or not active')
          }

          const dueDate = new Date(data.due_date)
          const now = new Date()
          if (dueDate < now) {
            console.warn('⚠️ Joining expired session (for testing)')
          }

          setSession(data)
          setStep('name')
        } catch (error: any) {
          setError(error.message || 'Could not find session. Please check the code.')
        } finally {
          setLoading(false)
        }
      }
      
      // Small delay to ensure state is set
      setTimeout(() => {
        autoSubmit()
      }, 100)
    }
  }, [searchParams])

  // Check if user is logged in and get their name
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Pre-fill name if user is logged in
        const name = user.user_metadata?.username || user.email?.split('@')[0] || ''
        if (name) {
          setStudentName(name)
        }
      }
    }
    checkUser()
  }, [])

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (sessionCode.length !== 6) {
      setError('Session code must be 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_code,
          due_date,
          enabled_games,
          is_active,
          word_sets(id, title)
        `)
        .eq('session_code', sessionCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (fetchError || !data) {
        throw new Error('Session not found or not active')
      }

      // Check if session is expired (but allow joining for testing even if expired)
      // Note: Quiz will still unlock when due date passes, but students can still join
      const dueDate = new Date(data.due_date)
      const now = new Date()
      if (dueDate < now) {
        // Allow joining expired sessions for testing, but show a warning
        console.warn('⚠️ Joining expired session (for testing)')
        // Don't block joining, just continue
      }

      setSession(data)
      setStep('name')
    } catch (error: any) {
      setError(error.message || 'Could not find session. Please check the code.')
    } finally {
      setLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!studentName.trim()) {
      setError('Please enter your name')
      setLoading(false)
      return
    }

    try {
      // Check if participant already exists with this name
      const { data: existingParticipant, error: checkError } = await supabase
        .from('session_participants')
        .select('id, selected_blocks')
        .eq('session_id', session.id)
        .eq('student_name', studentName.trim())
        .single()

      let participantId: string

      if (existingParticipant && !checkError) {
        // Participant already exists - reuse their ID and continue with their progress
        participantId = existingParticipant.id
        console.log('Existing participant found, resuming session:', participantId)
      } else {
        // Create new participant
        const { data: newParticipant, error: joinError } = await supabase
          .from('session_participants')
          .insert({
            session_id: session.id,
            student_name: studentName.trim(),
            student_id: user?.id || null, // Link to account if logged in
          })
          .select()
          .single()

        if (joinError) {
          // Check if it's a duplicate name error (race condition)
          if (joinError.code === '23505') {
            // Try to fetch the existing participant again
            const { data: retryParticipant } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', session.id)
              .eq('student_name', studentName.trim())
              .single()
            
            if (retryParticipant) {
              participantId = retryParticipant.id
            } else {
              setError('This name is already taken. Please choose another.')
              setLoading(false)
              return
            }
          } else {
            throw joinError
          }
        } else {
          participantId = newParticipant.id
        }
      }

      // Store in both sessionStorage and localStorage for the play page
      // localStorage persists across tabs, sessionStorage is per-tab
      sessionStorage.setItem('sessionParticipantId', participantId)
      sessionStorage.setItem('sessionId', session.id)
      sessionStorage.setItem('studentName', studentName.trim())
      localStorage.setItem(`sessionParticipantId_${session.id}`, participantId)
      localStorage.setItem(`sessionId_${session.id}`, session.id)
      localStorage.setItem(`studentName_${session.id}`, studentName.trim())

      // If existing participant had selected blocks, restore them ONLY if they're valid
      if (existingParticipant?.selected_blocks && 
          Array.isArray(existingParticipant.selected_blocks) && 
          existingParticipant.selected_blocks.length > 0) {
        sessionStorage.setItem('selectedBlocks', JSON.stringify(existingParticipant.selected_blocks))
        localStorage.setItem(`selectedBlocks_${session.id}`, JSON.stringify(existingParticipant.selected_blocks))
      } else {
        // New participant OR invalid blocks - ensure blocks step will be shown
        // Clear any old block selections
        sessionStorage.removeItem('selectedBlocks')
        localStorage.removeItem(`selectedBlocks_${session.id}`)
        // Also clear from database if it's invalid
        if (existingParticipant && (!existingParticipant.selected_blocks || 
            !Array.isArray(existingParticipant.selected_blocks) || 
            existingParticipant.selected_blocks.length === 0)) {
          await supabase
            .from('session_participants')
            .update({ selected_blocks: null })
            .eq('id', participantId)
        }
      }

      // Redirect to play page (it will show block selection if no blocks are selected)
      router.push(`/session/${session.id}/play`)
    } catch (error: any) {
      console.error('Error joining session:', error)
      setError(error.message || 'Could not join session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Session</h1>
                <p className="text-gray-600">Enter the session code from your teacher</p>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Session Code
                </label>
                <input
                  type="text"
                  id="code"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase().slice(0, 6))
                    setError('')
                  }}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-center text-2xl font-mono tracking-widest bg-gray-50"
                  maxLength={6}
                  required
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || sessionCode.length !== 6}
                className="w-full px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'name' && session && (
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">What's your name?</h1>
                <p className="text-gray-600">Enter your name to continue</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-700">
                    Word Set: {session.word_sets?.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-gray-600" />
                  <p className="text-sm text-gray-600">
                    {session.enabled_games?.length || 0} games to play
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g. Emma"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-gray-50"
                  required
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('code')
                    setError('')
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !studentName.trim()}
                  className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  {loading ? 'Joining...' : 'Start Playing'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JoinSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <JoinSessionContent />
    </Suspense>
  )
}

