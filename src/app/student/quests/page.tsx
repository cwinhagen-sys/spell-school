'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, CheckCircle2, Circle, Zap, ArrowRight, Trophy, Flame } from 'lucide-react'
import Link from 'next/link'

interface Quest {
  id: string
  title: string
  description: string
  target: number
  progress: number
  xp: number
  icon: string
  completed: boolean
}

interface Homework {
  id: string
  title: string
  color?: string
  due_date?: string
}

export default function DailyQuestsPage() {
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)

  const getGameTypeForQuest = (questId: string): string | null => {
    const questToGameMap: { [key: string]: string } = {
      'play_3_games': 'flashcards',
      'memory_2': 'match',
      'typing_1': 'typing',
      'choice_3_perfect': 'choice',
      'sentence_gap_perfect': 'storygap',
      'sentence_gap_2': 'storygap',
      'sentence_gap_5': 'storygap',
      'roulette_perfect_5_words': 'roulette',
      'roulette_perfect_10_words': 'roulette',
      'roulette_perfect_20_words': 'roulette',
      'roulette_3': 'roulette',
      'roulette_5': 'roulette',
      'multi_game_4': 'flashcards',
      'perfect_score_1': 'flashcards',
      'perfect_3': 'flashcards',
      'marathon_10': 'flashcards',
      'quiz_perfect': 'quiz',
      'typing_speed': 'typing'
    }
    return questToGameMap[questId] || null
  }

  const startQuestGame = (questId: string) => {
    const gameType = getGameTypeForQuest(questId)
    if (!gameType) {
      window.location.href = '/student/games'
      return
    }

    if (homeworks.length === 0) {
      window.location.href = '/student/games'
      return
    }

    const homeworkId = homeworks[0].id
    window.location.href = `/student?game=${gameType}&homework=${homeworkId}`
  }

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

        const classIds = (classLinks || []).map((r: any) => r.class_id)

        const { data: direct } = await supabase
          .from('assigned_word_sets')
          .select('due_date, word_sets ( id, title, color )')
          .eq('student_id', user.id)

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
        const todayDate = new Date()
        todayDate.setHours(23, 59, 59, 999)

        const active = combined
          .filter((rec: any) => !rec.due_date || new Date(rec.due_date) >= todayDate)
          .map((rec: any) => ({
            id: rec.word_sets.id,
            title: rec.word_sets.title,
            color: rec.word_sets.color,
            due_date: rec.due_date
          }))
          .slice(0, 5)

        const unique = Array.from(new Map(active.map(item => [item.id, item])).values())
        setHomeworks(unique)

        const now = new Date()
        const today = now.toDateString()
        const stored = localStorage.getItem(`dailyQuests_${today}_${user.id}`)

        if (stored) {
          const questData = JSON.parse(stored)
          setDailyQuests(questData.quests || questData)
        } else {
          const quests: Quest[] = [
            {
              id: 'play_3_games',
              title: 'Ordkrigare',
              description: 'Klara 3 spel av valfri typ',
              target: 3,
              progress: 0,
              xp: 15,
              icon: '⚔️',
              completed: false
            },
            {
              id: 'memory_2',
              title: 'Memory-mästare',
              description: 'Klara 2 Memory-spel',
              target: 2,
              progress: 0,
              xp: 15,
              icon: '🧠',
              completed: false
            },
            {
              id: 'typing_1',
              title: 'Stavningsexpert',
              description: 'Klara 1 skrivutmaning',
              target: 1,
              progress: 0,
              xp: 10,
              icon: '⌨️',
              completed: false
            }
          ]
          setDailyQuests(quests)
          localStorage.setItem(`dailyQuests_${today}_${user.id}`, JSON.stringify({ quests, resetTime: now.getTime() }))
        }
      } catch (error) {
        console.error('Error loading quests:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar uppdrag...</p>
        </div>
      </div>
    )
  }

  const completedCount = dailyQuests.filter(q => q.completed).length
  const totalXp = dailyQuests.reduce((sum, q) => sum + (q.completed ? q.xp : 0), 0)

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dagliga uppdrag</h1>
              <p className="text-gray-400">Klara uppdrag för att tjäna XP</p>
            </div>
          </div>
          <div className="text-right bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
            <div className="text-3xl font-bold text-cyan-400">{completedCount}/{dailyQuests.length}</div>
            <div className="text-sm text-gray-400">Klara</div>
          </div>
        </div>

        {/* Quests Grid */}
        <div className="space-y-4 mb-8">
          {dailyQuests.map((quest) => {
            const progressPercent = (quest.progress / quest.target) * 100
            const difficulty = quest.xp <= 15 ? 'easy' : quest.xp <= 50 ? 'medium' : 'hard'
            const difficultyStyles = {
              easy: {
                bg: 'from-emerald-500/20 to-green-500/20',
                border: 'border-emerald-500/30',
                progress: 'from-emerald-500 to-green-500',
                label: 'Enkel',
                labelBg: 'bg-emerald-500/20 text-emerald-400'
              },
              medium: {
                bg: 'from-amber-500/20 to-orange-500/20',
                border: 'border-amber-500/30',
                progress: 'from-amber-500 to-orange-500',
                label: 'Medel',
                labelBg: 'bg-amber-500/20 text-amber-400'
              },
              hard: {
                bg: 'from-rose-500/20 to-pink-500/20',
                border: 'border-rose-500/30',
                progress: 'from-rose-500 to-pink-500',
                label: 'Svår',
                labelBg: 'bg-rose-500/20 text-rose-400'
              }
            }

            const style = difficultyStyles[difficulty]

            return (
              <div
                key={quest.id}
                className={`bg-gradient-to-r ${style.bg} rounded-2xl p-6 border ${style.border} ${
                  quest.completed ? 'ring-2 ring-emerald-500/50' : ''
                } transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{quest.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{quest.title}</h3>
                      <p className="text-sm text-gray-400">{quest.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    {quest.completed ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <Circle className="w-7 h-7 text-gray-500" />
                    )}
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <Zap className="w-4 h-4" />
                      +{quest.xp} XP
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>Framsteg</span>
                    <span className="font-semibold text-white">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${style.progress}`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${style.labelBg}`}>
                    {style.label}
                  </span>
                  {!quest.completed && (
                    <button
                      onClick={() => startQuestGame(quest.id)}
                      className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Börja spela
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* All Complete Banner */}
        {completedCount === dailyQuests.length && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8 text-center mb-8">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-2xl font-bold text-amber-400 mb-2">Alla uppdrag klara!</h3>
            <p className="text-amber-300/80 font-semibold">+100 XP Bonus!</p>
            <p className="text-sm text-gray-400 mt-2">Grattis! Du har klarat alla dagliga uppdrag.</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl text-center text-sm text-gray-500 border border-white/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Nya uppdrag imorgon kl 06:00</span>
          </div>
          <p>
            XP intjänat idag: <span className="font-bold text-cyan-400">{totalXp}</span>
            {completedCount === dailyQuests.length && <span className="text-amber-400"> (+100 bonus)</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
