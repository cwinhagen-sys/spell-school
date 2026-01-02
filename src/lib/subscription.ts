/**
 * Subscription tier management and limits
 */

export type SubscriptionTier = 'free' | 'premium' | 'pro'

export interface SubscriptionLimits {
  maxClasses: number | null // null = unlimited
  maxStudentsPerClass: number | null // null = unlimited
  maxTotalStudents: number | null // null = unlimited (for free tier, this is total across all classes)
  maxWordSets: number | null // null = unlimited
  maxWordsPerWordSet: number | null // null = unlimited (for free tier, max words per word set)
  hasSessionMode: boolean
  hasProgressStats: boolean
  hasQuizStats: boolean
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxClasses: 1,
    maxStudentsPerClass: null, // Not applicable for free tier
    maxTotalStudents: 10, // Total across all classes
    maxWordSets: 1,
    maxWordsPerWordSet: 12, // Max words per word set for free tier
    hasSessionMode: false,
    hasProgressStats: false,
    hasQuizStats: false,
  },
  premium: {
    maxClasses: 3,
    maxStudentsPerClass: 30,
    maxTotalStudents: null, // Not applicable (limited by classes * students per class)
    maxWordSets: 20,
    maxWordsPerWordSet: null, // Unlimited
    hasSessionMode: true,
    hasProgressStats: false,
    hasQuizStats: false,
  },
  pro: {
    maxClasses: null, // Unlimited
    maxStudentsPerClass: null, // Unlimited
    maxTotalStudents: null, // Unlimited
    maxWordSets: null, // Unlimited
    maxWordsPerWordSet: null, // Unlimited
    hasSessionMode: true,
    hasProgressStats: true,
    hasQuizStats: true,
  },
}

/**
 * Get test pilot information for a user
 */
export async function getTestPilotInfo(userId: string, supabaseClient?: any): Promise<{ isTestPilot: boolean; expiresAt: Date | null; usedAt: Date | null }> {
  try {
    let supabase = supabaseClient
    if (!supabase) {
      const supabaseModule = await import('@/lib/supabase')
      supabase = supabaseModule.supabase
    }

    // Check if user has pro tier without stripe subscription (test pilot)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', userId)
      .single()

    if (!profile || profile.subscription_tier !== 'pro' || profile.stripe_subscription_id) {
      return { isTestPilot: false, expiresAt: null, usedAt: null }
    }

    // Get test pilot code usage date and expiration from testpilot_code_usage table
    // This table stores individual usage records per user, allowing multiple users per code
    const { data: codeUsage } = await supabase
      .from('testpilot_code_usage')
      .select('used_at, expires_at')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!codeUsage || !codeUsage.used_at) {
      // Fallback to old testpilot_codes table for backwards compatibility
      // (in case there's old data that hasn't been migrated yet)
      const { data: oldCodeUsage } = await supabase
        .from('testpilot_codes')
        .select('used_at, expires_at')
        .eq('used_by', userId)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!oldCodeUsage || !oldCodeUsage.used_at) {
        return { isTestPilot: true, expiresAt: null, usedAt: null }
      }

      const usedAt = new Date(oldCodeUsage.used_at)
      let expiresAt: Date
      if (oldCodeUsage.expires_at) {
        expiresAt = new Date(oldCodeUsage.expires_at)
      } else {
        expiresAt = new Date(usedAt)
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      if (expiresAt < new Date()) {
        return { isTestPilot: false, expiresAt, usedAt }
      }

      return { isTestPilot: true, expiresAt, usedAt }
    }

    const usedAt = new Date(codeUsage.used_at)
    const expiresAt = new Date(codeUsage.expires_at)

    // Check if expired (but don't update here - let getUserSubscriptionTier handle it)
    // Return expiresAt even if expired so UI can display the expiration date
    if (expiresAt < new Date()) {
      return { isTestPilot: false, expiresAt, usedAt }
    }

    return { isTestPilot: true, expiresAt, usedAt }
  } catch (error) {
    console.error('Error getting test pilot info:', error)
    return { isTestPilot: false, expiresAt: null, usedAt: null }
  }
}

