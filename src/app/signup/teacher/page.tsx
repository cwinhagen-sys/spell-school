'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TeacherSignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
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
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Image and Text */}
          <div className="text-center lg:text-left">
            <div className="w-48 h-48 bg-gray-700 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-8 border border-gray-600 overflow-hidden">
              <img 
                src="/assets/wizard/wizard_powerful.png" 
                alt="Teacher Wizard" 
                className="w-40 h-40 object-cover rounded-full"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))',
                  maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                }}
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Teacher Sign Up</h1>
            <p className="text-xl text-gray-300 mb-6">Start your magical teaching journey!</p>
            <div className="text-gray-400 space-y-2">
              <p>• Create word sets and assignments</p>
              <p>• Track student progress</p>
              <p>• Manage your classes</p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white/10 rounded-2xl border border-white/20 p-8 backdrop-blur-sm">
            {/* Google Sign Up - Separate Box */}
            <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
              <button 
                onClick={handleGoogleSignup}
                className="w-full bg-white/10 hover:bg-white/15 rounded-lg px-4 py-3 text-white border border-white/20 transition-all duration-200"
              >
                Continue with Google
              </button>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-gray-400">Or create account with email</span>
              </div>
            </div>

            {/* Teacher Sign Up Form */}
            <form onSubmit={handleEmailSignup} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white mb-3">
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
                <label htmlFor="email" className="block text-sm font-medium text-white mb-3">
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
                <label htmlFor="password" className="block text-sm font-medium text-white mb-3">
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

        {/* Back Button - Bottom Center */}
        <div className="text-center mt-8">
          <Link 
            href="/signup" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to role selection
          </Link>
        </div>
      </div>
    </div>
  )
}