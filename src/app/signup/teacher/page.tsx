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

      // Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
      
      if (isDevelopment) {
        setMessage('Account created successfully! In development mode, email verification is skipped. You can now log in.')
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setMessage('Account created successfully! Please check your email to verify your account.')
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Image and Text */}
          <div className="text-center lg:text-left">
            <div className="w-48 h-48 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-8 border border-green-200 overflow-hidden">
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
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Teacher Sign Up</h1>
            <p className="text-xl text-gray-600 mb-6">Start your magical teaching journey!</p>
            <div className="text-gray-500 space-y-2">
              <p>• Create word sets and assignments</p>
              <p>• Track student progress</p>
              <p>• Manage your classes</p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-lg">
            {/* Google Sign Up - Separate Box */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <button 
                onClick={handleGoogleSignup}
                className="w-full bg-white hover:bg-gray-50 rounded-lg px-4 py-3 text-gray-700 border border-gray-300 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Continue with Google
              </button>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-gray-500 bg-white">Or create account with email</span>
              </div>
            </div>

            {/* Teacher Sign Up Form */}
            <form onSubmit={handleEmailSignup} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-3">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-3">
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
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Create a password (min 6 characters)"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-md"
              >
                {loading ? 'Creating Account...' : 'Create Teacher Account'}
              </button>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-center ${
                message.includes('Error') 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
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
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
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