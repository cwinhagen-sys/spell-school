'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { levelForXp, cumulativeXp, deltaXp } from '@/lib/leveling'
import { TITLE_STEPS, titleForLevel } from '@/lib/wizardTitles'
import Link from 'next/link'
import LogoutHandler from '@/components/LogoutHandler'
import { TrendingUp, ArrowLeft, Star, Crown, Lock, Gem } from 'lucide-react'

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
        setMessage(`Could not load AP${e?.message ? `: ${e.message}` : ''}`)
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
    <>
      <LogoutHandler />
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl blur opacity-30" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Level & Arcane Points</h1>
                <p className="text-gray-400">Track your progress</p>
              </div>
            </div>
            <Link 
              href="/student" 
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          {/* Level bar */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-xl mb-8">
            {loading ? (
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Current Level</div>
                  <div className="text-6xl font-bold text-white mb-2">{lev.level}</div>
                  <div className="flex items-center justify-center gap-2 text-lg text-amber-400">
                    <Gem className="w-5 h-5" />
                    {points.toLocaleString()} Total AP
                  </div>
                </div>
                {lev.level < 100 && (
                  <>
                    <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-4 transition-all duration-500 rounded-full" 
                        style={{ width: `${pct * 100}%` }} 
                      />
                    </div>
                    <div className="text-center text-gray-400">
                      <span className="text-amber-400 font-semibold">{Math.max(0, deltaXp(lev.level + 1) - xpIntoLevel)}</span> AP left to Level {lev.level + 1}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Current and Next Titles */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-xl">
              <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Current Title
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentTitle.image || '/assets/wizard/wizard_novice.png'} alt={currentTitle.title || 'Current'} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-xl -z-10" />
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Level {lev.level}</div>
                  <div className="text-2xl font-bold text-white">{currentTitle.title || 'Apprentice'}</div>
                  {currentTitle.description && <div className="text-sm text-gray-400 mt-2 max-w-sm">{currentTitle.description}</div>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-xl">
              <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Next Title
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={(nextMilestone?.image) || '/assets/wizard/wizard_novice.png'} 
                      alt={(nextMilestone?.title) || 'Next'} 
                      className={`w-full h-full object-cover ${!nextMilestone ? '' : 'opacity-60'}`}
                    />
                    {nextMilestone && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Lock className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {nextMilestone ? (
                    <>
                      <div className="text-sm text-gray-400 mb-1">Unlocks at Level {nextMilestone.at}</div>
                      <div className="text-2xl font-bold text-white">{nextMilestone.title}</div>
                      {nextMilestone.description && <div className="text-sm text-gray-400 mt-2 max-w-sm">{nextMilestone.description}</div>}
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-400 mb-1">All titles unlocked</div>
                      <div className="text-2xl font-bold text-emerald-400">Max Level! 🎉</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All Titles */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-white">All Wizard Titles</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {TITLE_STEPS.map((step) => {
                const unlocked = lev.level >= step.at
                return (
                  <div
                    key={step.at}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      unlocked
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-white/5 bg-white/5 opacity-40'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden bg-white/5">
                      {step.image ? (
                        <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Star className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white">{step.title}</div>
                    <div className="text-xs text-gray-500 mt-1">Level {step.at}</div>
                    {unlocked && (
                      <div className="mt-2 text-xs text-emerald-400 font-medium">✓ Unlocked</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {message && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400">{message}</div>
          )}
        </div>
      </div>
    </>
  )
}
