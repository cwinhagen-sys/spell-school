import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Bulk Reset Student Password API
 * Allows teachers to reset passwords for multiple students at once
 * Requires Supabase Service Role Key for admin operations
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is a teacher
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a teacher
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can reset student passwords' }, { status: 403 })
    }

    const { studentIds, newPassword } = await request.json()

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs array is required' },
        { status: 400 }
      )
    }

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    console.log(`🔐 Bulk password reset request for ${studentIds.length} student(s)`)
    console.log(`🔐 Student IDs:`, studentIds)
    console.log(`🔐 Teacher ID:`, user.id)

    // First, get all teacher's classes (including deleted ones for checking access)
    const { data: teacherClasses, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)

    if (classesError) {
      console.error('❌ Error fetching teacher classes:', classesError)
      return NextResponse.json(
        { error: 'Failed to verify teacher access' },
        { status: 500 }
      )
    }

    if (!teacherClasses || teacherClasses.length === 0) {
      return NextResponse.json(
        { error: 'No classes found for teacher' },
        { status: 403 }
      )
    }

    const teacherClassIds = teacherClasses.map(c => c.id)
    console.log(`🔐 Teacher has ${teacherClassIds.length} classes`)

    // Verify teacher has access to all students (via class membership, including soft-deleted)
    // This includes students in "unassigned" group (soft-deleted from classes)
    // Don't filter by deleted_at - include both active and soft-deleted records
    const { data: classStudents, error: classStudentsError } = await supabaseAdmin
      .from('class_students')
      .select('student_id, class_id')
      .in('student_id', studentIds)
      .in('class_id', teacherClassIds)
      // Don't filter by deleted_at - include both active and soft-deleted records
      // This allows access to students in "unassigned" group

    if (classStudentsError) {
      console.error('❌ Error checking student access:', classStudentsError)
      return NextResponse.json(
        { error: 'Failed to verify student access' },
        { status: 500 }
      )
    }

    console.log(`🔐 Found ${classStudents?.length || 0} class_students records`)

    if (!classStudents || classStudents.length === 0) {
      console.error('❌ No class_students found for these students')
      return NextResponse.json(
        { error: 'No students found or you do not have permission to reset these passwords' },
        { status: 403 }
      )
    }

    // Get unique student IDs that teacher has access to
    const accessibleStudentIds = [...new Set(classStudents.map(cs => cs.student_id))]
    
    // Check if all requested students are accessible
    const inaccessibleStudents = studentIds.filter(id => !accessibleStudentIds.includes(id))
    if (inaccessibleStudents.length > 0) {
      return NextResponse.json(
        { error: `You do not have permission to reset passwords for ${inaccessibleStudents.length} student(s)` },
        { status: 403 }
      )
    }

    // Get student details (exclude soft-deleted students)
    const { data: students } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username')
      .in('id', studentIds)
      .eq('role', 'student')
      .is('deleted_at', null) // Exclude soft-deleted students

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 404 })
    }

    // Update passwords for all students
    const results = []
    const errors = []

    for (const student of students) {
      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          student.id,
          { password: newPassword }
        )

        if (updateError) {
          console.error(`❌ Failed to update password for ${student.email}:`, updateError)
          errors.push({ studentId: student.id, email: student.email, error: updateError.message })
        } else {
          console.log(`✅ Password updated successfully for: ${student.email}`)
          results.push({ studentId: student.id, username: student.username, email: student.email })
        }
      } catch (error: any) {
        console.error(`❌ Exception updating password for ${student.email}:`, error)
        errors.push({ studentId: student.id, email: student.email, error: error.message || 'Unknown error' })
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update passwords for all students', errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${results.length} student(s)`,
      results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('❌ Bulk reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

