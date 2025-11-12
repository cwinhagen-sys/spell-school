'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SpellSchoolSignup from '@/components/SpellSchoolSignup'

export default function TeacherSignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>, nameValue: string, emailValue: string, passwordValue: string) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
        options: {
          data: {
            name: nameValue
          }
        }
      })

      if (error) throw error

      // Create profile with teacher role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user?.id,
          email: emailValue,
          role: 'teacher',
          name: nameValue
        })

      if (profileError) throw profileError

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
        setMessage('Account created successfully! Please check your email to verify your account, then you can log in.')
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

  return (
    <SpellSchoolSignup
      logoUrl="/images/teacher-signup.png"
      posterUrl="/images/teacher-signup.png"
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
    />
  )
}
