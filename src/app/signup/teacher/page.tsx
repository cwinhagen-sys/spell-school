'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TeacherSignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleGoogleSignup = async () => {
    try {
      await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { 
          redirectTo: `${window.location.origin}/auth/callback` 
        } 
      })
    } catch (error: any) {
      setMessage(`Google sign-up error: ${error.message}`)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      })

      if (error) throw error

      // Create profile with teacher role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user?.id,
          email: formData.email,
          role: 'teacher',
          name: formData.name
        })

      if (profileError) throw profileError

      setMessage('Account created successfully! Please check your email to verify your account.')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-[calc(100vh+4rem)] -mt-16 -mb-16 bg-gray-900 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600 overflow-hidden">
            <img 
              src="/assets/wizard/wizard_powerful.png" 
              alt="Teacher Wizard" 
              className="w-28 h-28 object-cover rounded-full"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))',
                maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Teacher Sign Up</h1>
          <p className="text-gray-300">Start your magical teaching journey!</p>
        </div>

        <div className="bg-white/10 rounded-2xl border border-white/20 p-8 backdrop-blur-sm">
          {/* Google Sign Up */}
          <div className="mb-6">
            <button 
              onClick={handleGoogleSignup}
              className="w-full bg-white/10 hover:bg-white/15 rounded-lg px-4 py-3 text-white border border-white/20 transition-all duration-200"
            >
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">Or create account with email</span>
            </div>
          </div>

          {/* Teacher Sign Up Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Create a password (min 6 characters)"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? 'Creating Account...' : 'Create Teacher Account'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-center ${
              message.includes('Error') 
                ? 'bg-red-500/20 text-red-200 border border-red-500/30' 
                : 'bg-green-500/20 text-green-200 border border-green-500/30'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
