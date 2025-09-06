'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { levelForXp, cumulativeXp, deltaXp } from '@/lib/leveling'
import { TITLE_STEPS, titleForLevel } from '@/lib/wizardTitles'
import Link from 'next/link'

export default function LevelsPage() {
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/'; return }

        // Prefer the global progress record to avoid double-counting
        const { data: globalProgress, error: globalErr } = await supabase
          .from('student_progress')
          .select('total_points')
          .eq('student_id', user.id)
          .is('word_set_id', null)
          .is('homework_id', null)
          .limit(1)
          .maybeSingle()

        if (globalErr) {
          console.log('Levels - global progress error:', globalErr)
        }

        if (globalProgress && typeof globalProgress.total_points === 'number') {
          setPoints(globalProgress.total_points)
        } else {
          // Fallback: sum all records (legacy data without a global row)
          const { data, error } = await supabase
            .from('student_progress')
            .select('total_points')
            .eq('student_id', user.id)

          if (error) throw error

          const rows = (data as Array<{ total_points: number }> | null) ?? []
          const total = rows.reduce((sum, r) => sum + (r.total_points || 0), 0)
          setPoints(total)
        }
      } catch (e: any) {
        setMessage(`Failed to load XP${e?.message ? `: ${e.message}` : ''}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const lev = useMemo(() => levelForXp(points), [points])
  const currentTitle = titleForLevel(lev.level)
  const nextMilestone = useMemo(() => TITLE_STEPS.find(s => s.at > lev.level), [lev.level])

  const currentCum = cumulativeXp(lev.level)
  const nextDelta = lev.level >= 100 ? 0 : deltaXp(lev.level + 1)
  const xpIntoLevel = Math.max(0, points - currentCum)
  const pct = lev.level >= 100 ? 1 : Math.max(0, Math.min(1, xpIntoLevel / nextDelta))

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-white/10 bg-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Level Progress</h1>
          <Link href="/student" className="text-blue-300 hover:underline">Back</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Level bar */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          {loading ? (
            <div className="text-gray-300">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Current Level</div>
                <div className="text-5xl font-bold text-white mb-1">{lev.level}</div>
                <div className="text-sm text-gray-300">{points} Total XP</div>
              </div>
              {lev.level < 100 && (
                <>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="text-center text-sm text-gray-400">
                    {Math.max(0, deltaXp(lev.level + 1) - xpIntoLevel)} XP to Level {lev.level + 1}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Current and Next Titles */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold mb-4">Current Title</h2>
            <div className="flex items-center gap-6">
              <div className="w-48 h-48 rounded-2xl overflow-hidden ring-2 ring-white/20 bg-white/10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentTitle.image || '/assets/wizard/wizard_novice.png'} alt={currentTitle.title || 'Current'} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-sm text-gray-300 mb-1">Level {lev.level}</div>
                <div className="text-2xl font-bold">{currentTitle.title || 'Novice Learner'}</div>
                {currentTitle.description && <div className="text-sm text-gray-300 mt-2 max-w-sm">{currentTitle.description}</div>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold mb-4">Next Title</h2>
            <div className="flex items-center gap-6">
              <div className="w-48 h-48 rounded-2xl overflow-hidden ring-2 ring-white/20 bg-white/10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(nextMilestone?.image) || '/assets/wizard/wizard_novice.png'} alt={(nextMilestone?.title) || 'Next'} className="w-full h-full object-cover" />
              </div>
              <div>
                {nextMilestone ? (
                  <>
                    <div className="text-sm text-gray-300 mb-1">Unlocks at Level {nextMilestone.at}</div>
                    <div className="text-2xl font-bold">{nextMilestone.title}</div>
                    {nextMilestone.description && <div className="text-sm text-gray-300 mt-2 max-w-sm">{nextMilestone.description}</div>}
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-300 mb-1">All titles unlocked</div>
                    <div className="text-2xl font-bold">Maxed Out</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3 rounded bg-white/10 border border-white/10 text-sm">{message}</div>
        )}
      </div>
    </div>
  )
}


