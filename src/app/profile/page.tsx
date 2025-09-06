'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Role = 'teacher' | 'student'

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }

      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setRole((profile?.role as Role) ?? null)
      setLoading(false)
    }
    load()
  }, [router])

  const saveRole = async (nextRole: Role) => {
    setLoading(true)
    setMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, role: nextRole, created_at: new Date().toISOString() })

      if (error) throw error
      setRole(nextRole)
      setMessage('Saved!')
    } catch (e) {
      setMessage('Failed to save role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
          <div className="mb-4">
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{email}</div>
          </div>

          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">Role</div>
            <div className="flex gap-3">
              <button
                onClick={() => saveRole('student')}
                disabled={loading || role === 'student'}
                className={`px-4 py-2 rounded-lg border ${role === 'student' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}
              >
                Student
              </button>
              <button
                onClick={() => saveRole('teacher')}
                disabled={loading || role === 'teacher'}
                className={`px-4 py-2 rounded-lg border ${role === 'teacher' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}
              >
                Teacher
              </button>
            </div>
          </div>

          {message && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{message}</div>}
        </div>
      </div>
    </div>
  )
}




























