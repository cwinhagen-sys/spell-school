/**
 * Script to generate DALL-E images for a story
 * 
 * Usage: node scripts/generate-story-images.js [storyId]
 * Example: node scripts/generate-story-images.js home_breakfast
 * 
 * Requirements:
 * - OPENAI_API_KEY environment variable must be set
 * - Story JSON file must exist in src/data/scenarios/stories/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env.local manually
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
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

const storyId = process.argv[2];

if (!storyId) {
  console.error('❌ Please provide a story ID');
  console.log('Usage: node scripts/generate-story-images.js [storyId]');
  console.log('Example: node scripts/generate-story-images.js home_breakfast');
  process.exit(1);
}

// Load the story
const storyPath = path.join(__dirname, '..', 'src', 'data', 'scenarios', 'stories', `${storyId}.json`);

if (!fs.existsSync(storyPath)) {
  console.error(`❌ Story file not found: ${storyPath}`);
  process.exit(1);
}

const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
console.log(`📖 Loaded story: ${story.title}`);
console.log(`📊 Segments to process: ${Object.keys(story.segments).length}`);

// Create output directory
const outputDir = path.join(__dirname, '..', 'public', 'images', 'scenarios', storyId);
fs.mkdirSync(outputDir, { recursive: true });

// Style for comic book look
const STYLE_PREFIX = 'Comic book illustration style, vibrant colors, bold outlines, dynamic composition, expressive characters, child-friendly, clean digital art:';

async function generateImage(segmentId, prompt) {
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
            reject(new Error('No image data in response'));
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

async function processSegments() {
  const segments = Object.entries(story.segments);
  const results = {};
  const errors = {};

  for (let i = 0; i < segments.length; i++) {
    const [segmentId, segment] = segments[i];
    
    if (!segment.imagePrompt) {
      console.log(`⏭️  Skipping ${segmentId} (no imagePrompt)`);
      continue;
    }

    const outputPath = path.join(outputDir, `${segmentId}.png`);
    
    // Skip if image already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping ${segmentId} (image exists)`);
      results[segmentId] = `/images/scenarios/${storyId}/${segmentId}.png`;
      continue;
    }

    console.log(`\n🎨 [${i + 1}/${segments.length}] Generating: ${segmentId}`);
    console.log(`   Prompt: ${segment.imagePrompt.substring(0, 60)}...`);

    try {
      const imageData = await generateImage(segmentId, segment.imagePrompt);
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(outputPath, buffer);
      
      results[segmentId] = `/images/scenarios/${storyId}/${segmentId}.png`;
      console.log(`   ✅ Saved: ${outputPath}`);

      // Rate limiting delay (DALL-E has limits)
      if (i < segments.length - 1) {
        console.log(`   ⏳ Waiting 2 seconds before next image...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errors[segmentId] = error.message;
    }
  }

  return { results, errors };
}

async function updateStoryWithImages(imagePaths) {
  // Update the story JSON with image paths
  for (const [segmentId, imagePath] of Object.entries(imagePaths)) {
    if (story.segments[segmentId]) {
      story.segments[segmentId].imagePath = imagePath;
    }
  }

  // Save updated story
  fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
  console.log(`\n📝 Updated story file with image paths`);
}

async function main() {
  console.log('\n🚀 Starting image generation...\n');
  
  const { results, errors } = await processSegments();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS:');
  console.log(`   ✅ Generated: ${Object.keys(results).length} images`);
  console.log(`   ❌ Failed: ${Object.keys(errors).length} images`);
  
  if (Object.keys(results).length > 0) {
    await updateStoryWithImages(results);
  }

  if (Object.keys(errors).length > 0) {
    console.log('\n❌ ERRORS:');
    for (const [segmentId, error] of Object.entries(errors)) {
      console.log(`   ${segmentId}: ${error}`);
    }
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);




