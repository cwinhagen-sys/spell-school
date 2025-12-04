#!/usr/bin/env node

/**
 * Generate credentials file for stress testing
 * 
 * Usage:
 *   node scripts/generate-credentials.js --prefix=teststudent --count=30 --password=password123 --class-id=your-class-id
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const options = {
  prefix: 'teststudent',
  count: 30,
  password: 'password123',
  classId: null,
  outputFile: 'test-credentials.json'
}

args.forEach(arg => {
  if (arg.startsWith('--prefix=')) {
    options.prefix = arg.split('=')[1]
  } else if (arg.startsWith('--count=')) {
    options.count = parseInt(arg.split('=')[1]) || 30
  } else if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1]
  } else if (arg.startsWith('--class-id=')) {
    options.classId = arg.split('=')[1]
  } else if (arg.startsWith('--output=')) {
    options.outputFile = arg.split('=')[1]
  }
})

if (!options.classId) {
  console.error('❌ Du måste ange --class-id')
  console.error('\nAnvändning:')
  console.error('  node scripts/generate-credentials.js --prefix=teststudent --count=30 --password=password123 --class-id=your-class-id')
  console.error('\nExempel:')
  console.error('  node scripts/generate-credentials.js --prefix=teststudent --count=30 --password=password123 --class-id=abc123-def456-ghi789')
  console.error('\n💡 Tips: Hitta ditt class-id i URL:en när du är inne på din klass:')
  console.error('   /teacher/classes/abc123-def456-ghi789')
  console.error('   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
  console.error('   Detta är ditt class-id')
  process.exit(1)
}

console.log('📝 Generate Credentials File')
console.log('='.repeat(50))
console.log(`Prefix: ${options.prefix}`)
console.log(`Count: ${options.count}`)
console.log(`Password: ${options.password}`)
console.log(`Class ID: ${options.classId}`)
console.log(`Output: ${options.outputFile}`)
console.log('='.repeat(50))
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
console.log('📋 Exempel på första 5 credentials:')
credentials.slice(0, 5).forEach(cred => {
  console.log(`   ${cred.username} / ${cred.password}`)
})
if (credentials.length > 5) {
  console.log(`   ... och ${credentials.length - 5} till`)
}
console.log('')
console.log('🚀 Kör nu stress-testet:')
console.log(`   node scripts/stress-test-auth-customizable.js \\`)
console.log(`     --students=${options.count} \\`)
console.log(`     --duration=60 \\`)
console.log(`     --base-url=https://www.spellschool.se \\`)
console.log(`     --credentials-file=${options.outputFile}`)
console.log('')


