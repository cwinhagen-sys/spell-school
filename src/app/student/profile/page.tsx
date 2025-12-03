'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { levelForXp } from '@/lib/leveling'
import { titleForLevel } from '@/lib/wizardTitles'
import { Star, User, Award, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function WizardProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [wizardTitle, setWizardTitle] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }
        setUser(user)

        const { data: globalProgress } = await supabase
          .from('student_progress')
          .select('total_points')
          .eq('student_id', user.id)
          .is('word_set_id', null)
          .is('homework_id', null)
          .limit(1)
          .maybeSingle()

        if (globalProgress?.total_points) {
          setPoints(globalProgress.total_points)
        } else {
          const { data } = await supabase
            .from('student_progress')
            .select('total_points')
            .eq('student_id', user.id)

          if (data) {
            const total = data.reduce((sum, r) => sum + (r.total_points || 0), 0)
            setPoints(total)
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (points > 0) {
      const leveling = levelForXp(points)
      setWizardTitle(titleForLevel(leveling.level))
    }
  }, [points])

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar profil...</p>
        </div>
      </div>
    )
  }

  const leveling = levelForXp(points)

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur opacity-30" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Trollkarlsprofil</h1>
            <p className="text-gray-400">Din magiska resa</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-violet-500/50 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center overflow-hidden">
                  {wizardTitle?.image ? (
                    <img src={wizardTitle.image} alt={wizardTitle.title} className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-16 h-16 text-violet-400" />
                  )}
                </div>
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-xl -z-10" />
              </div>
              <h2 className="text-2xl font-bold text-white">{wizardTitle?.title || 'Lärling'}</h2>
              <p className="text-gray-400 mt-2">{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Elev'}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  Level
                </span>
                <span className="text-3xl font-bold text-violet-400">{leveling.level}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Total XP
                </span>
                <span className="text-2xl font-bold text-amber-400">{points.toLocaleString()}</span>
              </div>
            </div>

            {/* XP Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Framsteg till Level {leveling.level + 1}</span>
                <span className="text-gray-300">{Math.round(leveling.progressToNext * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${leveling.progressToNext * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Wizard Titles Preview */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Tillgängliga titlar
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 10, title: 'Gnistans lärling', image: '/assets/wizard/wizard_torch.png' },
                { level: 20, title: 'Eldväktare', image: '/assets/wizard/wizard_orbs.png' },
                { level: 30, title: 'Runadept', image: '/assets/wizard/wizard_book.png' },
                { level: 40, title: 'Arkanist', image: '/assets/wizard/wizard_pentagram.png' },
                { level: 50, title: 'Trollkarlskrigare', image: '/assets/wizard/wizard_sword.png' },
                { level: 60, title: 'Sigilmästare', image: '/assets/wizard/wizard_staff.png' },
              ].map((wizard) => {
                const unlocked = leveling.level >= wizard.level
                return (
                  <div
                    key={wizard.level}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      unlocked
                        ? 'border-violet-500/30 bg-violet-500/10'
                        : 'border-white/5 bg-white/5 opacity-40'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden bg-white/5">
                      {wizard.image && unlocked ? (
                        <img src={wizard.image} alt={wizard.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Star className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-gray-300">{wizard.title}</div>
                    <div className="text-xs text-gray-500">Lv.{wizard.level}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/student/levels"
                className="text-sm text-violet-400 hover:text-violet-300 font-medium"
              >
                Visa alla titlar →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
