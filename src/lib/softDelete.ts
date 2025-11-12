import { supabase } from './supabase'

export interface DeletionLog {
  table_name: string
  record_id: string
  deleted_by: string
  reason?: string
  anonymized_data?: any
}

/**
 * Soft delete en post - markerar som raderad men behåller data
 */
export async function softDelete(
  table: string, 
  recordId: string, 
  deletedBy: string, 
  reason?: string
): Promise<boolean> {
  try {
    // Logga raderingen först
    const { error: logError } = await supabase
      .from('deletion_logs')
      .insert({
        table_name: table,
        record_id: recordId,
        deleted_by: deletedBy,
        reason: reason || 'Manual deletion by user'
      })

    if (logError) {
      console.error('Error logging deletion:', logError)
      return false
    }

    // Markera som raderad
    const { error: deleteError } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId)

    if (deleteError) {
      console.error('Error soft deleting record:', deleteError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in softDelete:', error)
    return false
  }
}

/**
 * Anonymisera personuppgifter - behåller data för statistik men tar bort identifierande info
 */
export async function anonymizeProfile(profileId: string): Promise<boolean> {
  try {
    // Hämta data för att spara anonymiserad version
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    if (fetchError || !profile) {
      console.error('Error fetching profile for anonymization:', fetchError)
      return false
    }

    // Skapa anonymiserad version
    const anonymizedData = {
      role: profile.role,
      created_at: profile.created_at,
      // Behåller level och points för statistik
      level: profile.level || 1,
      total_points: profile.total_points || 0,
      // Tar bort identifierande data
      email: `anonymized_${profileId.slice(0, 8)}@deleted.local`,
      username: `Deleted User ${profileId.slice(0, 8)}`,
      last_active: null
    }

    // Uppdatera med anonymiserad data
    const { error: updateError } = await supabase
      .from('profiles')
      .update(anonymizedData)
      .eq('id', profileId)

    if (updateError) {
      console.error('Error anonymizing profile:', updateError)
      return false
    }

    // Logga anonymiseringen
    await supabase
      .from('deletion_logs')
      .insert({
        table_name: 'profiles',
        record_id: profileId,
        deleted_by: 'system',
        reason: 'GDPR anonymization after retention period',
        anonymized_data: anonymizedData
      })

    return true
  } catch (error) {
    console.error('Error in anonymizeProfile:', error)
    return false
  }
}

/**
 * Hämta alla poster som ska rensas (30 dagar gamla)
 */
export async function getRecordsToCleanup(): Promise<{
  profiles: any[]
  classes: any[]
  classStudents: any[]
  wordSets: any[]
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Hämta raderade profiler
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo)

    // Hämta raderade klasser
    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo)

    // Hämta raderade klass-student kopplingar
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('*')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo)

    // Hämta raderade word sets
    const { data: wordSets } = await supabase
      .from('word_sets')
      .select('*')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo)

    return {
      profiles: profiles || [],
      classes: classes || [],
      classStudents: classStudents || [],
      wordSets: wordSets || []
    }
  } catch (error) {
    console.error('Error getting records to cleanup:', error)
    return { profiles: [], classes: [], classStudents: [], wordSets: [] }
  }
}

/**
 * Kör cleanup-processen - anonymiserar gamla raderade poster
 */
export async function runCleanupProcess(): Promise<{
  success: boolean
  processed: number
  errors: string[]
}> {
  const errors: string[] = []
  let processed = 0

  try {
    const recordsToCleanup = await getRecordsToCleanup()

    // Anonymisera profiler
    for (const profile of recordsToCleanup.profiles) {
      const success = await anonymizeProfile(profile.id)
      if (success) {
        processed++
      } else {
        errors.push(`Failed to anonymize profile ${profile.id}`)
      }
    }

    // Ta bort klass-student kopplingar helt (ingen statistik behövs)
    for (const classStudent of recordsToCleanup.classStudents) {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('id', classStudent.id)

      if (error) {
        errors.push(`Failed to delete class_student ${classStudent.id}: ${error.message}`)
      } else {
        processed++
      }
    }

    // Ta bort klasser helt (ingen statistik behövs)
    for (const classRecord of recordsToCleanup.classes) {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classRecord.id)

      if (error) {
        errors.push(`Failed to delete class ${classRecord.id}: ${error.message}`)
      } else {
        processed++
      }
    }

    // Ta bort word sets helt (ingen statistik behövs)
    for (const wordSet of recordsToCleanup.wordSets) {
      const { error } = await supabase
        .from('word_sets')
        .delete()
        .eq('id', wordSet.id)

      if (error) {
        errors.push(`Failed to delete word_set ${wordSet.id}: ${error.message}`)
      } else {
        processed++
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors
    }
  } catch (error) {
    console.error('Error in cleanup process:', error)
    return {
      success: false,
      processed,
      errors: [...errors, `Cleanup process failed: ${error}`]
    }
  }
}
