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
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { markUserAsLoggedOut } from '@/lib/activity'
import { syncManager } from '@/lib/syncManager'

interface NavItem {
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
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

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

      // Load assignments
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
        .slice(0, 5) // Limit to 5 for dropdown

      // Remove duplicates by id
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
    
    // Show homework selection if multiple assignments exist, otherwise start directly
    if (homeworks.length === 1) {
      // Only one assignment - start directly
      window.location.href = `/student?game=${gameType}&homework=${homeworks[0].id}`
    } else {
      // Multiple assignments - show selection modal
      window.location.href = `/student?game=${gameType}&showHomeworkSelection=true`
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close desktop dropdowns
      Object.entries(dropdownRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown((prev) => prev === key ? null : prev)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu when clicking outside
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

  // Close dropdowns on route change
  useEffect(() => {
    setOpenDropdown(null)
    setMobileMenuOpen(false)
  }, [pathname])

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
      label: 'Wizard Profile',
      href: '/student/profile',
      icon: <User className="w-4 h-4" />,
      subItems: [
        { label: 'View Profile', href: '/student/profile' },
        { label: 'Edit Avatar', href: '/student/profile' }
      ]
    },
    {
      label: 'Level & XP',
      href: '/student/levels',
      icon: <TrendingUp className="w-4 h-4" />,
      subItems: [
        { label: 'View Progress', href: '/student/levels' },
        { label: 'Wizard Titles', href: '/student/levels' }
      ]
    },
    {
      label: 'Daily Quests',
      href: '/student/quests',
      icon: <Target className="w-4 h-4" />,
      subItems: [
        { label: 'View Quests', href: '/student/quests' },
        { label: 'Quest History', href: '/student/quests' }
      ]
    },
    {
      label: 'Trophies',
      href: '/student/badges',
      icon: <Trophy className="w-4 h-4" />,
      subItems: [
        { label: 'View Collection', href: '/student/badges' },
        { label: 'Achievements', href: '/student/badges' }
      ]
    },
    {
      label: 'Assignments',
      href: '/student/word-sets',
      icon: <BookOpen className="w-4 h-4" />,
      subItems: [] // Will be populated dynamically
    },
    {
      label: 'Games',
      href: '/student/games',
      icon: <Gamepad2 className="w-4 h-4" />,
      subItems: [
        { label: 'Flashcards', href: '#flashcards' },
        { label: 'Multiple Choice', href: '#choice' },
        { label: 'Memory Game', href: '#match' },
        { label: 'Matching Pairs', href: '#connect' },
        { label: 'Typing Challenge', href: '#typing' },
        { label: 'Translate', href: '#translate' },
        { label: 'Sentence Gap', href: '#storygap' },
        { label: 'Word Roulette', href: '#roulette' }
        // Block Reading temporarily disabled - code preserved in src/components/games/BlockReadingGame.tsx
        // { label: 'Block Reading', href: '#block_reading' }
      ]
    },
    {
      label: 'Leaderboard',
      href: '/student/leaderboard',
      icon: <Users className="w-4 h-4" />,
      subItems: [
        { label: 'Class Rankings', href: '/student/leaderboard' }
      ]
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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-indigo-50/95 via-purple-50/95 to-pink-50/95 backdrop-blur-md border-b border-purple-200/50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/student" className="flex items-center gap-2 group">
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Spell School
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <div
                  key={item.label}
                  ref={(el) => {
                    dropdownRefs.current[item.label] = el
                  }}
                  className="relative"
                >
                  <button
                    onClick={() => {
                      if (item.label === 'Assignments' || item.label === 'Games' || (item.subItems && item.subItems.length > 0)) {
                        toggleDropdown(item.label)
                      } else {
                        window.location.href = item.href
                      }
                    }}
                    className={`
                      flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-gray-700 hover:bg-white/60 hover:text-purple-600'
                      }
                    `}
                    aria-haspopup={item.label === 'Assignments' || item.label === 'Games' || (item.subItems && item.subItems.length > 0)}
                    aria-expanded={openDropdown === item.label}
                  >
                    <span className={active ? 'text-white' : 'text-purple-600'}>{item.icon}</span>
                    <span>{item.label}</span>
                    {(item.label === 'Assignments' || item.label === 'Games' || (item.subItems && item.subItems.length > 0)) && (
                      <ChevronDown 
                        className={`w-3 h-3 transition-transform ${openDropdown === item.label ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {openDropdown === item.label && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-purple-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto">
                      <div className="py-1">
                        {/* Special handling for Games */}
                        {item.label === 'Games' && item.subItems ? (
                          <>
                            {item.subItems.map((subItem, subIndex) => {
                              const gameType = subItem.href.replace('#', '')
                              return (
                                <button
                                  key={`${item.label}-sub-${subIndex}-${subItem.href}`}
                                  onClick={() => {
                                    startGame(gameType)
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                >
                                  {subItem.label}
                                </button>
                              )
                            })}
                            <Link
                              key={`${item.label}-main`}
                              href={item.href}
                              className="block px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border-t border-purple-100"
                              onClick={() => setOpenDropdown(null)}
                            >
                              View all games →
                            </Link>
                          </>
                        ) : item.label === 'Assignments' ? (
                          <>
                            {homeworks.length > 0 ? (
                              <>
                                {homeworks.map((hw, hwIndex) => (
                                  <Link
                                    key={`assignment-${hw.id}`}
                                    href={`/student/word-sets?assignment=${hw.id}`}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    <span 
                                      className="w-3 h-3 rounded-full flex-shrink-0" 
                                      style={{ backgroundColor: hw.color || '#6b7280' }}
                                    />
                                    <span className="truncate flex-1">{hw.title}</span>
                                  </Link>
                                ))}
                                <Link
                                  key={`${item.label}-main`}
                                  href={item.href}
                                  className="block px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border-t border-purple-100"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  View all assignments →
                                </Link>
                              </>
                            ) : (
                              <>
                                <div className="px-4 py-2 text-sm text-gray-500">No assignments</div>
                                <Link
                                  key={`${item.label}-main`}
                                  href={item.href}
                                  className="block px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border-t border-purple-100"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  View assignments →
                                </Link>
                              </>
                            )}
                          </>
                        ) : item.subItems ? (
                          <>
                            {item.subItems.map((subItem, subIndex) => (
                              <Link
                                key={`${item.label}-sub-${subIndex}-${subItem.href}`}
                                href={subItem.href}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                onClick={() => setOpenDropdown(null)}
                              >
                                {subItem.label}
                              </Link>
                            ))}
                            <Link
                              key={`${item.label}-main`}
                              href={item.href}
                              className="block px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors border-t border-purple-100"
                              onClick={() => setOpenDropdown(null)}
                            >
                              Go to {item.label} →
                            </Link>
                          </>
                        ) : null}
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                {user?.user_metadata?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'S'}
              </div>
              <span className="text-gray-700 font-medium">
                {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Student'}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${isLoggingOut
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-white/60 hover:text-purple-600'
                }
              `}
            >
              <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoggingOut ? 'Saving...' : 'Sign Out'}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-white/60 transition-colors"
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
          className="lg:hidden border-t border-purple-200/50 bg-white/95 backdrop-blur-md animate-in slide-in-from-top duration-200"
        >
          <nav className="container mx-auto px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              const isExpanded = openDropdown === item.label
              
              return (
                <div key={item.label}>
                  <button
                    onClick={() => {
                      if (item.label === 'Assignments' || item.label === 'Games' || (item.subItems && item.subItems.length > 0)) {
                        toggleDropdown(item.label)
                      } else {
                        window.location.href = item.href
                        setMobileMenuOpen(false)
                      }
                    }}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${active
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                        : 'text-gray-700 hover:bg-purple-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={active ? 'text-white' : 'text-purple-600'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {(item.label === 'Assignments' || item.label === 'Games' || (item.subItems && item.subItems.length > 0)) && (
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                  
                  {/* Mobile Dropdown */}
                  {isExpanded && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.label === 'Games' && item.subItems ? (
                        <>
                          {item.subItems.map((subItem, subIndex) => {
                            const gameType = subItem.href.replace('#', '')
                            return (
                              <button
                                key={`${item.label}-mobile-sub-${subIndex}-${subItem.href}`}
                                onClick={() => {
                                  startGame(gameType)
                                  setMobileMenuOpen(false)
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                {subItem.label}
                              </button>
                            )
                          })}
                          <Link
                            key={`${item.label}-mobile-main`}
                            href={item.href}
                            className="block px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            onClick={() => {
                              setMobileMenuOpen(false)
                              setOpenDropdown(null)
                            }}
                          >
                            View all games →
                          </Link>
                        </>
                      ) : item.label === 'Assignments' ? (
                        <>
                          {homeworks.length > 0 ? (
                            <>
                              {homeworks.map((hw) => (
                                <Link
                                  key={`assignment-mobile-${hw.id}`}
                                  href={`/student/word-sets?assignment=${hw.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  onClick={() => {
                                    setMobileMenuOpen(false)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <span 
                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: hw.color || '#6b7280' }}
                                  />
                                  <span className="truncate flex-1">{hw.title}</span>
                                </Link>
                              ))}
                              <Link
                                key={`${item.label}-mobile-main`}
                                href={item.href}
                                className="block px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                onClick={() => {
                                  setMobileMenuOpen(false)
                                  setOpenDropdown(null)
                                }}
                              >
                                View all assignments →
                              </Link>
                            </>
                          ) : (
                            <>
                              <div className="px-4 py-2 text-sm text-gray-500">No assignments</div>
                              <Link
                                key={`${item.label}-mobile-main`}
                                href={item.href}
                                className="block px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                onClick={() => {
                                  setMobileMenuOpen(false)
                                  setOpenDropdown(null)
                                }}
                              >
                                View assignments →
                              </Link>
                            </>
                          )}
                        </>
                      ) : item.subItems ? (
                        <>
                          {item.subItems.map((subItem, subIndex) => (
                            <Link
                              key={`${item.label}-mobile-sub-${subIndex}-${subItem.href}`}
                              href={subItem.href}
                              className="block px-4 py-2 text-sm text-gray-600 hover:bg-purple-50 rounded-lg transition-colors"
                              onClick={() => {
                                setMobileMenuOpen(false)
                                setOpenDropdown(null)
                              }}
                            >
                              {subItem.label}
                            </Link>
                          ))}
                          <Link
                            key={`${item.label}-mobile-main`}
                            href={item.href}
                            className="block px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            onClick={() => {
                              setMobileMenuOpen(false)
                              setOpenDropdown(null)
                            }}
                          >
                            Go to {item.label} →
                          </Link>
                        </>
                      ) : null}
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