/**
 * Get subscription tier for a user (defaults to 'free')
 * Automatically downgrades test pilot to free when expired
 */
export async function getUserSubscriptionTier(userId: string, supabaseClient?: any): Promise<SubscriptionTier> {
  try {
    // Use provided client (e.g., admin client) or default to regular client
    let supabase = supabaseClient
    if (!supabase) {
      const supabaseModule = await import('@/lib/supabase')
      supabase = supabaseModule.supabase
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.warn(`Warning: Could not fetch subscription_tier for user ${userId}, defaulting to 'free'. Error:`, error?.message)
      return 'free'
    }

    let tier = (data.subscription_tier as SubscriptionTier) || 'free'

    // Check if user is test pilot and if period has expired
    if (tier === 'pro' && !data.stripe_subscription_id) {
      const testPilotInfo = await getTestPilotInfo(userId, supabase)
      if (!testPilotInfo.isTestPilot) {
        // Test pilot expired, downgrade to free
        // Try to update (only works if we have admin client, otherwise will be handled by webhook/cron)
        try {
          await supabase
            .from('profiles')
            .update({ subscription_tier: 'free' })
            .eq('id', userId)
        } catch (error) {
          // If update fails (e.g., no admin rights), that's ok - will be handled elsewhere
          console.log('Could not auto-downgrade test pilot (may need admin client):', error)
        }
        tier = 'free'
      }
    }

    console.log(`User ${userId} subscription tier: ${tier}`)
    return tier
  } catch (error) {
    console.error('Error getting subscription tier:', error)
    return 'free'
  }
}

/**
 * Get subscription limits for a user
 */
export async function getUserSubscriptionLimits(userId: string, supabaseClient?: any): Promise<SubscriptionLimits> {
  const tier = await getUserSubscriptionTier(userId, supabaseClient)
  return TIER_LIMITS[tier]
}

/**
 * Check if user can create a new class
 */
export async function canCreateClass(userId: string, currentClassCount: number): Promise<boolean> {
  const limits = await getUserSubscriptionLimits(userId)
  
  if (limits.maxClasses === null) {
    return true // Unlimited
  }
  
  return currentClassCount < limits.maxClasses
}

/**
 * Check if user can create a new word set
 */
export async function canCreateWordSet(userId: string, currentWordSetCount: number, wordCount?: number): Promise<{ allowed: boolean; reason?: string; limitType?: 'wordSets' | 'wordCount' }> {
  const limits = await getUserSubscriptionLimits(userId)
  
  // Check word set count limit
  if (limits.maxWordSets !== null && currentWordSetCount >= limits.maxWordSets) {
    const tier = await getUserSubscriptionTier(userId)
    const tierName = getTierDisplayName(tier)
    return { 
      allowed: false, 
      reason: `${tierName}-planen tillåter max ${limits.maxWordSets} ordlistor. Uppgradera till ${tier === 'free' ? 'Premium' : 'Pro'} för fler ordlistor.`,
      limitType: 'wordSets'
    }
  }
  
  // Check word count per word set limit (if wordCount is provided)
  if (wordCount !== undefined && limits.maxWordsPerWordSet !== null && wordCount > limits.maxWordsPerWordSet) {
    const tier = await getUserSubscriptionTier(userId)
    const tierName = getTierDisplayName(tier)
    return { 
      allowed: false, 
      reason: `${tierName}-planen tillåter max ${limits.maxWordsPerWordSet} ord per ordlista. Uppgradera till ${tier === 'free' ? 'Premium' : 'Pro'} för fler ord.`,
      limitType: 'wordCount'
    }
  }
  
  return { allowed: true }
}

/**
 * Check if user can add students to a class
 */
