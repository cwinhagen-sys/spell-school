'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, CheckCircle2, Circle } from 'lucide-react'
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

  // Map quest ID to game type
  const getGameTypeForQuest = (questId: string): string | null => {
    const questToGameMap: { [key: string]: string } = {
      'play_3_games': 'flashcards', // Any game - default to flashcards
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
      'multi_game_4': 'flashcards', // Any game - default to flashcards
      'perfect_score_1': 'flashcards', // Any game - default to flashcards
      'perfect_3': 'flashcards', // Any game - default to flashcards
      'marathon_10': 'flashcards', // Any game - default to flashcards
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

    // Use first assignment
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

        // Load assignments
        const { data: classLinks } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id)

        const classIds = (classLinks || []).map((r: any) => r.class_id)

        // Load assignments
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

        // Generate or load daily quests
        const now = new Date()
        const today = now.toDateString()
        const stored = localStorage.getItem(`dailyQuests_${today}_${user.id}`)

        if (stored) {
          const questData = JSON.parse(stored)
          setDailyQuests(questData.quests || questData)
        } else {
          // Generate new quests
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
              title: 'Memory Champion',
              description: 'Complete 2 Memory Games',
              target: 2,
              progress: 0,
              xp: 15,
              icon: '🧠',
              completed: false
            },
            {
              id: 'typing_1',
              title: 'Spelling Bee',
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
      <div className="container mx-auto px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  const completedCount = dailyQuests.filter(q => q.completed).length
  const totalXp = dailyQuests.reduce((sum, q) => sum + (q.completed ? q.xp : 0), 0)

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Daily Quests</h1>
            <p className="text-gray-600">Complete quests to earn XP and unlock achievements</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{completedCount}/{dailyQuests.length}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {dailyQuests.map((quest) => {
            const progressPercent = (quest.progress / quest.target) * 100
            const difficulty = quest.xp <= 15 ? 'easy' : quest.xp <= 50 ? 'medium' : 'hard'
            const difficultyColors = {
              easy: 'from-green-50 to-emerald-50 border-green-200 text-green-700',
              medium: 'from-yellow-50 to-orange-50 border-yellow-200 text-yellow-700',
              hard: 'from-red-50 to-pink-50 border-red-200 text-red-700'
            }

            return (
              <div
                key={quest.id}
                className={`bg-gradient-to-r ${difficultyColors[difficulty]} rounded-xl p-6 border-2 ${
                  quest.completed ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{quest.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{quest.title}</h3>
                      <p className="text-sm text-gray-600">{quest.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {quest.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                    <div className="text-lg font-bold text-gray-800 mt-1">+{quest.xp} XP</div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                    <span>Progress</span>
                    <span className="font-semibold">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        quest.completed
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : difficulty === 'easy'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : difficulty === 'medium'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-medium text-gray-600 capitalize">{difficulty}</span>
                  {!quest.completed && (
                    <button
                      onClick={() => startQuestGame(quest.id)}
                      className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      Start Playing →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {completedCount === dailyQuests.length && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="text-xl font-bold text-purple-800 mb-2">All Quests Complete!</h3>
            <p className="text-purple-600 font-semibold">+100 XP Bonus!</p>
            <p className="text-sm text-purple-700 mt-2">Congratulations! You've completed all daily quests.</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-white/60 rounded-lg text-center text-sm text-gray-600">
          <p>New quests available tomorrow at 6:00 AM</p>
          <p className="mt-1">Total XP earned today: <span className="font-bold text-purple-600">{totalXp}</span></p>
        </div>
      </div>
    </div>
  )
}
