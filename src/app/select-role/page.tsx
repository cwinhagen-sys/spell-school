'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, GraduationCap, Sparkles } from 'lucide-react'

export default function SelectRole() {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleRoleSelection = async () => {
    if (!selectedRole) return

    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: selectedRole,
        }, { onConflict: 'id' })

      if (error) throw error

      setMessage('✅ Role saved!')
      router.replace(selectedRole === 'teacher' ? '/teacher' : '/student')
    } catch (error: any) {
      console.error('Error setting role:', error)
      setMessage(`❌ Error setting role: ${error?.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose your role</h1>
          <p className="text-lg text-gray-300">Tell us how you'll use Spell School</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
              selectedRole === 'student'
                ? 'border-yellow-400 bg-yellow-400/10 shadow-lg'
                : 'border-white/20 bg-white/10 hover:bg-white/20'
            }`}
            onClick={() => setSelectedRole('student')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Student</h3>
              <p className="text-gray-300 text-sm">Learn with interactive games and assignments</p>
            </div>
          </div>

          <div
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
              selectedRole === 'teacher'
                ? 'border-yellow-400 bg-yellow-400/10 shadow-lg'
                : 'border-white/20 bg-white/10 hover:bg-white/20'
            }`}
            onClick={() => setSelectedRole('teacher')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Teacher</h3>
              <p className="text-gray-300 text-sm">Create assignments and manage your students</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRoleSelection}
          disabled={!selectedRole || loading}
          className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-2xl hover:shadow-yellow-500/25"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>

        {message && (
          <div className="mt-6 p-4 rounded-lg text-center text-white/90">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}




















