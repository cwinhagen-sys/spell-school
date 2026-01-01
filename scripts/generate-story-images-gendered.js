/**
 * Script to generate DALL-E images for a story with gender variants
 * 
 * Usage: node scripts/generate-story-images-gendered.js [storyId] [gender]
 * Example: node scripts/generate-story-images-gendered.js home_breakfast girl
 * Example: node scripts/generate-story-images-gendered.js home_breakfast boy
 * Example: node scripts/generate-story-images-gendered.js home_breakfast both
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
  }
}

loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found');
  process.exit(1);
}

const storyId = process.argv[2];
const genderArg = process.argv[3] || 'both';

if (!storyId) {
  console.error('❌ Please provide a story ID');
  console.log('Usage: node scripts/generate-story-images-gendered.js [storyId] [gender]');
  console.log('Gender options: girl, boy, both');
  process.exit(1);
}

// Load story
const storyPath = path.join(__dirname, '..', 'src', 'data', 'scenarios', 'stories', `${storyId}.json`);

if (!fs.existsSync(storyPath)) {
  console.error(`❌ Story file not found: ${storyPath}`);
  process.exit(1);
}

const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
console.log(`📖 Loaded story: ${story.title}`);

// Determine which genders to generate
const genders = genderArg === 'both' ? ['girl', 'boy'] : [genderArg];
console.log(`👤 Generating for: ${genders.join(', ')}`);

const STYLE_PREFIX = 'Comic book illustration style, vibrant colors, bold outlines, dynamic composition, child-friendly, clean digital art:';

async function generateImage(prompt) {
  const enhancedPrompt = `${STYLE_PREFIX} ${prompt}. No text, words, or letters in the image.`;
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else if (response.data && response.data[0]) {
            resolve(response.data[0].b64_json);
          } else {
            reject(new Error('No image data'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function processGender(gender) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎨 Generating ${gender.toUpperCase()} images`);
  console.log('='.repeat(50));

  const outputDir = path.join(__dirname, '..', 'public', 'images', 'scenarios', storyId, gender);
  fs.mkdirSync(outputDir, { recursive: true });

  const segments = Object.entries(story.segments);
  const results = {};
  const errors = {};

  for (let i = 0; i < segments.length; i++) {
    const [segmentId, segment] = segments[i];
    
    // Check for gender-specific prompts
    const prompt = segment.imagePrompts?.[gender] || segment.imagePrompt;
    
    if (!prompt) {
      console.log(`⏭️  Skipping ${segmentId} (no prompt)`);
      continue;
    }

    const outputPath = path.join(outputDir, `${segmentId}.png`);
    
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping ${segmentId} (exists)`);
      results[segmentId] = `/images/scenarios/${storyId}/${gender}/${segmentId}.png`;
      continue;
    }

    console.log(`\n🎨 [${i + 1}/${segments.length}] ${segmentId}`);
    console.log(`   ${prompt.substring(0, 60)}...`);

    try {
      const imageData = await generateImage(prompt);
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(outputPath, buffer);
      
      results[segmentId] = `/images/scenarios/${storyId}/${gender}/${segmentId}.png`;
      console.log(`   ✅ Saved`);

      // Rate limit
      if (i < segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`   ❌ ${error.message}`);
      errors[segmentId] = error.message;
    }
  }

  return { results, errors };
}

async function updateStoryWithImages(allResults) {
  // Update story with gender-specific image paths
  for (const [segmentId, segment] of Object.entries(story.segments)) {
    if (!segment.imagePaths) {
      segment.imagePaths = {};
    }
    
    for (const gender of genders) {
      if (allResults[gender]?.results[segmentId]) {
        segment.imagePaths[gender] = allResults[gender].results[segmentId];
      }
    }
  }

  fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
  console.log(`\n📝 Updated story with image paths`);
}

async function main() {
  console.log('\n🚀 Starting gendered image generation...\n');
  
  const allResults = {};
  let totalGenerated = 0;
  let totalFailed = 0;

  for (const gender of genders) {
    const { results, errors } = await processGender(gender);
    allResults[gender] = { results, errors };
    totalGenerated += Object.keys(results).length;
    totalFailed += Object.keys(errors).length;
  }

  await updateStoryWithImages(allResults);

  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL RESULTS:');
  console.log(`   ✅ Generated: ${totalGenerated} images`);
  console.log(`   ❌ Failed: ${totalFailed} images`);
  console.log(`   💰 Estimated cost: $${(totalGenerated * 0.04).toFixed(2)}`);
  console.log('\n✨ Done!\n');
}

main().catch(console.error);



