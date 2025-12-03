#!/usr/bin/env node

/**
 * Multi-Class Stress Test Script
 * 
 * Detta script testar flera klasser samtidigt för att hitta skalningsgränser.
 * 
 * Användning:
 *   node scripts/stress-test-multi-class.js \
 *     --classes=5 \
 *     --students-per-class=30 \
 *     --duration=120 \
 *     --base-url=https://www.spellschool.se \
 *     --credentials-file=multi-class-credentials.json
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const options = {
  classes: 5,
  studentsPerClass: 30,
  duration: 120,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  credentialsFile: process.env.CREDENTIALS_FILE || null,
  credentials: null
}

args.forEach(arg => {
  if (arg.startsWith('--classes=')) {
    options.classes = parseInt(arg.split('=')[1]) || 5
  } else if (arg.startsWith('--students-per-class=')) {
    options.studentsPerClass = parseInt(arg.split('=')[1]) || 30
  } else if (arg.startsWith('--duration=')) {
    options.duration = parseInt(arg.split('=')[1]) || 120
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1]
  } else if (arg.startsWith('--credentials-file=')) {
    options.credentialsFile = arg.split('=')[1]
  }
})

// Load credentials
if (options.credentialsFile) {
  try {
    const filePath = path.resolve(options.credentialsFile)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    options.credentials = JSON.parse(fileContent)
  } catch (error) {
    console.error('Error loading credentials file:', error.message)
    process.exit(1)
  }
}

if (!options.credentials || !Array.isArray(options.credentials)) {
  console.error('No credentials provided or invalid format. Expected array of class objects.')
  console.error('Format: [{ classId: "...", students: [{ username: "...", password: "..." }] }]')
  process.exit(1)
}

console.log('🚀 Spell School Multi-Class Stress Test')
console.log('='.repeat(50))
console.log(`Classes: ${options.classes}`)
console.log(`Students per class: ${options.studentsPerClass}`)
console.log(`Total students: ${options.classes * options.studentsPerClass}`)
console.log(`Duration: ${options.duration}s`)
console.log(`Base URL: ${options.baseUrl}`)
console.log('='.repeat(50))
console.log('')

const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  authFailures: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: [],
  requestsByEndpoint: {},
  requestsByClass: {}
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const startTime = Date.now()
    const endpoint = urlObj.pathname
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 60000 // Increased timeout to 60 seconds for slower responses
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        const responseTime = Date.now() - startTime
        stats.totalResponseTime += responseTime
        stats.minResponseTime = Math.min(stats.minResponseTime, responseTime)
        stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime)
        
        if (!stats.requestsByEndpoint[endpoint]) {
          stats.requestsByEndpoint[endpoint] = { count: 0, totalTime: 0, errors: 0 }
        }
        stats.requestsByEndpoint[endpoint].count++
        stats.requestsByEndpoint[endpoint].totalTime += responseTime
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++
          resolve({ status: res.statusCode, data, responseTime })
        } else {
          stats.failedRequests++
          if (res.statusCode === 401 || res.statusCode === 403) {
            stats.authFailures++
          }
          stats.requestsByEndpoint[endpoint].errors++
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`))
        }
      })
    })
    
    req.on('error', (error) => {
      stats.failedRequests++
      stats.errors.push(error.message)
      if (stats.requestsByEndpoint[endpoint]) {
        stats.requestsByEndpoint[endpoint].errors++
      }
      reject(error)
    })
    
    req.on('timeout', () => {
      req.destroy()
      stats.failedRequests++
      stats.errors.push(`Timeout: ${endpoint}`)
      if (stats.requestsByEndpoint[endpoint]) {
        stats.requestsByEndpoint[endpoint].errors++
      }
      reject(new Error('Request timeout'))
    })
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function loginStudent(username, password, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add exponential backoff delay between retries
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Max 5 seconds
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      const response = await makeRequest(`${options.baseUrl}/api/auth/student-login`, {
        method: 'POST',
        body: { username, password }
      })
      
      // Parse response data (it comes as a string from makeRequest)
      let responseData = response.data
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData)
        } catch (e) {
          // If parsing fails, it's not JSON
        }
      }
      
      if (responseData && responseData.success && responseData.session) {
        return responseData.session.access_token
      }
      
      // If we get here, login didn't succeed but didn't throw an error
      if (attempt === retries - 1) {
        throw new Error(responseData?.error || 'Login failed')
      }
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempt === retries - 1) {
        throw new Error(`Login error: ${error.message}`)
      }
      // Otherwise, log and retry
      if (attempt === 0) {
        // Only log on first attempt to avoid spam
        console.log(`   ⚠️  Login attempt ${attempt + 1} failed for ${username}, retrying...`)
      }
    }
  }
}

// Simulate students from a single class
async function simulateClass(classData, classIndex) {
  const classStats = {
    requests: 0,
    errors: 0,
    studentsLoggedIn: 0
  }
  
  if (!stats.requestsByClass[classData.classId]) {
    stats.requestsByClass[classData.classId] = { requests: 0, errors: 0, students: 0 }
  }
  
  const students = classData.students.slice(0, options.studentsPerClass)
  const studentTokens = new Map()
  
  // Login all students (with delays to avoid overwhelming the API)
  console.log(`📚 Class ${classIndex + 1} (${classData.classId}): Logging in ${students.length} students...`)
  
  // Login students in smaller batches to avoid overwhelming the API
  const batchSize = 5 // Login 5 at a time
  for (let batchStart = 0; batchStart < students.length; batchStart += batchSize) {
    const batch = students.slice(batchStart, batchStart + batchSize)
    
    // Login batch in parallel (but limited to batchSize)
    const loginPromises = batch.map(async (student, batchIndex) => {
      try {
        // Stagger logins slightly even within batch
        await new Promise(resolve => setTimeout(resolve, batchIndex * 200))
        
        const token = await loginStudent(student.username, student.password)
        studentTokens.set(student.username, token)
        classStats.studentsLoggedIn++
        stats.requestsByClass[classData.classId].students++
        return { success: true, username: student.username }
      } catch (error) {
        console.error(`  ✗ Failed to login ${student.username}:`, error.message)
        return { success: false, username: student.username, error: error.message }
      }
    })
    
    // Wait for batch to complete
    const results = await Promise.all(loginPromises)
    const successCount = results.filter(r => r.success).length
    
    if ((batchStart + batchSize) % 10 === 0 || batchStart + batchSize >= students.length) {
      console.log(`  ✓ ${Math.min(batchStart + batchSize, students.length)}/${students.length} students processed (${classStats.studentsLoggedIn} logged in)`)
    }
    
    // Delay between batches to avoid rate limiting
    if (batchStart + batchSize < students.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second between batches
    }
  }
  
  console.log(`✅ Class ${classIndex + 1}: ${classStats.studentsLoggedIn}/${students.length} students logged in`)
  
  // Simulate activity for each student
  const intervals = []
  
  studentTokens.forEach((token, username) => {
    const headers = {
      'Authorization': `Bearer ${token}`
    }
    
    // Leaderboard requests every 10 seconds (with random jitter to avoid thundering herd)
    const baseInterval = 10000
    const jitter = Math.random() * 2000 // 0-2 seconds random delay
    const leaderboardInterval = setInterval(async () => {
      try {
        // Add small random delay to spread out requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500))
        
        stats.totalRequests++
        classStats.requests++
        stats.requestsByClass[classData.classId].requests++
        await makeRequest(`${options.baseUrl}/api/student/leaderboards`, {
          method: 'POST',
          headers,
          body: { classId: classData.classId }
        })
      } catch (error) {
        classStats.errors++
        stats.requestsByClass[classData.classId].errors++
        // Log error details for debugging
        if (error.message && !error.message.includes('timeout')) {
          console.error(`   Leaderboard error for ${username}:`, error.message.substring(0, 100))
        }
      }
    }, baseInterval + jitter)
    
    intervals.push(leaderboardInterval)
    
    // Dashboard requests every 30 seconds
    const dashboardInterval = setInterval(async () => {
      try {
        stats.totalRequests++
        classStats.requests++
        stats.requestsByClass[classData.classId].requests++
        await makeRequest(`${options.baseUrl}/student`, {
          method: 'GET',
          headers
        }).catch(() => {
          // May fail if it's a page route, but simulates load
        })
      } catch (error) {
        classStats.errors++
        stats.requestsByClass[classData.classId].errors++
      }
    }, 30000)
    
    intervals.push(dashboardInterval)
  })
  
  // Clear intervals after duration
  setTimeout(() => {
    intervals.forEach(interval => clearInterval(interval))
  }, options.duration * 1000)
  
  return classStats
}

async function runStressTest() {
  console.log('Starting multi-class stress test...\n')
  
  const startTime = Date.now()
  
  // Limit to requested number of classes
  const classesToTest = options.credentials.slice(0, options.classes)
  
  console.log(`Testing ${classesToTest.length} classes...\n`)
  
  // Simulate all classes concurrently
  const classPromises = classesToTest.map((classData, index) => 
    simulateClass(classData, index)
  )
  
  const classResults = await Promise.all(classPromises)
  
  console.log(`\n${classResults.filter(c => c.studentsLoggedIn > 0).length} classes active`)
  console.log('Running stress test...\n')
  
  await new Promise(resolve => setTimeout(resolve, options.duration * 1000))
  
  const endTime = Date.now()
  const totalTime = (endTime - startTime) / 1000
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results')
  console.log('='.repeat(50))
  console.log(`Total Duration: ${totalTime.toFixed(2)}s`)
  console.log(`Total Requests: ${stats.totalRequests}`)
  console.log(`Successful: ${stats.successfulRequests}`)
  console.log(`Failed: ${stats.failedRequests}`)
  console.log(`Success Rate: ${stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) : 0}%`)
  
  if (stats.totalRequests > 0) {
    const avgResponseTime = stats.totalResponseTime / stats.totalRequests
    console.log(`\nResponse Times:`)
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`)
    console.log(`  Min: ${stats.minResponseTime === Infinity ? 'N/A' : stats.minResponseTime + 'ms'}`)
    console.log(`  Max: ${stats.maxResponseTime}ms`)
    console.log(`  Requests/sec: ${(stats.totalRequests / totalTime).toFixed(2)}`)
  }
  
  console.log(`\nRequests by Endpoint:`)
  Object.entries(stats.requestsByEndpoint).forEach(([endpoint, data]) => {
    const avgTime = data.totalTime / data.count
    console.log(`  ${endpoint}:`)
    console.log(`    Requests: ${data.count}`)
    console.log(`    Avg Time: ${avgTime.toFixed(2)}ms`)
    console.log(`    Errors: ${data.errors}`)
  })
  
  console.log(`\nRequests by Class:`)
  Object.entries(stats.requestsByClass).forEach(([classId, data]) => {
    console.log(`  ${classId}:`)
    console.log(`    Students: ${data.students}`)
    console.log(`    Requests: ${data.requests}`)
    console.log(`    Errors: ${data.errors}`)
  })
  
  console.log('\n' + '='.repeat(50))
  
  const requestsPerSecond = stats.totalRequests / totalTime
  const requestsPerClassPerSecond = requestsPerSecond / classesToTest.length
  
  console.log(`\n📈 Performance Analysis`)
  console.log('='.repeat(50))
  console.log(`Requests per second: ${requestsPerSecond.toFixed(2)}`)
  console.log(`Requests per class per second: ${requestsPerClassPerSecond.toFixed(2)}`)
  
  if (stats.totalRequests > 0) {
    const avgResponseTime = stats.totalResponseTime / stats.totalRequests
    if (avgResponseTime > 1000) {
      console.log('⚠️  WARNING: Average response time is high (>1s)')
    }
    
    if (stats.failedRequests / stats.totalRequests > 0.1) {
      console.log('⚠️  WARNING: Failure rate is high (>10%)')
    }
  }
  
  console.log('')
}

runStressTest().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})

