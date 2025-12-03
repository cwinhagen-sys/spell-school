'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSubscriptionTier, getTierDisplayName, getTierPrice, TIER_LIMITS, type SubscriptionTier } from '@/lib/subscription'
import { Check, X, Crown, Zap, ArrowRight, ExternalLink, User, Users, BookOpen, Sparkles, Shield, TrendingUp, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

export default function TeacherAccountPage() {
  const [user, setUser] = useState<any>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  const [loading, setLoading] = useState(true)
  const [classCount, setClassCount] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [wordSetCount, setWordSetCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }

        setUser(user)

        // Get subscription tier
        const tier = await getUserSubscriptionTier(user.id)
        setSubscriptionTier(tier)

        // Get class count
        const { data: classes } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id)
          .is('deleted_at', null)

        setClassCount(classes?.length || 0)

        // Get total students count
        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id)
          const { data: classStudents } = await supabase
            .from('class_students')
            .select('student_id')
            .in('class_id', classIds)

          const uniqueStudents = new Set(classStudents?.map(cs => cs.student_id) || [])
          setTotalStudents(uniqueStudents.size)
        }

        // Get word sets count
        const { data: wordSets } = await supabase
          .from('word_sets')
          .select('id')
          .eq('teacher_id', user.id)

        setWordSetCount(wordSets?.length || 0)
      } catch (error) {
        console.error('Error loading account info:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const limits = TIER_LIMITS[subscriptionTier]
  const tierIcon = subscriptionTier === 'free' ? Shield : subscriptionTier === 'premium' ? Zap : Crown
  const TierIcon = tierIcon

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return 'from-gray-500 to-slate-600'
      case 'premium':
        return 'from-cyan-500 to-blue-600'
      case 'pro':
        return 'from-amber-500 to-orange-600'
    }
  }

  const getTierGlow = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return 'shadow-gray-500/20'
      case 'premium':
        return 'shadow-cyan-500/30'
      case 'pro':
        return 'shadow-amber-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar kontoinformation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mitt konto</h1>
            <p className="text-gray-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Aktuell plan</h2>
            <p className="text-gray-400">Din nuvarande prenumerationsplan</p>
          </div>
          <div className={`w-16 h-16 bg-gradient-to-br ${getTierColor(subscriptionTier)} rounded-2xl flex items-center justify-center shadow-lg ${getTierGlow(subscriptionTier)}`}>
            <TierIcon className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${getTierColor(subscriptionTier)} text-white font-bold text-lg shadow-lg ${getTierGlow(subscriptionTier)}`}>
            <TierIcon className="w-5 h-5" />
            {getTierDisplayName(subscriptionTier)}
          </div>
          {subscriptionTier !== 'free' && (
            <div className="text-gray-400">
              {getTierPrice(subscriptionTier, false)} SEK/månad
            </div>
          )}
        </div>

        {subscriptionTier === 'free' && (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-5 h-5" />
            Uppgradera plan
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Usage Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Klasser</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{classCount}</span>
            <span className="text-gray-500">
              / {limits.maxClasses === null ? '∞' : limits.maxClasses}
            </span>
          </div>
          {limits.maxClasses !== null && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                style={{ width: `${Math.min((classCount / limits.maxClasses) * 100, 100)}%` }}
              />
            </div>
          )}
          {limits.maxClasses !== null && classCount >= limits.maxClasses && (
            <p className="text-sm text-amber-400 font-medium mt-3">
              Maxgräns nådd för {getTierDisplayName(subscriptionTier)}-planen
            </p>
          )}
        </div>

        <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Elever</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{totalStudents}</span>
            <span className="text-gray-500 text-sm">
              {subscriptionTier === 'free' 
                ? ` / ${limits.maxTotalStudents}`
                : subscriptionTier === 'premium'
                ? ` / ${limits.maxStudentsPerClass} per klass`
                : ' / ∞'}
            </span>
          </div>
          {subscriptionTier === 'free' && limits.maxTotalStudents !== null && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all"
                style={{ width: `${Math.min((totalStudents / limits.maxTotalStudents) * 100, 100)}%` }}
              />
            </div>
          )}
          {subscriptionTier === 'free' && limits.maxTotalStudents !== null && totalStudents >= limits.maxTotalStudents && (
            <p className="text-sm text-amber-400 font-medium mt-3">
              Maxgräns nådd för Free-planen
            </p>
          )}
        </div>

        <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Ordlistor</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{wordSetCount}</span>
            <span className="text-gray-500">
              / {limits.maxWordSets === null ? '∞' : limits.maxWordSets}
            </span>
          </div>
          {limits.maxWordSets !== null && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all"
                style={{ width: `${Math.min((wordSetCount / limits.maxWordSets) * 100, 100)}%` }}
              />
            </div>
          )}
          {limits.maxWordSets !== null && wordSetCount >= limits.maxWordSets && (
            <p className="text-sm text-amber-400 font-medium mt-3">
              Maxgräns nådd för {getTierDisplayName(subscriptionTier)}-planen
            </p>
          )}
        </div>
      </div>

      {/* Features Card */}
      <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Funktioner i din plan</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              <span className="font-medium text-white">Session Mode</span>
            </div>
            {limits.hasSessionMode ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Inkluderad</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Ej tillgänglig</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-white">Progress-statistik</span>
            </div>
            {limits.hasProgressStats ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Inkluderad</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Ej tillgänglig</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-white">Quiz-statistik</span>
            </div>
            {limits.hasQuizStats ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Inkluderad</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Ej tillgänglig</span>
              </div>
            )}
          </div>
        </div>

        {subscriptionTier !== 'pro' && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              Visa alla planer och uppgradera
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
