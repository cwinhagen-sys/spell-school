'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  return (
    <div className="relative min-h-screen bg-gray-900 text-white px-6 py-10 flex items-center">
      <div className="fixed top-6 right-6 z-10"><Link href="/" className="text-sm text-gray-300 hover:text-white">Home</Link></div>
      <div className="max-w-3xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-6 w-full">
          <StudentForm />
          <TeacherForm />
        </div>
        <p className="mt-6 text-center text-sm text-gray-400">Already have an account? <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Login</Link></p>
      </div>
    </div>
  )
}

function StudentForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState<string>('')
  const [classCode, setClassCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (!/^.*(?=.*[a-zA-Z])(?=.*\d).{8,16}$/.test(password)) { setMsg('Password must be 8-16 chars incl. letters and numbers'); return }
    setLoading(true)
    // Allow real email or fallback alias for username-only
    const signupEmail = email && email.includes('@') ? email.trim() : `${username}@local.local`
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: { data: { role: 'student', username, age } }
    })
    if (error) setMsg(error.message)
    else {
      const userId = data.user?.id
      // Ensure a profile row exists with role and name
      if (userId) {
        await supabase.from('profiles').upsert({ id: userId, email: signupEmail, role: 'student' }, { onConflict: 'id' })
      }
      // Try join class if code provided (requires session)
      if (classCode.trim()) {
        await supabase.rpc('join_class_with_code', { p_code: classCode.trim().toUpperCase() })
      }
      window.location.href = '/auth/callback'
    }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-bold mb-4">Create your student account</h1>
      <button onClick={async()=>{
        await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
      }} className="w-full bg-white/10 hover:bg-white/15 rounded-md px-4 py-2">Sign up with Google</button>
      <div className="my-4 text-center text-gray-400">OR</div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm text-gray-300">Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Don't use your real name" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm text-gray-300">Email (optional)</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-300">Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="8-16 chars, numbers + letters" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm text-gray-300">Age</label>
          <input value={age} onChange={e=>setAge(e.target.value)} type="number" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-300">Class Code (Optional)</label>
          <input value={classCode} onChange={e=>setClassCode(e.target.value)} className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
        </div>
        {msg && <div className="text-sm text-red-200">{msg}</div>}
        <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-md px-4 py-2">{loading? 'Creating…':'Sign Up'}</button>
      </form>
      <div className="mt-3 text-sm"><a href="#" onClick={(e)=>{e.preventDefault(); document.querySelector('#teacher-signup')?.scrollIntoView({behavior:'smooth'})}} className="text-indigo-400 hover:text-indigo-300">Oops, I'm not a student</a></div>
      <p className="mt-4 text-xs text-gray-400">Creating an account means you're okay with our <a className="underline" href="#">Terms of Use</a> and <a className="underline" href="#">PRIVACY POLICY</a>.</p>
    </div>
  )
}

function TeacherForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (!/^.*(?=.*[a-zA-Z])(?=.*\d).{8,16}$/.test(password)) { setMsg('Password must be 8-16 chars incl. letters and numbers'); return }
    setLoading(true)
    if (!email || !email.includes('@')) { setMsg('Please enter a valid email'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role: 'teacher' } } })
    if (error) setMsg(error.message)
    else {
      const userId = data.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({ id: userId, email, role: 'teacher' }, { onConflict: 'id' })
      }
      window.location.href = '/auth/callback'
    }
    setLoading(false)
  }

  return (
    <div id="teacher-signup" className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-bold mb-4">Create your teacher account</h1>
      <div className="grid gap-2">
        <button onClick={async()=>{await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })}} className="w-full bg-white/10 hover:bg-white/15 rounded-md px-4 py-2">Sign up with Google</button>
        <button disabled className="w-full bg-white/5 rounded-md px-4 py-2 opacity-50 cursor-not-allowed">Sign up with Microsoft</button>
        <button disabled className="w-full bg-white/5 rounded-md px-4 py-2 opacity-50 cursor-not-allowed">Sign up with Clever</button>
        <button disabled className="w-full bg-white/5 rounded-md px-4 py-2 opacity-50 cursor-not-allowed">Sign up with Classlink</button>
      </div>
      <div className="my-4 text-center text-gray-400">OR</div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm text-gray-300">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm text-gray-300">Password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="8-16 chars, numbers + letters" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" required />
        </div>
        {msg && <div className="text-sm text-red-200">{msg}</div>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-md px-4 py-2">{loading? 'Creating…':'Sign Up'}</button>
      </form>
      <div className="mt-3 text-sm"><Link href="/signup" className="text-indigo-400 hover:text-indigo-300">Oops, I'm not a teacher</Link></div>
      <p className="mt-4 text-xs text-gray-400">Creating an account means you're okay with our <a className="underline" href="#">Terms of Use</a> and <a className="underline" href="#">PRIVACY POLICY</a>.</p>
    </div>
  )
}


