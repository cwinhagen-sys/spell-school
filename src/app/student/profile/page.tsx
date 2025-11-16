'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { levelForXp } from '@/lib/leveling'
import { titleForLevel } from '@/lib/wizardTitles'
import { Star, User, Award } from 'lucide-react'

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

        // Load XP
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
      <div className="container mx-auto px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  const leveling = levelForXp(points)

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Wizard Profile</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-purple-300 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden mb-4">
                {wizardTitle?.image ? (
                  <img src={wizardTitle.image} alt={wizardTitle.title} className="w-full h-full object-cover" />
                ) : (
                  <Star className="w-16 h-16 text-purple-500" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{wizardTitle?.title || 'Novice Learner'}</h2>
              <p className="text-gray-600 mt-2">{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Student'}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-700 font-medium">Level</span>
                <span className="text-2xl font-bold text-purple-600">{leveling.level}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="text-gray-700 font-medium">Total XP</span>
                <span className="text-xl font-bold text-indigo-600">{points.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Wizard Titles Preview */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Available Titles
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 10, title: 'Spark Initiate', image: '/assets/wizard/wizard_torch.png' },
                { level: 20, title: 'Apprentice of Embers', image: '/assets/wizard/wizard_orbs.png' },
                { level: 30, title: 'Rune Adept', image: '/assets/wizard/wizard_book.png' },
                { level: 40, title: 'Arcane Scholar', image: '/assets/wizard/wizard_pentagram.png' },
                { level: 50, title: 'Spellblade', image: '/assets/wizard/wizard_sword.png' },
                { level: 60, title: 'Master of Sigils', image: '/assets/wizard/wizard_staff.png' },
              ].map((wizard) => {
                const unlocked = leveling.level >= wizard.level
                return (
                  <div
                    key={wizard.level}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      unlocked
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full overflow-hidden bg-purple-100">
                      {wizard.image && unlocked ? (
                        <img src={wizard.image} alt={wizard.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Star className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-gray-700">{wizard.title}</div>
                    <div className="text-xs text-gray-500">Lv.{wizard.level}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 text-center">
              <a
                href="/student/levels"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View all titles →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


