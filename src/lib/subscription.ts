/**
 * Subscription tier management and limits
 */

export type SubscriptionTier = 'free' | 'premium' | 'pro'

export interface SubscriptionLimits {
  maxClasses: number | null // null = unlimited
  maxStudentsPerClass: number | null // null = unlimited
  maxTotalStudents: number | null // null = unlimited (for free tier, this is total across all classes)
  maxWordSets: number | null // null = unlimited
  hasSessionMode: boolean
  hasProgressStats: boolean
  hasQuizStats: boolean
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxClasses: 1,
    maxStudentsPerClass: null, // Not applicable for free tier
    maxTotalStudents: 30, // Total across all classes
    maxWordSets: 5,
    hasSessionMode: false,
    hasProgressStats: false,
    hasQuizStats: false,
  },
  premium: {
    maxClasses: 3,
    maxStudentsPerClass: 30,
    maxTotalStudents: null, // Not applicable (limited by classes * students per class)
    maxWordSets: 20,
    hasSessionMode: true,
    hasProgressStats: false,
    hasQuizStats: false,
  },
  pro: {
    maxClasses: null, // Unlimited
    maxStudentsPerClass: null, // Unlimited
    maxTotalStudents: null, // Unlimited
    maxWordSets: null, // Unlimited
    hasSessionMode: true,
    hasProgressStats: true,
    hasQuizStats: true,
  },
}

/**
 * Get subscription tier for a user (defaults to 'free')
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
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.warn(`Warning: Could not fetch subscription_tier for user ${userId}, defaulting to 'free'. Error:`, error?.message)
      return 'free'
    }

    const tier = (data.subscription_tier as SubscriptionTier) || 'free'
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
export async function canCreateWordSet(userId: string, currentWordSetCount: number): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId)
  
  if (limits.maxWordSets === null) {
    return { allowed: true } // Unlimited
  }
  
  if (currentWordSetCount >= limits.maxWordSets) {
    const tier = await getUserSubscriptionTier(userId)
    const tierName = getTierDisplayName(tier)
    return { 
      allowed: false, 
      reason: `${tierName}-planen tillåter max ${limits.maxWordSets} ordlistor. Uppgradera till ${tier === 'free' ? 'Premium' : 'Pro'} för fler ordlistor.` 
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
        reason: `${tierName} plan allows max ${limits.maxTotalStudents} students total. Upgrade to Premium for more students.` 
      }
    }
  }

  // For premium tier, check students per class
  if (tier === 'premium' && limits.maxStudentsPerClass !== null) {
    if (currentStudentCount >= limits.maxStudentsPerClass) {
      const tierName = getTierDisplayName(tier)
      return { 
        allowed: false, 
        reason: `${tierName} plan allows max ${limits.maxStudentsPerClass} students per class. Upgrade to Pro for unlimited students.` 
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
  if (tier === 'premium') return yearly ? 758 : 79
  if (tier === 'pro') return yearly ? 1238 : 129
  return 0
}

