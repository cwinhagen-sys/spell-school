import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Reset Student Password API
 * Allows teachers to reset student passwords
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
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // This requires service role key in .env
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

    const { studentId, newPassword } = await request.json()

    if (!studentId || !newPassword) {
      return NextResponse.json(
        { error: 'Student ID and new password are required' },
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

    console.log('🔐 Teacher password reset request for student:', studentId)

    // Get student details
    const { data: student, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, class_code, role')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify teacher has access to this student (via class membership)
    const { data: classStudents } = await supabaseAdmin
      .from('class_students')
      .select(`
        class_id,
        classes!inner(teacher_id)
      `)
      .eq('student_id', studentId)
      .eq('classes.teacher_id', user.id)

    if (!classStudents || classStudents.length === 0) {
      return NextResponse.json(
        { error: 'You do not have permission to reset this student\'s password' },
        { status: 403 }
      )
    }

    console.log('✅ Teacher authorized to reset password for:', student.email)

    // Update the password in Supabase Auth using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      studentId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ Failed to update password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Password updated successfully for:', student.email)

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${student.username}`,
      student: {
        id: student.id,
        username: student.username,
        email: student.email
      }
    })

  } catch (error) {
    console.error('❌ Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





















