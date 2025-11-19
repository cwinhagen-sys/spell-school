'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isWorkspaceEmail, extractDomain } from '@/lib/google-auth'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Loggar in…')

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === 'SIGNED_IN') {
        // Session created, will be handled below
      }
    })

    const run = async () => {
      try {
        setStatus('Kontrollerar session…')
        
        // Check for OAuth errors in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        const errorParam = hashParams.get('error') || queryParams.get('error')
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')
        
        if (errorParam) {
          setStatus(`OAuth-fel: ${errorDescription || errorParam}`)
          setTimeout(() => router.replace('/'), 5000)
          return
        }
        
        // Check for OAuth code parameter (PKCE flow)
        // Supabase will automatically exchange this for tokens when we call getSession()
        const code = hashParams.get('code') || queryParams.get('code')
        
        // Check for tokens in URL (try to set session manually if found)
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          try {
            const { data: sessionData } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (sessionData.session) {
              // Clear the hash/query from URL
              window.history.replaceState({}, '', window.location.pathname)
            }
          } catch (e) {
            // Ignore errors, will try getSession below
          }
        }
        
        // If we have a code parameter, Supabase needs to exchange it
        // This happens automatically when we call getSession(), but we should wait a bit
        if (code) {
          setStatus('Bearbetar OAuth-kod…')
          // Give Supabase a moment to process the code
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // Wait for Supabase to process the OAuth callback
        setStatus('Väntar på att sessionen skapas…')
        let session = null
        let sessionError = null
        
        // Try multiple times with increasing delays
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500 + attempt * 300))
          
          const result = await supabase.auth.getSession()
          session = result.data.session
          sessionError = result.error
          
          if (session?.user) break
        }
        
        if (sessionError) {
          setStatus(`Fel: ${sessionError.message}`)
          setTimeout(() => router.replace('/'), 5000)
          return
        }
        
        if (!session?.user) {
          setStatus('Ingen aktiv session hittades. Omdirigerar till startsidan...')
          setTimeout(() => router.replace('/'), 3000)
          return
        }

        setStatus('Skapar din profil…')
        const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
        const isGoogleOAuth = session.user.app_metadata?.provider === 'google'
        
        // Google OAuth emails are auto-verified
        if (!session.user.email_confirmed_at && !isDevelopment && !isGoogleOAuth) {
          setStatus('Vänligen verifiera din e-postadress först. Kontrollera din inkorg.')
          await supabase.auth.signOut()
          router.replace('/?message=Vänligen verifiera din e-postadress innan du loggar in.')
          return
        }
        
        // Extract Google OAuth data
        const googleEmail = session.user.email
        const googleName = session.user.user_metadata?.full_name || session.user.user_metadata?.name
        const googleUserId = session.user.user_metadata?.sub || session.user.id
        const googleProfilePicture = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        
        // Check if it's a Workspace account
        const isWorkspace = isWorkspaceEmail(googleEmail)
        const workspaceDomain = isWorkspace ? extractDomain(googleEmail) : null
        
        // Get role from URL params (set during signup) or metadata
        // For Google OAuth, only allow teacher role
        const requestedRole = searchParams.get('role') || session.user.user_metadata?.role || null
        
        // Check existing profile for role - check by both ID and email
        let userRole = requestedRole
        let existingProfile = null
        let needsRoleUpdate = false
        
        if (!userRole) {
          // First check by user ID
          const { data: profileById } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', session.user.id)
            .maybeSingle()
          
          if (profileById?.role) {
            existingProfile = profileById
            userRole = profileById.role
            
            // If user logs in with Google OAuth but has student role, update to teacher
            // Google OAuth is only for teachers
            if (isGoogleOAuth && userRole === 'student') {
              userRole = 'teacher'
              needsRoleUpdate = true
            }
          } else if (googleEmail) {
            // If no profile by ID, check by email (in case user has existing account)
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('role, email, id')
              .eq('email', googleEmail)
              .maybeSingle()
            
            if (profileByEmail) {
              // If email matches but ID is different, user has existing account with email/password
              if (profileByEmail.id !== session.user.id) {
                setStatus('Det finns redan ett konto med denna e-postadress. Använd e-post och lösenord för att logga in.')
                await supabase.auth.signOut()
                setTimeout(() => {
                  router.replace('/?message=Det finns redan ett konto med denna e-postadress. Använd e-post och lösenord för att logga in.')
                }, 3000)
                return
              } else {
                // Same ID, use existing role but update if needed
                userRole = profileByEmail.role
                if (isGoogleOAuth && userRole === 'student') {
                  userRole = 'teacher'
                  needsRoleUpdate = true
                }
              }
            }
          }
        }
        
        // For Google OAuth, default to teacher if no role is found
        // Students cannot sign up via Google OAuth
        if (!userRole) {
          if (isGoogleOAuth) {
            userRole = 'teacher'
          } else {
            setStatus('Vänligen välj din roll…')
            router.replace('/select-role')
            return
          }
        }
        
        // Ensure Google OAuth only creates/updates to teacher accounts
        if (isGoogleOAuth && userRole !== 'teacher') {
          userRole = 'teacher'
          needsRoleUpdate = true
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
        
        // Upsert profile - always ensure role is set correctly
        if (needsRoleUpdate) {
          profileData.role = 'teacher'
        }
        
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })
        
        if (upsertError) {
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
        
        // Double-check: If Google OAuth, ensure role is teacher
        if (isGoogleOAuth) {
          const { data: verifyProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (verifyProfile?.role !== 'teacher') {
            await supabase
              .from('profiles')
              .update({ role: 'teacher' })
              .eq('id', session.user.id)
            userRole = 'teacher'
          }
        }

        setStatus('Omdirigerar…')
        
        // Wait a moment to ensure profile is saved
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'teacher') {
          router.replace('/teacher')
        } else if (profile?.role === 'student') {
          router.replace('/student')
        } else {
          router.replace('/select-role')
        }
      } catch (e: any) {
        setStatus(`Fel: ${e?.message || 'Okänt fel'}. Omdirigerar...`)
        setTimeout(() => {
          router.replace('/')
        }, 3000)
      }
    }
    
    run()
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-gray-700 text-lg">{status}</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-700">Laddar...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
