'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SpellSchoolSignup from '@/components/SpellSchoolSignup'
import { getGoogleOAuthOptions, getGoogleAuthErrorMessage } from '@/lib/google-auth'

function TeacherSignupContent() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tierParam = searchParams?.get('tier')

  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      setMessage('')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: getGoogleOAuthOptions('teacher')
      })
      
      if (error) {
        const errorMessage = getGoogleAuthErrorMessage(error)
        setMessage(errorMessage)
        setLoading(false)
      }
      // If successful, user will be redirected to OAuth flow
    } catch (error: any) {
      const errorMessage = getGoogleAuthErrorMessage(error)
      setMessage(errorMessage)
      setLoading(false)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>, nameValue: string, emailValue: string, passwordValue: string, tier?: string, yearly?: boolean) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Always use free tier for new signups - payment wall will appear when limits are reached
    const selectedTier = 'free'

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
        options: {
          data: {
            name: nameValue,
            tier: selectedTier
          }
        }
      })

      if (error) {
        // Check if it's a user already exists error
        if (error.message?.toLowerCase().includes('user already registered') || 
            error.message?.toLowerCase().includes('email address is already registered') ||
            error.message?.toLowerCase().includes('already been registered') ||
            error.status === 422) {
          throw new Error('An account with this email address already exists. Please sign in instead or use a different email address.')
        }
        throw error
      }

      if (!data.user) {
        throw new Error('User creation failed')
      }

      // Create profile via API route (uses service role to bypass RLS)
      // This is necessary when email verification is enabled and user doesn't have a session yet
      // The API route can work with or without authentication token
      const profileResponse = await fetch('/api/create-teacher-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: data.user.id, // Pass user ID directly
          email: emailValue,
          name: nameValue,
          role: 'teacher',
          subscription_tier: 'free'
        })
      })

      const profileData = await profileResponse.json()
      
      if (!profileResponse.ok) {
        throw new Error(profileData.error || 'Failed to create profile')
      }

      // All signups start with free tier - payment wall will appear when limits are reached
      // Check if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
      
      if (isDevelopment) {
        // In development mode, log in automatically since email verification is skipped
        setMessage('Account created successfully! Logging you in...')
        
        // Sign in the user automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password: passwordValue
        })
        
        if (signInError) {
          // Check if error is due to email not being verified
          if (signInError.message?.toLowerCase().includes('email not confirmed') || 
              signInError.message?.toLowerCase().includes('email_not_confirmed')) {
            setMessage('✅ Account created successfully! Please check your email inbox to verify your account before signing in.')
          } else {
            setMessage('Account created successfully! However, automatic login failed. Please log in manually.')
          }
          setLoading(false)
        } else {
          // Redirect to teacher dashboard
          setTimeout(() => {
            router.push('/teacher')
          }, 1000)
        }
      } else {
        // In production, require email verification
        // Don't redirect - just show message in signup form
        setMessage('✅ Account created successfully! Please check your email inbox to verify your account before signing in.')
        
        // Clear form fields
        setName('')
        setEmail('')
        setPassword('')
        setLoading(false)
      }

    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <SpellSchoolSignup
      onGoogleSignup={handleGoogleSignup}
      onEmailSignup={handleEmailSignup}
      loading={loading}
      message={message}
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      isStudent={false}
      showGoogle={true}
      initialTier={tierParam}
    />
  )
}

export default function TeacherSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <TeacherSignupContent />
    </Suspense>
  )
}

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <TeacherSignupContent />
    </Suspense>
  )
}
