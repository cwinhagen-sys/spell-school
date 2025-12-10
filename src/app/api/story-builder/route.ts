import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOpenAI } from '@/lib/openai'

// ---------- Types ----------
const StartRequestSchema = z.object({
  type: z.literal('start'),
  targetWords: z.array(z.string()).optional().default([]), // Now optional, empty array is OK
  theme: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional()
})

const ContinueRequestSchema = z.object({
  type: z.literal('continue'),
  storyContext: z.string(),
  playerWord: z.string(),
  gapType: z.string(),
  targetWords: z.array(z.string()).optional().default([]), // Optional - no longer used
  usedTargetWords: z.array(z.string()).optional().default([]), // Optional - no longer used
  segmentNumber: z.number(),
  forceEnd: z.boolean().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  theme: z.string().optional()
})

// Difficulty configurations
const DIFFICULTY_CONFIG = {
  easy: {
    totalBlanks: 5,
    maxWords: 15,
    vocabLevel: 'A1 (very simple)',
    sentenceLength: 'very short (5-10 words)',
    description: 'Short and simple'
  },
  medium: {
    totalBlanks: 7,
    maxWords: 25,
    vocabLevel: 'A1-A2 (simple)',
    sentenceLength: 'short (10-20 words)',
    description: 'Medium length'
  },
  hard: {
    totalBlanks: 10,
    maxWords: 35,
    vocabLevel: 'A2-B1',
    sentenceLength: 'normal (15-30 words)',
    description: 'Full story'
  }
}

const RequestSchema = z.union([StartRequestSchema, ContinueRequestSchema])

const ResponseSchema = z.object({
  text: z.string(),
  hasGap: z.boolean(),
  gapType: z.enum(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'name']).optional(),
  isEnding: z.boolean(),
  validationError: z.string().optional()
})

export type StoryBuilderResponse = z.infer<typeof ResponseSchema>

// ---------- Validate Word Grammar ----------
async function validateWordGrammar(
  openai: ReturnType<typeof getOpenAI>,
  storyContext: string,
  playerWord: string,
  gapType: string
): Promise<{ valid: boolean; reason?: string }> {
  const prompt = `You are checking if a word fits GRAMMATICALLY (word type only) in a sentence gap.

**Story so far (incomplete sentence):**
"${storyContext}"

**Word the player wants to add:** "${playerWord}"
**Expected word type:** ${gapType}

**RULES - BE VERY LENIENT:**
- Allow spelling mistakes (e.g., "happi" for "happy" is OK)
- Allow silly/absurd/illogical words - we want creative fun stories! (e.g., "banana" for a person's name is OK, "purple" for an emotion is OK)
- Allow ANY word that has the correct grammatical type, even if it makes no logical sense
- ONLY reject if the word type is completely grammatically wrong:
  - A verb where a noun is needed after "a/an" (e.g., "running" after "I saw a")
  - A noun where a verb is needed after "to" (e.g., "table" after "she started to")
  - An adjective where a noun is needed after "a/an" (e.g., "blue" after "he found a")

**IMPORTANT:** Do NOT reject words because they're illogical or don't make sense in context. That's what makes it fun! Only reject pure grammar errors.

**Examples:**
- "The cat was very" + "purple" → VALID (adjective fits - even if silly!)
- "The cat was very" + "table" → INVALID (noun doesn't fit after "very")
- "She found a mysterious" + "banana" → VALID (noun fits - silly is OK!)
- "She found a mysterious" + "running" → INVALID (verb doesn't fit)
- "He started to" + "dance" → VALID (verb fits)
- "He started to" + "happy" → INVALID (adjective doesn't fit after "to")
- "The dog felt" + "chair" → VALID (noun fits - illogical but fun!)

**Output JSON only:**
{"valid": true} or {"valid": false, "reason": "brief explanation"}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Does "${playerWord}" fit grammatically? Be lenient - only reject if impossible. JSON only.` }
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return { valid: true }

    const result = JSON.parse(content)
    return { valid: result.valid !== false, reason: result.reason }
  } catch {
    // If validation fails, allow the word
    return { valid: true }
  }
}

