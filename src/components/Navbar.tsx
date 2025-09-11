"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Simple fallback logout that always works
  const forceLogout = () => {
    console.log('Force logout triggered')
    localStorage.clear()
    sessionStorage.clear()
    window.location.replace('/')
  }
  
  const handleSignOut = async () => {
    if (isLoggingOut) return // Prevent double-clicking
    
    try {
      setIsLoggingOut(true)
      console.log('Logout button clicked')
      
      // Try to mark as logged out first (but don't wait for it)
      markUserAsLoggedOut().catch(err => console.log('Failed to mark as logged out:', err))
      
      // Clear any stored auth data immediately
      console.log('Clearing auth data...')
      localStorage.clear()
      sessionStorage.clear()
      
      // Set a timeout to force redirect regardless of Supabase response
      const forceRedirect = setTimeout(() => {
        console.log('Force redirect after timeout')
        forceLogout()
      }, 1500) // 1.5 second timeout
      
      // Try Supabase logout with timeout
      console.log('Signing out from Supabase...')
      try {
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 1000)
        )
        
        await Promise.race([signOutPromise, timeoutPromise])
        console.log('Successfully signed out from Supabase')
      } catch (error) {
        console.log('Supabase signOut failed or timed out:', error)
      }
      
      // Clear timeout and redirect
      clearTimeout(forceRedirect)
      console.log('Redirecting to home page...')
      window.location.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if there's an error
      forceLogout()
    }
  }
  
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null
  return (
    <header className="bg-gray-900 border-b border-white/10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 grid place-items-center font-bold">SS</div>
          <span className="text-lg font-bold">Spell School</span>
        </Link>
        <nav className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isLoggingOut 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            {isLoggingOut && (
              <div className="text-xs text-gray-400 ml-1">
                (max 2s)
              </div>
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}


