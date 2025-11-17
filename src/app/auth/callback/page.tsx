'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isWorkspaceEmail, extractDomain } from '@/lib/google-auth'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    let mounted = true
    
    const run = async () => {
      try {
        setStatus('Checking session…')
        
        // Wait a moment for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Get session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setStatus(`Error: ${error.message}`)
          setTimeout(() => router.replace('/'), 3000)
          return
        }
        
        if (!session?.user) {
          console.error('No active session found')
          setStatus('No active session. Redirecting…')
          setTimeout(() => router.replace('/'), 2000)
          return
        }
        
        console.log('✅ Session found:', {
          userId: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider,
          emailConfirmed: !!session.user.email_confirmed_at
        })

        setStatus('Checking email verification…')
        // Check if email is verified (skip in development)
        const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
        const isGoogleOAuth = session.user.app_metadata?.provider === 'google'
        
        // Google OAuth emails are auto-verified
        if (!session.user.email_confirmed_at && !isDevelopment && !isGoogleOAuth) {
          setStatus('Please verify your email address first. Check your inbox.')
          await supabase.auth.signOut()
          router.replace('/?message=Please verify your email address before signing in.')
          return
        }
        
        // In development, manually confirm email if not already confirmed
        if (!session.user.email_confirmed_at && isDevelopment) {
          console.log('Development mode: Skipping email verification')
          setStatus('Development mode: Skipping email verification…')
        }

        setStatus('Creating your profile…')
        
        // Extract Google OAuth data
        const googleEmail = session.user.email
        const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name
        const googleUserId = session.user.user_metadata?.sub || session.user.id
        const googleProfilePicture = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        
        // Check if it's a Workspace account
        const isWorkspace = isWorkspaceEmail(googleEmail)
        const workspaceDomain = isWorkspace ? extractDomain(googleEmail) : null
        
        // Get role from URL params (set during signup) or metadata
        const requestedRole = searchParams.get('role') || session.user.user_metadata?.role || null
        
        // Check existing profile for role
        let userRole = requestedRole
        if (!userRole) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          userRole = existingProfile?.role || null
        }
        
        // If still no role, redirect to role selection
        if (!userRole) {
          setStatus('Please select your role…')
          router.replace('/select-role')
          return
        }
        
        // Prepare profile data
        const profileData: any = {
          id: session.user.id,
          email: googleEmail || session.user.email,
          role: userRole,
          name: googleName || session.user.email?.split('@')[0] || undefined,
        }
        
        // Add last_active if column exists
        try {
          profileData.last_active = new Date().toISOString()
        } catch (e) {
          // Column might not exist, continue without it
        }
        
        // Add Google-specific fields if this is a Google sign-in
        if (isGoogleOAuth) {
          profileData.google_email = googleEmail
          profileData.google_user_id = googleUserId
          profileData.google_name = googleName
          profileData.email_source = 'google'
          if (googleProfilePicture) {
            profileData.google_profile_picture = googleProfilePicture
          }
          if (workspaceDomain) {
            profileData.workspace_domain = workspaceDomain
          }
        } else {
          // For non-Google signups, determine email source
          if (googleEmail?.includes('@local.local')) {
            profileData.email_source = 'synthetic'
          } else if (userRole === 'teacher') {
            profileData.email_source = 'manual'
          } else {
            profileData.email_source = 'synthetic'
          }
        }
        
        // Upsert profile
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })
        
        if (upsertError) {
          console.log('Profile upsert error:', upsertError)
          // Try without optional fields if they don't exist
          if (upsertError.code === '42703') {
            const basicProfileData: any = {
              id: session.user.id,
              email: googleEmail || session.user.email,
              role: userRole,
              name: googleName || undefined
            }
            await supabase
              .from('profiles')
              .upsert(basicProfileData, { onConflict: 'id' })
          }
        }

        setStatus('Redirecting…')
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'teacher') {
          console.log('✅ Redirecting to teacher dashboard')
          router.replace('/teacher')
        } else if (profile?.role === 'student') {
          console.log('✅ Redirecting to student dashboard')
          router.replace('/student')
        } else {
          console.log('⚠️ No role found, redirecting to role selection')
          router.replace('/select-role')
        }
        return
      } catch (e: any) {
        console.error('❌ Auth callback error:', e)
        console.error('   Error details:', {
          message: e?.message,
          status: e?.status,
          code: e?.code
        })
        setStatus(`Error: ${e?.message || 'Unknown error'}. Redirecting...`)
        setTimeout(() => {
          if (mounted) {
            router.replace('/')
          }
        }, 3000)
      }
    }
    
    run()
    
    return () => {
      mounted = false
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-700">{status}</p>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-700">Loading...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}


