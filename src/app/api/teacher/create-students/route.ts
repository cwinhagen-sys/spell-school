import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type StudentInput = {
  username: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Enhanced debugging
    const envDebug = {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      serviceRoleKeyLength: serviceRoleKey?.length || 0,
      supabaseUrlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
      allSupabaseKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
      nodeEnv: process.env.NODE_ENV
    }
    
    console.error('🔍 Create Students API - Environment Check:', envDebug)

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase configuration for create-students endpoint', envDebug)
      return NextResponse.json(
        { 
          error: 'Server configuration error. Please contact support.',
          debug: envDebug
        },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create students' }, { status: 403 })
    }

    const { classId, students } = (await request.json()) as {
      classId?: string
      students?: StudentInput[]
    }

    if (!classId || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'Class ID and at least one student are required' },
        { status: 400 }
      )
    }

    // Verify class belongs to teacher
    const { data: classRecord, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .is('deleted_at', null)
      .single()

    if (classError || !classRecord) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 })
    }

    const normalizedClassCode = classRecord.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 16) || 'CLASS'

    const results: Array<{ username: string; success: boolean; message: string }> = []

    for (const rawStudent of students) {
      const username = rawStudent.username?.trim().toLowerCase()
      const password = rawStudent.password ?? ''

      if (!username || !password) {
        results.push({
          username: rawStudent.username || '',
          success: false,
          message: 'Username and password are required'
        })
        continue
      }

      try {
        const email = `${username}.${normalizedClassCode}@local.local`

        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, deleted_at')
          .eq('email', email)
          .maybeSingle()

        if (existingProfile && !existingProfile.deleted_at) {
          results.push({
            username,
            success: false,
            message: 'User already exists'
          })
          continue
        }

        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            class_code: normalizedClassCode
          }
        })

        if (createError || !createdUser?.user) {
          throw createError || new Error('Failed to create user')
        }

        // Create/restore profile
        const { error: profileInsertError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: createdUser.user.id,
            email,
            role: 'student',
            username,
            class_code: normalizedClassCode,
            deleted_at: null
          }, { onConflict: 'id' })

        if (profileInsertError) {
          throw profileInsertError
        }

        // Ensure class membership
        const { error: classInsertError } = await supabaseAdmin
          .from('class_students')
          .upsert({
            class_id: classId,
            student_id: createdUser.user.id,
            deleted_at: null
          }, { onConflict: 'class_id,student_id' })

        if (classInsertError) {
          throw classInsertError
        }

        results.push({ username, success: true, message: 'Student created' })
      } catch (error: any) {
        console.error('Failed to create student', { username: rawStudent.username, error })
        const message =
          typeof error?.message === 'string'
            ? error.message
            : 'Failed to create student'
        results.push({
          username: rawStudent.username || '',
          success: false,
          message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.length - successCount

    return NextResponse.json({
      successCount,
      errorCount,
      results
    })
  } catch (error) {
    console.error('Error in POST /api/teacher/create-students:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



