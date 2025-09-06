'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/5 rounded-2xl border border-white/10 p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Join a Class</h1>
        <p className="text-gray-300 mb-6">Enter the 6‑character class code from your teacher.</p>
        <form onSubmit={join} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. AB3D7K"
            className="w-full px-4 py-3 rounded-lg tracking-widest uppercase font-mono bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
            maxLength={8}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Joining…' : 'Join Class'}
          </button>
        </form>
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('✅') ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-red-500/20 text-red-200 border border-red-400/30'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}


