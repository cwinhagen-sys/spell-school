import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { canAddStudentsToClass } from '@/lib/subscription'

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

    // Check subscription limits before creating students
    const { data: currentStudents } = await supabaseAdmin
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId)
      .is('deleted_at', null)

    const currentStudentCount = new Set(currentStudents?.map(cs => cs.student_id) || []).size
    
    // Use admin client to check subscription tier (bypasses RLS)
    const canAdd = await canAddStudentsToClass(user.id, classId, currentStudentCount, supabaseAdmin)

    if (!canAdd.allowed) {
      return NextResponse.json(
        { error: canAdd.reason || 'Subscription limit reached' },
        { status: 403 }
      )
    }

    // Check if adding these students would exceed the limit
    const studentsToAdd = students.length
    
    // Use admin client to get subscription tier (bypasses RLS)
    const tier = await import('@/lib/subscription').then(m => m.getUserSubscriptionTier(user.id, supabaseAdmin))
    const limits = await import('@/lib/subscription').then(m => m.getUserSubscriptionLimits(user.id, supabaseAdmin))
    
    console.log(`Creating students: User ${user.id} (${user.email}) has tier: ${tier}`)
    
    // Pro tier has unlimited students - skip all checks
    if (tier === 'pro') {
      console.log('Pro tier detected - skipping all student limit checks')
      // No limits for pro tier, continue with student creation
    } else if (tier === 'free' && limits.maxTotalStudents !== null) {
      // Count total students across all classes
      const { data: allClasses } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)

      if (allClasses && allClasses.length > 0) {
        const classIds = allClasses.map(c => c.id)
        const { data: allClassStudents } = await supabaseAdmin
          .from('class_students')
          .select('student_id')
          .in('class_id', classIds)
          .is('deleted_at', null)

        const totalStudents = new Set(allClassStudents?.map(cs => cs.student_id) || []).size
        if (totalStudents + studentsToAdd > limits.maxTotalStudents) {
          const { getTierDisplayName } = await import('@/lib/subscription')
          const tierName = getTierDisplayName(tier)
          return NextResponse.json(
            { error: `${tierName} plan allows max ${limits.maxTotalStudents} students per class.` },
            { status: 403 }
          )
        }
      }
    } else if (tier === 'premium' && limits.maxStudentsPerClass !== null) {
      if (currentStudentCount + studentsToAdd > limits.maxStudentsPerClass) {
        const { getTierDisplayName } = await import('@/lib/subscription')
        const tierName = getTierDisplayName(tier)
        return NextResponse.json(
          { error: `${tierName} plan allows max ${limits.maxStudentsPerClass} students per class.` },
          { status: 403 }
        )
      }
    }

    const normalizedClassCode = classRecord.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 16) || 'CLASS'

    // Create a short unique identifier for the teacher (first 8 chars of UUID)
    const teacherShortId = user.id.replace(/-/g, '').slice(0, 8)

    const results: Array<{ username: string; success: boolean; message: string }> = []

    for (const rawStudent of students) {
      // Preserve Swedish characters (å, ä, ö) - only trim whitespace, don't lowercase
      const username = rawStudent.username?.trim()
      const password = rawStudent.password ?? ''

        if (!username || !password) {
          results.push({
            username: rawStudent.username || '',
            success: false,
            message: 'Användarnamn och lösenord krävs'
          })
          continue
        }

      try {
        // Include teacher ID to make email unique per teacher
        // This allows multiple teachers to have students with the same username
        // To allow same username with different passwords, we add a hash of the password to the email
        // Format: username.teacherShortId.classCode.passwordHash@local.local
        // This makes each (username, password) combination unique per teacher and class
        const crypto = await import('crypto')
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex').slice(0, 8)
        const email = `${username}.${teacherShortId}.${normalizedClassCode}.${passwordHash}@local.local`

        // Check if this teacher already has a student with the same username in the same class
        // We need to verify if the password matches an existing account
        const { data: existingClassStudents } = await supabaseAdmin
          .from('class_students')
          .select(`
            student_id,
            profiles!inner(username, email)
          `)
          .eq('class_id', classId)
          .eq('profiles.username', username)
          .is('deleted_at', null)

        if (existingClassStudents && existingClassStudents.length > 0) {
          // There's already a student with this username in this class
          // Try to verify if the password matches by attempting to sign in
          let passwordMatchFound = false
          for (const existingStudent of existingClassStudents) {
            const existingEmail = (existingStudent.profiles as any)?.email
            
            if (existingEmail) {
              // Try to sign in to verify if the password matches
              const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: existingEmail,
                password: password
              })

              // Sign out immediately after verification attempt (whether it succeeded or failed)
              await supabaseAdmin.auth.signOut()

              // If sign-in succeeds, it means this exact username+password combination already exists
              if (!signInError) {
                passwordMatchFound = true
                break
              }
            }
          }
          
          if (passwordMatchFound) {
            results.push({
              username,
              success: false,
              message: 'En elev med detta användarnamn och lösenord finns redan'
            })
            continue // Continue to next student in the outer loop
          }
          // If we get here, there are students with this username but different passwords
          // This is allowed - we'll create a new account with a unique email (based on password hash)
        }

        // Check if the email already exists (which would mean this exact combination already exists)
        // Note: email already generated above with password hash, so this checks for exact (username+password) match
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, deleted_at')
          .eq('email', email)
          .maybeSingle()

        if (existingProfile && !existingProfile.deleted_at) {
          results.push({
            username,
            success: false,
            message: 'En elev med detta användarnamn och lösenord finns redan'
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



