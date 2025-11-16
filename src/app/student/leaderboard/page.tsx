'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { levelForXp } from '@/lib/leveling'
import { titleForLevel } from '@/lib/wizardTitles'
import { Trophy } from 'lucide-react'

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

        // Load class leaderboard
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
              setError('Could not load leaderboard data')
            }
          }
        } else {
          setError('You are not in a class')
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error)
        setError('Failed to load leaderboard')
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
        // Only show players who have played at least one session
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
      <div className="container mx-auto px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Leaderboard</h1>
          <p className="text-gray-600">See which classmates lead in different categories</p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">
            {error}
          </div>
        ) : leaderboardPlayers.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No leaderboard data available</p>
            <p className="text-gray-400 text-sm mt-2">Start playing games to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {[
              {
                key: 'level',
                title: 'Highest Level',
                description: 'Total XP levels',
                metric: (player: LeaderboardPlayer) => player.level,
                renderValue: (player: LeaderboardPlayer) => `Lv ${player.level}`
              },
              {
                key: 'badges',
                title: 'Most Badges',
                description: 'Collector\'s favorite',
                metric: (player: LeaderboardPlayer) => player.badgeCount,
                renderValue: (player: LeaderboardPlayer) => `${player.badgeCount} badges`
              },
              {
                key: 'streak',
                title: 'Current Streak',
                description: 'Days in a row right now',
                metric: (player: LeaderboardPlayer) => player.longestStreak,
                renderValue: (player: LeaderboardPlayer) => `${player.longestStreak} days`
              },
              {
                key: 'sessions',
                title: 'Games Played',
                description: 'Total number of games',
                metric: (player: LeaderboardPlayer) => player.sessionCount,
                renderValue: (player: LeaderboardPlayer) => `${player.sessionCount} games`
              },
              {
                key: 'kpm',
                title: 'Fastest Typist',
                description: 'Best Typing Challenge KPM',
                metric: (player: LeaderboardPlayer) => player.bestKpm,
                renderValue: (player: LeaderboardPlayer) => `${Math.round(player.bestKpm)} KPM`
              },
              {
                key: 'accuracy',
                title: 'Best Accuracy',
                description: 'Highest average accuracy',
                metric: (player: LeaderboardPlayer) => player.averageAccuracy,
                renderValue: (player: LeaderboardPlayer) => `${Math.round(player.averageAccuracy)}%`
              }
            ].map(category => {
              // Filter and sort players for this category
              const sortedPlayers = leaderboardPlayers
                .slice()
                .sort((a, b) => (category.metric(b) || 0) - (category.metric(a) || 0))
              
              // Take top 5 (or fewer if less than 5 players have data in this category)
              const topPlayers = sortedPlayers.slice(0, 5)

              return (
                <div key={category.key} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-gray-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {category.title}
                      </h3>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {topPlayers.map((player, index) => {
                      const rank = index + 1
                      const isTopThree = rank <= 3
                      const isCurrentUser = player.id === leaderboardData?.currentUserId
                      
                      // Medal colors and styles
                      const medalStyles = {
                        1: {
                          badge: 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-500 text-white shadow-lg shadow-yellow-500/50',
                          border: 'border-yellow-300',
                          bg: 'bg-gradient-to-r from-yellow-50/80 to-yellow-100/40',
                          glow: 'shadow-lg shadow-yellow-500/30'
                        },
                        2: {
                          badge: 'bg-gradient-to-br from-gray-300 to-gray-500 border-gray-400 text-white shadow-lg shadow-gray-400/50',
                          border: 'border-gray-300',
                          bg: 'bg-gradient-to-r from-gray-50/80 to-gray-100/40',
                          glow: 'shadow-lg shadow-gray-400/30'
                        },
                        3: {
                          badge: 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-700 text-white shadow-lg shadow-amber-600/50',
                          border: 'border-amber-400',
                          bg: 'bg-gradient-to-r from-amber-50/80 to-amber-100/40',
                          glow: 'shadow-lg shadow-amber-500/30'
                        }
                      }
                      
                      const medalStyle = isTopThree ? medalStyles[rank as 1 | 2 | 3] : null
                      
                      return (
                        <div
                          key={`${category.key}-${player.id}`}
                          className={`flex items-center justify-between rounded-xl border px-3 py-3 transition-all ${
                            isCurrentUser
                              ? isTopThree
                                ? `${medalStyle?.border} ${medalStyle?.bg} ${medalStyle?.glow}`
                                : 'border-indigo-200 bg-indigo-50/60'
                              : isTopThree
                                ? `${medalStyle?.border} ${medalStyle?.bg} ${medalStyle?.glow}`
                                : 'border-gray-200 bg-white'
                          } ${isTopThree ? 'shadow-md' : 'shadow-sm'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={player.wizardImage}
                                alt={player.displayName || 'Student'}
                                className={`w-12 h-12 rounded-full object-cover border-2 shadow ${
                                  isTopThree ? 'border-white shadow-lg' : 'border-white'
                                }`}
                              />
                              <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isTopThree 
                                  ? medalStyle?.badge 
                                  : 'bg-white border border-gray-200 text-gray-600'
                              }`}>
                                {rank}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                {player.displayName || 'Student'}
                                {isCurrentUser && (
                                  <span className="text-xs font-semibold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
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
                            <div className={`text-base font-bold ${
                              isTopThree ? 'text-gray-900' : 'text-gray-900'
                            }`}>
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

        <div className="mt-8 p-4 bg-white/60 rounded-lg text-center text-sm text-gray-600">
          <p>Leaderboard updates after each game session</p>
        </div>
      </div>
    </div>
  )
}
