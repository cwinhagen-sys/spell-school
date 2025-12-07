#!/usr/bin/env node

/**
 * Browser-based Stress Test using Playwright
 * 
 * Simulates real browsers opening the student dashboard.
 * Requires: npm install playwright
 * 
 * Usage:
 *   node scripts/stress-test-browser.js --students=10 --duration=60 --base-url=https://www.spellschool.se
 */

const { chromium } = require('playwright')

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  students: 10,
  duration: 60,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  headless: true
}

args.forEach(arg => {
  if (arg.startsWith('--students=')) {
    options.students = parseInt(arg.split('=')[1]) || 10
  } else if (arg.startsWith('--duration=')) {
    options.duration = parseInt(arg.split('=')[1]) || 60
  } else if (arg.startsWith('--base-url=')) {
    options.baseUrl = arg.split('=')[1]
  } else if (arg === '--headed') {
    options.headless = false
  }
})

console.log('🌐 Browser-based Stress Test')
console.log('='.repeat(50))
console.log(`Students: ${options.students}`)
console.log(`Duration: ${options.duration}s`)
console.log(`Base URL: ${options.baseUrl}`)
console.log(`Headless: ${options.headless}`)
console.log('='.repeat(50))
console.log('')

const stats = {
  browsersOpened: 0,
  browsersClosed: 0,
  errors: []
}

async function simulateBrowser(studentId) {
  let browser = null
  let page = null
  
  try {
    browser = await chromium.launch({ headless: options.headless })
    stats.browsersOpened++
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    })
    
    page = await context.newPage()
    
    // Navigate to student dashboard
    console.log(`Student ${studentId}: Loading dashboard...`)
    await page.goto(`${options.baseUrl}/student`, { waitUntil: 'networkidle' })
    
    // Simulate user interactions
    const interactionInterval = setInterval(async () => {
      try {
        // Random scroll
        await page.evaluate(() => {
          window.scrollBy(0, Math.random() * 500 - 250)
        })
        
        // Random click (if safe)
        const buttons = await page.$$('button:not([disabled])')
        if (buttons.length > 0 && Math.random() > 0.9) {
          const randomButton = buttons[Math.floor(Math.random() * buttons.length)]
          await randomButton.click().catch(() => {})
        }
      } catch (error) {
        // Ignore interaction errors
      }
    }, 5000) // Every 5 seconds
    
    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, options.duration * 1000))
    
    clearInterval(interactionInterval)
    
    console.log(`Student ${studentId}: Closing browser...`)
    await browser.close()
    stats.browsersClosed++
    
  } catch (error) {
    stats.errors.push(`Student ${studentId}: ${error.message}`)
    if (browser) {
      await browser.close().catch(() => {})
      stats.browsersClosed++
    }
  }
}

async function runTest() {
  console.log('Starting browser stress test...\n')
  
  const startTime = Date.now()
  const browsers = []
  
  // Launch all browsers
  for (let i = 0; i < options.students; i++) {
    browsers.push(simulateBrowser(i + 1))
  }
  
  // Wait for all browsers to complete
  await Promise.all(browsers)
  
  const endTime = Date.now()
  const totalTime = (endTime - startTime) / 1000
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results')
  console.log('='.repeat(50))
  console.log(`Total Duration: ${totalTime.toFixed(2)}s`)
  console.log(`Browsers Opened: ${stats.browsersOpened}`)
  console.log(`Browsers Closed: ${stats.browsersClosed}`)
  console.log(`Errors: ${stats.errors.length}`)
  
  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }
  
  console.log('')
}

// Check if Playwright is installed
try {
  require('playwright')
  runTest().catch(error => {
    console.error('Test failed:', error)
    process.exit(1)
  })
} catch (error) {
  console.error('Playwright not installed. Install it with:')
  console.error('  npm install playwright')
  console.error('  npx playwright install chromium')
  process.exit(1)
}




