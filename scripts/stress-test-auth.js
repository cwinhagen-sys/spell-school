#!/usr/bin/env node

/**
 * Authenticated Stress Test Script for Spell School
 * 
 * This script requires actual student credentials to test authenticated endpoints.
 * It simulates real student behavior including login, dashboard access, and API calls.
 * 
 * Usage:
 *   node scripts/stress-test-auth.js --students=30 --duration=60 --base-url=https://www.spellschool.se
 * 
 * Requirements:
 *   - Create a test class with test students
 *   - Set TEST_STUDENT_CREDENTIALS environment variable as JSON array:
 *     [{"username": "student1", "password": "pass1", "classId": "class-id"}, ...]
 *   - Or use --credentials-file=path/to/credentials.json
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

// Parse command line arguments
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

console.log('🚀 Spell School Authenticated Stress Test')
console.log('='.repeat(50))
console.log(`Students: ${options.students} (${options.credentials.length} credentials available)`)
console.log(`Duration: ${options.duration}s`)
console.log(`Base URL: ${options.baseUrl}`)
console.log('='.repeat(50))
console.log('')

// Statistics
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

// Helper function to make HTTP request
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

// Login and get session token
async function loginStudent(username, password) {
  try {
    const response = await makeRequest(`${options.baseUrl}/api/auth/student-login`, {
      method: 'POST',
      body: { username, password }
    })
    
    const data = JSON.parse(response.data)
    if (data.success && data.session) {
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    }
    throw new Error('Login failed')
  } catch (error) {
    throw new Error(`Login error: ${error.message}`)
  }
}

// Refresh token if needed
async function refreshTokenIfNeeded(session) {
  // Check if token is expired or will expire soon (within 5 minutes)
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000) // Supabase uses seconds
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    
    if (expiresAt < fiveMinutesFromNow) {
      // Token expired or expiring soon, but we can't refresh without Supabase client
      // For stress test, we'll just re-login if token fails
      return null
    }
  }
  return session.access_token
}

// Simulate a single authenticated student
async function simulateAuthenticatedStudent(credential, index) {
  const studentStats = {
    requests: 0,
    errors: 0,
    authSession: null,
    lastTokenRefresh: Date.now()
  }
  
  // Helper to get current token or re-login if needed
  const getAuthToken = async () => {
    if (!studentStats.authSession) {
      // Not logged in, login first
      studentStats.authSession = await loginStudent(credential.username, credential.password)
      return studentStats.authSession.access_token
    }
    
    // Check if we need to refresh (every 30 minutes or if token might be expired)
    const timeSinceRefresh = Date.now() - studentStats.lastTokenRefresh
    if (timeSinceRefresh > 30 * 60 * 1000) {
      // Try to refresh by re-logging in
      try {
        studentStats.authSession = await loginStudent(credential.username, credential.password)
        studentStats.lastTokenRefresh = Date.now()
      } catch (error) {
        // If re-login fails, use old token and hope it still works
        console.warn(`⚠️  Student ${index + 1} token refresh failed, using old token`)
      }
    }
    
    return studentStats.authSession.access_token
  }
  
  try {
    // Login
    try {
      studentStats.authSession = await loginStudent(credential.username, credential.password)
      console.log(`✓ Student ${index + 1} logged in`)
    } catch (error) {
      console.error(`✗ Student ${index + 1} login failed:`, error.message)
      return studentStats
    }
    
    // Simulate leaderboard requests (every 10 seconds)
    if (credential.classId) {
      const leaderboardInterval = setInterval(async () => {
        try {
          stats.totalRequests++
          studentStats.requests++
          
          // Get fresh token
          const token = await getAuthToken()
          const headers = {
            'Authorization': `Bearer ${token}`
          }
          
          const response = await makeRequest(`${options.baseUrl}/api/student/leaderboards`, {
            method: 'POST',
            headers,
            body: { classId: credential.classId }
          })
        } catch (error) {
          studentStats.errors++
          // If it's an auth error, try to re-login
          if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
            // Only log first few auth errors to avoid spam
            if (studentStats.errors <= 2) {
              console.warn(`⚠️  Student ${index + 1} auth error: ${error.message.substring(0, 100)}`)
            }
            studentStats.authSession = null // Force re-login on next request
          }
        }
      }, 10000)
      
      setTimeout(() => {
        clearInterval(leaderboardInterval)
      }, options.duration * 1000)
    }
    
    // Simulate dashboard page load (every 30 seconds)
    const dashboardInterval = setInterval(async () => {
      try {
        stats.totalRequests++
        studentStats.requests++
        
        // Get fresh token
        const token = await getAuthToken()
        const headers = {
          'Authorization': `Bearer ${token}`
        }
        
        // Simulate accessing student dashboard
        await makeRequest(`${options.baseUrl}/student`, {
          method: 'GET',
          headers
        }).catch(() => {
          // May fail if it's a page route, but simulates load
        })
      } catch (error) {
        studentStats.errors++
      }
    }, 30000)
    
    setTimeout(() => {
      clearInterval(dashboardInterval)
    }, options.duration * 1000)
    
  } catch (error) {
    studentStats.errors++
  }
  
  return studentStats
}

// Main test function
async function runStressTest() {
  console.log('Starting authenticated stress test...\n')
  
  const startTime = Date.now()
  const students = []
  
  // Use available credentials, repeat if needed
  const credentialsToUse = []
  for (let i = 0; i < options.students; i++) {
    credentialsToUse.push(options.credentials[i % options.credentials.length])
  }
  
  // Start all student simulations with throttling to avoid rate limits
  // Rate limit: 200 per 5 min = ~40 per minute = ~0.67 per second
  // To be safe, we'll do 1 login per 100ms = 10 per second max
  console.log(`Logging in ${credentialsToUse.length} students with throttling...`)
  
  const studentResults = []
  const BATCH_SIZE = 10 // Process 10 logins at a time
  const DELAY_BETWEEN_BATCHES_MS = 1000 // Wait 1 second between batches
  
  for (let i = 0; i < credentialsToUse.length; i += BATCH_SIZE) {
    const batch = credentialsToUse.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(credentialsToUse.length / BATCH_SIZE)
    
    console.log(`Logging in batch ${batchIndex}/${totalBatches} (${batch.length} students)...`)
    
    // Process batch in parallel
    const batchPromises = batch.map((cred, j) => 
      simulateAuthenticatedStudent(cred, i + j)
    )
    
    const batchResults = await Promise.all(batchPromises)
    studentResults.push(...batchResults)
    
    // Wait before next batch (except for last batch)
    if (i + BATCH_SIZE < credentialsToUse.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS))
    }
  }
  
  console.log(`\n${studentResults.filter(s => s.authSession).length} students logged in successfully`)
  console.log('Running stress test...\n')
  
  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, options.duration * 1000))
  
  const endTime = Date.now()
  const totalTime = (endTime - startTime) / 1000
  
  // Print statistics
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results')
  console.log('='.repeat(50))
  console.log(`Total Duration: ${totalTime.toFixed(2)}s`)
  console.log(`Total Requests: ${stats.totalRequests}`)
  console.log(`Successful: ${stats.successfulRequests}`)
  console.log(`Failed: ${stats.failedRequests}`)
  console.log(`Auth Failures: ${stats.authFailures}`)
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
  
  if (stats.errors.length > 0) {
    console.log(`\nErrors (showing first 10):`)
    const uniqueErrors = [...new Set(stats.errors)].slice(0, 10)
    uniqueErrors.forEach(err => console.log(`  - ${err}`))
  }
  
  console.log('\n' + '='.repeat(50))
  
  // Performance analysis
  console.log('\n📈 Performance Analysis')
  console.log('='.repeat(50))
  
  const requestsPerSecond = stats.totalRequests / totalTime
  const requestsPerStudentPerSecond = requestsPerSecond / options.students
  
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
    
    if (stats.authFailures > 0) {
      console.log(`⚠️  WARNING: ${stats.authFailures} authentication failures`)
    }
  }
  
  console.log('')
}

// Run the test
runStressTest().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})

