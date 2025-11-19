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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Välj din roll</h1>
          <p className="text-lg text-gray-600">Endast lärare kan registrera sig. Elever läggs till av sina lärare.</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
              selectedRole === 'teacher'
                ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
            }`}
            onClick={() => setSelectedRole('teacher')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Lärare</h3>
              <p className="text-gray-600 text-sm">Skapa uppgifter och hantera dina elever</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
          <p className="text-sm text-blue-800 text-center">
            <strong>Obs:</strong> Elever kan inte registrera sig själva. Lärare skapar elevkonton via funktionen "Lägg till elever" i lärardashbordet.
          </p>
        </div>

        <button
          onClick={handleRoleSelection}
          disabled={!selectedRole || loading}
          className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-2xl hover:shadow-indigo-500/25"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>

        {message && (
          <div className="mt-6 p-4 rounded-lg text-center text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}




















