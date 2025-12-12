'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, CheckCircle2, Circle, Zap, ArrowRight } from 'lucide-react'

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
              title: 'Word Warrior',
              description: 'Complete 3 games of any type',
              target: 3,
              progress: 0,
              xp: 15,
              icon: '⚔️',
              completed: false
            },
            {
              id: 'memory_2',
              title: 'Memory Master',
              description: 'Complete 2 Memory games',
              target: 2,
              progress: 0,
              xp: 15,
              icon: '🧠',
              completed: false
            },
            {
              id: 'typing_1',
              title: 'Spelling Expert',
              description: 'Complete 1 Typing Challenge',
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
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading quests...</p>
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
            <div className="w-12 h-12 bg-[#161622] border border-white/[0.08] rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Daily Quests</h1>
              <p className="text-sm text-gray-500">Complete quests to earn XP</p>
            </div>
          </div>
          <div className="text-right bg-[#161622] rounded-xl px-4 py-3 border border-white/[0.08]">
            <div className="text-2xl font-bold text-white">{completedCount}/{dailyQuests.length}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </div>

        {/* Quests Grid */}
        <div className="space-y-3 mb-8">
          {dailyQuests.map((quest) => {
            const progressPercent = (quest.progress / quest.target) * 100

            return (
              <div
                key={quest.id}
                className={`bg-[#161622] rounded-xl p-5 border border-white/[0.08] ${
                  quest.completed ? 'border-emerald-500/30' : ''
                } transition-all hover:bg-[#1a1a2e]`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1a1a2e] rounded-xl flex items-center justify-center border border-white/[0.06]">
                      <span className="text-2xl">{quest.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{quest.title}</h3>
                      <p className="text-sm text-gray-500">{quest.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    {quest.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-600" />
                    )}
                    <div className="flex items-center gap-1 text-amber-400 text-sm font-semibold">
                      <Zap className="w-3.5 h-3.5" />
                      +{quest.xp} XP
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Progress</span>
                    <span className="font-medium text-gray-400">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        quest.completed ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {!quest.completed && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => startQuestGame(quest.id)}
                      className="flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Start playing
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* All Complete Banner */}
        {completedCount === dailyQuests.length && (
          <div className="bg-[#161622] border border-emerald-500/20 rounded-xl p-6 text-center mb-6">
            <div className="w-14 h-14 bg-[#1a1a2e] rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/[0.06]">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">All quests completed!</h3>
            <p className="text-emerald-400 text-sm font-medium">+100 XP Bonus</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-4 bg-[#161622] rounded-xl text-center text-sm text-gray-500 border border-white/[0.08]">
          <p className="mb-1">
            XP earned today: <span className="font-semibold text-amber-400">{totalXp}</span>
            {completedCount === dailyQuests.length && <span className="text-amber-400"> (+100 bonus)</span>}
          </p>
          <p className="text-xs text-gray-600">New quests tomorrow at 06:00</p>
        </div>
      </div>
    </div>
  )
}
