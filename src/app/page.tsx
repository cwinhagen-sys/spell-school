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
    <div className="min-h-[calc(100vh+4rem)] -mt-16 -mb-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center px-6">
      {/* Main Content */}
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold text-white shadow-lg">SS</div>
          <h1 className="mt-4 text-3xl font-bold text-gray-800">Spell School</h1>
          <p className="text-gray-600 mt-1">Language learning platform</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 backdrop-blur-sm shadow-xl">
          <button onClick={handleGoogle} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md px-4 py-2 transition-colors">Continue with Google</button>
          <div className="my-4 text-center text-gray-500">OR</div>
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input value={identifier} onChange={e=>setIdentifier(e.target.value)} type="text" placeholder="Email or Username" className="w-full rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
            {message && <div className="text-sm text-red-600">{message}</div>}
            <button disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-md px-4 py-2 transition-all duration-200 shadow-lg">{loading? 'Signing in…':'Login'}</button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">No account? <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign up</Link></p>
        </div>
      </div>
    </div>
  )
}
