'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getGoogleOAuthOptions } from '@/lib/google-auth'

export default function OAuthTestPage() {
  const [info, setInfo] = useState<any>(null)

  const testOAuth = async () => {
    const origin = window.location.origin
    const redirectUrl = `${origin}/auth/callback?role=teacher`
    
    const debugInfo = {
      currentOrigin: origin,
      currentUrl: window.location.href,
      redirectUrl,
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      oauthOptions: getGoogleOAuthOptions('teacher')
    }
    
    setInfo(debugInfo)
    console.log('🔍 OAuth Debug Info:', debugInfo)
    
    // Try to initiate OAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: getGoogleOAuthOptions('teacher')
    })
    
    if (error) {
      console.error('❌ OAuth Error:', error)
      setInfo({ ...debugInfo, error: error.message })
    } else {
      console.log('✅ OAuth initiated successfully')
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">OAuth Debug Test</h1>
        
        <button
          onClick={testOAuth}
          className="mb-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Test Google OAuth
        </button>

        {info && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="font-bold mb-2">Debug Information:</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(info, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold mb-2">⚠️ Important:</h3>
          <p className="text-sm mb-2">
            Make sure you have added <code className="bg-gray-200 px-1 rounded">http://localhost:3000/auth/callback</code> to your Supabase Dashboard:
          </p>
          <ol className="text-sm list-decimal list-inside space-y-1">
            <li>Go to Supabase Dashboard → Authentication → URL Configuration</li>
            <li>Add <code className="bg-gray-200 px-1 rounded">http://localhost:3000/auth/callback</code> to Redirect URLs</li>
            <li>Click Save</li>
            <li>Try again</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

