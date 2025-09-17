'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StudentSignupPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    age: '',
    classCode: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Create a unique email for the student (using username + @local.local)
      const email = `${formData.username}@local.local`
      
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            age: parseInt(formData.age),
            class_code: formData.classCode || null
          }
        }
      })

      if (error) throw error

      // Create profile with student role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user?.id,
          email: email,
          role: 'student',
          username: formData.username,
          age: parseInt(formData.age),
          class_code: formData.classCode || null
        })

      if (profileError) throw profileError

      // If class code is provided, try to join the class
      if (formData.classCode.trim()) {
        try {
          const normalizedCode = formData.classCode.trim().toUpperCase()
          const { data: joinResult, error: joinError } = await supabase.rpc('join_class_with_code', { 
            p_code: normalizedCode 
          })
          
          if (joinError) {
            console.error('Error joining class:', joinError)
            setMessage('Account created successfully! However, there was an issue joining the class. You can try joining manually later.')
          } else if (joinResult === true) {
            setMessage('Account created successfully! You have automatically joined the class.')
          } else {
            setMessage('Account created successfully! However, the class code was invalid. You can try joining manually later.')
          }
        } catch (joinErr) {
          console.error('Error joining class:', joinErr)
          setMessage('Account created successfully! However, there was an issue joining the class. You can try joining manually later.')
        }
      } else {
        setMessage('Account created successfully! You can now sign in.')
      }
      
      // Redirect directly to student dashboard
      setTimeout(() => {
        router.push('/student')
      }, 2000)

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
            <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-8 border border-blue-200 overflow-hidden">
              <img 
                src="/assets/wizard/wizard_novice.png" 
                alt="Student Wizard" 
                className="w-40 h-40 object-cover rounded-full"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))',
                  maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                }}
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Student Sign Up</h1>
            <p className="text-xl text-gray-600 mb-6">Join the magical learning adventure!</p>
            <div className="text-gray-500 space-y-2">
              <p>• Play educational games</p>
              <p>• Earn points and level up</p>
              <p>• Join your teacher's class</p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-lg">
            {/* Google Sign Up - Separate Box */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <button 
                disabled 
                className="w-full bg-gray-300 text-gray-500 rounded-lg px-4 py-3 cursor-not-allowed opacity-50"
              >
                Continue with Google (Currently Unavailable)
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Google sign-up is temporarily disabled for students
              </p>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-gray-500 bg-white">Or create account with</span>
              </div>
            </div>

            {/* Student Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-3">
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Choose a username"
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

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-3">
                  Age *
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  required
                  min="5"
                  max="18"
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your age"
                />
              </div>

              <div>
                <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-3">
                  Class Code (Optional)
                </label>
                <input
                  type="text"
                  id="classCode"
                  name="classCode"
                  value={formData.classCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter class code from your teacher"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask your teacher for the class code to join their class
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-md"
              >
                {loading ? 'Creating Account...' : 'Create Student Account'}
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