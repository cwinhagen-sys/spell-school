#!/usr/bin/env node

/**
 * Create Multiple Classes with Students for Stress Testing
 * 
 * Detta script skapar automatiskt flera klasser med elever för stress-testing.
 * 
 * Användning:
 *   node scripts/create-multiple-classes.js \
 *     --classes=5 \
 *     --students-per-class=30 \
 *     --teacher-email=your-email@example.com \
 *     --teacher-password=your-password \
 *     --base-url=https://www.spellschool.se \
 *     --output=multi-class-credentials.json
 * 
 * OBS: Du behöver vara inloggad som lärare med PRO-plan för att skapa många elever.
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const options = {
  classes: 5,
  studentsPerClass: 30,
  teacherEmail: null,
  teacherPassword: null,
  baseUrl: process.env.BASE_URL || 'https://www.spellschool.se',
  outputFile: 'multi-class-credentials.json',
  password: 'password123',
  prefix: 'teststudent'
}

args.forEach(arg => {
  if (arg.startsWith('--classes=')) {
    options.classes = parseInt(arg.split('=')[1]) || 5
  } else if (arg.startsWith('--students-per-class=')) {
    options.studentsPerClass = parseInt(arg.split('=')[1]) || 30
  } else if (arg.startsWith('--teacher-email=')) {
    options.teacherEmail = arg.split('=')[1]
  } else if (arg.startsWith('--teacher-password=')) {
    options.teacherPassword = arg.split('=')[1]
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1]
  } else if (arg.startsWith('--output=')) {
    options.outputFile = arg.split('=')[1]
  } else if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1]
  } else if (arg.startsWith('--prefix=')) {
    options.prefix = arg.split('=')[1]
  }
})

if (!options.teacherEmail || !options.teacherPassword) {
  console.error('❌ Du måste ange teacher email och password')
  console.error('\nAnvändning:')
  console.error('  node scripts/create-multiple-classes.js \\')
  console.error('    --classes=5 \\')
  console.error('    --students-per-class=30 \\')
  console.error('    --teacher-email=your-email@example.com \\')
  console.error('    --teacher-password=your-password \\')
  console.error('    --base-url=https://www.spellschool.se \\')
  console.error('    --output=multi-class-credentials.json')
  process.exit(1)
}

console.log('🚀 Create Multiple Classes with Students')
console.log('='.repeat(50))
console.log(`Classes to create: ${options.classes}`)
console.log(`Students per class: ${options.studentsPerClass}`)
console.log(`Total students: ${options.classes * options.studentsPerClass}`)
console.log(`Base URL: ${options.baseUrl}`)
console.log(`Output file: ${options.outputFile}`)
console.log('='.repeat(50))
console.log('')

const stats = {
  classesCreated: 0,
  studentsCreated: 0,
  errors: []
}

function makeRequest(url, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const req = client.request(url, {
      method: requestOptions.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...requestOptions.headers
      },
      timeout: 60000
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data), rawData: data })
          } catch (e) {
            resolve({ status: res.statusCode, data: data, rawData: data })
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`))
        }
      })
    })
    
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    if (requestOptions.body) {
      req.write(JSON.stringify(requestOptions.body))
    }
    
    req.end()
  })
}

// Note: This script requires @supabase/supabase-js package
// Install it with: npm install @supabase/supabase-js

let supabase = null

async function initSupabase() {
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edbbestqdwldryxuxkma.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bx81qdFnpcX79ovYbCL98Q_eirRtByp'
    
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    return supabase
  } catch (error) {
    console.error('❌ Failed to initialize Supabase. Make sure @supabase/supabase-js is installed:')
    console.error('   npm install @supabase/supabase-js')
    throw error
  }
}

async function loginTeacher() {
  try {
    console.log('🔐 Logging in as teacher...')
    
    if (!supabase) {
      await initSupabase()
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: options.teacherEmail,
      password: options.teacherPassword
    })
    
    if (error) throw error
    
    if (data.session?.access_token) {
      console.log('✅ Teacher logged in successfully')
      return data.session.access_token
    }
    
    throw new Error('No access token in response')
  } catch (error) {
    console.error('❌ Failed to login as teacher:', error.message)
    throw error
  }
}

async function createClass(teacherToken, className) {
  try {
    if (!supabase) {
      await initSupabase()
    }
    
    // Get current user to verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser(teacherToken)
    if (userError || !user) {
      throw new Error('Authentication failed')
    }
    
    const { data: newClass, error: classError } = await supabase
      .from('classes')
      .insert({ name: className, teacher_id: user.id })
      .select()
      .single()
    
    if (classError) throw classError
    
    if (newClass?.id) {
      return newClass.id
    }
    
    throw new Error('No class ID in response')
  } catch (error) {
    console.error(`❌ Failed to create class "${className}":`, error.message)
    throw error
  }
}

async function createStudents(teacherToken, classId, students) {
  try {
    const response = await makeRequest(`${options.baseUrl}/api/teacher/create-students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teacherToken}`
      },
      body: {
        classId: classId,
        students: students
      }
    })
    
    if (response.data.success) {
      return response.data.created || students.length
    }
    
    throw new Error(response.data.error || 'Failed to create students')
  } catch (error) {
    console.error(`❌ Failed to create students for class ${classId}:`, error.message)
    throw error
  }
}

async function createMultipleClasses() {
  const credentials = []
  let teacherToken = null
  
  try {
    // Initialize Supabase
    await initSupabase()
    
    // Login as teacher
    teacherToken = await loginTeacher()
    
    // Create classes and students
    let studentCounter = 1
    
    for (let classIndex = 0; classIndex < options.classes; classIndex++) {
      const className = `Stress Test Class ${classIndex + 1}`
      console.log(`\n📚 Creating class ${classIndex + 1}/${options.classes}: "${className}"`)
      
      try {
        // Create class
        const classId = await createClass(teacherToken, className)
        console.log(`  ✅ Class created: ${classId}`)
        stats.classesCreated++
        
        // Generate students for this class
        const students = []
        const classStudents = []
        
        for (let i = 0; i < options.studentsPerClass; i++) {
          const username = `${options.prefix}${studentCounter}`
          students.push({
            username: username,
            password: options.password
          })
          classStudents.push({
            username: username,
            password: options.password
          })
          studentCounter++
        }
        
        // Create students in batches of 10 (to avoid overwhelming the API)
        const batchSize = 10
        let createdCount = 0
        
        for (let i = 0; i < students.length; i += batchSize) {
          const batch = students.slice(i, i + batchSize)
          try {
            const created = await createStudents(teacherToken, classId, batch)
            createdCount += created
            console.log(`  ✅ Created ${created} students (${createdCount}/${students.length} total)`)
            stats.studentsCreated += created
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < students.length) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          } catch (error) {
            console.error(`  ⚠️  Failed to create batch ${i / batchSize + 1}:`, error.message)
            stats.errors.push(`Class ${classIndex + 1}, batch ${i / batchSize + 1}: ${error.message}`)
          }
        }
        
        // Add to credentials
        credentials.push({
          classId: classId,
          className: className,
          students: classStudents
        })
        
        console.log(`  ✅ Class ${classIndex + 1} complete: ${createdCount} students created`)
        
        // Small delay between classes
        if (classIndex < options.classes - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to create class ${classIndex + 1}:`, error.message)
        stats.errors.push(`Class ${classIndex + 1}: ${error.message}`)
      }
    }
    
    // Save credentials file
    const outputPath = path.resolve(options.outputFile)
    fs.writeFileSync(outputPath, JSON.stringify(credentials, null, 2))
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary')
    console.log('='.repeat(50))
    console.log(`Classes created: ${stats.classesCreated}/${options.classes}`)
    console.log(`Students created: ${stats.studentsCreated}/${options.classes * options.studentsPerClass}`)
    console.log(`Errors: ${stats.errors.length}`)
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }
    
    console.log(`\n✅ Credentials saved to: ${outputPath}`)
    console.log(`\n🚀 Run stress test with:`)
    console.log(`   node scripts/stress-test-multi-class.js \\`)
    console.log(`     --classes=${stats.classesCreated} \\`)
    console.log(`     --students-per-class=${options.studentsPerClass} \\`)
    console.log(`     --duration=120 \\`)
    console.log(`     --base-url=${options.baseUrl} \\`)
    console.log(`     --credentials-file=${options.outputFile}`)
    console.log('')
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

createMultipleClasses().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})

