/**
 * Script to generate a single test image
 * 
 * Usage: node scripts/generate-single-image.js
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
  console.error('❌ OPENAI_API_KEY not found');
  process.exit(1);
}

const STYLE_PREFIX = 'Comic book illustration style, vibrant colors, bold outlines, dynamic composition, expressive characters, child-friendly, clean digital art:';

const TEST_PROMPT = 'A child in pajamas standing in a sunny kitchen, looking at ingredients on the counter, morning light streaming through window';

async function generateImage() {
  const enhancedPrompt = `${STYLE_PREFIX} ${TEST_PROMPT}. No text, words, or letters in the image.`;
  
  console.log('🎨 Generating test image...');
  console.log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`);

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
            resolve({
              imageData: response.data[0].b64_json,
              revisedPrompt: response.data[0].revised_prompt
            });
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

async function main() {
  try {
    const result = await generateImage();
    
    // Save the image
    const outputDir = path.join(__dirname, '..', 'public', 'images', 'scenarios', 'home_breakfast');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'intro.png');
    const buffer = Buffer.from(result.imageData, 'base64');
    fs.writeFileSync(outputPath, buffer);
    
    console.log('✅ Image saved:', outputPath);
    console.log('📝 Revised prompt:', result.revisedPrompt);
    
    // Update the story file
    const storyPath = path.join(__dirname, '..', 'src', 'data', 'scenarios', 'stories', 'home_breakfast.json');
    const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    story.segments.intro.imagePath = '/images/scenarios/home_breakfast/intro.png';
    fs.writeFileSync(storyPath, JSON.stringify(story, null, 2));
    
    console.log('✅ Story file updated with image path');
    console.log('\n🎉 Done! Check the image at public/images/scenarios/home_breakfast/intro.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();




