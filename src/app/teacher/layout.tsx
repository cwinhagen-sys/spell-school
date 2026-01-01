'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { BookOpen, Users, FileText, Calendar, UserPlus, LogOut, Gamepad2, Lock, Menu, X, ChevronRight, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'
import { hasSessionModeAccess, hasProgressStatsAccess } from '@/lib/subscription'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [hasSessionAccess, setHasSessionAccess] = useState(false)
  const [hasProgressAccess, setHasProgressAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const sessionAccess = await hasSessionModeAccess(user.id)
          const progressAccess = await hasProgressStatsAccess(user.id)
          setHasSessionAccess(sessionAccess)
          setHasProgressAccess(progressAccess)
        }
      } catch (error) {
        console.error('Error checking access:', error)
      } finally {
        setCheckingAccess(false)
      }
    }
    checkAccess()
  }, [])

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

  const navItems = [
    { id: 'dashboard', href: '/teacher', label: 'Dashboard', icon: BookOpen, exact: true },
    { id: 'classes', href: '/teacher/classes', label: 'Classes', icon: Users },
    { id: 'word-sets', href: '/teacher/word-sets', label: 'Word Lists', icon: FileText },
    { id: 'assign', href: '/teacher/assign', label: 'Assign', icon: Calendar },
    { 
      id: 'sessions',
      href: hasSessionAccess ? '/teacher/sessions' : '/teacher/account', 
      label: 'Sessions', 
      icon: Gamepad2,
      locked: !hasSessionAccess,
      lockMessage: 'Requires Premium or Pro'
    },
    { 
      id: 'progress',
      href: hasProgressAccess ? '/teacher/students' : '/teacher/account', 
      label: 'Progress', 
      icon: TrendingUp,
      locked: !hasProgressAccess,
      lockMessage: 'Requires Pro plan'
    },
  ]

  return (
    <div className="min-h-screen bg-[#08080f]">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#0a0a12]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20' 
          : 'bg-[#08080f]/80 backdrop-blur-sm border-b border-transparent'
      }`}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-3">
            {/* Logo */}
            <Link href="/teacher" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform shadow-lg shadow-orange-500/20">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col">
                <span 
                  className="text-xl font-bold tracking-tight font-[family-name:var(--font-playfair)]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  <span className="text-white">Spell</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Teacher Portal</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 mx-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = item.exact ? pathname === item.href : isActive(item.href)
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      if (item.locked) {
                        e.preventDefault()
                        router.push('/teacher/account')
                      }
                    }}
                    title={item.locked ? item.lockMessage : ''}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      item.locked
                        ? 'text-gray-600 cursor-not-allowed opacity-60'
                        : active
                        ? 'text-white bg-white/[0.08] border border-white/[0.08]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.locked && <Lock className="w-3 h-3 text-amber-500/70 flex-shrink-0" />}
                    {active && !item.locked && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/teacher/account"
                className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive('/teacher/account')
                    ? 'text-white bg-white/[0.08] border border-white/[0.08]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden md:inline">My Account</span>
              </Link>
              
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50"
              >
                <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isLoggingOut ? 'Saving...' : 'Sign out'}</span>
              </button>

              {/* Mobile menu button */}
              <button 
                className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.04]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0a0a12]/98 backdrop-blur-xl border-t border-white/[0.06]">
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = item.exact ? pathname === item.href : isActive(item.href)
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      if (item.locked) {
                        e.preventDefault()
                        router.push('/teacher/account')
                      }
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-lg text-sm font-medium transition-all ${
                      item.locked
                        ? 'text-gray-600 opacity-60'
                        : active
                        ? 'text-white bg-white/[0.08] border border-white/[0.08]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </div>
                    {item.locked ? (
                      <Lock className="w-4 h-4 text-amber-500/70" />
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    )}
                  </Link>
                )
              })}
              
              <Link
                href="/teacher/account"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive('/teacher/account')
                    ? 'text-white bg-white/[0.08] border border-white/[0.08]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5" />
                  My Account
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
