'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SpellSchoolLanding from '@/components/SpellSchoolLanding'
import { getGoogleOAuthOptions, getGoogleAuthErrorMessage } from '@/lib/google-auth'

export default function Home() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check for message in URL params (from auth callback redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlMessage = params.get('message')
    if (urlMessage) {
      setMessage(urlMessage)
      // Clear the message from URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Don't redirect if we're on the auth callback page
        if (window.location.pathname === '/auth/callback') {
          setCheckingAuth(false)
          return
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // User is logged in, check their role and redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (profile?.role === 'teacher') {
            router.replace('/teacher')
          } else if (profile?.role === 'student') {
            router.replace('/student')
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setCheckingAuth(false)
      }
    }
    
    checkAuth()
  }, [router])

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
      
      // Only allow teacher login via Google OAuth
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

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Loading...</p>
      </div>
    )
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
