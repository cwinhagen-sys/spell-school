'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, CheckCircle2, Circle, Zap, ArrowRight, Gem } from 'lucide-react'

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
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Daily Quests</h1>
              <p className="text-sm text-gray-500">Complete quests to earn Experience Points</p>
            </div>
          </div>
          <div className="text-right bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <div className="text-2xl font-bold text-white">{completedCount}/{dailyQuests.length}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </div>

        {/* Quests Grid */}
        <div className="space-y-3 mb-8">
          {dailyQuests.map((quest) => {
            const progressPercent = (quest.progress / quest.target) * 100

            // Map quest ID to badge background image
            const getQuestBackgroundImage = (questId: string): string | null => {
              const backgroundMap: { [key: string]: string } = {
                'play_3_games': 'word_warrior.png',
                'memory_2': 'memory_champion.png',
                'typing_1': 'spelling_bee.png',
                'choice_3_perfect': 'choice_master.png',
                'sentence_gap_perfect': 'gap_filler.png',
                'spell_slinger_100': 'spell_slinger_novice.png',
                'sentence_gap_2': 'sentence_builder.png',
                'roulette_3': 'roulette_master.png',
                'multi_game_4': 'multi_game_player.png',
                'perfect_score_1': 'perfect_score.png',
                'spell_slinger_1200': 'spell_slinger_expert.png',
                'sentence_gap_5': 'grammar_guru.png',
                'roulette_5': 'roulette_legend.png',
                'marathon_10': 'marathon_runner.png',
                'perfect_3': 'perfectionist.png',
                'quiz_perfect': 'quiz_god.png',
                'typing_speed': 'speed_god.png',
                'roulette_perfect_5_words': 'sentence_starter.png',
                'roulette_perfect_10_words': 'sentence_expert.png',
                'roulette_perfect_20_words': 'sentence_master.png',
                'scenario_breakfast_2_stars': 'breakfast_chef.png',
                'scenario_breakfast_3_stars': 'master_chef.png'
              }
              
              const filename = backgroundMap[questId]
              return filename ? `/images/badges/backgrounds/${filename}` : null
            }

            const backgroundImage = getQuestBackgroundImage(quest.id)

            return (
              <div
                key={quest.id}
                className={`bg-white/5 rounded-xl p-5 border border-white/10 relative overflow-hidden ${
                  quest.completed ? 'border-emerald-500/30' : ''
                } transition-all hover:bg-white/10`}
              >
                {/* Background image */}
                {backgroundImage && (
                  <div 
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      quest.completed 
                        ? 'opacity-30' 
                        : 'opacity-20'
                    }`}
                    style={{
                      backgroundImage: `url(${backgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
                
                {/* Dark overlay for readability */}
                {backgroundImage && (
                  <div className={`absolute inset-0 transition-opacity duration-300 ${
                    quest.completed 
                      ? 'bg-gradient-to-br from-black/60 via-black/50 to-black/60' 
                      : 'bg-gradient-to-br from-black/70 via-black/60 to-black/70'
                  }`} />
                )}
                
                {/* Content */}
                <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
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
                    <div className="flex items-center gap-1 text-white text-sm font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <div className="flex items-center gap-1">
                        <Gem className="w-3.5 h-3.5 text-amber-400" />
                        +{quest.xp} XP
                      </div>
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
              </div>
              </div>
            )
          })}
        </div>

        {/* All Complete Banner */}
        {completedCount === dailyQuests.length && (
          <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-6 text-center mb-6">
            <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/10">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">All quests completed!</h3>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
              <Gem className="w-3.5 h-3.5" />
              +100 XP Bonus
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-4 bg-white/5 rounded-xl text-center text-sm text-gray-500 border border-white/10">
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
