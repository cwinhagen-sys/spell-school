'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { BookOpen, Users, FileText, Calendar, UserPlus, LogOut, Gamepad2, Lock, Sparkles, Menu, X, ChevronRight, TrendingUp, PenTool } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'
import { hasSessionModeAccess, hasProgressStatsAccess, getUserSubscriptionTier, getTierDisplayName, type SubscriptionTier } from '@/lib/subscription'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [hasSessionAccess, setHasSessionAccess] = useState(false)
  const [hasProgressAccess, setHasProgressAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  
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
          const tier = await getUserSubscriptionTier(user.id)
          setHasSessionAccess(sessionAccess)
          setHasProgressAccess(progressAccess)
          setSubscriptionTier(tier)
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
    { id: 'classes', href: '/teacher/classes', label: 'Klasser', icon: Users },
    { id: 'word-sets', href: '/teacher/word-sets', label: 'Gloslistor', icon: FileText },
    { id: 'assign', href: '/teacher/assign', label: 'Tilldela', icon: Calendar },
    { 
      id: 'progress',
      href: hasProgressAccess ? '/teacher/students' : '/teacher/account', 
      label: 'Progress', 
      icon: TrendingUp,
      locked: !hasProgressAccess,
      lockMessage: 'Kräver Pro-plan'
    },
    { 
      id: 'sessions',
      href: hasSessionAccess ? '/teacher/sessions' : '/teacher/account', 
      label: 'Sessions', 
      icon: Gamepad2,
      locked: !hasSessionAccess,
      lockMessage: 'Kräver Premium eller Pro'
    },
    { id: 'story-reviews', href: '/teacher/story-reviews', label: 'Texter', icon: PenTool },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f2a] via-[#0a0a1a] to-[#050510]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0a0a1a]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20' : 'bg-[#0a0a1a]/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-3">
            {/* Logo */}
            <Link href="/teacher" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/20">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 to-rose-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold text-white leading-tight">
                  Spell<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Lärarportal</span>
              </div>
            </Link>

            {/* Desktop Navigation - more spacing */}
            <nav className="hidden lg:flex items-center gap-2 mx-8">
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
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      item.locked
                        ? 'text-gray-600 cursor-not-allowed opacity-60'
                        : active
                        ? 'text-white bg-white/10 shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.locked && <Lock className="w-3 h-3 text-amber-500/70 flex-shrink-0" />}
                    {active && !item.locked && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right side actions - more spacing */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Subscription Tier Badge */}
              {subscriptionTier !== 'free' && (
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  subscriptionTier === 'premium'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  <span>{getTierDisplayName(subscriptionTier)}</span>
                </div>
              )}
              
              <Link
                href="/teacher/account"
                className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive('/teacher/account')
                    ? 'text-white bg-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden md:inline">Mitt konto</span>
              </Link>
              
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isLoggingOut ? 'Sparar...' : 'Logga ut'}</span>
              </button>

              {/* Mobile menu button */}
              <button 
                className="lg:hidden p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-white/5">
            <div className="px-4 py-4 space-y-1">
              {/* Subscription Tier Badge in Mobile */}
              {subscriptionTier !== 'free' && (
                <div className={`mb-4 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                  subscriptionTier === 'premium'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  <span>{getTierDisplayName(subscriptionTier)}</span>
                </div>
              )}
              
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
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                      item.locked
                        ? 'text-gray-600 opacity-60'
                        : active
                        ? 'text-white bg-white/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive('/teacher/account')
                    ? 'text-white bg-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5" />
                  Mitt konto
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
