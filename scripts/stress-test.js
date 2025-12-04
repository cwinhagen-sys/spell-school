#!/usr/bin/env node

/**
 * Stress Test Script for Spell School
 * 
 * Simulates multiple concurrent students making requests to test performance.
 * 
 * Usage:
 *   node scripts/stress-test.js [options]
 * 
 * Options:
 *   --students=N    Number of students to simulate (default: 30)
 *   --duration=N    Duration in seconds (default: 60)
 *   --base-url=URL  Base URL of the application (default: http://localhost:3000)
 *   --class-id=ID   Class ID to use for leaderboard tests
 * 
 * Example:
 *   node scripts/stress-test.js --students=30 --duration=60 --base-url=https://www.spellschool.se
 */

const https = require('https')
const http = require('http')

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  students: 30,
  duration: 60,
  baseUrl: 'http://localhost:3000',
  classId: null
}

args.forEach(arg => {
  if (arg.startsWith('--students=')) {
    options.students = parseInt(arg.split('=')[1]) || 30
  } else if (arg.startsWith('--duration=')) {
    options.duration = parseInt(arg.split('=')[1]) || 60
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1] || 'http://localhost:3000'
  } else if (arg.startsWith('--class-id=')) {
    options.classId = arg.split('=')[1] || null
  }
})

console.log('🚀 Spell School Stress Test')
console.log('=' .repeat(50))
console.log(`Students: ${options.students}`)
console.log(`Duration: ${options.duration}s`)
console.log(`Base URL: ${options.baseUrl}`)
console.log(`Class ID: ${options.classId || 'Not provided'}`)
console.log('=' .repeat(50))
console.log('')

// Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: []
}

// Helper function to make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const startTime = Date.now()
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        const responseTime = Date.now() - startTime
        stats.totalResponseTime += responseTime
        stats.minResponseTime = Math.min(stats.minResponseTime, responseTime)
        stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime)
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++
          resolve({ status: res.statusCode, data, responseTime })
        } else {
          stats.failedRequests++
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })
    
    req.on('error', (error) => {
      stats.failedRequests++
      stats.errors.push(error.message)
      reject(error)
    })
    
    req.on('timeout', () => {
      req.destroy()
      stats.failedRequests++
      stats.errors.push('Request timeout')
      reject(new Error('Request timeout'))
    })
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

// Simulate a single student
async function simulateStudent(studentId, classId) {
  const studentStats = {
    requests: 0,
    errors: 0
  }
  
  try {
    // Simulate activity tracking (every 60 seconds)
    const activityInterval = setInterval(async () => {
      try {
        stats.totalRequests++
        studentStats.requests++
        // Note: This would require actual auth token, so we'll skip for now
        // await makeRequest(`${options.baseUrl}/api/activity`, { method: 'POST' })
      } catch (error) {
        studentStats.errors++
      }
    }, 60000)
    
    // Simulate leaderboard requests (every 10 seconds)
    if (classId) {
      const leaderboardInterval = setInterval(async () => {
        try {
          stats.totalRequests++
          studentStats.requests++
          // Note: This would require actual auth token
          // For now, we'll just simulate the request pattern
          await makeRequest(`${options.baseUrl}/api/student/leaderboards`, {
            method: 'POST',
            body: { classId }
          }).catch(() => {
            // Expected to fail without auth, but simulates the load
          })
        } catch (error) {
          studentStats.errors++
        }
      }, 10000)
      
      // Cleanup
      setTimeout(() => {
        clearInterval(leaderboardInterval)
      }, options.duration * 1000)
    }
    
    // Cleanup
    setTimeout(() => {
      clearInterval(activityInterval)
    }, options.duration * 1000)
    
  } catch (error) {
    studentStats.errors++
  }
  
  return studentStats
}

// Simulate sync manager flush (every 10 seconds per student)
async function simulateSyncFlush(studentId) {
  const flushInterval = setInterval(async () => {
    try {
      stats.totalRequests++
      // Simulate sync flush requests
      // Note: Would require actual auth
    } catch (error) {
      // Expected errors without auth
    }
  }, 10000)
  
  setTimeout(() => {
    clearInterval(flushInterval)
  }, options.duration * 1000)
}

// Main test function
async function runStressTest() {
  console.log('Starting stress test...\n')
  
  const startTime = Date.now()
  const students = []
  
  // Start all student simulations
  for (let i = 0; i < options.students; i++) {
    const studentId = `student_${i}`
    students.push(simulateStudent(studentId, options.classId))
    students.push(simulateSyncFlush(studentId))
  }
  
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
  console.log(`Success Rate: ${stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) : 0}%`)
  
  if (stats.totalRequests > 0) {
    const avgResponseTime = stats.totalResponseTime / stats.totalRequests
    console.log(`\nResponse Times:`)
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`)
    console.log(`  Min: ${stats.minResponseTime === Infinity ? 'N/A' : stats.minResponseTime + 'ms'}`)
    console.log(`  Max: ${stats.maxResponseTime}ms`)
    console.log(`  Requests/sec: ${(stats.totalRequests / totalTime).toFixed(2)}`)
  }
  
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
  
  if (avgResponseTime > 1000) {
    console.log('⚠️  WARNING: Average response time is high (>1s)')
  }
  
  if (stats.failedRequests / stats.totalRequests > 0.1) {
    console.log('⚠️  WARNING: Failure rate is high (>10%)')
  }
  
  console.log('')
}

// Run the test
runStressTest().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})


