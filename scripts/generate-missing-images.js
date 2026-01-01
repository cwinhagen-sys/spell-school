/**
 * Script to generate specific missing images
 * Usage: node scripts/generate-missing-images.js home_chores
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

const storyId = process.argv[2] || 'home_chores';

// Load story
const storyPath = path.join(__dirname, '..', 'src', 'data', 'scenarios', 'stories', `${storyId}.json`);
const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));

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

async function generateMissing() {
  const baseDir = path.join(__dirname, '..', 'public', 'images', 'scenarios', storyId);
  const girlDir = path.join(baseDir, 'girl');
  const boyDir = path.join(baseDir, 'boy');
  const sharedDir = path.join(baseDir, 'shared');
  
  fs.mkdirSync(girlDir, { recursive: true });
  fs.mkdirSync(boyDir, { recursive: true });
  fs.mkdirSync(sharedDir, { recursive: true });

  const tasks = [
    // Intro images
    {
      id: 'intro',
      gender: 'girl',
      prompt: story.segments.intro.imagePrompts.girl,
      path: path.join(girlDir, 'intro.png')
    },
    {
      id: 'intro',
      gender: 'boy',
      prompt: story.segments.intro.imagePrompts.boy,
      path: path.join(boyDir, 'intro.png')
    },
    // Shared images
    {
      id: 'seg_room_start',
      gender: 'shared',
      prompt: story.segments.seg_room_start.imagePrompt,
      path: path.join(sharedDir, 'seg_room_start.png')
    },
    {
      id: 'seg_tv',
      gender: 'shared',
      prompt: story.segments.seg_tv.imagePrompt,
      path: path.join(sharedDir, 'seg_tv.png')
    },
    {
      id: 'seg_sister_sad',
      gender: 'shared',
      // Modified prompt to avoid content filter
      prompt: 'Comic book style, vibrant colors, NO PEOPLE: A child\'s room with a teddy bear on the floor near a doorway. A tissue box on a nearby table. Soft lighting. A gentle, learning moment atmosphere. Lesson about kindness mood.',
      path: path.join(sharedDir, 'seg_sister_sad.png')
    }
  ];

  console.log(`\n🎨 Generating ${tasks.length} missing images...\n`);

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    if (fs.existsSync(task.path)) {
      console.log(`⏭️  Skipping ${task.id} (${task.gender}) - exists`);
      continue;
    }

    console.log(`\n[${i + 1}/${tasks.length}] ${task.id} (${task.gender})`);
    console.log(`   ${task.prompt.substring(0, 60)}...`);

    try {
      const imageData = await generateImage(task.prompt);
      fs.writeFileSync(task.path, Buffer.from(imageData, 'base64'));
      console.log(`   ✅ Saved`);
      
      // Update story
      if (task.gender === 'shared') {
        story.segments[task.id].imagePath = `/images/scenarios/${storyId}/shared/${task.id}.png`;
      } else {
        if (!story.segments[task.id].imagePaths) {
          story.segments[task.id].imagePaths = {};
        }
        story.segments[task.id].imagePaths[task.gender] = `/images/scenarios/${storyId}/${task.gender}/${task.id}.png`;
      }
      
      if (i < tasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`   ❌ ${error.message}`);
    }
  }

  // Save updated story
  fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
  console.log(`\n📝 Updated story with image paths`);
  console.log('\n✨ Done!\n');
}

generateMissing().catch(console.error);



