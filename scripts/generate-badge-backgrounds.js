/**
 * Script to generate custom badge background images in comic book wizard style
 * Usage: node scripts/generate-badge-backgrounds.js
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

const BASE_DIR = path.join(__dirname, '..', 'public', 'images', 'badges', 'backgrounds');

// Ensure directory exists
fs.mkdirSync(BASE_DIR, { recursive: true });

// Badge definitions with custom prompts
const BADGE_BACKGROUNDS = [
  {
    filename: 'word_warrior.png',
    name: 'Word Warrior',
    icon: '⚔️',
    prompt: 'Comic book illustration style. A magical wizard\'s study with floating words and letters glowing with mystical energy. Ancient spell books on shelves. A magical sword made of glowing letters. Mystical purple and blue magical auras. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'memory_champion.png',
    name: 'Memory Champion',
    icon: '🧠',
    prompt: 'Comic book illustration style. A wizard\'s magical brain with glowing neural pathways and memory crystals floating around. Magical sparkles and thought bubbles with symbols. Mystical purple and indigo magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'spelling_bee.png',
    name: 'Spelling Bee',
    icon: '⌨️',
    prompt: 'Comic book illustration style. A magical keyboard with glowing keys floating in mystical energy. Letters transforming into magical symbols. Wizard\'s spell book open nearby with glowing text. Magical blue and cyan auras. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'choice_master.png',
    name: 'Choice Master',
    icon: '✅',
    prompt: 'Comic book illustration style. A wizard\'s magical decision tree with glowing branches and checkmarks. Multiple paths with magical portals. A crystal ball showing perfect choices. Mystical green and emerald magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'gap_filler.png',
    name: 'Gap Filler',
    icon: '📝',
    prompt: 'Comic book illustration style. A magical scroll with glowing words and empty spaces being filled with mystical letters. A wizard\'s quill writing with magical ink. Floating sentence fragments connecting. Mystical indigo and purple magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'spell_slinger_novice.png',
    name: 'Spell Slinger Novice',
    icon: '✨',
    prompt: 'Comic book illustration style. A young wizard\'s wand casting first spells with sparkles and magical energy. Simple magical symbols floating. Beginner spell book open. Mystical silver and light blue magical auras. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'sentence_builder.png',
    name: 'Sentence Builder',
    icon: '📝',
    prompt: 'Comic book illustration style. Magical words and phrases floating and connecting like building blocks. A wizard\'s construction site with glowing sentence structures. Magical grammar symbols. Mystical blue and teal magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'roulette_master.png',
    name: 'Roulette Master',
    icon: '🎯',
    prompt: 'Comic book illustration style. A magical spinning wheel with glowing symbols and mystical targets. Wizard\'s precision magic with perfect aim. Magical darts and arrows hitting targets. Mystical rose and pink magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'multi_game_player.png',
    name: 'Multi-Game Player',
    icon: '🎮',
    prompt: 'Comic book illustration style. Multiple magical game boards floating in mystical space. Wizard\'s collection of enchanted games. Various magical symbols representing different games. Mystical violet and purple magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'perfect_score.png',
    name: 'Perfect Score',
    icon: '💯',
    prompt: 'Comic book illustration style. A perfect magical score of 100 glowing with golden energy. Wizard\'s achievement crystal. Perfect magical symbols and stars. Mystical gold and amber magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'spell_slinger_expert.png',
    name: 'Spell Slinger Expert',
    icon: '🔥',
    prompt: 'Comic book illustration style. An advanced wizard\'s wand casting powerful spells with intense magical fire. Complex magical symbols and runes. Advanced spell book with glowing pages. Mystical orange and red magical fire energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'grammar_guru.png',
    name: 'Grammar Guru',
    icon: '📖',
    prompt: 'Comic book illustration style. An ancient wizard\'s grammar tome with perfect sentence structures glowing. Magical punctuation marks floating. Perfect grammar symbols and rules. Mystical deep blue and indigo magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'roulette_legend.png',
    name: 'Roulette Legend',
    icon: '👑',
    prompt: 'Comic book illustration style. A legendary wizard\'s magical roulette wheel with perfect precision. Crown of mastery floating above. Perfect magical targets and symbols. Mystical gold and royal purple magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'marathon_runner.png',
    name: 'Marathon Runner',
    icon: '🏃',
    prompt: 'Comic book illustration style. A wizard running through a magical marathon course with glowing checkpoints. Magical speed symbols and energy trails. Multiple game achievements along the path. Mystical orange and red magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'perfectionist.png',
    name: 'Perfectionist',
    icon: '⭐',
    prompt: 'Comic book illustration style. A perfect wizard\'s achievement with three glowing stars in perfect alignment. Flawless magical symbols. Perfect magical energy patterns. Mystical gold and yellow magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'quiz_god.png',
    name: 'Quiz God',
    icon: '🎓',
    prompt: 'Comic book illustration style. A divine wizard\'s quiz with all correct answers glowing. Magical graduation cap floating. Perfect knowledge symbols. Mystical deep purple and violet magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'speed_god.png',
    name: 'Speed God',
    icon: '⚡',
    prompt: 'Comic book illustration style. A lightning-fast wizard\'s magic with speed symbols and energy trails. Magical lightning bolts. Speed runes and symbols. Mystical electric blue and cyan magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'ultimate_gamer.png',
    name: 'Ultimate Gamer',
    icon: '👑',
    prompt: 'Comic book illustration style. The ultimate wizard master with a crown of all achievements. All magical games mastered. Supreme magical symbols. Mystical legendary gold and rainbow magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'first_steps.png',
    name: 'First Steps',
    icon: '🎯',
    prompt: 'Comic book illustration style. A young wizard taking first steps on a magical path. Beginner magical symbols. First spell sparkles. Mystical soft blue and green magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'getting_hot.png',
    name: 'Getting Hot',
    icon: '🔥',
    prompt: 'Comic book illustration style. A wizard building momentum with three days of magical practice. Growing magical fire. Streak symbols glowing. Mystical orange and red magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'week_warrior.png',
    name: 'Week Warrior',
    icon: '📅',
    prompt: 'Comic book illustration style. A dedicated wizard with seven days of magical practice. Weekly calendar with glowing days. Consistent magical energy. Mystical blue and teal magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'monthly_master.png',
    name: 'Monthly Master',
    icon: '📆',
    prompt: 'Comic book illustration style. A master wizard with thirty days of continuous magical practice. Full calendar glowing. Mastery symbols. Mystical purple and violet magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'rising_star.png',
    name: 'Rising Star',
    icon: '⭐',
    prompt: 'Comic book illustration style. A rising wizard star reaching level 10. Ascending magical path. Growing magical power. Mystical yellow and gold magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'experienced_learner.png',
    name: 'Experienced Learner',
    icon: '🌟',
    prompt: 'Comic book illustration style. An experienced wizard reaching level 25. Advanced magical knowledge. Complex spell symbols. Mystical blue and silver magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'master_student.png',
    name: 'Master Student',
    icon: '🏆',
    prompt: 'Comic book illustration style. A master wizard reaching level 50. Trophy of mastery. Advanced magical symbols. Mystical gold and amber magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'legendary_scholar.png',
    name: 'Legendary Scholar',
    icon: '👑',
    prompt: 'Comic book illustration style. A legendary wizard reaching level 100. Supreme crown of knowledge. Ultimate magical symbols. Mystical legendary rainbow and gold magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'breakfast_chef.png',
    name: 'Breakfast Chef',
    icon: '🍳',
    prompt: 'Comic book illustration style. A wizard\'s magical kitchen with floating breakfast ingredients and cooking utensils. Magical eggs, toast, and pancakes glowing with mystical energy. A wizard\'s chef hat floating. Mystical warm orange and yellow magical auras. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'master_chef.png',
    name: 'Master Chef',
    icon: '👨‍🍳',
    prompt: 'Comic book illustration style. A master wizard chef\'s kitchen with perfect magical dishes and culinary mastery. Advanced cooking spells and recipes glowing. A golden chef\'s hat and magical utensils. Mystical gold and amber magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'sentence_starter.png',
    name: 'Sentence Starter',
    icon: '📝',
    prompt: 'Comic book illustration style. A wizard beginning to craft magical sentences with glowing first words. Simple sentence structures starting to form. Beginner writing magic with sparkles. Mystical soft blue and green magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'sentence_expert.png',
    name: 'Sentence Expert',
    icon: '📖',
    prompt: 'Comic book illustration style. An expert wizard crafting complex magical sentences with perfect structure. Advanced sentence patterns glowing. Multiple sentence elements connecting beautifully. Mystical deep blue and indigo magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  },
  {
    filename: 'sentence_master.png',
    name: 'Sentence Master',
    icon: '📚',
    prompt: 'Comic book illustration style. A master wizard creating perfect, elaborate magical sentences with supreme skill. Masterful sentence architecture with all elements in harmony. Ultimate writing mastery symbols. Mystical legendary purple and gold magical energy. Bold outlines, vibrant colors, dynamic composition. Wizard/magic theme. No people.'
  }
];

const STYLE_PREFIX = 'Comic book illustration style, vibrant colors, bold outlines, dynamic composition, child-friendly, clean digital art, wizard and magic theme:';

async function generateImage(prompt, filename) {
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

async function generateAllBadgeBackgrounds() {
  console.log(`\n🎨 Generating ${BADGE_BACKGROUNDS.length} badge background images...\n`);

  for (let i = 0; i < BADGE_BACKGROUNDS.length; i++) {
    const badge = BADGE_BACKGROUNDS[i];
    const filePath = path.join(BASE_DIR, badge.filename);
    
    // Skip if already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  [${i + 1}/${BADGE_BACKGROUNDS.length}] Skipping ${badge.filename} - already exists`);
      continue;
    }

    console.log(`\n[${i + 1}/${BADGE_BACKGROUNDS.length}] Generating ${badge.filename}...`);
    console.log(`   Badge: ${badge.name} (${badge.icon})`);
    console.log(`   Prompt: ${badge.prompt.substring(0, 80)}...`);

    try {
      const imageData = await generateImage(badge.prompt, badge.filename);
      fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));
      console.log(`   ✅ Saved to ${filePath}`);
      
      // Rate limiting delay (DALL-E has limits)
      if (i < BADGE_BACKGROUNDS.length - 1) {
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

  console.log('\n✨ Done! All badge backgrounds generated.\n');
  console.log(`📁 Images saved to: ${BASE_DIR}\n`);
}

generateAllBadgeBackgrounds().catch(console.error);

