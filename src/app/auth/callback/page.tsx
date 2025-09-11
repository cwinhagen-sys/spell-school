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

        setStatus('Ensuring your profile…')
        // Try to upsert profile from auth metadata to avoid forcing role select
        const metaRole = (session.user.user_metadata?.role as string | undefined) || null
        const metaName = (session.user.user_metadata?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '').trim() || null
        const { data: upserted, error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: session.user.id, 
            email: session.user.email, 
            role: metaRole || undefined, 
            full_name: metaName || undefined,
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
                full_name: metaName || undefined
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


