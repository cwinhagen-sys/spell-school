/**
 * Script to generate DALL-E images for a story
 * - Intro image: gender-specific (girl/boy folders)
 * - All other images: shared (used by both genders)
 * 
 * Usage: node scripts/generate-story-images-v2.js [storyId]
 * Example: node scripts/generate-story-images-v2.js home_breakfast
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

if (!storyId) {
  console.error('❌ Please provide a story ID');
  console.log('Usage: node scripts/generate-story-images-v2.js [storyId]');
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

async function main() {
  console.log('\n🚀 Starting image generation (v2 - intro only gendered)...\n');
  
  // Create directories
  const baseDir = path.join(__dirname, '..', 'public', 'images', 'scenarios', storyId);
  const girlDir = path.join(baseDir, 'girl');
  const boyDir = path.join(baseDir, 'boy');
  const sharedDir = path.join(baseDir, 'shared');
  
  fs.mkdirSync(girlDir, { recursive: true });
  fs.mkdirSync(boyDir, { recursive: true });
  fs.mkdirSync(sharedDir, { recursive: true });

  const segments = Object.entries(story.segments);
  let generated = 0;
  let failed = 0;

  for (let i = 0; i < segments.length; i++) {
    const [segmentId, segment] = segments[i];
    
    // Check if this segment has gender-specific prompts (intro)
    const hasGenderPrompts = segment.imagePrompts && (segment.imagePrompts.girl || segment.imagePrompts.boy);
    const hasSharedPrompt = segment.imagePrompt;
    
    if (!hasGenderPrompts && !hasSharedPrompt) {
      console.log(`⏭️  Skipping ${segmentId} (no prompt)`);
      continue;
    }

    if (hasGenderPrompts) {
      // Generate gender-specific images
      for (const gender of ['girl', 'boy']) {
        const prompt = segment.imagePrompts[gender];
        if (!prompt) continue;
        
        const outputDir = gender === 'girl' ? girlDir : boyDir;
        const outputPath = path.join(outputDir, `${segmentId}.png`);
        
        if (fs.existsSync(outputPath)) {
          console.log(`⏭️  Skipping ${segmentId} (${gender}) - exists`);
          continue;
        }

        console.log(`\n🎨 [${i + 1}/${segments.length}] ${segmentId} (${gender})`);
        console.log(`   ${prompt.substring(0, 50)}...`);

        try {
          const imageData = await generateImage(prompt);
          fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
          console.log(`   ✅ Saved to ${gender}/`);
          generated++;
          
          // Update story with path
          if (!segment.imagePaths) segment.imagePaths = {};
          segment.imagePaths[gender] = `/images/scenarios/${storyId}/${gender}/${segmentId}.png`;
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`   ❌ ${error.message}`);
          failed++;
        }
      }
    } else {
      // Generate shared image (no people)
      const outputPath = path.join(sharedDir, `${segmentId}.png`);
      
      if (fs.existsSync(outputPath)) {
        console.log(`⏭️  Skipping ${segmentId} (shared) - exists`);
        segment.imagePath = `/images/scenarios/${storyId}/shared/${segmentId}.png`;
        continue;
      }

      console.log(`\n🎨 [${i + 1}/${segments.length}] ${segmentId} (shared)`);
      console.log(`   ${hasSharedPrompt.substring(0, 50)}...`);

      try {
        const imageData = await generateImage(hasSharedPrompt);
        fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
        console.log(`   ✅ Saved to shared/`);
        generated++;
        
        // Update story with path
        segment.imagePath = `/images/scenarios/${storyId}/shared/${segmentId}.png`;
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   ❌ ${error.message}`);
        failed++;
      }
    }
  }

  // Save updated story
  fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
  console.log(`\n📝 Updated story with image paths`);

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS:');
  console.log(`   ✅ Generated: ${generated} images`);
  console.log(`   ❌ Failed: ${failed} images`);
  console.log(`   💰 Estimated cost: $${(generated * 0.04).toFixed(2)}`);
  console.log('\n✨ Done!\n');
}

main().catch(console.error);



