#!/usr/bin/env node

/**
 * Helper Script för att skapa test-elever
 * 
 * Detta script hjälper dig att skapa test-elever för stress-testet.
 * Det skapar elever via Supabase API.
 * 
 * Användning:
 *   node scripts/create-test-students.js --count=10 --class-id=your-class-id
 * 
 * Kräver:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (eller använd Supabase Dashboard)
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

// Parse arguments
const args = process.argv.slice(2)
const options = {
  count: 10,
  classId: null,
  password: 'password123',
  prefix: 'teststudent',
  outputFile: 'test-credentials.json'
}

args.forEach(arg => {
  if (arg.startsWith('--count=')) {
    options.count = parseInt(arg.split('=')[1]) || 10
  } else if (arg.startsWith('--class-id=')) {
    options.classId = arg.split('=')[1]
  } else if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1]
  } else if (arg.startsWith('--prefix=')) {
    options.prefix = arg.split('=')[1]
  } else if (arg.startsWith('--output=')) {
    options.outputFile = arg.split('=')[1]
  }
})

if (!options.classId) {
  console.error('❌ Du måste ange --class-id')
  console.error('\nAnvändning:')
  console.error('  node scripts/create-test-students.js --count=10 --class-id=your-class-id')
  console.error('\nExempel:')
  console.error('  node scripts/create-test-students.js --count=30 --class-id=abc123-def456-ghi789')
  process.exit(1)
}

console.log('📝 Test Student Creator')
console.log('='.repeat(50))
console.log(`Antal elever att skapa: ${options.count}`)
console.log(`Class ID: ${options.classId}`)
console.log(`Prefix: ${options.prefix}`)
console.log(`Output file: ${options.outputFile}`)
console.log('='.repeat(50))
console.log('')

console.log('⚠️  OBS: Detta script skapar INTE faktiska konton.')
console.log('   Du behöver skapa kontona via Spell School UI eller Supabase Dashboard.')
console.log('')
console.log('📋 Detta script skapar bara credentials-filen för dig.')
console.log('')

// Generate credentials
const credentials = []
for (let i = 1; i <= options.count; i++) {
  credentials.push({
    username: `${options.prefix}${i}`,
    password: options.password,
    classId: options.classId
  })
}

// Write to file
const outputPath = path.resolve(options.outputFile)
fs.writeFileSync(outputPath, JSON.stringify(credentials, null, 2))

console.log(`✅ Skapade ${credentials.length} credentials i ${outputPath}`)
console.log('')
console.log('📋 Nästa steg:')
console.log('1. Skapa faktiska konton via Spell School UI:')
console.log('   - Gå till /teacher/add-students')
console.log('   - Välj din klass')
console.log('   - Skapa elever med dessa användarnamn och lösenord:')
console.log('')
credentials.slice(0, 5).forEach(cred => {
  console.log(`   ${cred.username} / ${cred.password}`)
})
if (credentials.length > 5) {
  console.log(`   ... och ${credentials.length - 5} till`)
}
console.log('')
console.log('2. När kontona är skapade, kör stress-testet:')
console.log(`   node scripts/stress-test-auth.js \\`)
console.log(`     --students=${options.count} \\`)
console.log(`     --duration=60 \\`)
console.log(`     --base-url=https://www.spellschool.se \\`)
console.log(`     --credentials-file=${options.outputFile}`)
console.log('')


