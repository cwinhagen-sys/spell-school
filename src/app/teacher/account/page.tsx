'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserSubscriptionTier, getTierDisplayName, getTierPrice, TIER_LIMITS, getTestPilotInfo, getExceedingResources, type SubscriptionTier } from '@/lib/subscription'
import { Check, X, Crown, Zap, ArrowRight, ExternalLink, User, Users, BookOpen, Sparkles, Shield, TrendingUp, Gamepad2, AlertCircle, CreditCard, Settings, Key, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import DowngradeModal from '@/components/DowngradeModal'

interface UpgradeButtonProps {
  currentTier: SubscriptionTier
  targetTier: 'premium' | 'pro'
  onUpgrade: () => Promise<void>
  isDowngrade?: boolean
}

function UpgradeButton({ currentTier, targetTier, onUpgrade, isDowngrade = false }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [yearly, setYearly] = useState(false)

  // Get current price (assume monthly for comparison)
  const currentPriceMonthly = getTierPrice(currentTier, false)
  const currentPriceYearly = getTierPrice(currentTier, true)
  const targetPrice = getTierPrice(targetTier, yearly)
  const targetPriceMonthly = getTierPrice(targetTier, false)
  const targetPriceYearly = getTierPrice(targetTier, true)
  
  // Calculate price difference
  // If yearly, compare yearly prices. If monthly, compare monthly prices.
  const priceDifference = yearly 
    ? (targetPriceYearly - currentPriceYearly)
    : (targetPriceMonthly - currentPriceMonthly)
  
  // Determine if this is a downgrade based on tier hierarchy
  const tierOrder: SubscriptionTier[] = ['free', 'premium', 'pro']
  const currentTierIndex = tierOrder.indexOf(currentTier)
  const targetTierIndex = tierOrder.indexOf(targetTier)
  const isActuallyDowngrade = targetTierIndex < currentTierIndex

  // Prevent downgrading - users should contact support to downgrade
  if (isActuallyDowngrade || isDowngrade) {
    return (
      <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl">
        <p className="text-sm text-amber-300">
          <strong>Downgrade not allowed:</strong> You cannot downgrade to a lower plan directly. 
          Contact support if you want to cancel your subscription or change your plan.
        </p>
      </div>
    )
  }

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

    try {
      const action = 'upgrade'
      console.log(`🔄 Starting ${action} to`, targetTier)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      console.log('📤 Calling upgrade-subscription API...')
      const response = await fetch('/api/upgrade-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          targetTier,
          yearly: yearly
        }),
      })

      const data = await response.json()
      console.log('📥 Upgrade API response:', { ok: response.ok, data })

      if (!response.ok) {
        console.error('❌ Upgrade failed:', data)
        throw new Error(data.error || 'Failed to upgrade subscription')
      }

      // If we got a URL, redirect to Stripe Checkout
      if (data.url) {
        console.log('🔗 Redirecting to Stripe Checkout:', data.url)
        window.location.href = data.url
        return
      }

      // If upgrade/downgrade was successful directly (existing subscription updated)
      if (data.success) {
        const action = isDowngrade || isActuallyDowngrade ? 'nedgradering' : 'uppgradering'
        console.log(`✅ ${action} successful, refreshing tier...`)
        await onUpgrade()
        // Reload page to show updated tier
        window.location.reload()
      } else {
        console.warn('⚠️ Response missing success flag:', data)
        const action = isDowngrade || isActuallyDowngrade ? 'nedgraderingen' : 'uppgraderingen'
        setError(`${action.charAt(0).toUpperCase() + action.slice(1)} completed but could not be confirmed. Please refresh the page.`)
        setLoading(false)
      }
    } catch (err: any) {
      const action = isDowngrade || isActuallyDowngrade ? 'nedgradering' : 'uppgradering'
      console.error(`❌ ${action} error:`, err)
      setError(err.message || `Ett fel uppstod vid ${action}`)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={loading}
          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
            isActuallyDowngrade || isDowngrade
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20'
          }`}
        >
          {isActuallyDowngrade || isDowngrade ? (
            <>
              <ArrowRight className="w-5 h-5 rotate-180" />
              Downgrade to {getTierDisplayName(targetTier)}
            </>
          ) : (
            <>
              <Crown className="w-5 h-5" />
              Upgrade to {getTierDisplayName(targetTier)}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {isActuallyDowngrade || isDowngrade ? 'Confirm downgrade' : 'Confirm upgrade'}
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/[0.12]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Nuvarande plan:</span>
                  <span className="text-white font-semibold">{getTierDisplayName(currentTier)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Pris:</span>
                  <span className="text-white">{currentPriceMonthly} SEK/month</span>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-gray-500 rotate-90" />
              </div>

              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Ny plan:</span>
                  <span className="text-amber-400 font-bold">{getTierDisplayName(targetTier)}</span>
                </div>
                
                {/* Billing Period Toggle */}
                <div className="mb-3 p-3 bg-white/5 rounded-lg border border-white/[0.12]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Billing period:</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setYearly(false)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        !yearly
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setYearly(true)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        yearly
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-300">Pris:</span>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold">
                      {yearly ? `${targetPrice} SEK/year` : `${targetPrice} SEK/month`}
                    </span>
                    {yearly && (
                      <div className="text-xs text-gray-400 mt-1">
                        ({Math.round(targetPrice / 12)} SEK/month)
                      </div>
                    )}
                  </div>
                </div>
                {priceDifference !== 0 && (
                  <div className="pt-3 border-t border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {priceDifference > 0 ? 'Extra cost:' : 'Credit/refund:'}
                      </span>
                      <span className={`text-sm font-semibold ${priceDifference > 0 ? 'text-amber-300' : 'text-gray-300'}`}>
                        {priceDifference > 0 ? '+' : ''}{priceDifference} SEK/{yearly ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/[0.12]">
                <p className="text-sm text-gray-300">
                  <strong>Pro-rata payment:</strong> Stripe automatically calculates the amount based on the remaining time in your billing period. 
                  {priceDifference > 0 
                    ? ' You will be charged immediately for the difference.'
                    : ' You will receive credit for remaining time applied to your next invoice.'
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmDialog(false)
                  await handleUpgrade()
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    {isActuallyDowngrade || isDowngrade ? 'Confirm downgrade' : 'Confirm upgrade'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TeacherAccountPageContent() {
  const [user, setUser] = useState<any>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  const [loading, setLoading] = useState(true)
  const [classCount, setClassCount] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [wordSetCount, setWordSetCount] = useState(0)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [testpilotCode, setTestpilotCode] = useState('')
  const [showTestpilotInput, setShowTestpilotInput] = useState(false)
  const [testpilotLoading, setTestpilotLoading] = useState(false)
  const [testpilotMessage, setTestpilotMessage] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [testPilotInfo, setTestPilotInfo] = useState<{ isTestPilot: boolean; expiresAt: Date | null; usedAt: Date | null } | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [exceedingResources, setExceedingResources] = useState<{
    classes: Array<{ id: string; name: string; studentCount: number }>
    wordSets: Array<{ id: string; title: string }>
    totalStudents: number
  } | null>(null)
  const [checkingResources, setCheckingResources] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success parameter from Stripe checkout
    const success = searchParams?.get('success')
    if (success === 'true') {
      setShowSuccessMessage(true)
      // Remove success parameter from URL
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('success')
        url.searchParams.delete('session_id')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [searchParams])

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
        
        // If we just came from Stripe checkout, poll for tier update
        // Webhooks can take a few seconds to process
        if (searchParams?.get('success') === 'true') {
          console.log('🔄 Payment successful, polling for tier update...')
          console.log('📊 Initial tier:', tier)
          
          // Poll every 2 seconds for up to 30 seconds
          let attempts = 0
          const maxAttempts = 15
          let initialTier = tier
          
          const pollInterval = setInterval(async () => {
            attempts++
            console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`)
            
            const updatedTier = await getUserSubscriptionTier(user.id)
            console.log(`📊 Current tier: ${updatedTier}, initial: ${initialTier}`)
            
            if (updatedTier !== initialTier && updatedTier !== 'free') {
              console.log(`✅ Tier updated to ${updatedTier}!`)
              setSubscriptionTier(updatedTier)
              clearInterval(pollInterval)
              
              // Reload all data
              const { data: classes } = await supabase
                .from('classes')
                .select('id')
                .eq('teacher_id', user.id)
                .is('deleted_at', null)
              setClassCount(classes?.length || 0)
              
              if (classes && classes.length > 0) {
                const classIds = classes.map(c => c.id)
                const { data: classStudents } = await supabase
                  .from('class_students')
                  .select('student_id')
                  .in('class_id', classIds)
                const uniqueStudents = new Set(classStudents?.map(cs => cs.student_id) || [])
                setTotalStudents(uniqueStudents.size)
              }
              
              const { data: wordSets } = await supabase
                .from('word_sets')
                .select('id')
                .eq('teacher_id', user.id)
              setWordSetCount(wordSets?.length || 0)
            } else if (attempts >= maxAttempts) {
              console.log('⏱️ Polling timeout - tier may not have updated yet')
              console.log('💡 Check server logs and Stripe webhook forwarding')
              clearInterval(pollInterval)
            }
          }, 2000)
          
          // Cleanup on unmount
          return () => clearInterval(pollInterval)
        }

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

        // Get test pilot info if user has pro tier
        let testPilot: { isTestPilot: boolean; expiresAt: Date | null; usedAt: Date | null } | null = null
        if (tier === 'pro') {
          testPilot = await getTestPilotInfo(user.id)
          setTestPilotInfo(testPilot)
          
          // Check if test pilot is expired or expiring soon, and check exceeding resources
          if (testPilot.isTestPilot && testPilot.expiresAt) {
            const daysLeft = Math.ceil((testPilot.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            if (daysLeft <= 7) {
              // Check what resources exceed free tier limits
              setCheckingResources(true)
              try {
                const resources = await getExceedingResources(user.id)
                setExceedingResources(resources)
              } catch (error) {
                console.error('Error checking exceeding resources:', error)
              } finally {
                setCheckingResources(false)
              }
            }
          } else if (!testPilot.isTestPilot && tier === 'pro') {
            // Test pilot expired but still has pro tier (needs manual downgrade), check resources
            setCheckingResources(true)
            try {
              const resources = await getExceedingResources(user.id)
              setExceedingResources(resources)
            } catch (error) {
              console.error('Error checking exceeding resources:', error)
            } finally {
              setCheckingResources(false)
            }
          }
        }

        // Get subscription info if user has a paid tier (and not test pilot)
        if (tier !== 'free' && !testPilot?.isTestPilot) {
          setSubscriptionLoading(true)
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              const response = await fetch('/api/get-subscription-info', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              })
              if (response.ok) {
                const data = await response.json()
                setSubscriptionInfo(data.subscription)
                if (!data.subscription) {
                  console.log('⚠️ No Stripe subscription found for user (this is normal if you have test-pilot or manually set tier)')
                }
              } else {
                console.error('❌ Failed to fetch subscription info:', response.status, response.statusText)
              }
            }
          } catch (error) {
            console.error('Error loading subscription info:', error)
          } finally {
            setSubscriptionLoading(false)
          }
        }
      } catch (error) {
        console.error('Error loading account info:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchParams])

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
          <p className="text-gray-400">Loading account information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-white/5 border border-white/[0.12] rounded-xl flex items-center gap-3 animate-in slide-in-from-top">
          <div className="w-10 h-10 bg-white/5 border border-white/[0.12] rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Payment completed!</p>
            <p className="text-gray-300 text-sm">
              {subscriptionTier === 'free' 
                ? 'Waiting for the system to process payment... (this may take a few seconds)'
                : `Your subscription is now active! You have the ${getTierDisplayName(subscriptionTier)} plan.`}
            </p>
            {subscriptionTier === 'free' && (
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    const updatedTier = await getUserSubscriptionTier(user.id)
                    setSubscriptionTier(updatedTier)
                    if (updatedTier !== 'free') {
                      // Reload page data
                      window.location.reload()
                    }
                  }
                }}
                className="mt-2 text-sm text-amber-400 hover:text-amber-300 underline"
              >
                Update now
              </button>
            )}
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-[#161622] border border-white/[0.12] rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Account</h1>
            <p className="text-gray-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Current plan</h2>
            <p className="text-gray-400">Your current subscription plan</p>
          </div>
          <div className="w-16 h-16 bg-[#161622] border border-white/[0.12] rounded-2xl flex items-center justify-center">
            <TierIcon className={`w-8 h-8 ${subscriptionTier === 'free' ? 'text-gray-400' : subscriptionTier === 'premium' ? 'text-cyan-400' : 'text-amber-400'}`} />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/[0.12] text-white font-bold text-lg">
            <TierIcon className={`w-5 h-5 ${subscriptionTier === 'free' ? 'text-gray-400' : subscriptionTier === 'premium' ? 'text-cyan-400' : 'text-amber-400'}`} />
            {getTierDisplayName(subscriptionTier)}
          </div>
          {subscriptionTier !== 'free' && (
            <div className="text-gray-400">
              {subscriptionInfo?.price?.amount 
                ? `${subscriptionInfo.price.amount} SEK/${subscriptionInfo.billingPeriod === 'yearly' ? 'year' : 'month'}`
                : `${getTierPrice(subscriptionTier, false)} SEK/month`}
            </div>
          )}
        </div>

        {/* Test Pilot Information */}
        {testPilotInfo?.isTestPilot && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/[0.12]">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Test pilot period
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                You have the Pro plan as a test pilot for 1 month. This period will automatically convert to the Free plan when it ends.
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/[0.12]">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Downgrades to Free plan</p>
                  <p className="text-sm font-medium text-white">
                    {(() => {
                      // Use expiresAt if available, otherwise calculate from usedAt
                      let expiresAt = testPilotInfo.expiresAt
                      
                      if (!expiresAt) {
                        if (testPilotInfo.usedAt) {
                          // Calculate from usedAt (1 month from when code was used)
                          expiresAt = new Date(testPilotInfo.usedAt)
                          expiresAt.setMonth(expiresAt.getMonth() + 1)
                        } else {
                          // Should not happen, but fallback to null (will show error)
                          return 'Unknown'
                        }
                      }
                      
                      return expiresAt.toLocaleDateString('sv-SE', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    })()}
                  </p>
                </div>
              </div>
              {/* Warning if expiring soon or expired */}
              {(() => {
                if (!testPilotInfo) return null
                
                // Use expiresAt if available, otherwise calculate from usedAt
                let expiresAt = testPilotInfo.expiresAt
                
                if (!expiresAt) {
                  if (testPilotInfo.usedAt) {
                    // Calculate from usedAt (1 month from when code was used)
                    expiresAt = new Date(testPilotInfo.usedAt)
                    expiresAt.setMonth(expiresAt.getMonth() + 1)
                  } else {
                    // Should not happen if testPilotInfo.isTestPilot is true
                    // Skip warning if we don't have date info
                    return null
                  }
                }
                
                // Check if expired (if isTestPilot is false, it's expired)
                const isExpired = !testPilotInfo.isTestPilot
                const daysLeft = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                
                // Show warning if expiring within 7 days or already expired
                if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
                  return (
                    <div className="mt-4 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-200 mb-1">
                            Test pilot period expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                          </p>
                          {checkingResources ? (
                            <p className="text-sm text-amber-200/80">Checking resources...</p>
                          ) : exceedingResources && (exceedingResources.classes.length > (TIER_LIMITS.free.maxClasses || 0) || exceedingResources.wordSets.length > (TIER_LIMITS.free.maxWordSets || 0)) ? (
                            <>
                              <p className="text-sm text-amber-200/80 mb-2">
                                When the period expires, your account will be downgraded to the Free plan. You have more classes or word sets than the Free plan allows.
                              </p>
                              <button
                                onClick={() => setShowDowngradeModal(true)}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg transition-colors text-sm"
                              >
                                Choose what to keep
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                } else if ((daysLeft !== null && daysLeft <= 0) || isExpired) {
                  return (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-200 mb-1">
                            Test pilot period has expired
                          </p>
                          {checkingResources ? (
                            <p className="text-sm text-red-200/80">Checking resources...</p>
                          ) : exceedingResources && (exceedingResources.classes.length > (TIER_LIMITS.free.maxClasses ?? 0) || exceedingResources.wordSets.length > (TIER_LIMITS.free.maxWordSets ?? 0)) ? (
                            <>
                              <p className="text-sm text-red-200/80 mb-2">
                                Your account will be downgraded to the Free plan. You have more classes or word sets than the Free plan allows. Choose what to keep.
                              </p>
                              <button
                                onClick={() => setShowDowngradeModal(true)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg transition-colors text-sm"
                              >
                                Choose what to keep
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-red-200/80">
                              Your account will be automatically downgraded to the Free plan.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>
        )}

        {/* Subscription Status - only show for paid tiers (not test pilot) */}
        {subscriptionTier !== 'free' && subscriptionInfo && !testPilotInfo?.isTestPilot && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/[0.12]">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              Prenumerationsinformation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/[0.12]">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Next billing</p>
                  <p className="text-sm font-medium text-white">
                    {subscriptionInfo.currentPeriodEnd 
                      ? new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/[0.12]">
                      <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="text-sm font-medium text-white capitalize">
                    {subscriptionInfo.status === 'active' ? 'Aktiv' : 
                     subscriptionInfo.status === 'canceled' ? 'Avbruten' :
                     subscriptionInfo.status === 'past_due' ? 'Past due' :
                     subscriptionInfo.status === 'trialing' ? 'Testperiod' :
                     subscriptionInfo.status}
                    {subscriptionInfo.cancelAtPeriodEnd && (
                      <span className="ml-2 text-xs text-amber-400">(avslutas vid periodens slut)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/[0.12]">
                      <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Billing period</p>
                  <p className="text-sm font-medium text-white capitalize">
                    {subscriptionInfo.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
                  </p>
                </div>
              </div>
              {subscriptionInfo.currentPeriodStart && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/[0.12]">
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Prenumeration startade</p>
                    <p className="text-sm font-medium text-white">
                      {new Date(subscriptionInfo.currentPeriodStart).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {subscriptionTier !== 'free' && subscriptionLoading && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/[0.12]">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading subscription information...</span>
            </div>
          </div>
        )}

        {subscriptionTier === 'free' && (
          <div className="space-y-4">
            {/* Tier Selection for logged-in users */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Choose your plan</h3>
              
              {/* Billing Period Toggle */}
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/[0.12]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">Billing period:</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('monthly')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      billingPeriod === 'monthly'
                        ? 'bg-white/5 text-white border border-white/[0.12]'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('yearly')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      billingPeriod === 'yearly'
                        ? 'bg-white/5 text-white border border-white/[0.12]'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    Yearly
                    {billingPeriod === 'yearly' && (
                      <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        Save 20%
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Premium Tier */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/[0.12] hover:border-cyan-500/50 transition-all flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-6 h-6 text-gray-400" />
                    <h4 className="text-xl font-bold text-white">Premium</h4>
                  </div>
                  <div className="mb-4">
                    {billingPeriod === 'monthly' ? (
                      <>
                        <span className="text-3xl font-bold text-white">79</span>
                        <span className="text-gray-400 ml-1">SEK/month</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">758</span>
                        <span className="text-gray-400 ml-1">SEK/year</span>
                        <div className="text-xs text-gray-500 mt-1">
                          (63 SEK/month)
                        </div>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-gray-300 flex-grow">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      3 classes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      30 students per class
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      20 word lists
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      Session Mode
                    </li>
                  </ul>
                  <button
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) {
                          alert('You must be logged in')
                          return
                        }

                        const response = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({
                            tier: 'premium',
                            yearly: billingPeriod === 'yearly',
                          }),
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          throw new Error(data.error || 'Could not create checkout session')
                        }

                        if (data.url) {
                          window.location.href = data.url
                        }
                      } catch (error: any) {
                        console.error('Error creating checkout session:', error)
                        alert(error.message || 'Ett fel uppstod')
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 mt-auto"
                  >
                    Choose Premium
                  </button>
                </div>

                {/* Pro Tier */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/[0.12] hover:border-amber-500/50 transition-all relative flex flex-col">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-white/5 border border-white/[0.12] text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Popular
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <Crown className="w-6 h-6 text-amber-400" />
                    <h4 className="text-xl font-bold text-white">Pro</h4>
                  </div>
                  <div className="mb-4">
                    {billingPeriod === 'monthly' ? (
                      <>
                        <span className="text-3xl font-bold text-white">129</span>
                        <span className="text-gray-400 ml-1">SEK/month</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">1238</span>
                        <span className="text-gray-400 ml-1">SEK/year</span>
                        <div className="text-xs text-gray-500 mt-1">
                          (103 SEK/month)
                        </div>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-4 text-sm text-gray-300 flex-grow">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      Unlimited classes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      Unlimited students
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      Unlimited word lists
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      Session Mode
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gray-400" />
                      Progress & Quiz Statistics
                    </li>
                  </ul>
                  <button
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) {
                          alert('You must be logged in')
                          return
                        }

                        const response = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({
                            tier: 'pro',
                            yearly: billingPeriod === 'yearly',
                          }),
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          throw new Error(data.error || 'Could not create checkout session')
                        }

                        if (data.url) {
                          window.location.href = data.url
                        }
                      } catch (error: any) {
                        console.error('Error creating checkout session:', error)
                        alert(error.message || 'Ett fel uppstod')
                      }
                    }}
                    className="w-full px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 mt-auto text-sm sm:text-base"
                  >
                    Choose Pro
                  </button>
                </div>
              </div>
            </div>
            
            {/* Testpilot Code Input */}
            <div className="pt-4 border-t border-white/[0.12]">
              <button
                onClick={() => setShowTestpilotInput(!showTestpilotInput)}
                className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Do you have a test pilot code?
              </button>
              
              {showTestpilotInput && (
                <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/[0.12] space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Enter test pilot code
                    </label>
                    <input
                      type="text"
                      value={testpilotCode}
                      onChange={(e) => setTestpilotCode(e.target.value.toUpperCase())}
                      placeholder="Enter your code here"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/[0.12] rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all"
                      disabled={testpilotLoading}
                    />
                  </div>
                  
                  {testpilotMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      testpilotMessage.includes('✅') || testpilotMessage.includes('activated')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {testpilotMessage}
                    </div>
                  )}
                  
                  <button
                    onClick={async () => {
                      if (!testpilotCode.trim()) {
                        setTestpilotMessage('❌ Enter a code')
                        return
                      }
                      
                      setTestpilotLoading(true)
                      setTestpilotMessage('')
                      
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) {
                          throw new Error('You must be logged in')
                        }
                        
                        const response = await fetch('/api/redeem-testpilot-code', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ code: testpilotCode.trim() }),
                        })
                        
                        const data = await response.json()
                        
                        if (!response.ok) {
                          throw new Error(data.error || 'Could not activate code')
                        }
                        
                        setTestpilotMessage('✅ Pro plan has been activated!')
                        setTestpilotCode('')
                        
                        // Reload to show updated tier
                        setTimeout(() => {
                          window.location.reload()
                        }, 1500)
                      } catch (error: any) {
                        setTestpilotMessage(`❌ ${error.message || 'An error occurred'}`)
                      } finally {
                        setTestpilotLoading(false)
                      }
                    }}
                    disabled={testpilotLoading || !testpilotCode.trim()}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {testpilotLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Activate Pro
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {subscriptionTier === 'premium' && (
          <UpgradeButton 
            currentTier="premium" 
            targetTier="pro"
            onUpgrade={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                const updatedTier = await getUserSubscriptionTier(user.id)
                setSubscriptionTier(updatedTier)
              }
            }}
          />
        )}

        {/* Customer Portal Button - for managing subscription (not available for test pilot) */}
        {subscriptionTier !== 'free' && !testPilotInfo?.isTestPilot && (
          <div className="mt-6 pt-6 border-t border-white/[0.12]">
            <button
              onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    alert('You must be logged in to manage your subscription.')
                    return
                  }

                  const response = await fetch('/api/create-portal-session', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                  })

                  const data = await response.json()

                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to create portal session')
                  }

                  if (data.url) {
                    // Use location.href for mobile compatibility instead of window.open
                    window.location.href = data.url
                  }
                } catch (error: any) {
                  console.error('Error opening customer portal:', error)
                  alert(error.message || 'An error occurred while opening the customer portal.')
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/[0.12] text-white rounded-xl font-medium transition-all hover:border-white/[0.20]"
            >
              <Settings className="w-5 h-5" />
              Hantera prenumeration
              <ExternalLink className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Update payment method, view invoices, cancel subscription and more
            </p>
          </div>
        )}

      </div>

      {/* Usage Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/5 border border-white/[0.12] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Classes</h3>
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
              Limit reached for {getTierDisplayName(subscriptionTier)} plan
            </p>
          )}
        </div>

        <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/5 border border-white/[0.12] rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Students</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{totalStudents}</span>
            <span className="text-gray-500 text-sm">
              {subscriptionTier === 'free' 
                ? ` / ${limits.maxTotalStudents}`
                : subscriptionTier === 'premium'
                ? ` / ${limits.maxStudentsPerClass} per class`
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
              Limit reached for Free plan
            </p>
          )}
        </div>

        <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/5 border border-white/[0.12] rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Word lists</h3>
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
              Limit reached for {getTierDisplayName(subscriptionTier)} plan
            </p>
          )}
        </div>
      </div>

      {/* Features Card */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/5 border border-white/[0.12] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Features in your plan</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/[0.12]">
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              <span className="font-medium text-white">Session Mode</span>
            </div>
            {limits.hasSessionMode ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Included</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Not available</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/[0.12]">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-white">Progress Statistics</span>
            </div>
            {limits.hasProgressStats ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Included</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Not available</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/[0.12]">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-white">Quiz Statistics</span>
            </div>
            {limits.hasQuizStats ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Included</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Not available</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Downgrade Modal */}
      {exceedingResources && (
        <DowngradeModal
          isOpen={showDowngradeModal}
          onClose={() => setShowDowngradeModal(false)}
          onConfirm={async (classesToKeep, wordSetsToKeep) => {
            const response = await fetch('/api/downgrade-to-free', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                classesToKeep,
                wordSetsToKeep,
              }),
            })

            if (!response.ok) {
              const data = await response.json()
              throw new Error(data.error || 'Failed to downgrade')
            }

            // Reload page to reflect changes
            window.location.reload()
          }}
          classes={exceedingResources.classes}
          wordSets={exceedingResources.wordSets}
          totalStudents={exceedingResources.totalStudents}
        />
      )}
    </div>
  )
}

export default function TeacherAccountPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading account information...</p>
        </div>
      </div>
    }>
      <TeacherAccountPageContent />
    </Suspense>
  )
}