export async function canAddStudentsToClass(
  userId: string,
  classId: string,
  currentStudentCount: number,
  supabaseClient?: any
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId, supabaseClient)
  const tier = await getUserSubscriptionTier(userId, supabaseClient)

  // For free tier, check total students across all classes
  if (tier === 'free') {
    // Use provided client (e.g., admin client) or default to regular client
    let supabase = supabaseClient
    if (!supabase) {
      const supabaseModule = await import('@/lib/supabase')
      supabase = supabaseModule.supabase
    }
    
    // Get all class IDs for this teacher
    const { data: teacherClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', userId)
      .is('deleted_at', null)

    if (!teacherClasses || teacherClasses.length === 0) {
      return { allowed: true }
    }

    const classIds = teacherClasses.map((c: any) => c.id)

    // Count total unique students across all classes (use same client)
    const { data: allClassStudents } = await supabase
      .from('class_students')
      .select('student_id')
      .in('class_id', classIds)
      .is('deleted_at', null)

    const totalStudents = new Set(allClassStudents?.map((cs: any) => cs.student_id) || []).size

    if (limits.maxTotalStudents !== null && totalStudents >= limits.maxTotalStudents) {
      const tierName = getTierDisplayName(tier)
      return { 
        allowed: false, 
        reason: `${tierName} plan allows max ${limits.maxTotalStudents} students per class.` 
      }
    }
  }

  // For premium tier, check students per class
  if (tier === 'premium' && limits.maxStudentsPerClass !== null) {
    if (currentStudentCount >= limits.maxStudentsPerClass) {
      const tierName = getTierDisplayName(tier)
      return { 
        allowed: false, 
        reason: `${tierName} plan allows max ${limits.maxStudentsPerClass} students per class.` 
      }
    }
  }

  return { allowed: true }
}

/**
 * Check if user has access to session mode
 */
export async function hasSessionModeAccess(userId: string): Promise<boolean> {
  const limits = await getUserSubscriptionLimits(userId)
  return limits.hasSessionMode
}

/**
 * Check if user has access to progress statistics
 */
export async function hasProgressStatsAccess(userId: string): Promise<boolean> {
  const limits = await getUserSubscriptionLimits(userId)
  return limits.hasProgressStats
}

/**
 * Check if user has access to quiz statistics
 */
export async function hasQuizStatsAccess(userId: string): Promise<boolean> {
  const limits = await getUserSubscriptionLimits(userId)
  return limits.hasQuizStats
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  }
  return names[tier]
}

/**
 * Get tier price
 */
export function getTierPrice(tier: SubscriptionTier, yearly: boolean = false): number {
  if (tier === 'free') return 0
  if (tier === 'premium') return yearly ? 299 : 29
  if (tier === 'pro') return yearly ? 499 : 49
  return 0
}

/**
 * Get classes and word sets that exceed free tier limits
 */
export async function getExceedingResources(userId: string, supabaseClient?: any): Promise<{
  classes: Array<{ id: string; name: string; studentCount: number }>
  wordSets: Array<{ id: string; title: string }>
  totalStudents: number
}> {
  try {
    let supabase = supabaseClient
    if (!supabase) {
      const supabaseModule = await import('@/lib/supabase')
      supabase = supabaseModule.supabase
    }

    // Get all classes
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', userId)
      .is('deleted_at', null)

    // Get all word sets
    const { data: wordSets } = await supabase
      .from('word_sets')
      .select('id, title')
      .eq('teacher_id', userId)
      .is('deleted_at', null)

    // Get student counts per class
    const classIds = classes?.map((c: { id: string }) => c.id) || []
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('class_id, student_id')
      .in('class_id', classIds)
      .is('deleted_at', null)

    // Count students per class
    const studentCounts = new Map<string, number>()
    const allStudentIds = new Set<string>()
    
    classStudents?.forEach((cs: { class_id: string; student_id: string }) => {
      const count = studentCounts.get(cs.class_id) || 0
      studentCounts.set(cs.class_id, count + 1)
      allStudentIds.add(cs.student_id)
    })

    const classesWithCounts = (classes || []).map((c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
      studentCount: studentCounts.get(c.id) || 0
    }))

    // Return all classes and word sets (user needs to select which to keep)
    return {
      classes: classesWithCounts,
      wordSets: (wordSets || []).map((ws: { id: string; title: string }) => ({ id: ws.id, title: ws.title })),
      totalStudents: allStudentIds.size
    }
  } catch (error) {
    console.error('Error getting exceeding resources:', error)
    return { classes: [], wordSets: [], totalStudents: 0 }
  }
}

/**
 * Downgrade user to free tier and delete selected resources
 */
