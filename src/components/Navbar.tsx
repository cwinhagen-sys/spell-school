"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'

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
      
      // 🔄 NEW: Final flush with SyncManager (faster, more reliable)
      console.log('🔄 Final sync before logout...')
      try {
        await Promise.race([
          syncManager.cleanup(),
          new Promise(resolve => setTimeout(resolve, 3000)) // Max 3 seconds (faster than old 6s)
        ])
        console.log('✅ Sync completed successfully!')
      } catch (error) {
        console.error('❌ Error syncing before logout:', error)
      }
      
      // Try to mark as logged out
      markUserAsLoggedOut().catch(err => console.log('Failed to mark as logged out:', err))
      
      // Clear any stored auth data (but preserve persistent logs for debugging)
      console.log('Clearing auth data...')
      
      // Save persistent logs before clearing
      const persistentLogs = localStorage.getItem('persistentLogs')
      
      localStorage.clear()
      sessionStorage.clear()
      
      // Restore persistent logs for post-logout debugging
      if (persistentLogs) {
        localStorage.setItem('persistentLogs', persistentLogs)
        console.log('📋 Preserved persistent logs for debugging'
)
      }
      
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
  
  // Don't show Navbar on landing pages or teacher pages (teacher has its own header)
  if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/signup/') || pathname?.startsWith('/teacher')) return null
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-gray-800">
          <span className="text-lg font-bold">Spell School</span>
        </Link>
        <nav className="flex items-center gap-4">
          {/* Dashboard link for teachers */}
          {pathname.startsWith('/teacher') && (
            <Link 
              href="/teacher" 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/teacher' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              Dashboard
            </Link>
          )}
          
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isLoggingOut 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
            <span>{isLoggingOut ? 'Saving data...' : 'Sign Out'}</span>
            {isLoggingOut && (
              <div className="text-xs text-gray-400 ml-1">
                (please wait)
              </div>
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}