// Sentence patterns to encourage variety
const GAP_PATTERNS = [
  { pattern: 'saw a/an [noun]', gapType: 'noun', example: 'She looked up and saw a' },
  { pattern: 'was/were [adjective]', gapType: 'adjective', example: 'The old house was very' },
  { pattern: 'started to [verb]', gapType: 'verb', example: 'The creature started to' },
  { pattern: 'felt [adjective]', gapType: 'adjective', example: 'Tom felt suddenly very' },
  { pattern: 'heard a [noun]', gapType: 'noun', example: 'Behind her, she heard a loud' },
  { pattern: 'found a [noun]', gapType: 'noun', example: 'Under the bed, he found a' },
  { pattern: 'began to [verb]', gapType: 'verb', example: 'The ground began to' },
  { pattern: 'looked [adjective]', gapType: 'adjective', example: 'Everything around them looked' },
  { pattern: 'needed a [noun]', gapType: 'noun', example: 'To escape, they needed a' },
  { pattern: 'wanted to [verb]', gapType: 'verb', example: 'More than anything, she wanted to' },
]

// ---------- Build Prompts ----------
function buildStartPrompt(theme?: string, difficulty: 'easy' | 'medium' | 'hard' = 'hard') {
  // Pick a random pattern to suggest
  const suggestedPattern = GAP_PATTERNS[Math.floor(Math.random() * GAP_PATTERNS.length)]
  const config = DIFFICULTY_CONFIG[difficulty]
  
  const system = `You are a creative story builder for an English learning game.

Create the BEGINNING of an engaging story for young learners (ages 10-15).

**DIFFICULTY: ${difficulty.toUpperCase()}**
- Vocabulary: ${config.vocabLevel}
- Sentence length: ${config.sentenceLength}
- Use ${difficulty === 'easy' ? 'VERY simple words a 10-year-old knows' : difficulty === 'medium' ? 'simple everyday words' : 'normal A2-B1 words'}

**CRITICAL RULES FOR THE GAP:**
1. Write ${difficulty === 'easy' ? '1 short sentence' : '1-2 sentences'} that are INCOMPLETE - they NEED a word to make sense
2. The sentence MUST be grammatically incomplete without the gap word
3. NEVER end with "..." or make it feel like a complete thought
4. The gap should be for a NOUN, VERB, or ADJECTIVE that the sentence needs

**SUGGESTED PATTERN:** "${suggestedPattern.pattern}"
Example: "${suggestedPattern.example}"

${theme ? `**Theme:** ${theme}` : 'Theme: adventure, animals, magic, friendship, or school'}

**JSON output:**
{"text": "Your INCOMPLETE sentence...", "hasGap": true, "gapType": "${suggestedPattern.gapType}", "isEnding": false}`

  return system
}

