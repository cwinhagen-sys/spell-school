'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GameCard from '@/components/GameCard'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Homework {
  id: string
  title: string
  color?: string
  due_date?: string
  words?: any[]
}

export default function GamesPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [oldWordSets, setOldWordSets] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [showHomeworkSelection, setShowHomeworkSelection] = useState(false)
  const [pendingGame, setPendingGame] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }

        // Load assignments using the same logic as dashboard
        const { data: classLinks } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id)

        const classIds = (classLinks || []).map((r: any) => r.class_id)

        // Assigned directly to the student
        const { data: direct } = await supabase
          .from('assigned_word_sets')
          .select('id, created_at, due_date, word_sets ( id, title, words, color )')
          .eq('student_id', user.id)

        // Assigned to any of the student's classes
        let byClass: any[] = []
        if (classIds.length > 0) {
          const { data: cls } = await supabase
            .from('assigned_word_sets')
            .select('id, created_at, due_date, word_sets ( id, title, words, color )')
            .in('class_id', classIds)
            .is('student_id', null)
          byClass = (cls as any[]) || []
        }

        const combined = [...(direct as any[] || []), ...byClass].filter(r => r.word_sets)
        
        // Unique by word set id
        const byWordSetId = new Map<string, any>()
        for (const rec of combined) {
          const wsid = rec.word_sets?.id
          if (!wsid) continue
          const existing = byWordSetId.get(wsid)
          if (!existing) {
            byWordSetId.set(wsid, rec)
          } else {
            const a = rec.due_date ? new Date(rec.due_date).getTime() : Infinity
            const b = existing.due_date ? new Date(existing.due_date).getTime() : Infinity
            if (a < b) byWordSetId.set(wsid, rec)
          }
        }
        const unique = Array.from(byWordSetId.values())

        // Map to Homework shape
        const mapped: Homework[] = unique.map((rec: any) => ({
          id: rec.word_sets.id,
          title: rec.word_sets.title,
          color: rec.word_sets.color,
          due_date: rec.due_date ? new Date(rec.due_date).toISOString() : undefined,
          words: rec.word_sets.words || []
        }))

        // Separate into active and old
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        const active = mapped.filter(h => !h.due_date || new Date(h.due_date) >= today)
        const old = mapped.filter(h => h.due_date && new Date(h.due_date) < today)

        setHomeworks(active)
        setOldWordSets(old)
      } catch (error) {
        console.error('Error loading games:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleGameClick = (gameType: string) => {
    if (homeworks.length === 0 && oldWordSets.length === 0) {
      alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
      return
    }
    if (homeworks.length === 1 && oldWordSets.length === 0) {
      setSelectedHomework(homeworks[0])
      // Navigate to game (simplified - would need game modals)
      window.location.href = `/student?game=${gameType}&homework=${homeworks[0].id}`
    } else {
      setPendingGame(gameType)
      setShowHomeworkSelection(true)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Games</h1>
          <p className="text-gray-600">Practice vocabulary with engaging games</p>
        </div>

        {homeworks.length === 0 && oldWordSets.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">No assignments available</p>
            <p className="text-gray-400 text-sm">Please wait for your teacher to assign vocabulary sets.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <GameCard
                title="Flashcards"
                color="blue"
                icon={<span className="text-3xl">🃏</span>}
                onClick={() => handleGameClick('flashcards')}
              />
              <GameCard
                title="Multiple Choice"
                color="green"
                icon={<span className="text-3xl">✅</span>}
                onClick={() => handleGameClick('choice')}
              />
              <GameCard
                title="Memory Game"
                color="orange"
                icon={<span className="text-3xl">🧠</span>}
                onClick={() => handleGameClick('match')}
              />
              <GameCard
                title="Matching Pairs"
                color="purple"
                icon={<span className="text-3xl">🔗</span>}
                onClick={() => handleGameClick('connect')}
              />
              <GameCard
                title="Typing Challenge"
                color="pink"
                icon={<span className="text-3xl">⌨️</span>}
                onClick={() => handleGameClick('typing')}
              />
              <GameCard
                title="Translate"
                color="teal"
                icon={<span className="text-3xl">🌐</span>}
                onClick={() => handleGameClick('translate')}
              />
              <GameCard
                title="Sentence Gap"
                color="indigo"
                icon={<span className="text-3xl">📝</span>}
                onClick={() => handleGameClick('storygap')}
              />
              <GameCard
                title="Word Roulette"
                color="red"
                icon={<span className="text-3xl">🎰</span>}
                onClick={() => handleGameClick('roulette')}
              />
            </div>

            <div className="bg-white/60 rounded-lg p-4 text-center text-sm text-gray-600">
              <p>Select a game above to start playing with your assigned vocabulary sets.</p>
              <Link href="/student/word-sets" className="text-purple-600 hover:text-purple-700 font-medium ml-1">
                View assignments →
              </Link>
            </div>
          </>
        )}

        {showHomeworkSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Select Assignment</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {homeworks.map((hw) => (
                  <button
                    key={hw.id}
                    onClick={() => {
                      setSelectedHomework(hw)
                      setShowHomeworkSelection(false)
                      window.location.href = `/student?game=${pendingGame}&homework=${hw.id}`
                    }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: hw.color || '#6b7280' }} />
                      <span className="font-medium text-gray-800">{hw.title}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowHomeworkSelection(false)
                  setPendingGame(null)
                }}
                className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

