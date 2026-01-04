/**
 * Script to generate generic environment images for home_pet scenario
 * Usage: node scripts/generate-pet-images.js
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
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

const STORY_ID = 'home_pet';
const BASE_DIR = path.join(__dirname, '..', 'public', 'images', 'scenarios', STORY_ID, 'shared');

// Ensure directory exists
fs.mkdirSync(BASE_DIR, { recursive: true });

// Image generation tasks with prompts
const IMAGE_TASKS = [
  {
    filename: 'seg_schedule.png',
    prompt: 'Comic book illustration style. A warm, friendly kitchen interior. A wooden or modern kitchen table in the center. A handwritten note or paper on the table showing a care schedule (visible but text doesn\'t need to be readable). Morning sunlight streaming through a window. Clean, organized kitchen with cabinets and counter. Warm, helpful mood. Bold lines, vibrant colors, comic book panel style. No people, no animals. Focus on the table, note, and kitchen environment.'
  },
  {
    filename: 'seg_memory.png',
    prompt: 'Comic book illustration style. A kitchen or hallway interior. The scene suggests uncertainty - maybe items slightly out of place, or a clock on the wall showing morning time. Warm morning light. Slightly confused or uncertain atmosphere. Bold lines, vibrant colors, comic book panel style. No people, no animals. Focus on the environment suggesting someone is trying to remember something.'
  },
  {
    filename: 'seg_breakfast.png',
    prompt: 'Comic book illustration style. A clean, organized kitchen interior. A dog food bowl on the floor with properly measured food (one cup, not overflowing). A fresh water bowl nearby, full of clean water. Both bowls are clean and properly placed. Morning light fills the room. Clean, organized, proper care atmosphere. Bold lines, vibrant colors, comic book panel style. No people, no animals. Focus on the two bowls and clean kitchen environment.'
  },
  {
    filename: 'seg_afternoon.png',
    prompt: 'Comic book illustration style. A friendly backyard scene. Green grass, maybe a fence in the background. A ball visible on the grass. A water bowl visible nearby, full. Afternoon light (warmer golden tones than morning). Fun, energetic, outdoor play atmosphere. Bold lines, vibrant colors, comic book panel style. No people, no animals. Focus on the backyard, grass, ball, and water bowl.'
  },
  {
    filename: 'seg_forgot.png',
    prompt: 'Comic book illustration style. A bedroom or living room interior. A computer or gaming setup visible. An empty dog food bowl visible in the background. An empty water bowl visible. Late afternoon or evening light (darker, more muted). Neglectful, sad atmosphere. Bold lines, muted colors, comic book panel style. No people, no animals. Focus on the gaming setup and empty bowls showing neglect.'
  },
  {
    filename: 'ending_success.png',
    prompt: 'Comic book illustration style. A warm home interior. A dog food bowl full of food. A water bowl full of clean water. Both bowls properly placed and filled. Warm, satisfied, successful atmosphere. Bold lines, vibrant warm colors, comic book panel style. No people, no animals. Focus on the full bowls showing perfect care.'
  },
  {
    filename: 'ending_okay.png',
    prompt: 'Comic book illustration style. A home interior scene. A dog food bowl visible (maybe partially empty or not perfectly full). A water bowl visible (maybe partially empty). The scene suggests something was missed - bowls are there but not perfect. Partial success, okay but could be better mood. Bold lines, warm but muted colors, comic book panel style. No people, no animals. Focus on the bowls showing partial care.'
  },
  {
    filename: 'ending_fail.png',
    prompt: 'Comic book illustration style. A home interior scene. An empty dog food bowl, completely empty. An empty water bowl, completely empty. A door visible in the background. The scene shows neglect - bowls empty, nothing done. Failure, neglect, sadness mood. Bold lines, muted sadder color tones, comic book panel style. No people, no animals. Focus on the empty bowls, door, and neglected atmosphere.'
  }
];

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
            reject(new Error('No image data returned'));
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

async function generateAllImages() {
  console.log(`\n🎨 Generating ${IMAGE_TASKS.length} images for ${STORY_ID}...\n`);

  for (let i = 0; i < IMAGE_TASKS.length; i++) {
    const task = IMAGE_TASKS[i];
    const filePath = path.join(BASE_DIR, task.filename);
    
    // Skip if already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  [${i + 1}/${IMAGE_TASKS.length}] Skipping ${task.filename} - already exists`);
      continue;
    }

    console.log(`\n[${i + 1}/${IMAGE_TASKS.length}] Generating ${task.filename}...`);
    console.log(`   Prompt: ${task.prompt.substring(0, 80)}...`);

    try {
      const imageData = await generateImage(task.prompt);
      fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));
      console.log(`   ✅ Saved to ${filePath}`);
      
      // Rate limiting delay (DALL-E has limits)
      if (i < IMAGE_TASKS.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next image...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      if (error.message.includes('content_policy_violation')) {
        console.error('   ⚠️  Content policy violation - may need to adjust prompt');
      }
    }
  }

  console.log('\n✨ Done! All images generated.\n');
  console.log(`📁 Images saved to: ${BASE_DIR}\n`);
}

generateAllImages().catch(console.error);