function buildContinuePrompt(
  storyContext: string,
  playerWord: string,
  segmentNumber: number,
  forceEnd: boolean = false,
  difficulty: 'easy' | 'medium' | 'hard' = 'hard',
  theme?: string
) {
  const config = DIFFICULTY_CONFIG[difficulty]
  
  // Determine story phase based on difficulty
  const totalBlanks = config.totalBlanks
  let storyPhase = 'RISING ACTION'
  const progressRatio = segmentNumber / totalBlanks
  if (progressRatio <= 0.3) storyPhase = 'DEVELOPMENT'
  else if (progressRatio <= 0.6) storyPhase = 'RISING ACTION'
  else if (progressRatio <= 0.85) storyPhase = 'CLIMAX'
  else storyPhase = 'RESOLUTION'
  
  // Pick a random pattern for variety
  const suggestedPattern = GAP_PATTERNS[(segmentNumber + Math.floor(Math.random() * 3)) % GAP_PATTERNS.length]
  
  // Detect repetitive words in the story
  const storyWords = storyContext.toLowerCase().split(/\s+/)
  const wordCounts: Record<string, number> = {}
  storyWords.forEach(w => {
    if (w.length > 4) wordCounts[w] = (wordCounts[w] || 0) + 1
  })
  const overusedWords = Object.entries(wordCounts)
    .filter(([_, count]) => count >= 2)
    .map(([word]) => word)
  
  const system = `You are continuing a collaborative story with a young English learner. This is meant to be FUN and CREATIVE!

**DIFFICULTY: ${difficulty.toUpperCase()}**
- Vocabulary: ${config.vocabLevel}
- Keep sentences ${config.sentenceLength}

**STORY SO FAR:**
${storyContext}

**THE PLAYER JUST ADDED:** "${playerWord}"

${theme ? `**SETTING:** The story takes place at/in "${theme}". Keep the setting consistent.` : ''}

**🎭 CREATIVE STORYTELLING RULES (VERY IMPORTANT!):**
1. **EMBRACE ILLOGICAL/SILLY CHOICES!** If the player's word doesn't make logical sense, that's part of the fun! 
   - Work WITH it creatively - acknowledge it in a fun way and continue the story
   - Examples:
     * Player adds "banana" for a person → "named Banana (which was unusual, but they liked it). Banana was very"
     * Player adds "purple" for an emotion → ". Purple wasn't a normal feeling, but that's exactly how they felt. They needed to find a"
     * Player adds "chair" for something they felt → ". Yes, they felt like a chair - it was strange, but somehow it made sense. The chair-feeling made them want to"

2. **Make it work!** Always find a creative way to incorporate the player's choice, no matter how silly or unexpected.

**⚠️ CRITICAL FORMATTING RULES: ⚠️**
1. Your text comes IMMEDIATELY AFTER "${playerWord}" - include proper punctuation!
2. Do NOT repeat "${playerWord}" in your response
3. Start with punctuation that completes the sentence (usually period, comma, or description)

**CORRECT EXAMPLES:**
- Story ends: "She found a" → Player: "kitten"
- ✅ YOUR RESPONSE: "with soft grey fur. It purred softly and the girl began to"
  (Result: "She found a kitten with soft grey fur. It purred...")

- Story ends: "The creature was very" → Player: "purple"
- ✅ YOUR RESPONSE: ". Purple? That was unexpected, but it was definitely purple. Everyone stared in amazement and needed a"
  (Result: "The creature was very purple. Purple? That was unexpected...")

- Story ends: "He felt" → Player: "chair"
- ✅ YOUR RESPONSE: ". A chair? Yes, he felt like a chair - heavy, wooden, and stuck in place. This chair-feeling made him want to"
  (Result: "He felt chair. A chair? Yes, he felt like a chair...")

**WRONG EXAMPLES:**
- ❌ "strange creature" → Creates: "kitten strange creature" (no punctuation!)
- ❌ "kitten was small" → Repeats "kitten"!
- ❌ Ignoring silly choices or making them "normal" - embrace the silliness!

**YOUR TEXT MUST:**
- Connect smoothly to "${playerWord}" - creatively work with it even if it's silly!
- ${forceEnd ? 'Complete the story with 2-3 full sentences (happy ending).' : 'End with an INCOMPLETE sentence needing a word'}
- Use pronouns (it, the, this) to refer back to "${playerWord}"
- Make the story entertaining and embrace creative/silly player choices!

**STORY PHASE: ${storyPhase}**

**JSON output:**
{"text": "continuation starting with proper punctuation after ${playerWord}...", "hasGap": ${forceEnd ? 'false' : 'true'}, "gapType": "${suggestedPattern.gapType}", "isEnding": ${forceEnd ? 'true' : 'false'}}`

  return system
}

