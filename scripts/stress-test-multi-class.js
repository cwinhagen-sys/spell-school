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
      timeout: 30000
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

async function loginStudent(username, password) {
  try {
    const response = await makeRequest(`${options.baseUrl}/api/auth/student-login`, {
      method: 'POST',
      body: { username, password }
    })
    
    const data = JSON.parse(response.data)
    if (data.success && data.session) {
      return data.session.access_token
    }
    throw new Error('Login failed')
  } catch (error) {
    throw new Error(`Login error: ${error.message}`)
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
  
  // Login all students
  console.log(`📚 Class ${classIndex + 1} (${classData.classId}): Logging in ${students.length} students...`)
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    try {
      const token = await loginStudent(student.username, student.password)
      studentTokens.set(student.username, token)
      classStats.studentsLoggedIn++
      stats.requestsByClass[classData.classId].students++
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ ${i + 1}/${students.length} students logged in`)
      }
    } catch (error) {
      console.error(`  ✗ Failed to login ${student.username}:`, error.message)
    }
  }
  
  console.log(`✅ Class ${classIndex + 1}: ${classStats.studentsLoggedIn}/${students.length} students logged in`)
  
  // Simulate activity for each student
  const intervals = []
  
  studentTokens.forEach((token, username) => {
    const headers = {
      'Authorization': `Bearer ${token}`
    }
    
    // Leaderboard requests every 10 seconds
    const leaderboardInterval = setInterval(async () => {
      try {
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
      }
    }, 10000)
    
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

