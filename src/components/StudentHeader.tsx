'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, 
  TrendingUp, 
  Target, 
  Trophy, 
  BookOpen, 
  Gamepad2, 
  Users, 
  LogOut, 
  ChevronDown,
  Menu,
  X,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  subItems?: Array<{ label: string; href: string }>
}

interface Homework {
  id: string
  title: string
  color?: string
  due_date?: string
}

export default function StudentHeader() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [scrolled, setScrolled] = useState(false)
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        loadAssignments(user.id)
      }
    }
    loadUser()
  }, [])

  const loadAssignments = async (userId: string) => {
    try {
      const { data: classLinks } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', userId)

      const classIds = (classLinks || []).map((r: any) => r.class_id)

      const { data: direct } = await supabase
        .from('assigned_word_sets')
        .select('due_date, word_sets ( id, title, color )')
        .eq('student_id', userId)

      let byClass: any[] = []
      if (classIds.length > 0) {
        const { data: cls } = await supabase
          .from('assigned_word_sets')
          .select('due_date, word_sets ( id, title, color )')
          .in('class_id', classIds)
          .is('student_id', null)
        byClass = (cls as any[]) || []
      }

      const combined = [...(direct as any[] || []), ...byClass].filter(r => r.word_sets)
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      const active = combined
        .filter((rec: any) => !rec.due_date || new Date(rec.due_date) >= today)
        .map((rec: any) => ({
          id: rec.word_sets.id,
          title: rec.word_sets.title,
          color: rec.word_sets.color,
          due_date: rec.due_date
        }))
        .slice(0, 5)

      const unique = Array.from(new Map(active.map(item => [item.id, item])).values())
      setHomeworks(unique)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const startGame = async (gameType: string) => {
    if (homeworks.length === 0) {
      window.location.href = '/student/games'
      return
    }
    
    if (homeworks.length === 1) {
      window.location.href = `/student?game=${gameType}&homework=${homeworks[0].id}`
    } else {
      window.location.href = `/student?game=${gameType}&showHomeworkSelection=true`
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown((prev) => prev === key ? null : prev)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    setOpenDropdown(null)
    setMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    if (isLoggingOut) return
    
    try {
      setIsLoggingOut(true)
      
      try {
        await Promise.race([
          syncManager.cleanup(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ])
      } catch (error) {
        console.error('Error syncing before logout:', error)
      }
      
      markUserAsLoggedOut().catch(err => console.log('Failed to mark as logged out:', err))
      
      const persistentLogs = localStorage.getItem('persistentLogs')
      localStorage.clear()
      sessionStorage.clear()
      
      if (persistentLogs) {
        localStorage.setItem('persistentLogs', persistentLogs)
      }
      
      const forceRedirect = setTimeout(() => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.replace('/')
      }, 1500)
      
      try {
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 1000)
        )
        await Promise.race([signOutPromise, timeoutPromise])
      } catch (error) {
        console.log('Supabase signOut failed or timed out:', error)
      }
      
      clearTimeout(forceRedirect)
      window.location.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.clear()
      sessionStorage.clear()
      window.location.replace('/')
    }
  }

  const navItems: NavItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      href: '/student/profile',
      icon: <User className="w-4 h-4 text-blue-400" />
    },
    {
      id: 'levels',
      label: 'Level & Arcane Points',
      href: '/student/levels',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'quests',
      label: 'Quests',
      href: '/student/quests',
      icon: <Target className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'badges',
      label: 'Badges',
      href: '/student/badges',
      icon: <Trophy className="w-4 h-4 text-violet-400" />
    },
    {
      id: 'wordsets',
      label: 'Word Sets',
      href: '/student/word-sets',
      icon: <BookOpen className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'vocabulary-games',
      label: 'Vocabulary Games',
      href: '/student/games',
      icon: <Gamepad2 className="w-4 h-4 text-pink-400" />,
      subItems: [
        { label: 'Flashcards', href: '#flashcards' },
        { label: 'Multiple Choice', href: '#choice' },
        { label: 'Memory', href: '#match' },
        { label: 'Matching Pairs', href: '#connect' },
        { label: 'Typing', href: '#typing' },
        { label: 'Translate', href: '#translate' },
        { label: 'Sentence Gap', href: '#storygap' },
        { label: 'Word Roulette', href: '#roulette' }
      ]
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      href: '/student/leaderboard',
      icon: <Users className="w-4 h-4 text-orange-400" />
    }
  ]

  const isActive = (href: string) => {
    if (href === '/student') {
      return pathname === '/student'
    }
    return pathname?.startsWith(href)
  }

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label)
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-[#0a0a1a]/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/student" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span 
              className="text-xl font-bold tracking-tight font-[family-name:var(--font-playfair)] hidden sm:block"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span className="text-white">Spell</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">School</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    dropdownRefs.current[item.label] = el
                  }}
                  className="relative"
                >
                  <button
                    onClick={() => {
                      if (item.subItems && item.subItems.length > 0) {
                        toggleDropdown(item.label)
                      } else {
                        window.location.href = item.href
                      }
                    }}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                    aria-haspopup={item.subItems && item.subItems.length > 0}
                    aria-expanded={openDropdown === item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.subItems && item.subItems.length > 0 && (
                      <ChevronDown 
                        className={`w-3 h-3 transition-transform ${openDropdown === item.label ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {openDropdown === item.label && item.subItems && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white/5 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="py-2">
                        {item.subItems.map((subItem, subIndex) => {
                          const gameType = subItem.href.replace('#', '')
                          return (
                            <button
                              key={`${item.id}-sub-${subIndex}`}
                              onClick={() => {
                                startGame(gameType)
                                setOpenDropdown(null)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-amber-500/10 hover:text-white transition-colors flex items-center gap-2"
                            >
                              <Zap className="w-3 h-3 text-amber-400" />
                              {subItem.label}
                            </button>
                          )
                        })}
                        {item.id === 'vocabulary-games' && (
                          <Link
                            href={item.href}
                            className="block px-4 py-2.5 text-sm font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors border-t border-white/10 mt-1"
                            onClick={() => setOpenDropdown(null)}
                          >
                            View all games →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Right Side - User Actions */}
          <div className="flex items-center gap-3">
            {/* User Avatar/Name */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-semibold text-xs shadow-lg shadow-amber-500/30">
                {user?.user_metadata?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'S'}
              </div>
              <span className="text-gray-300 font-medium">
                {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Student'}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${isLoggingOut
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoggingOut ? 'Saving...' : 'Sign out'}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden border-t border-white/10 bg-[#0a0a1a]/98 backdrop-blur-xl animate-in slide-in-from-top duration-200"
        >
          <nav className="container mx-auto px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              const isExpanded = openDropdown === item.label
              
              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (item.subItems && item.subItems.length > 0) {
                        toggleDropdown(item.label)
                      } else {
                        window.location.href = item.href
                        setMobileMenuOpen(false)
                      }
                    }}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${active
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.subItems && item.subItems.length > 0 && (
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                  
                  {/* Mobile Dropdown */}
                  {isExpanded && item.subItems && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.subItems.map((subItem, subIndex) => {
                        const gameType = subItem.href.replace('#', '')
                        return (
                          <button
                            key={`${item.id}-mobile-sub-${subIndex}`}
                            onClick={() => {
                              startGame(gameType)
                              setMobileMenuOpen(false)
                              setOpenDropdown(null)
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            {subItem.label}
                          </button>
                        )
                      })}
                      {item.id === 'vocabulary-games' && (
                        <Link
                          href={item.href}
                          className="block px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          onClick={() => {
                            setMobileMenuOpen(false)
                            setOpenDropdown(null)
                          }}
                        >
                          View all games →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
