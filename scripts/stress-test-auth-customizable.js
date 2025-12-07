#!/usr/bin/env node

/**
 * CUSTOMIZABLE Stress Test Script
 * 
 * Detta är en modifierbar version av stress-testet där du enkelt kan ändra
 * vad eleverna gör under testet.
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

// ============================================
// KONFIGURATION - Ändra dessa värden!
// ============================================

const CONFIG = {
  // Hur ofta elever hämtar leaderboard (i millisekunder)
  // 10000 = var 10:e sekund
  // 5000 = var 5:e sekund (mer aggressivt)
  // 20000 = var 20:e sekund (mindre aggressivt)
  LEADERBOARD_INTERVAL: 10000,
  
  // Hur ofta elever laddar dashboard (i millisekunder)
  // 30000 = var 30:e sekund
  DASHBOARD_INTERVAL: 30000,
  
  // Hur ofta elever simulerar activity tracking (i millisekunder)
  // 60000 = var 60:e sekund (1 minut)
  // Sätt till null för att stänga av
  ACTIVITY_TRACKING_INTERVAL: 60000,
  
  // Simulera spelresultat? (true/false)
  // Om true, skickar elever fake spelresultat
  SIMULATE_GAME_RESULTS: false,
  
  // Hur ofta elever skickar spelresultat (i millisekunder)
  // Bara relevant om SIMULATE_GAME_RESULTS är true
  GAME_RESULTS_INTERVAL: 60000,
}

// ============================================
// RESTEN AV KODEN (behöver normalt inte ändras)
// ============================================

const args = process.argv.slice(2)
const options = {
  students: 30,
  duration: 60,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  credentialsFile: process.env.CREDENTIALS_FILE || null,
  credentials: null
}

args.forEach(arg => {
  if (arg.startsWith('--students=')) {
    options.students = parseInt(arg.split('=')[1]) || 30
  } else if (arg.startsWith('--duration=')) {
    options.duration = parseInt(arg.split('=')[1]) || 60
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
} else if (process.env.TEST_STUDENT_CREDENTIALS) {
  try {
    options.credentials = JSON.parse(process.env.TEST_STUDENT_CREDENTIALS)
  } catch (error) {
    console.error('Error parsing TEST_STUDENT_CREDENTIALS:', error.message)
    process.exit(1)
  }
}

if (!options.credentials || options.credentials.length === 0) {
  console.error('No credentials provided. Set TEST_STUDENT_CREDENTIALS env var or use --credentials-file')
  process.exit(1)
}

console.log('🚀 Spell School Customizable Stress Test')
console.log('='.repeat(50))
console.log(`Students: ${options.students}`)
console.log(`Duration: ${options.duration}s`)
console.log(`Base URL: ${options.baseUrl}`)
console.log('\n📋 Test Configuration:')
console.log(`  Leaderboard requests: every ${CONFIG.LEADERBOARD_INTERVAL/1000}s`)
console.log(`  Dashboard requests: every ${CONFIG.DASHBOARD_INTERVAL/1000}s`)
console.log(`  Activity tracking: ${CONFIG.ACTIVITY_TRACKING_INTERVAL ? `every ${CONFIG.ACTIVITY_TRACKING_INTERVAL/1000}s` : 'disabled'}`)
console.log(`  Game results: ${CONFIG.SIMULATE_GAME_RESULTS ? `every ${CONFIG.GAME_RESULTS_INTERVAL/1000}s` : 'disabled'}`)
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
  requestsByEndpoint: {}
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

// Simulate a single authenticated student
async function simulateAuthenticatedStudent(credential, index) {
  const studentStats = {
    requests: 0,
    errors: 0,
    authToken: null
  }
  
  try {
    // Login
    try {
      studentStats.authToken = await loginStudent(credential.username, credential.password)
      console.log(`✓ Student ${index + 1} logged in`)
    } catch (error) {
      console.error(`✗ Student ${index + 1} login failed:`, error.message)
      return studentStats
    }
    
    const headers = {
      'Authorization': `Bearer ${studentStats.authToken}`
    }
    
    // ============================================
    // SIMULERA LEADERBOARD REQUESTS
    // ============================================
    if (credential.classId && CONFIG.LEADERBOARD_INTERVAL) {
      const leaderboardInterval = setInterval(async () => {
        try {
          stats.totalRequests++
          studentStats.requests++
          await makeRequest(`${options.baseUrl}/api/student/leaderboards`, {
            method: 'POST',
            headers,
            body: { classId: credential.classId }
          })
        } catch (error) {
          studentStats.errors++
        }
      }, CONFIG.LEADERBOARD_INTERVAL)
      
      setTimeout(() => {
        clearInterval(leaderboardInterval)
      }, options.duration * 1000)
    }
    
    // ============================================
    // SIMULERA DASHBOARD PAGE LOAD
    // ============================================
    if (CONFIG.DASHBOARD_INTERVAL) {
      const dashboardInterval = setInterval(async () => {
        try {
          stats.totalRequests++
          studentStats.requests++
          await makeRequest(`${options.baseUrl}/student`, {
            method: 'GET',
            headers
          }).catch(() => {
            // May fail if it's a page route, but simulates load
          })
        } catch (error) {
          studentStats.errors++
        }
      }, CONFIG.DASHBOARD_INTERVAL)
      
      setTimeout(() => {
        clearInterval(dashboardInterval)
      }, options.duration * 1000)
    }
    
    // ============================================
    // SIMULERA ACTIVITY TRACKING
    // ============================================
    if (CONFIG.ACTIVITY_TRACKING_INTERVAL) {
      const activityInterval = setInterval(async () => {
        try {
          stats.totalRequests++
          studentStats.requests++
          // Simulera activity tracking API-anrop
          await makeRequest(`${options.baseUrl}/api/activity`, {
            method: 'POST',
            headers
          }).catch(() => {
            // API kanske inte finns ännu, det är okej
          })
        } catch (error) {
          studentStats.errors++
        }
      }, CONFIG.ACTIVITY_TRACKING_INTERVAL)
      
      setTimeout(() => {
        clearInterval(activityInterval)
      }, options.duration * 1000)
    }
    
    // ============================================
    // SIMULERA SPELRESULTAT (valfritt)
    // ============================================
    if (CONFIG.SIMULATE_GAME_RESULTS && CONFIG.GAME_RESULTS_INTERVAL) {
      const gameResultsInterval = setInterval(async () => {
        try {
          stats.totalRequests++
          studentStats.requests++
          // Simulera att en elev skickar in ett spelresultat
          await makeRequest(`${options.baseUrl}/api/game-result`, {
            method: 'POST',
            headers,
            body: {
              gameType: 'flashcards',
              score: Math.floor(Math.random() * 100),
              totalWords: 10
            }
          }).catch(() => {
            // API kanske inte finns ännu, det är okej
          })
        } catch (error) {
          studentStats.errors++
        }
      }, CONFIG.GAME_RESULTS_INTERVAL)
      
      setTimeout(() => {
        clearInterval(gameResultsInterval)
      }, options.duration * 1000)
    }
    
  } catch (error) {
    studentStats.errors++
  }
  
  return studentStats
}

async function runStressTest() {
  console.log('Starting stress test...\n')
  
  const startTime = Date.now()
  
  const credentialsToUse = []
  for (let i = 0; i < options.students; i++) {
    credentialsToUse.push(options.credentials[i % options.credentials.length])
  }
  
  console.log(`Logging in ${credentialsToUse.length} students...`)
  const loginPromises = credentialsToUse.map((cred, i) => 
    simulateAuthenticatedStudent(cred, i)
  )
  
  const studentResults = await Promise.all(loginPromises)
  
  console.log(`\n${studentResults.filter(s => s.authToken).length} students logged in successfully`)
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
  
  console.log('\n' + '='.repeat(50))
  
  const requestsPerSecond = stats.totalRequests / totalTime
  const requestsPerStudentPerSecond = requestsPerSecond / options.students
  
  console.log(`\n📈 Performance Analysis`)
  console.log('='.repeat(50))
  console.log(`Requests per second: ${requestsPerSecond.toFixed(2)}`)
  console.log(`Requests per student per second: ${requestsPerStudentPerSecond.toFixed(2)}`)
  
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




