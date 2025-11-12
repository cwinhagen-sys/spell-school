import { supabase } from './supabase'

export interface LeaderboardEntry {
  id: string
  word_set_id: string | null
  student_id: string
  username: string
  kpm: number
  duration_sec: number
  accuracy_pct: number
  created_at: string
  rank?: number
}

/**
 * Save or update a typing challenge result in the leaderboard
 * Only saves if accuracy is 100%
 */
export async function saveTypingLeaderboardEntry(
  wordSetId: string | null,
  kpm: number,
  durationSec: number,
  accuracyPct: number
): Promise<{ success: boolean; isTop10: boolean; rank?: number; error?: string }> {
  try {
    // Only save if 100% accuracy
    if (accuracyPct < 100) {
      return { success: false, isTop10: false, error: 'Accuracy must be 100%' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, isTop10: false, error: 'No user found' }
    }

    // Get username from profile (fallback to name or email)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, name, email')
      .eq('id', user.id)
      .single()

    const username = profile?.username || profile?.name || profile?.email?.split('@')[0] || 'Unknown'

    // Check if user already has an entry for this word set
    // Note: Use maybeSingle() instead of single() to handle case where no record exists
    const { data: existing, error: checkError } = await supabase
      .from('typing_leaderboard')
      .select('id, kpm')
      .eq('word_set_id', wordSetId)
      .eq('student_id', user.id)
      .maybeSingle()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned (expected)
      console.error('Error checking existing leaderboard entry:', checkError)
    }

    if (existing) {
      // Only update if new KPM is better
      if (kpm > existing.kpm) {
        const { error: updateError } = await supabase
          .from('typing_leaderboard')
          .update({
            kpm,
            duration_sec: durationSec,
            accuracy_pct: accuracyPct,
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('❌ Error updating leaderboard:', updateError)
          return { success: false, isTop10: false, error: updateError.message }
        } else {
          console.log('✅ Leaderboard entry updated successfully (better KPM)')
        }
      } else {
        // Not better, don't update
        return { success: false, isTop10: false, error: 'Previous record is better' }
      }
    } else {
      // Insert new entry
      const { error: insertError } = await supabase
        .from('typing_leaderboard')
        .insert({
          word_set_id: wordSetId,
          student_id: user.id,
          username,
          kpm,
          duration_sec: durationSec,
          accuracy_pct: accuracyPct
        })

      if (insertError) {
        console.error('❌ Error inserting leaderboard:', insertError)
        console.error('Insert error details:', JSON.stringify(insertError, null, 2))
        console.error('Insert error code:', insertError.code)
        console.error('Insert error message:', insertError.message)
        console.error('Insert error hint:', insertError.hint)
        console.error('Insert data attempted:', { wordSetId, student_id: user.id, username, kpm, durationSec, accuracyPct })
        return { success: false, isTop10: false, error: insertError.message || insertError.code || 'Unknown error' }
      } else {
        console.log('✅ Leaderboard entry inserted successfully')
      }
    }

    // Check if user is in top 10
    const { data: leaderboard, error: rankError } = await supabase
      .from('typing_leaderboard')
      .select('id, student_id, kpm')
      .eq('word_set_id', wordSetId)
      .order('kpm', { ascending: false })
      .limit(10)

    if (rankError) {
      console.error('Error fetching leaderboard for ranking:', rankError)
      return { success: true, isTop10: false }
    }

    const userRank = leaderboard?.findIndex(entry => entry.student_id === user.id)
    const isTop10 = userRank !== -1
    const rank = isTop10 ? userRank + 1 : undefined

    return { success: true, isTop10, rank }
  } catch (error: any) {
    console.error('Error in saveTypingLeaderboardEntry:', error)
    return { success: false, isTop10: false, error: error?.message || 'Unknown error' }
  }
}

/**
 * Get top 10 leaderboard entries for a word set
 */
export async function getTypingLeaderboard(wordSetId: string | null): Promise<{
  success: boolean
  entries: LeaderboardEntry[]
  userRank?: number
  error?: string
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: leaderboard, error } = await supabase
      .from('typing_leaderboard')
      .select('*')
      .eq('word_set_id', wordSetId)
      .order('kpm', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return { success: false, entries: [], error: error.message }
    }

    // Add rank and find user's rank
    const entries: LeaderboardEntry[] = (leaderboard || []).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))

    let userRank: number | undefined
    if (user) {
      const userIndex = entries.findIndex(entry => entry.student_id === user.id)
      if (userIndex !== -1) {
        userRank = userIndex + 1
      }
    }

    return { success: true, entries, userRank }
  } catch (error: any) {
    console.error('Error in getTypingLeaderboard:', error)
    return { success: false, entries: [], error: error?.message || 'Unknown error' }
  }
}

