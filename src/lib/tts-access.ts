/**
 * TTS Access Management
 * Handles checking if a student has TTS (OpenAI) access granted by PRO teachers
 */

import { supabase } from './supabase'

/**
 * Check if current student has TTS access
 * Returns true if student has access granted by any PRO teacher
 */
export async function hasTTSAccess(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Check if student has TTS access
    const { data, error } = await supabase
      .from('student_tts_access')
      .select('id, enabled')
      .eq('student_id', user.id)
      .eq('enabled', true)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('Error checking TTS access:', error)
      return false
    }

    return !!data && data.enabled
  } catch (error) {
    console.error('Error checking TTS access:', error)
    return false
  }
}

/**
 * Get TTS access status for a student (for teachers)
 */
export async function getStudentTTSAccess(studentId: string, teacherId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('student_tts_access')
      .select('enabled')
      .eq('student_id', studentId)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    if (error) {
      console.warn('Error getting student TTS access:', error)
      return false
    }

    return !!data && data.enabled
  } catch (error) {
    console.error('Error getting student TTS access:', error)
    return false
  }
}

/**
 * Grant or revoke TTS access for a student (PRO teachers only)
 */
export async function setStudentTTSAccess(
  studentId: string,
  teacherId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (enabled) {
      // Upsert: insert or update
      const { error } = await supabase
        .from('student_tts_access')
        .upsert({
          student_id: studentId,
          teacher_id: teacherId,
          enabled: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,teacher_id'
        })

      if (error) {
        console.error('Error granting TTS access:', error)
        return { success: false, error: error.message }
      }
    } else {
      // Disable access
      const { error } = await supabase
        .from('student_tts_access')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)

      if (error) {
        console.error('Error revoking TTS access:', error)
        return { success: false, error: error.message }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error setting TTS access:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all students with TTS access for a teacher
 */
export async function getStudentsWithTTSAccess(teacherId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('student_tts_access')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('enabled', true)

    if (error) {
      console.error('Error getting students with TTS access:', error)
      return []
    }

    return (data || []).map(row => row.student_id)
  } catch (error) {
    console.error('Error getting students with TTS access:', error)
    return []
  }
}



