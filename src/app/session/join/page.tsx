'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BookOpen, Users, ArrowLeft, Gamepad2, Sparkles } from 'lucide-react'

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
      setError('Sessionskoden måste vara 6 tecken')
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
        throw new Error('Sessionen hittades inte eller är inte aktiv')
      }

      // Check if session is expired (but allow joining for testing even if expired)
      const dueDate = new Date(data.due_date)
      const now = new Date()
      if (dueDate < now) {
        console.warn('⚠️ Joining expired session (for testing)')
      }

      setSession(data)
      setStep('name')
    } catch (error: any) {
      setError(error.message || 'Kunde inte hitta sessionen. Kontrollera koden.')
    } finally {
      setLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!studentName.trim()) {
      setError('Ange ditt namn')
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
            student_id: user?.id || null,
          })
          .select()
          .single()

        if (joinError) {
          if (joinError.code === '23505') {
            const { data: retryParticipant } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', session.id)
              .eq('student_name', studentName.trim())
              .single()
            
            if (retryParticipant) {
              participantId = retryParticipant.id
            } else {
              setError('Detta namn är redan taget. Välj ett annat.')
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

      // Store in both sessionStorage and localStorage
      sessionStorage.setItem('sessionParticipantId', participantId)
      sessionStorage.setItem('sessionId', session.id)
      sessionStorage.setItem('studentName', studentName.trim())
      localStorage.setItem(`sessionParticipantId_${session.id}`, participantId)
      localStorage.setItem(`sessionId_${session.id}`, session.id)
      localStorage.setItem(`studentName_${session.id}`, studentName.trim())

      // If existing participant had selected blocks, restore them
      if (existingParticipant?.selected_blocks && 
          Array.isArray(existingParticipant.selected_blocks) && 
          existingParticipant.selected_blocks.length > 0) {
        sessionStorage.setItem('selectedBlocks', JSON.stringify(existingParticipant.selected_blocks))
        localStorage.setItem(`selectedBlocks_${session.id}`, JSON.stringify(existingParticipant.selected_blocks))
      } else {
        sessionStorage.removeItem('selectedBlocks')
        localStorage.removeItem(`selectedBlocks_${session.id}`)
        if (existingParticipant && (!existingParticipant.selected_blocks || 
            !Array.isArray(existingParticipant.selected_blocks) || 
            existingParticipant.selected_blocks.length === 0)) {
          await supabase
            .from('session_participants')
            .update({ selected_blocks: null })
            .eq('id', participantId)
        }
      }

      router.push(`/session/${session.id}/play`)
    } catch (error: any) {
      console.error('Error joining session:', error)
      setError(error.message || 'Kunde inte gå med i sessionen. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Aurora background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ 
        backgroundImage: 'linear-gradient(to right, #ffffff1a 1px, transparent 1px), linear-gradient(to bottom, #ffffff1a 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }} />
      
      <div className="max-w-md w-full relative z-10">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/20 rounded-3xl blur-xl" />
        
        <div className="relative bg-[#12122a]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8">
          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div className="text-center mb-6">
                {/* Animated icon container */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl blur-lg opacity-50 animate-pulse" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Gamepad2 className="w-10 h-10 text-white" />
                  </div>
                  {/* Sparkle decorations */}
                  <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Gå med i Session</h1>
                <p className="text-gray-400">Ange sessionskoden från din lärare</p>
              </div>

              <div>
                <label htmlFor="code" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Sessionskod
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="code"
                    value={sessionCode}
                    onChange={(e) => {
                      setSessionCode(e.target.value.toUpperCase().slice(0, 6))
                      setError('')
                    }}
                    placeholder="ABC123"
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-center text-3xl font-mono tracking-[0.3em] text-white placeholder:text-gray-600 transition-all"
                    maxLength={6}
                    required
                  />
                  {/* Animated border glow when focused */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-orange-500/0 to-amber-500/0 pointer-events-none transition-all peer-focus:from-amber-500/20 peer-focus:via-orange-500/20 peer-focus:to-amber-500/20" />
                </div>
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || sessionCode.length !== 6}
                className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/30 disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Checking...
                  </span>
                ) : (
                  'Fortsätt'
                )}
              </button>
            </form>
          )}

          {step === 'name' && session && (
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div className="text-center mb-6">
                {/* Animated icon container */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-lg opacity-50 animate-pulse" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Vad heter du?</h1>
                <p className="text-gray-400">Ange ditt namn för att fortsätta</p>
              </div>

              {/* Session info card */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center border border-white/10">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ordlista</p>
                    <p className="text-sm font-semibold text-white">
                      {session.word_sets?.title || 'Session'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center border border-white/10">
                    <Gamepad2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Spel</p>
                    <p className="text-sm font-semibold text-white">
                      {session.enabled_games?.length || 0} spel att spela
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Ditt namn
                </label>
                <input
                  type="text"
                  id="name"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value)
                    setError('')
                  }}
                  placeholder="t.ex. Emma"
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder:text-gray-600 transition-all text-lg"
                  required
                />
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('code')
                    setError('')
                  }}
                  className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Tillbaka
                </button>
                <button
                  type="submit"
                  disabled={loading || !studentName.trim()}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-semibold disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30 disabled:shadow-none transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    'Börja spela'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 blur-xl rounded-full" />
      </div>
    </div>
  )
}

export default function JoinSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center relative overflow-hidden">
        {/* Aurora background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 blur-3xl" />
          <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl" />
        </div>
        <div className="text-center relative z-10">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl blur-lg opacity-50 animate-pulse" />
            <div className="relative w-16 h-16 border-2 border-amber-500/30 border-t-amber-500 rounded-xl animate-spin" />
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <JoinSessionContent />
    </Suspense>
  )
}
