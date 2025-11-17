'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import SpellSchoolLanding from '@/components/SpellSchoolLanding'
import { getGoogleOAuthOptions, getGoogleAuthErrorMessage } from '@/lib/google-auth'

export default function Home() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>, identifierValue: string, passwordValue: string) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    console.log('🔐 Login attempt with identifier:', identifierValue)
    
    // NEW SYSTEM: Try student username-based login first
    // If identifier doesn't contain @ or ., it's likely a student username
    if (!identifierValue.includes('@') && !identifierValue.includes('.')) {
      console.log('📝 Attempting student username login...')
      
      try {
        const response = await fetch('/api/auth/student-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifierValue, password: passwordValue })
        })
        
        const data = await response.json()
        
        if (data.success && data.session) {
          console.log('✅ Student login successful!')
          // Set the session in Supabase client
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          })
          window.location.href = '/auth/callback'
          return
        } else {
          console.log('❌ Student login failed:', data.error)
          setMessage(`Error: ${data.error || 'Invalid username or password'}`)
          setLoading(false)
          return
        }
      } catch (error) {
        console.error('❌ Student login error:', error)
        setMessage('Error: Login failed. Please try again.')
        setLoading(false)
        return
      }
    }
    
    // FALLBACK: Traditional email-based login for teachers or legacy student accounts
    // Determine email format:
    // 1. If contains @, use as-is (for teachers or students with full email)
    // 2. If contains ., assume username.classcode format for students
    let email = identifierValue
    if (!identifierValue.includes('@')) {
      if (identifierValue.includes('.')) {
        // Legacy student format: username.classcode → username.classcode@local.local
        email = `${identifierValue.toLowerCase()}@local.local`
        console.log('📧 Using legacy student email format:', email)
      }
    }
    
    console.log('🔐 Attempting email login:', email)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwordValue })
    if (error) {
      console.error('❌ Email login error:', error.message)
      setMessage(`Error: ${error.message}`)
    } else {
      console.log('✅ Email login successful!')
      window.location.href = '/auth/callback'
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    try {
      setLoading(true)
      setMessage('')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: getGoogleOAuthOptions('student') // Default to student, will be determined in callback
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

  return (
    <SpellSchoolLanding
      logoUrl="/images/memory-card-back.png"
      posterUrl="/images/memory-card-back.png"
      onEmailLogin={handleEmailLogin}
      onGoogleLogin={handleGoogle}
      loading={loading}
      message={message}
      identifier={identifier}
      setIdentifier={setIdentifier}
      password={password}
      setPassword={setPassword}
    />
  )
}
