'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { levelForXp } from '@/lib/leveling'
import { titleForLevel } from '@/lib/wizardTitles'
import { Trophy, Users, Crown, Zap, Target, Flame, Keyboard, TrendingUp } from 'lucide-react'

interface LeaderboardPlayer {
  id: string
  displayName?: string | null
  username?: string | null
  name?: string | null
  totalPoints: number
  badgeCount: number
  longestStreak: number
  bestKpm: number
  averageAccuracy: number
  sessionCount: number
  level: number
  wizardImage?: string
}

interface ClassLeaderboardResponse {
  success: boolean
  currentUserId: string
  players: LeaderboardPlayer[]
}

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<ClassLeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }

        const { data: classLinks } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id)
          .limit(1)
          .maybeSingle()

        if (classLinks?.class_id) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const response = await fetch('/api/student/leaderboards', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ classId: classLinks.class_id })
            })

            const data = await response.json()

            if (data.success && data.players) {
              setLeaderboardData(data)
            } else {
              setError('Could not load leaderboard')
            }
          }
        } else {
          setError('You are not in any class')
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error)
        setError('Kunde inte ladda topplistan')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const leaderboardPlayers = useMemo(() => {
    if (!leaderboardData?.players) return []
    return leaderboardData.players
      .filter(player => {
        const sessionCount = player.sessionCount || 0
        return sessionCount > 0
      })
      .map(player => {
        const totalPoints = player.totalPoints || 0
        const levelInfo = levelForXp(totalPoints)
        const wizard = titleForLevel(levelInfo.level)
        const displayName = player.displayName || player.username || player.name || 'Student'
        return {
          ...player,
          displayName,
          totalPoints,
          level: levelInfo.level,
          wizardImage: wizard?.image || '/assets/wizard/wizard_novice.png',
          badgeCount: player.badgeCount || 0,
          longestStreak: player.longestStreak || 0,
          bestKpm: player.bestKpm || 0,
          averageAccuracy: player.averageAccuracy || 0,
          sessionCount: player.sessionCount || 0
        }
      })
  }, [leaderboardData])

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  const categories = [
    {
      key: 'level',
      title: 'Highest Level',
      description: 'Total XP levels',
      icon: <Crown className="w-5 h-5" />,
      iconColor: 'text-amber-400',
      bgColor: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      metric: (player: LeaderboardPlayer) => player.level,
      renderValue: (player: LeaderboardPlayer) => `Lv ${player.level}`
    },
    {
      key: 'badges',
      title: 'Most Badges',
      description: 'Collector\'s favorite',
      icon: <Trophy className="w-5 h-5" />,
      iconColor: 'text-amber-400',
      bgColor: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      metric: (player: LeaderboardPlayer) => player.badgeCount,
      renderValue: (player: LeaderboardPlayer) => `${player.badgeCount} badges`
    },
    {
      key: 'streak',
      title: 'Longest Streak',
      description: 'Days in a row right now',
      icon: <Flame className="w-5 h-5" />,
      iconColor: 'text-orange-400',
      bgColor: 'from-orange-500/20 to-red-500/20',
      borderColor: 'border-orange-500/30',
      metric: (player: LeaderboardPlayer) => player.longestStreak,
      renderValue: (player: LeaderboardPlayer) => `${player.longestStreak} days`
    },
    {
      key: 'sessions',
      title: 'Most Games',
      description: 'Total number of games',
      icon: <Zap className="w-5 h-5" />,
      iconColor: 'text-cyan-400',
      bgColor: 'from-cyan-500/20 to-blue-500/20',
      borderColor: 'border-cyan-500/30',
      metric: (player: LeaderboardPlayer) => player.sessionCount,
      renderValue: (player: LeaderboardPlayer) => `${player.sessionCount} games`
    },
    {
      key: 'kpm',
      title: 'Fastest Typist',
      description: 'Best typing speed',
      icon: <Keyboard className="w-5 h-5" />,
      iconColor: 'text-fuchsia-400',
      bgColor: 'from-fuchsia-500/20 to-pink-500/20',
      borderColor: 'border-fuchsia-500/30',
      metric: (player: LeaderboardPlayer) => player.bestKpm,
      renderValue: (player: LeaderboardPlayer) => `${Math.round(player.bestKpm)} KPM`
    },
    {
      key: 'accuracy',
      title: 'Best Accuracy',
      description: 'Highest average',
      icon: <Target className="w-5 h-5" />,
      iconColor: 'text-emerald-400',
      bgColor: 'from-emerald-500/20 to-green-500/20',
      borderColor: 'border-emerald-500/30',
      metric: (player: LeaderboardPlayer) => player.averageAccuracy,
      renderValue: (player: LeaderboardPlayer) => `${Math.round(player.averageAccuracy)}%`
    }
  ]

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-gray-400">See which classmates lead in different categories</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center text-red-400">
            {error}
          </div>
        ) : leaderboardPlayers.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No leaderboard available</p>
            <p className="text-gray-500 text-sm mt-2">Start playing games to get on the leaderboard!</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {categories.map(category => {
              const sortedPlayers = leaderboardPlayers
                .slice()
                .sort((a, b) => (category.metric(b) || 0) - (category.metric(a) || 0))
              
              const topPlayers = sortedPlayers.slice(0, 5)

              return (
                <div 
                  key={category.key} 
                  className={`rounded-2xl border bg-gradient-to-br ${category.bgColor} ${category.borderColor} p-6 backdrop-blur-sm`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className={category.iconColor}>{category.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{category.title}</h3>
                      <p className="text-xs text-gray-400">{category.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {topPlayers.map((player, index) => {
                      const rank = index + 1
                      const isTopThree = rank <= 3
                      const isCurrentUser = player.id === leaderboardData?.currentUserId
                      
                      const medalColors = {
                        1: 'from-amber-400 to-yellow-500 text-white shadow-amber-500/50',
                        2: 'from-gray-300 to-gray-400 text-gray-800 shadow-gray-400/50',
                        3: 'from-orange-400 to-amber-500 text-white shadow-orange-500/50'
                      }
                      
                      return (
                        <div
                          key={`${category.key}-${player.id}`}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                            isCurrentUser
                              ? 'border-amber-500/50 bg-amber-500/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={player.wizardImage}
                                alt={player.displayName || 'Student'}
                                className={`w-10 h-10 rounded-full object-cover border-2 ${
                                  isTopThree ? 'border-white shadow-lg' : 'border-white/30'
                                }`}
                              />
                              <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                                isTopThree 
                                  ? `bg-gradient-to-br ${medalColors[rank as 1 | 2 | 3]}`
                                  : 'bg-[#1a1a2e] border border-white/20 text-gray-400'
                              }`}>
                                {rank}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white flex items-center gap-2">
                                {player.displayName}
                                {isCurrentUser && (
                                  <span className="text-xs font-medium text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Level {player.level} · {player.totalPoints.toLocaleString()} XP
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-white">
                              {category.renderValue(player)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {topPlayers.length === 0 && (
                      <div className="text-xs text-gray-500 text-center py-4">
                        No statistics yet
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 p-4 bg-white/5 backdrop-blur-sm rounded-xl text-center text-sm text-gray-500 border border-white/10">
          <p>The leaderboard updates after each game played</p>
        </div>
      </div>
    </div>
  )
}
