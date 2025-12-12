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

      if (error) throw error

      if (!data.user) {
        throw new Error('User creation failed')
      }

      // Create profile with teacher role - always start with 'free' tier
      // Premium/Pro will be upgraded after successful payment via webhook
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: emailValue,
          role: 'teacher',
          name: nameValue,
          subscription_tier: 'free' // Start with free, upgrade after payment
        })

      if (profileError) throw profileError

      // All signups start with free tier - payment wall will appear when limits are reached
      // Continue with normal signup flow
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
          setMessage('Account created successfully! However, automatic login failed. Please log in manually.')
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          // Redirect to teacher dashboard
          setTimeout(() => {
            router.push('/teacher')
          }, 1000)
        }
      } else {
        setMessage('Account created successfully! Logging you in...')
        
        // Sign in the user automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password: passwordValue
        })
        
        if (signInError) {
          setMessage('Account created successfully! However, automatic login failed. Please log in manually.')
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          // Redirect to teacher dashboard
          setTimeout(() => {
            router.push('/teacher')
          }, 1000)
        }
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
