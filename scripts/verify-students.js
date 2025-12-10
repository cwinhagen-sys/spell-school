#!/usr/bin/env node

/**
 * Verify Students Script
 * 
 * Detta script verifierar vilka elever som faktiskt finns och kan logga in.
 * 
 * Användning:
 *   node scripts/verify-students.js --credentials-file=multi-class-credentials.json --base-url=https://www.spellschool.se
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const options = {
  credentialsFile: 'multi-class-credentials.json',
  baseUrl: process.env.BASE_URL || 'https://www.spellschool.se'
}

args.forEach(arg => {
  if (arg.startsWith('--credentials-file=')) {
    options.credentialsFile = arg.split('=')[1]
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1]
  }
})

// Load credentials
let credentials = []
try {
  const filePath = path.resolve(options.credentialsFile)
  const fileContent = fs.readFileSync(filePath, 'utf8')
  credentials = JSON.parse(fileContent)
} catch (error) {
  console.error('❌ Error loading credentials file:', error.message)
  process.exit(1)
}

console.log('🔍 Verify Students')
console.log('='.repeat(50))
console.log(`Credentials file: ${options.credentialsFile}`)
console.log(`Base URL: ${options.baseUrl}`)
console.log(`Classes: ${credentials.length}`)
console.log('='.repeat(50))
console.log('')

const stats = {
  totalStudents: 0,
  verifiedStudents: 0,
  failedStudents: 0,
  missingStudents: []
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
      timeout: 10000
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) })
          } catch (e) {
            resolve({ status: res.statusCode, data: data })
          }
        } else {
          let errorMessage = `HTTP ${res.statusCode}`
          try {
            const parsed = JSON.parse(data)
            errorMessage = parsed.error || parsed.message || errorMessage
          } catch (e) {
            errorMessage = `${errorMessage}: ${data.substring(0, 200)}`
          }
          reject(new Error(errorMessage))
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

async function verifyStudent(username, password) {
  try {
    const response = await makeRequest(`${options.baseUrl}/api/auth/student-login`, {
      method: 'POST',
      body: { username, password }
    })
    
    if (response.data.success) {
      return { success: true, user: response.data.user }
    }
    
    return { success: false, error: response.data.error || 'Login failed' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function verifyAllStudents() {
  console.log('Verifying students...\n')
  
  for (let classIndex = 0; classIndex < credentials.length; classIndex++) {
    const classData = credentials[classIndex]
    console.log(`📚 Class ${classIndex + 1}/${credentials.length}: ${classData.className || classData.classId}`)
    console.log(`   Students: ${classData.students.length}`)
    
    let classVerified = 0
    let classFailed = 0
    
    for (let i = 0; i < classData.students.length; i++) {
      const student = classData.students[i]
      stats.totalStudents++
      
      const result = await verifyStudent(student.username, student.password)
      
      if (result.success) {
        classVerified++
        stats.verifiedStudents++
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Verified ${i + 1}/${classData.students.length} students`)
        }
      } else {
        classFailed++
        stats.failedStudents++
        stats.missingStudents.push({
          class: classData.className || classData.classId,
          username: student.username,
          error: result.error
        })
        console.log(`   ✗ Failed: ${student.username} - ${result.error}`)
      }
      
      // Small delay to avoid overwhelming the API
      if (i < classData.students.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    console.log(`   ✅ Class ${classIndex + 1}: ${classVerified}/${classData.students.length} verified, ${classFailed} failed\n`)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Verification Results')
  console.log('='.repeat(50))
  console.log(`Total students: ${stats.totalStudents}`)
  console.log(`✅ Verified: ${stats.verifiedStudents}`)
  console.log(`❌ Failed: ${stats.failedStudents}`)
  console.log(`Success rate: ${((stats.verifiedStudents / stats.totalStudents) * 100).toFixed(2)}%`)
  
  if (stats.missingStudents.length > 0) {
    console.log('\n❌ Failed Students:')
    stats.missingStudents.slice(0, 20).forEach(s => {
      console.log(`   - ${s.username} (${s.class}): ${s.error}`)
    })
    if (stats.missingStudents.length > 20) {
      console.log(`   ... and ${stats.missingStudents.length - 20} more`)
    }
  }
  
  console.log('')
}

verifyAllStudents().catch(error => {
  console.error('Verification failed:', error)
  process.exit(1)
})







