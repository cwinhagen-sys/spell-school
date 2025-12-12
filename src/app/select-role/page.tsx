'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Sparkles } from 'lucide-react'

export default function SelectRole() {
  const [selectedRole, setSelectedRole] = useState<'teacher' | null>(null)
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

      // Only allow teacher role - students are added by teachers
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'teacher',
        }, { onConflict: 'id' })

      if (error) throw error

      setMessage('✅ Role saved!')
      router.replace('/teacher')
    } catch (error: any) {
      console.error('Error setting role:', error)
      setMessage(`❌ Error setting role: ${error?.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center p-4">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl w-full relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Select your role</h1>
          <p className="text-base text-gray-400">Only teachers can register. Students are added by their teachers.</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div
            className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
              selectedRole === 'teacher'
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-white/[0.08] bg-[#161622] hover:bg-white/[0.04] hover:border-white/[0.12]'
            }`}
            onClick={() => setSelectedRole('teacher')}
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Teacher</h3>
              <p className="text-gray-400 text-sm">Create assignments and manage your students</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 max-w-md mx-auto">
          <p className="text-sm text-amber-200/80 text-center">
            <strong>Note:</strong> Students cannot register themselves. Teachers create student accounts via the "Add students" feature in the teacher dashboard.
          </p>
        </div>

        <button
          onClick={handleRoleSelection}
          disabled={!selectedRole || loading}
          className="w-full max-w-md mx-auto block bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-orange-500/20"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>

        {message && (
          <div className="mt-6 p-4 rounded-xl text-center text-gray-300 bg-[#161622] border border-white/[0.08] max-w-md mx-auto">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}




















