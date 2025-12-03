import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { levelForXp } from '@/lib/leveling'

// Supabase configuration (same as in lib/supabase.ts)
const supabaseUrl = 'https://edbbestqdwldryxuxkma.supabase.co'
const supabaseAnonKey = 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'

// GET /api/teacher/students - Get all students for a teacher
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase client with teacher's token (uses RLS policies)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify teacher authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('API: Got user:', user.id, user.email)

    // Get teacher's classes (only non-deleted ones)
    console.log('API: Fetching classes for teacher:', user.id)
    const { data: teacherClasses, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', user.id)
      .is('deleted_at', null)

    if (classError) {
      console.error('Error fetching teacher classes:', classError)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    console.log('API: Found classes:', teacherClasses)

    // Get existing class IDs (empty if no classes)
    const existingClassIds = teacherClasses?.map(c => c.id) || []
    console.log('API: Existing class IDs:', existingClassIds)

    // Declare students variable outside the if/else blocks
    let students: any[] = []

    // Get students directly from class_students table instead of RPC
    // This will find ALL students that have EVER been linked to this teacher's classes
    const { data: classStudents, error: classStudentsError } = await supabase
      .from('class_students')
      .select(`
        student_id,
        class_id,
        created_at,
        classes!class_students_class_id_fkey!inner(
          id,
          name,
          teacher_id
        ),
        profiles!inner(
          id,
          email,
          username,
          role
        )
      `)
      .eq('classes.teacher_id', user.id)
      .eq('profiles.role', 'student')

    if (classStudentsError) {
      console.error('Error fetching class students:', classStudentsError)
      
      // Fallback: Try a simpler query without the complex joins
      // We need to get ALL students for this teacher, not just those in existing classes
      console.log('API: Trying fallback query...')
      
      // First, get ALL class_students for ANY class that belongs to this teacher
      // (including deleted classes - don't filter by deleted_at)
      const { data: allTeacherClassIds, error: allClassError } = await supabase
        .from('classes')
        .select('id, name, deleted_at')
        .eq('teacher_id', user.id)
      
      const allClassIds = allTeacherClassIds?.map(c => c.id) || []
      const deletedClasses = allTeacherClassIds?.filter(c => c.deleted_at !== null) || []
      console.log('API: All teacher class IDs (including deleted):', allClassIds.length)
      console.log('API: Deleted classes:', deletedClasses.length, deletedClasses.map(c => ({ id: c.id, name: c.name })))
      
      const { data: fallbackStudents, error: fallbackError } = await supabase
        .from('class_students')
        .select(`
          student_id,
          class_id,
          created_at
        `)
        .in('class_id', allClassIds)
        .is('deleted_at', null)
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
      }
      
      console.log('API: Fallback query successful, found:', fallbackStudents?.length || 0)
      
      // Transform fallback data (without profile info)
      students = (fallbackStudents || []).map((cs: any) => {
        // Find class info from ALL classes (including deleted)
        const classInfo = allTeacherClassIds?.find(c => c.id === cs.class_id)
        const className = classInfo?.name || 'Unknown Class'
        
        return {
          student_id: cs.student_id,
          class_id: cs.class_id,
          class_name: className,
          student_email: 'Unknown Email', // We don't have email in fallback
          created_at: cs.created_at
        }
      })
      
      console.log('API: Fallback students transformed:', students.length)
    } else {
      console.log('API: Class students found:', classStudents?.length || 0)
      console.log('API: Sample class student data:', classStudents?.slice(0, 2))

      // Transform the data to match the expected format
      students = (classStudents || []).map((cs: any) => ({
        student_id: cs.student_id,
        class_id: cs.class_id,
        class_name: cs.classes?.name,
        student_email: cs.profiles?.email,
        created_at: cs.created_at
      }))

      console.log('API: Transformed students found:', students?.length || 0)
      console.log('API: Sample transformed student data:', students?.slice(0, 2))
    }
    
    console.log('API: Final students array length:', students.length)
    
    // Debug: Check if we have any students at all
    if (students.length === 0) {
      console.log('API: No students found - checking if there are any class_students records for this teacher...')
      
      // Check if there are ANY class_students records for this teacher
      const { data: anyClassStudents, error: anyError } = await supabase
        .from('class_students')
        .select(`
          student_id,
          class_id,
          classes!class_students_class_id_fkey!inner(teacher_id)
        `)
        .eq('classes.teacher_id', user.id)
        .limit(5)
      
      console.log('API: Any class_students found:', anyClassStudents?.length || 0)
      if (anyClassStudents && anyClassStudents.length > 0) {
        console.log('API: Sample class_students (no profile join):', anyClassStudents)
      }
    }

    // Continue processing even if no students found - we want to show unassigned students
    
    // Mark students as "Unassigned" if their class no longer exists
    const studentsWithStatus = (students || []).map((s: any) => {
      const classExists = s.class_id && existingClassIds.includes(s.class_id)
      const result = {
        ...s,
        class_name: classExists ? s.class_name : 'Unassigned',
        class_id: classExists ? s.class_id : null,
        has_active_class: classExists
      }
      
      // Debug first student
      if (students && students.length > 0 && s.student_id === students[0]?.student_id) {
        console.log('API: First student mapping:', {
          original_class_id: s.class_id,
          original_class_name: s.class_name,
          existingClassIds,
          classExists,
          result_class_name: result.class_name,
          result_has_active_class: result.has_active_class
        })
      }
      
      return result
    })
    
    console.log('API: Students with status:', studentsWithStatus.length)
    console.log('API: Unassigned students:', studentsWithStatus.filter(s => !s.has_active_class).length)
    
    // If no students after processing, return empty array
    if (!studentsWithStatus || studentsWithStatus.length === 0) {
      console.log('API: No students after processing, returning empty array')
      return NextResponse.json({ students: [] })
    }
    
    // Get student details separately from profiles
    const studentIds = studentsWithStatus?.map((s: any) => s.student_id) || []
    console.log('API: Student IDs to fetch:', studentIds)
    
    const { data: studentDetails, error: studentDetailsError } = await supabase
      .from('profiles')
      .select('id, email, created_at, last_active, username')
      .in('id', studentIds)
      .eq('role', 'student')

    if (studentDetailsError) {
      console.error('Error fetching student details:', studentDetailsError)
      return NextResponse.json({ error: 'Failed to fetch student details' }, { status: 500 })
    }

    console.log('API: Student details found:', studentDetails?.length || 0)

    // Get student progress for each student
    // IMPORTANT: Only fetch GLOBAL progress records (word_set_id = null)
    let progressData: any[] = []
    
    if (studentIds.length > 0) {
      const { data: progress, error: progressError } = await supabase
        .from('student_progress')
        .select('student_id, total_points, last_played_at, games_played')
        .in('student_id', studentIds)
        .is('word_set_id', null)  // Global progress record
        .is('homework_id', null)   // Global progress record
        .is('deleted_at', null)
      
      if (progressError) {
        console.error('Error fetching progress:', progressError)
      } else {
        progressData = progress || []
      }
    }
    
    console.log('API: Progress data found:', progressData.length)
    console.log('API: Progress data sample:', progressData.slice(0, 3))
    
    // Debug progress fetch with better logging
    console.log('API: Attempting to fetch progress for student IDs (first 5):', studentIds.slice(0, 5))
    console.log('API: Progress data received:', progressData.length, 'records')
    if (progressData.length > 0) {
      console.log('API: Sample progress record:', progressData[0])
    }

    // Combine data - use studentsWithStatus (includes unassigned)
    const studentsWithProgress = studentsWithStatus?.map((student: any) => {
      const studentDetail = studentDetails?.find(s => s.id === student.student_id)
      const progress = progressData?.find(p => p.student_id === student.student_id)
      
      const totalXp = progress?.total_points || 0
      let calculatedLevel = 1
      
      try {
        calculatedLevel = levelForXp(totalXp).level
      } catch (error) {
        console.error('Error calculating level for XP:', totalXp, error)
        // Fallback: simple approximation
        calculatedLevel = Math.max(1, Math.floor(totalXp / 100))
      }
      
      // Debug for first student
      if (studentsWithStatus && studentsWithStatus.length > 0 && student.student_id === studentsWithStatus[0]?.student_id) {
        console.log('API: First student debug:', {
          student_id: student.student_id,
          has_active_class: student.has_active_class,
          class_name: student.class_name,
          progress_found: !!progress,
          progress_data: progress,
          total_points: totalXp,
          calculated_level: calculatedLevel,
          last_played_at: progress?.last_played_at
        })
      }
      
      return {
        id: student.student_id,
        email: student.student_email || 'Unknown',
        name: studentDetail?.username || student.student_email?.split('@')[0] || 'Student',
        class_name: student.class_name, // Will be "Unassigned" if no active class
        class_id: student.class_id,
        created_at: student.created_at || new Date().toISOString(),
        last_sign_in_at: studentDetail?.last_active || null,
        total_points: totalXp,
        level: calculatedLevel,
        last_activity: progress?.last_played_at || student.created_at || new Date().toISOString(),
        is_active: student.has_active_class // Active only if they have an active class
      }
    }) || []

    return NextResponse.json({ students: studentsWithProgress })

  } catch (error) {
    console.error('Error in GET /api/teacher/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teacher/students - Reset password for a student
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase client with teacher's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify teacher authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, studentId, studentEmail, classId } = await request.json()

    if (action === 'reset_password') {
      // Verify teacher has access to this student using the working function
      const { data: teacherStudents } = await supabase
        .rpc('get_teacher_students', { 
          teacher_uuid: user.id,
          class_ids: [] // Get all students for this teacher
        })

      const hasAccess = teacherStudents?.some((s: any) => s.student_id === studentId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Send password reset email (needs service role - using anon won't work for this)
      // TODO: This needs proper service role key for resetPasswordForEmail
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(studentEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`
      })

      if (resetError) {
        console.error('Error sending reset email:', resetError)
        return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Password reset email sent' })

    } else if (action === 'remove_from_class' || action === 'delete_student') {
      let studentRecord: any = null
      let hasActiveClass = false
      
      // If action is delete_student and classId is null, treat as unassigned deletion
      if (action === 'delete_student' && !classId) {
        // Skip class check, go directly to deletion
        hasActiveClass = false
        studentRecord = {
          class_id: null,
          class_name: 'Unassigned'
        }
      }
      // If classId is provided, verify it belongs to teacher and use it directly
      else if (classId && action === 'remove_from_class') {
        // Verify the class belongs to the teacher
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('id', classId)
          .eq('teacher_id', user.id)
          .is('deleted_at', null)
          .single()
        
        if (classError || !classData) {
          console.log('API: Class not found or access denied:', { classId, teacherId: user.id, error: classError?.message })
          return NextResponse.json({ error: 'Access denied - class not found' }, { status: 403 })
        }
        
        // Verify student is in this class
        const { data: classStudent, error: csError } = await supabase
          .from('class_students')
          .select('class_id, deleted_at')
          .eq('student_id', studentId)
          .eq('class_id', classId)
          .is('deleted_at', null)
          .single()
        
        if (csError || !classStudent) {
          console.log('API: Student not in class:', { studentId, classId, error: csError?.message })
          return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 })
        }
        
        hasActiveClass = true
        studentRecord = {
          class_id: classId,
          class_name: classData.name
        }
      } else {
        // Fallback: Verify teacher has access to this student by checking if student belongs to teacher's class
        // Get all teacher's classes
        const { data: teacherClasses, error: classesError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', user.id)
          .is('deleted_at', null)
        
        if (classesError) {
          console.error('Error fetching teacher classes:', classesError)
          return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
        }

        const teacherClassIds = teacherClasses?.map(c => c.id) || []
        
        if (teacherClassIds.length === 0) {
          return NextResponse.json({ error: 'No classes found for teacher' }, { status: 403 })
        }

        // Check if student belongs to any of teacher's classes (active)
        const { data: classStudents, error: csError } = await supabase
          .from('class_students')
          .select('class_id, deleted_at')
          .eq('student_id', studentId)
          .in('class_id', teacherClassIds)
          .is('deleted_at', null)
        
        if (!csError && classStudents && classStudents.length > 0) {
          // Student is in at least one active class
          const activeClassStudent = classStudents[0]
          const classInfo = teacherClasses?.find(c => c.id === activeClassStudent.class_id)
          hasActiveClass = true
          studentRecord = {
            class_id: activeClassStudent.class_id,
            class_name: classInfo?.name || 'Unknown Class'
          }
        } else {
          // Check if student was in a deleted class_students record
          const { data: deletedClassStudents } = await supabase
            .from('class_students')
            .select('class_id, deleted_at')
            .eq('student_id', studentId)
            .in('class_id', teacherClassIds)
            .not('deleted_at', 'is', null)
          
          if (deletedClassStudents && deletedClassStudents.length > 0) {
            // Student was previously in teacher's class but is now unassigned
            studentRecord = {
              class_id: null,
              class_name: 'Unassigned'
            }
          } else {
            // Student doesn't belong to any of teacher's classes
            console.log('API: Student not found in teacher classes:', { 
              studentId, 
              teacherId: user.id, 
              teacherClassIds,
              csError: csError?.message 
            })
            return NextResponse.json({ error: 'Access denied - student not found in your classes' }, { status: 403 })
          }
        }
      }
      
      console.log('API: Delete check:', {
        studentId,
        studentClassId: studentRecord?.class_id,
        hasActiveClass,
        providedClassId: classId
      })

      const deletionTimestamp = new Date().toISOString()
      
      if (hasActiveClass) {
        // Student has an active class - remove from class using soft delete
        const { error: removeError } = await supabase
          .from('class_students')
          .update({ deleted_at: deletionTimestamp })
          .eq('student_id', studentId)
          .eq('class_id', studentRecord.class_id)

        if (removeError) {
          console.error('Error removing student from class:', removeError)
          return NextResponse.json({ error: 'Failed to remove student from class' }, { status: 500 })
        }

        // Log deletion in deletion_logs
        await supabase
          .from('deletion_logs')
          .insert({
            table_name: 'class_students',
            record_id: studentId,
            deleted_by: user.id,
            deleted_at: deletionTimestamp,
            reason: `Student removed from class: ${studentRecord.class_name}`,
            anonymized_data: {
              student_name: studentRecord.student_email?.split('@')[0] || 'Unknown',
              class_name: studentRecord.class_name,
              deletion_type: 'remove_from_class'
            }
          })

        return NextResponse.json({ 
          success: true, 
          message: 'Student removed from class',
          deletionDate: deletionTimestamp,
          anonymizationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      } else {
        // Student is unassigned (no active class) - soft delete the student entirely
        // Check if student is already deleted
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, deleted_at, username, email, created_at')
          .eq('id', studentId)
          .single()

        if (!existingProfile) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        if (existingProfile.deleted_at) {
          // Student is already deleted, return success
          return NextResponse.json({ 
            success: true, 
            message: 'Student already deleted',
            deletionDate: existingProfile.deleted_at
          })
        }

        // Get student data before deletion for logging
        const studentProfile = {
          username: existingProfile.username,
          email: existingProfile.email,
          created_at: existingProfile.created_at
        }

        const { error: deleteError } = await supabase
          .from('profiles')
          .update({ deleted_at: deletionTimestamp })
          .eq('id', studentId)
          .is('deleted_at', null) // Only update if not already deleted

        if (deleteError) {
          console.error('Error deleting unassigned student:', deleteError)
          return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
        }

        // Also soft delete any class_students records (if they exist but class is gone)
        await supabase
          .from('class_students')
          .update({ deleted_at: deletionTimestamp })
          .eq('student_id', studentId)
          .is('deleted_at', null)

        // Log deletion in deletion_logs
        await supabase
          .from('deletion_logs')
          .insert({
            table_name: 'profiles',
            record_id: studentId,
            deleted_by: user.id,
            deleted_at: deletionTimestamp,
            reason: 'Unassigned student permanently deleted',
            anonymized_data: {
              username: studentProfile?.username || 'Unknown',
              account_created: studentProfile?.created_at,
              deletion_type: 'permanent_delete'
            }
          })

        return NextResponse.json({ 
          success: true, 
          message: 'Unassigned student deleted',
          deletionDate: deletionTimestamp,
          anonymizationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      }

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in POST /api/teacher/students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
