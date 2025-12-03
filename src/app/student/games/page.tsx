'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GameCard from '@/components/GameCard'
import { BookOpen, Gamepad2, X } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

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
      alert('Inga ordlistor tilldelade ännu. Be din lärare tilldela ordlistor.')
      return
    }
    if (homeworks.length === 1 && oldWordSets.length === 0) {
      setSelectedHomework(homeworks[0])
      window.location.href = `/student?game=${gameType}&homework=${homeworks[0].id}`
    } else {
      setPendingGame(gameType)
      setShowHomeworkSelection(true)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar spel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Gamepad2 className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Spel</h1>
              <p className="text-gray-400">Träna ordförråd med engagerande spel</p>
            </div>
          </div>
        </div>

        {homeworks.length === 0 && oldWordSets.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <BookOpen className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg mb-2">Inga ordlistor tillgängliga</p>
            <p className="text-gray-500 text-sm">Vänta på att din lärare tilldelar ordlistor.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <GameCard
                title="Flashcards"
                color="cyan"
                icon={<span className="text-3xl">🃏</span>}
                onClick={() => handleGameClick('flashcards')}
              />
              <GameCard
                title="Flerval"
                color="emerald"
                icon={<span className="text-3xl">✅</span>}
                onClick={() => handleGameClick('choice')}
              />
              <GameCard
                title="Memory"
                color="orange"
                icon={<span className="text-3xl">🧠</span>}
                onClick={() => handleGameClick('match')}
              />
              <GameCard
                title="Para ihop"
                color="violet"
                icon={<span className="text-3xl">🔗</span>}
                onClick={() => handleGameClick('connect')}
              />
              <GameCard
                title="Skrivutmaning"
                color="pink"
                icon={<span className="text-3xl">⌨️</span>}
                onClick={() => handleGameClick('typing')}
              />
              <GameCard
                title="Översätt"
                color="teal"
                icon={<span className="text-3xl">🌐</span>}
                onClick={() => handleGameClick('translate')}
              />
              <GameCard
                title="Meningsluckor"
                color="indigo"
                icon={<span className="text-3xl">📝</span>}
                onClick={() => handleGameClick('storygap')}
              />
              <GameCard
                title="Ordkarusellen"
                color="rose"
                icon={<span className="text-3xl">🎰</span>}
                onClick={() => handleGameClick('roulette')}
              />
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 text-center text-sm text-gray-400 border border-white/10">
              <p>Välj ett spel ovan för att börja träna med dina tilldelade ordlistor.</p>
              <Link href="/student/word-sets" className="text-violet-400 hover:text-violet-300 font-medium ml-1">
                Visa ordlistor →
              </Link>
            </div>
          </>
        )}

        {/* Assignment Selection Modal */}
        <AnimatePresence>
          {showHomeworkSelection && (
            <motion.div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="relative w-full max-w-md"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-3xl blur-xl" />
                <div className="relative bg-[#12122a] border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Välj ordlista</h3>
                    <button
                      onClick={() => {
                        setShowHomeworkSelection(false)
                        setPendingGame(null)
                      }}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {homeworks.map((hw) => (
                      <button
                        key={hw.id}
                        onClick={() => {
                          setSelectedHomework(hw)
                          setShowHomeworkSelection(false)
                          window.location.href = `/student?game=${pendingGame}&homework=${hw.id}`
                        }}
                        className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: hw.color || '#a855f7' }} />
                          <span className="font-medium text-white group-hover:text-violet-400 transition-colors">{hw.title}</span>
                        </div>
                      </button>
                    ))}
                    {oldWordSets.length > 0 && (
                      <>
                        <div className="text-xs text-gray-500 pt-4 pb-2 border-t border-white/5 mt-4">Äldre ordlistor</div>
                        {oldWordSets.map((hw) => (
                          <button
                            key={hw.id}
                            onClick={() => {
                              setSelectedHomework(hw)
                              setShowHomeworkSelection(false)
                              window.location.href = `/student?game=${pendingGame}&homework=${hw.id}`
                            }}
                            className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all opacity-70"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: hw.color || '#6b7280' }} />
                              <span className="font-medium text-gray-400">{hw.title}</span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
