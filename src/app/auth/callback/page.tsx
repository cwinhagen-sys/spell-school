'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    const run = async () => {
      try {
        setStatus('Checking session…')
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session?.user) {
          setStatus('No active session. Redirecting…')
          router.replace('/')
          return
        }

        setStatus('Checking email verification…')
        // Check if email is verified (skip in development)
        const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
        if (!session.user.email_confirmed_at && !isDevelopment) {
          setStatus('Please verify your email address first. Check your inbox.')
          // Sign out the user since email is not verified
          await supabase.auth.signOut()
          router.replace('/?message=Please verify your email address before signing in.')
          return
        }
        
        // In development, manually confirm email if not already confirmed
        if (!session.user.email_confirmed_at && isDevelopment) {
          console.log('Development mode: Skipping email verification')
          setStatus('Development mode: Skipping email verification…')
        }

        setStatus('Ensuring your profile…')
        // Only create profile if email is verified
        const metaRole = (session.user.user_metadata?.role as string | undefined) || null
        const metaName = (session.user.user_metadata?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '').trim() || null
        
        // For Google OAuth users, check if they already have a profile to determine role
        let userRole = metaRole
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
        
        const { data: upserted, error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: session.user.id, 
            email: session.user.email, 
            role: userRole, 
            name: metaName || undefined,
            last_active: new Date().toISOString() // Track login time
          }, { onConflict: 'id' })
        
        if (upsertError) {
          console.log('Profile upsert error (may be missing last_active column):', upsertError)
          // Try without last_active if column doesn't exist
          if (upsertError.code === '42703') {
            await supabase
              .from('profiles')
              .upsert({ 
                id: session.user.id, 
                email: session.user.email, 
                role: metaRole || undefined, 
                name: metaName || undefined
              }, { onConflict: 'id' })
          }
        }

        setStatus('Checking your role…')
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'teacher' || profile?.role === 'student') {
          router.replace(profile.role === 'teacher' ? '/teacher' : '/student')
          return
        }
        // Fallback to role select only if we still lack role
        router.replace('/select-role')
        return
      } catch (e) {
        router.replace('/')
      }
    }
    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-700">{status}</p>
    </div>
  )
}


