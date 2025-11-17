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
        setStatus('Processing OAuth callback…')
        
        // Log URL for debugging
        console.log('🔐 Auth callback URL:', window.location.href)
        console.log('🔐 URL hash:', window.location.hash)
        console.log('🔐 URL search:', window.location.search)
        
        // Use onAuthStateChange to wait for the session to be ready
        // This is more reliable than polling getSession()
        const sessionPromise = new Promise<any>((resolve, reject) => {
          let unsubscribe: any = null
          
          const timeout = setTimeout(() => {
            if (unsubscribe) unsubscribe()
            reject(new Error('Timeout waiting for OAuth session'))
          }, 10000) // 10 second timeout
          
          unsubscribe = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 Auth state change:', event, session ? 'session found' : 'no session')
            
            if (event === 'SIGNED_IN' && session) {
              clearTimeout(timeout)
              if (unsubscribe) unsubscribe()
              resolve(session)
            } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
              // Continue waiting
            } else if (event === 'USER_UPDATED' && session) {
              clearTimeout(timeout)
              if (unsubscribe) unsubscribe()
              resolve(session)
            }
          })
          
          // Also try to get session immediately in case it's already available
          supabase.auth.getSession().then(({ data, error }) => {
            if (data.session && !error) {
              clearTimeout(timeout)
              if (unsubscribe) unsubscribe()
              resolve(data.session)
            }
          })
        })
        
        // Wait for session with timeout
        let session: any = null
        try {
          session = await sessionPromise
        } catch (error: any) {
          console.error('❌ Error waiting for session:', error)
          // Fallback: try getSession directly
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) {
            throw sessionError
          }
          session = data.session
        }
        
        if (!mounted) return
        
        if (!session?.user) {
          console.error('❌ No active session found after OAuth callback')
          console.error('   This might mean:')
          console.error('   1. OAuth callback was not processed correctly')
          console.error('   2. Redirect URL mismatch in Supabase Dashboard')
          console.error('   3. PKCE code expired or invalid')
          console.error('   4. Session expired or was cleared')
          setStatus('No active session. Please try logging in again.')
          setTimeout(() => router.replace('/'), 3000)
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


