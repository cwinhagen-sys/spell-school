'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { BookOpen, Users, FileText, Calendar, UserPlus, LogOut, Gamepad2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const handleSignOut = async () => {
    if (isLoggingOut) return
    
    try {
      setIsLoggingOut(true)
      
      // Final sync before logout
      try {
        await Promise.race([
          syncManager.cleanup(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ])
      } catch (error) {
        console.error('Error syncing before logout:', error)
      }
      
      // Mark as logged out
      markUserAsLoggedOut().catch(err => console.log('Failed to mark as logged out:', err))
      
      // Clear auth data
      const persistentLogs = localStorage.getItem('persistentLogs')
      localStorage.clear()
      sessionStorage.clear()
      
      if (persistentLogs) {
        localStorage.setItem('persistentLogs', persistentLogs)
      }
      
      // Sign out from Supabase
      try {
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 1000)
        )
        await Promise.race([signOutPromise, timeoutPromise])
      } catch (error) {
        console.log('Supabase signOut failed or timed out:', error)
      }
      
      window.location.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.clear()
      sessionStorage.clear()
      window.location.replace('/')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with title and logout */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Teacher Dashboard</h1>
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
            <span>{isLoggingOut ? 'Saving data...' : 'Sign out'}</span>
          </button>
        </div>
      </header>

      {/* Navigation - always show */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/teacher"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/teacher'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/teacher/classes"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/classes') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Classes
            </Link>
            <Link
              href="/teacher/word-sets"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/word-sets') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Word Sets
            </Link>
            <Link
              href="/teacher/assign"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/assign') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Assign
            </Link>
            <Link
              href="/teacher/students"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/students') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Progress
            </Link>
            <Link
              href="/teacher/sessions"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/sessions') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Session Mode
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
