'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        // Check user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        // Check localStorage for Supabase keys
        const localStorageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-') || key.includes('auth')
        )
        
        const localStorageData: Record<string, any> = {}
        localStorageKeys.forEach(key => {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              // Try to parse as JSON, otherwise use as string
              try {
                localStorageData[key] = JSON.parse(value)
              } catch {
                localStorageData[key] = value.substring(0, 100) // First 100 chars
              }
            }
          } catch (e) {
            localStorageData[key] = 'Error reading'
          }
        })
        
        // Check sessionStorage
        const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-') || key.includes('auth')
        )
        
        const sessionStorageData: Record<string, any> = {}
        sessionStorageKeys.forEach(key => {
          try {
            const value = sessionStorage.getItem(key)
            if (value) {
              try {
                sessionStorageData[key] = JSON.parse(value)
              } catch {
                sessionStorageData[key] = value.substring(0, 100)
              }
            }
          } catch (e) {
            sessionStorageData[key] = 'Error reading'
          }
        })
        
        setDebugInfo({
          session: {
            data: sessionData.session,
            error: sessionError,
            hasSession: !!sessionData.session,
            userId: sessionData.session?.user?.id,
            email: sessionData.session?.user?.email,
            provider: sessionData.session?.user?.app_metadata?.provider,
            expiresAt: sessionData.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toLocaleString() : null
          },
          user: {
            data: userData.user,
            error: userError,
            hasUser: !!userData.user
          },
          localStorage: {
            keys: localStorageKeys,
            data: localStorageData,
            count: localStorageKeys.length
          },
          sessionStorage: {
            keys: sessionStorageKeys,
            data: sessionStorageData,
            count: sessionStorageKeys.length
          },
          url: {
            current: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash
          },
          timestamp: new Date().toISOString()
        })
      } catch (error: any) {
        setDebugInfo({
          error: error.message,
          stack: error.stack
        })
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session)
      checkAuth()
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const clearAuth = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <p>Loading debug info...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Auth Debug Info</h1>
        
        <div className="mb-4">
          <button
            onClick={clearAuth}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Auth & Reload
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg mb-2">Session Status</h2>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.session, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg mb-2">User Status</h2>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.user, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg mb-2">LocalStorage ({debugInfo.localStorage?.count || 0} keys)</h2>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.localStorage, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg mb-2">SessionStorage ({debugInfo.sessionStorage?.count || 0} keys)</h2>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.sessionStorage, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg mb-2">URL Info</h2>
            <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.url, null, 2)}
            </pre>
          </div>
          
          {debugInfo.error && (
            <div className="bg-red-100 p-4 rounded">
              <h2 className="font-bold text-lg mb-2 text-red-800">Error</h2>
              <pre className="text-xs overflow-auto">{debugInfo.error}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


