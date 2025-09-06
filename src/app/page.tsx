'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const email = identifier.includes('@') ? identifier : `${identifier}@local.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(`Error: ${error.message}`)
    else window.location.href = '/auth/callback'
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  return (
    <div className="min-h-[calc(100vh+4rem)] -mt-16 -mb-16 bg-gray-900 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold">SS</div>
          <h1 className="mt-4 text-3xl font-bold">Spell School</h1>
          <p className="text-gray-300 mt-1">Language learning platform</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <button onClick={handleGoogle} className="w-full bg-white/10 hover:bg-white/15 rounded-md px-4 py-2">Continue with Google</button>
          <div className="my-4 text-center text-gray-400">OR</div>
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input value={identifier} onChange={e=>setIdentifier(e.target.value)} type="text" placeholder="Email or Username" className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" required />
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" required />
            {message && <div className="text-sm text-red-200">{message}</div>}
            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-md px-4 py-2">{loading? 'Signing in…':'Login'}</button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-400">No account? <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">Sign up</Link></p>
        </div>
      </div>
    </div>
  )
}
