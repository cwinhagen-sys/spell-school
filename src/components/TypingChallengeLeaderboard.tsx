'use client'

import { useEffect, useState, useRef } from 'react'
import { Trophy, X } from 'lucide-react'
import { getTypingLeaderboard, type LeaderboardEntry } from '@/lib/typingLeaderboard'

interface TypingChallengeLeaderboardProps {
  wordSetId: string | null
  onClose: () => void
  userRank?: number
  userKpm?: number
  userTime?: number
}

export default function TypingChallengeLeaderboard({
  wordSetId,
  onClose,
  userRank,
  userKpm,
  userTime
}: TypingChallengeLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const hasRefreshedRef = useRef(false)

  useEffect(() => {
    hasRefreshedRef.current = false
    void loadLeaderboard()
  }, [wordSetId])

  // Refresh once after 2 seconds if leaderboard is empty (waiting for result to save)
  useEffect(() => {
    if (!loading && leaderboard.length === 0 && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true
      const timeout = setTimeout(() => {
        void loadLeaderboard()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [loading, leaderboard.length])

  async function loadLeaderboard() {
    setLoading(true)
    const result = await getTypingLeaderboard(wordSetId)
    if (result.success) {
      setLeaderboard(result.entries)
    }
    setLoading(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="relative bg-[#12122a] rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-8 max-h-[90vh] flex flex-col border border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/30 via-cyan-500/20 to-fuchsia-500/30 rounded-3xl blur-xl" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Typing Challenge Leaderboard</h2>
              <p className="text-sm text-gray-400">Top 10 Players</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* User's Result (if top 10) */}
        {userRank && userRank <= 10 && userKpm !== undefined && userTime !== undefined && (
          <div className="relative mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl border-2 border-amber-500/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <span className="text-white font-bold text-lg">{userRank}</span>
                </div>
                <div>
                  <p className="font-bold text-white">🎉 Du är med i topplistan!</p>
                  <p className="text-sm text-gray-300">Rang #{userRank} • {userKpm} KPM • {formatTime(userTime)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard - Scrollable */}
        <div className="relative flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 border-t-transparent mb-4"></div>
              <p className="text-gray-400">Laddar leaderboard...</p>
              <p className="text-xs text-gray-500 mt-2">Väntar på att resultat registreras...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Inga resultat ännu. Var den första!</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {leaderboard.map((entry, index) => {
                const isUser = userRank === entry.rank
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      isUser
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50'
                        : index % 2 === 0
                        ? 'bg-white/5 border-white/10'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                          entry.rank === 1
                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                            : entry.rank === 2
                            ? 'bg-white/20 text-gray-300 border border-white/20'
                            : entry.rank === 3
                            ? 'bg-orange-500/30 text-orange-300 border border-orange-500/30'
                            : 'bg-white/10 text-gray-400 border border-white/10'
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${isUser ? 'text-amber-400' : 'text-white'}`}>
                          {entry.username}
                          {isUser && ' (Du)'}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-right flex-shrink-0">
                      <div>
                        <p className="text-sm text-gray-400">KPM</p>
                        <p className="font-bold text-white">{entry.kpm}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Tid</p>
                        <p className="font-bold text-white">{formatTime(entry.duration_sec)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