export async function downgradeToFreeWithSelection(
  userId: string,
  classesToKeep: string[],
  wordSetsToKeep: string[],
  supabaseClient?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    let supabase = supabaseClient
    if (!supabase) {
      const supabaseModule = await import('@/lib/supabase')
      supabase = supabaseModule.supabase
    }

    // Get all classes and word sets
    const { data: allClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', userId)
      .is('deleted_at', null)

    const { data: allWordSets } = await supabase
      .from('word_sets')
      .select('id')
      .eq('teacher_id', userId)
      .is('deleted_at', null)

    // Delete classes not in keep list
    const classesToDelete = (allClasses || [])
      .map((c: { id: string }) => c.id)
      .filter((id: string) => !classesToKeep.includes(id))

    if (classesToDelete.length > 0) {
      const { error: deleteClassesError } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', classesToDelete)

      if (deleteClassesError) {
        return { success: false, error: `Failed to delete classes: ${deleteClassesError.message}` }
      }
    }

    // Delete word sets not in keep list
    const wordSetsToDelete = (allWordSets || [])
      .map((ws: { id: string }) => ws.id)
      .filter((id: string) => !wordSetsToKeep.includes(id))

    if (wordSetsToDelete.length > 0) {
      const { error: deleteWordSetsError } = await supabase
        .from('word_sets')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', wordSetsToDelete)

      if (deleteWordSetsError) {
        return { success: false, error: `Failed to delete word sets: ${deleteWordSetsError.message}` }
      }
    }

    // Update subscription tier to free
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subscription_tier: 'free' })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: `Failed to update subscription: ${updateError.message}` }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Downgrade expired test pilot subscriptions to free
 * This function should be called with an admin Supabase client
 */
export async function downgradeExpiredTestPilots(supabaseAdmin: any): Promise<{ downgraded: number; errors: string[] }> {
  const errors: string[] = []
  let downgraded = 0

  try {
    // Get all users with pro tier and no stripe subscription (potential test pilots)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_tier, stripe_subscription_id')
      .eq('subscription_tier', 'pro')
      .is('stripe_subscription_id', null)

    if (profilesError) {
      errors.push(`Error fetching profiles: ${profilesError.message}`)
      return { downgraded: 0, errors }
    }

    if (!profiles || profiles.length === 0) {
      return { downgraded: 0, errors: [] }
    }

    // Check each profile to see if test pilot has expired
    for (const profile of profiles) {
      try {
        const testPilotInfo = await getTestPilotInfo(profile.id, supabaseAdmin)
        
        if (!testPilotInfo.isTestPilot) {
          // Test pilot has expired, check if user exceeds free tier limits
          const exceedingResources = await getExceedingResources(profile.id, supabaseAdmin)
          
          // Only auto-downgrade if user doesn't exceed limits
          // If they exceed limits, they need to manually choose what to keep
          if (exceedingResources.classes.length <= (TIER_LIMITS.free.maxClasses || 0) && 
              exceedingResources.wordSets.length <= (TIER_LIMITS.free.maxWordSets || 0) &&
              exceedingResources.totalStudents <= (TIER_LIMITS.free.maxTotalStudents || 0)) {
            // Safe to auto-downgrade
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({ subscription_tier: 'free' })
              .eq('id', profile.id)

            if (updateError) {
              errors.push(`Failed to downgrade user ${profile.id}: ${updateError.message}`)
            } else {
              downgraded++
              console.log(`✅ Downgraded expired test pilot user ${profile.id} to free (no exceeding resources)`)
            }
          } else {
            // User exceeds limits - don't auto-downgrade, let them choose manually
            console.log(`⚠️ User ${profile.id} has expired test pilot but exceeds free tier limits - manual downgrade required`)
            // Note: We could set a flag here, but for now we'll let getUserSubscriptionTier handle it
            // when the user logs in, they'll see the warning and can use the modal
          }
        }
      } catch (error: any) {
        errors.push(`Error processing user ${profile.id}: ${error.message}`)
      }
    }

    return { downgraded, errors }
  } catch (error: any) {
    errors.push(`Fatal error in downgradeExpiredTestPilots: ${error.message}`)
    return { downgraded, errors }
  }
}

