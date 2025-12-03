#!/usr/bin/env node

/**
 * Game Complete Stress Test Script for Spell School
 * 
 * Simulates multiple students completing games simultaneously to test
 * database performance and identify bottlenecks.
 * 
 * Usage:
 *   node scripts/stress-test-game-complete.js --students=50 --base-url=https://www.spellschool.se
 * 
 * Requirements:
 *   - Set TEST_STUDENT_CREDENTIALS environment variable as JSON array:
 *     [{"username": "student1", "password": "pass1", "classId": "class-id"}, ...]
 *   - Or use --credentials-file=path/to/credentials.json
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  students: 30,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  credentialsFile: process.env.CREDENTIALS_FILE || null,
  credentials: null,
  gameType: 'typing', // Default game type
  score: 100, // Default score
  pointsToAdd: 50 // Default XP to add
}

args.forEach(arg => {
  if (arg.startsWith('--students=')) {
    options.students = parseInt(arg.split('=')[1]) || 30
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1]
  } else if (arg.startsWith('--credentials-file=')) {
    options.credentialsFile = arg.split('=')[1]
  } else if (arg.startsWith('--game-type=')) {
    options.gameType = arg.split('=')[1] || 'typing'
  } else if (arg.startsWith('--score=')) {
    options.score = parseInt(arg.split('=')[1]) || 100
  } else if (arg.startsWith('--points=')) {
    options.pointsToAdd = parseInt(arg.split('=')[1]) || 50
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

console.log('🎮 Game Complete Stress Test')
console.log('='.repeat(50))
console.log(`Students: ${options.students}`)
console.log(`Game Type: ${options.gameType}`)
console.log(`Score: ${options.score}`)
console.log(`Points to Add: ${options.pointsToAdd}`)
console.log(`Base URL: ${options.baseUrl}`)
console.log('='.repeat(50))
console.log('')

// Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: [],
  requestsByEndpoint: {},
  databaseOperations: {
    endGameSession: 0,
    updateProgress: 0,
    xpSync: 0,
    questSync: 0
  }
}

// Helper function to make HTTP request
function makeRequest(url, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const startTime = Date.now()
    const endpoint = urlObj.pathname
    
    const req = client.request(url, {
      method: requestOptions.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...requestOptions.headers
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
          stats.requestsByEndpoint[endpoint] = { 
            count: 0, 
            totalTime: 0, 
            errors: 0,
            success: 0
          }
        }
        stats.requestsByEndpoint[endpoint].count++
        stats.requestsByEndpoint[endpoint].totalTime += responseTime
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++
          stats.requestsByEndpoint[endpoint].success++
          resolve({ status: res.statusCode, data, responseTime })
        } else {
          stats.failedRequests++
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
    
    if (requestOptions.body) {
      req.write(JSON.stringify(requestOptions.body))
    }
    
    req.end()
  })
}

// Login and get session token + user info
async function loginStudent(username, password) {
  try {
    const response = await makeRequest(`${options.baseUrl}/api/auth/student-login`, {
      method: 'POST',
      body: { username, password }
    })
    
    const data = JSON.parse(response.data)
    if (data.success && data.session && data.user) {
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user_id: data.user.id // Store user ID for XP sync
      }
    }
    throw new Error('Login failed')
  } catch (error) {
    throw new Error(`Login error: ${error.message}`)
  }
}

// Simulate game completion - mimics what happens when a student finishes a game
async function simulateGameComplete(credential, index) {
  const studentStats = {
    requests: 0,
    errors: 0,
    authSession: null,
    operations: {
      endGameSession: false,
      updateProgress: false,
      xpSync: false,
      questSync: false
    }
  }
  
  try {
    // Login first
    try {
      studentStats.authSession = await loginStudent(credential.username, credential.password)
      console.log(`✓ Student ${index + 1} logged in`)
    } catch (error) {
      console.error(`✗ Student ${index + 1} login failed:`, error.message)
      return studentStats
    }
    
    const token = studentStats.authSession.access_token
    const headers = {
      'authorization': `Bearer ${token}`, // Use lowercase to match quest-sync
      'Content-Type': 'application/json'
    }
    
    const startTime = Date.now()
    
    // Simulate what happens when a game completes:
    // Note: In real app, endGameSession() and updateStudentProgress() are done
    // directly from client via Supabase, but XP/Quest sync goes through API.
    // We'll test the API sync operations which create similar database load.
    // In the real app, these happen client-side via Supabase client:
    // 1. endGameSession() - INSERT/UPDATE to game_sessions (blocking)
    // 2. updateStudentProgress() - UPDATE profiles + SELECT + UPDATE student_progress (blocking)
    // 3. XP sync - Batch insert to xp_events (via API, non-blocking)
    // 4. Quest sync - Batch insert to quest progress (via API, non-blocking)
    
    // Since we can't directly call Supabase client from Node.js,
    // we'll simulate the database load by making API calls that trigger similar operations
    // The XP and Quest sync APIs will create similar database load
    
    // Step 3: Simulate XP sync (batch insert to xp_events)
    // Use user.id from login response (UUID), not username
    const userId = studentStats.authSession?.user_id
    if (!userId) {
      console.error(`  ✗ Student ${index + 1}: No user_id from login`)
      studentStats.errors++
    } else {
      try {
        stats.totalRequests++
        studentStats.requests++
        stats.databaseOperations.xpSync++
        
        const xpEvent = {
          id: crypto.randomUUID(), // Generate proper UUID
          student_id: userId, // Use UUID from login, not username
          kind: options.gameType,
          delta: options.pointsToAdd,
          created_at: new Date().toISOString(),
          metadata: {
            game_session: {
              started_at: new Date(Date.now() - 60000).toISOString(),
              finished_at: new Date().toISOString(),
              accuracy_pct: options.score
            }
          }
        }
        
        const xpResponse = await makeRequest(`${options.baseUrl}/api/xp-sync`, {
          method: 'POST',
          headers,
          body: { events: [xpEvent] }
        })
        
        studentStats.operations.xpSync = true
        console.log(`  ✓ Student ${index + 1}: XP sync completed`)
      } catch (error) {
        studentStats.errors++
        // Log more details for debugging
        const errorDetails = error.message || error.toString()
        const hasToken = headers['authorization'] || headers['Authorization'] ? 'Yes' : 'No'
        const tokenLength = (headers['authorization'] || headers['Authorization'] || '').length
        console.error(`  ✗ Student ${index + 1}: XP sync failed:`, errorDetails.substring(0, 80))
        console.error(`    Debug: Token present: ${hasToken}, Length: ${tokenLength}, User ID: ${userId.substring(0, 8)}...`)
      }
    }
    
    // Step 4: Simulate Quest sync (quest progress update)
    try {
      stats.totalRequests++
      studentStats.requests++
      stats.databaseOperations.questSync++
      
      const questEvent = {
        id: crypto.randomUUID(), // Generate proper UUID (required by schema)
        type: 'QUEST_PROGRESS',
        questId: 'play_3_games',
        delta: 1,
        ts: Date.now()
      }
      
      const questResponse = await makeRequest(`${options.baseUrl}/api/quest-sync`, {
        method: 'POST',
        headers,
        body: { events: [questEvent] }
      })
      
      studentStats.operations.questSync = true
      console.log(`  ✓ Student ${index + 1}: Quest sync completed`)
    } catch (error) {
      studentStats.errors++
      console.error(`  ✗ Student ${index + 1}: Quest sync failed:`, error.message.substring(0, 50))
    }
    
    const totalTime = Date.now() - startTime
    console.log(`✓ Student ${index + 1}: Game complete simulation finished in ${totalTime}ms`)
    
    return studentStats
  } catch (error) {
    studentStats.errors++
    console.error(`✗ Student ${index + 1}: Game complete simulation failed:`, error.message)
    return studentStats
  }
}

// Main test function
async function runStressTest() {
  console.log('Starting game complete stress test...\n')
  
  const startTime = Date.now()
  
  // Use available credentials, repeat if needed
  const credentialsToUse = []
  for (let i = 0; i < options.students; i++) {
    credentialsToUse.push(options.credentials[i % options.credentials.length])
  }
  
  // OPTION 1: All students complete game simultaneously (worst case)
  console.log(`Simulating ${credentialsToUse.length} students completing games SIMULTANEOUSLY...\n`)
  const gameCompletePromises = credentialsToUse.map((cred, i) => 
    simulateGameComplete(cred, i)
  )
  
  const results = await Promise.all(gameCompletePromises)
  
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
  console.log(`Success Rate: ${stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) : 0}%`)
  
  if (stats.totalRequests > 0) {
    const avgResponseTime = stats.totalResponseTime / stats.totalRequests
    console.log(`\nResponse Times:`)
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`)
    console.log(`  Min: ${stats.minResponseTime === Infinity ? 'N/A' : stats.minResponseTime + 'ms'}`)
    console.log(`  Max: ${stats.maxResponseTime}ms`)
    console.log(`  Requests/sec: ${(stats.totalRequests / totalTime).toFixed(2)}`)
  }
  
  console.log(`\nDatabase Operations:`)
  console.log(`  XP Sync: ${stats.databaseOperations.xpSync}`)
  console.log(`  Quest Sync: ${stats.databaseOperations.questSync}`)
  console.log(`  Total DB Operations: ${stats.databaseOperations.xpSync + stats.databaseOperations.questSync}`)
  
  console.log(`\nRequests by Endpoint:`)
  Object.entries(stats.requestsByEndpoint).forEach(([endpoint, data]) => {
    const avgTime = data.totalTime / data.count
    const successRate = data.count > 0 ? ((data.success / data.count) * 100).toFixed(2) : 0
    console.log(`  ${endpoint}:`)
    console.log(`    Requests: ${data.count}`)
    console.log(`    Success: ${data.success} (${successRate}%)`)
    console.log(`    Errors: ${data.errors}`)
    console.log(`    Avg Time: ${avgTime.toFixed(2)}ms`)
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
  
  console.log(`Requests per second: ${requestsPerSecond.toFixed(2)}`)
  console.log(`Database operations per second: ${((stats.databaseOperations.xpSync + stats.databaseOperations.questSync) / totalTime).toFixed(2)}`)
  
  if (stats.totalRequests > 0) {
    const avgResponseTime = stats.totalResponseTime / stats.totalRequests
    if (avgResponseTime > 1000) {
      console.log('⚠️  WARNING: Average response time is high (>1s) - users will experience lag')
    }
    
    if (stats.failedRequests / stats.totalRequests > 0.1) {
      console.log('⚠️  WARNING: Failure rate is high (>10%)')
    }
    
    if (avgResponseTime > 500 && avgResponseTime <= 1000) {
      console.log('⚠️  WARNING: Average response time is moderate (500ms-1s) - some users may experience lag')
    }
  }
  
  // Estimate user experience
  console.log('\n👥 Estimated User Experience:')
  if (stats.totalRequests > 0) {
    const avgResponseTime = stats.totalResponseTime / stats.totalRequests
    if (avgResponseTime < 200) {
      console.log('✅ Excellent: Users will not notice any lag (<200ms)')
    } else if (avgResponseTime < 500) {
      console.log('✅ Good: Minor lag may be noticeable but acceptable (200-500ms)')
    } else if (avgResponseTime < 1000) {
      console.log('⚠️  Moderate: Noticeable lag, may affect user experience (500ms-1s)')
    } else {
      console.log('❌ Poor: Significant lag, users will experience freezing (>1s)')
    }
  }
  
  console.log('')
}

// Run the test
runStressTest().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})