// ---------- API Handler ----------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.format() },
        { status: 400 }
      )
    }
    
    const openai = getOpenAI()
    
    if (parsed.data.type === 'start') {
      const { theme, difficulty = 'hard' } = parsed.data
      const systemPrompt = buildStartPrompt(theme, difficulty)
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Start a story. The LAST sentence must be INCOMPLETE and need a word to finish it. No "..." endings. Output JSON only.' }
        ],
        temperature: 0.9,
        max_tokens: difficulty === 'easy' ? 80 : difficulty === 'medium' ? 120 : 150,
        response_format: { type: 'json_object' }
      })
      
      const content = completion.choices[0]?.message?.content
      if (!content) {
        return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
      }
      
      try {
        const rawResponse = JSON.parse(content)
        let text = (rawResponse.text || '').trim()
        
        // Remove trailing "..." as it makes it feel complete
        text = text.replace(/\.{2,}$/, '')
        
        const response: StoryBuilderResponse = {
          text,
          hasGap: rawResponse.hasGap ?? true,
          gapType: rawResponse.gapType,
          isEnding: rawResponse.isEnding ?? false
        }
        return NextResponse.json(response)
      } catch (parseError) {
        console.error('Failed to parse start response:', content, parseError)
        return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
      }
      
    } else {
      const { storyContext, playerWord, segmentNumber, forceEnd, gapType, difficulty = 'hard', theme } = parsed.data
      
      // Validate the word grammatically before continuing (skip validation for forceEnd)
      if (!forceEnd) {
        const validation = await validateWordGrammar(openai, storyContext, playerWord, gapType)
        
        if (!validation.valid) {
          return NextResponse.json({
            text: '',
            hasGap: true,
            isEnding: false,
            validationError: validation.reason || 'That word doesn\'t fit here. Try a different type of word!'
          })
        }
      }
      
      const systemPrompt = buildContinuePrompt(
        storyContext,
        playerWord,
        segmentNumber,
        forceEnd ?? false,
        difficulty,
        theme
      )
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: forceEnd 
            ? `Write a happy ending. Start with punctuation that completes the sentence after "${playerWord}" (like ". " or ", "). Do NOT repeat "${playerWord}". Output JSON only.`
            : `Continue the story after "${playerWord}". Start with proper punctuation (like ". " or " that was " etc). Do NOT repeat "${playerWord}". End with an incomplete sentence needing a word. Output JSON only.`
          }
        ],
        temperature: 0.9,
        max_tokens: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 150 : 200,
        response_format: { type: 'json_object' }
      })
      
      const content = completion.choices[0]?.message?.content
      if (!content) {
        return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
      }
      
      try {
        const rawResponse = JSON.parse(content)
        let text = (rawResponse.text || '').trim()
        
        // Clean up player word repetitions
        const escapedWord = playerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const lowerWord = playerWord.toLowerCase()
        
        // 1. Remove word if it appears at the very start
        const startPattern = new RegExp(`^${escapedWord}[\\s,\\.!?]*`, 'i')
        text = text.replace(startPattern, '').trim()
        
        // 2. Remove word if it appears within the first ~30 characters (early repetition)
        const words = text.split(/\s+/)
        const firstFewWords = words.slice(0, 6)
        const wordIndex = firstFewWords.findIndex((w: string) => 
          w.toLowerCase().replace(/[.,!?;:'"]/g, '') === lowerWord
        )
        
        if (wordIndex !== -1 && wordIndex < 6) {
          words.splice(0, wordIndex + 1)
          text = words.join(' ').trim()
          text = text.replace(/^[,.\s!?]+/, '').trim()
        }
        
        // 3. Ensure proper sentence structure - if text starts with a lowercase letter
        // and doesn't start with punctuation, it needs to connect properly
        if (text.length > 0) {
          const firstChar = text.charAt(0)
          const startsWithPunctuation = /^[.,!?;:\-]/.test(firstChar)
          const startsWithLowercase = /^[a-z]/.test(firstChar)
          
          // If it starts with lowercase and no punctuation, it's likely a description
          // that should connect with the previous word (like "with soft fur")
          if (startsWithLowercase && !startsWithPunctuation) {
            // Check if it looks like it should be a new sentence
            // (starts with common sentence starters)
            const newSentenceStarters = ['the', 'it', 'she', 'he', 'they', 'everyone', 'suddenly', 'then', 'but', 'and', 'so']
            const firstWord = text.split(/\s+/)[0].toLowerCase()
            
            if (newSentenceStarters.includes(firstWord)) {
              // This should be a new sentence - add period and capitalize
              text = '. ' + text.charAt(0).toUpperCase() + text.slice(1)
            }
            // Otherwise it's probably a description like "with soft fur" - leave as is
          }
        }
        
        // 4. Remove trailing "..." as it makes it feel complete
        if (!forceEnd) {
          text = text.replace(/\.{2,}$/, '')
        }
        
        // Ensure text is not empty
        if (!text && !forceEnd) {
          return NextResponse.json({ error: 'AI returned empty continuation' }, { status: 500 })
        }
        
        const response: StoryBuilderResponse = {
          text: text || 'The end.',
          hasGap: forceEnd ? false : (rawResponse.hasGap ?? true),
          gapType: rawResponse.gapType,
          isEnding: forceEnd ? true : (rawResponse.isEnding ?? false)
        }
        return NextResponse.json(response)
      } catch (parseError) {
        console.error('Failed to parse continue response:', content, parseError)
        return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
      }
    }
    
  } catch (error: any) {
    console.error('Story Builder API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

