'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Users, BookOpen } from 'lucide-react'

export default function JoinClassPage() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const guard = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'student') {
        window.location.href = profile?.role === 'teacher' ? '/teacher' : '/select-role'
      }
    }
    guard()
  }, [])

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setSubmitting(true)
    setMessage('')
    try {
      const normalized = code.trim().toUpperCase()
      const { data, error } = await supabase.rpc('join_class_with_code', { p_code: normalized })
      if (error) throw error
      if (data === true) {
        setMessage('✅ Joined class successfully!')
        setTimeout(() => { window.location.href = '/student' }, 1000)
      } else {
        setMessage('❌ Invalid or expired code.')
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to join class'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-start justify-center px-4 pt-20">
      <div className="max-w-lg w-full">
        {/* Back button */}
        <div className="mb-8">
          <a 
            href="/student" 
            className="inline-flex items-center text-violet-600 hover:text-violet-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </a>
        </div>

        {/* Main form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-10">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-10">Enter Class Code</h1>
          
          <form onSubmit={join} className="space-y-8">
            <div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AB3D7K"
                className="w-full px-8 py-6 text-5xl tracking-widest uppercase font-mono bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-center rounded-xl"
                maxLength={8}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-5 rounded-xl font-semibold hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 hover:shadow-lg text-xl"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                  Joining...
                </div>
              ) : (
                'Join Class'
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-8 p-5 rounded-xl text-center font-medium ${
              message.includes('✅') 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center justify-center">
                <span className="text-2xl mr-2">{message.includes('✅') ? '✅' : '❌'}</span>
                {message.replace(/[✅❌]/g, '').trim()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


