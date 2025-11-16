import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOpenAI } from '@/lib/openai'

// Request schema
const RequestSchema = z.object({
  words: z.array(z.string()).min(1),
  blockIndex: z.number().int().min(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  cefrLevel: z.number().int().min(1).max(10).optional() // CEFR level 1-10 (A1-C2) for precise difficulty scaling
})

// Response schema
const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['fact', 'vocabulary', 'inference']),
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  options: z.array(z.string()).length(4), // Always 4 options
  explanation: z.string().optional() // Explanation for why the answer is correct
})

const ResponseSchema = z.object({
  text: z.string().min(1),
  usedWords: z.array(z.string()).min(1), // Words from word list that appear in text
  questions: z.array(QuestionSchema).min(2).max(7) // 2-7 questions based on difficulty
})

type BlockReadingResponse = z.infer<typeof ResponseSchema>

function getDifficultyGuidance(difficulty: 'easy' | 'medium' | 'hard', blockIndex: number, cefrLevel?: number): string {
  // If CEFR level is provided, use it for precise guidance
  if (cefrLevel !== undefined) {
    switch (cefrLevel) {
      case 1: // A1 - Beginner
        return `CEFR Level: A1 - Beginner / Breakthrough

TEXT REQUIREMENTS:
- Very short and concrete (3-4 sentences, 40-60 words total)
- Simple sentences (5-8 words each), very high-frequency words
- Topics: everyday life, school, family, hobbies, objects, colors, numbers
- Focus: Simple present tense, basic sentence structures
- Vocabulary: Common words (family, numbers, colors, food, school, hobbies, simple objects)
- Example style: "I have a blue school bag. In the bag, I have a book, a pencil, and an apple. The apple is red. I take my bag to school every day."

QUESTION DESIGN (100% literal):
- 100% literal questions - "right there in the text"
- Question types:
  * What color is...? / What is in...? / What is not in...?
  * Where is...? / When does...? / Who has...?
  * Very simple multiple-choice about basic facts directly stated
- NO abstract, inferential, or opinion-based questions
- All answers must be explicitly stated in the text
- Generate 2-3 questions (all literal/fact questions)`
      
      case 2: // A2 - Elementary
        return `CEFR Level: A2 - Elementary / Waystage

TEXT REQUIREMENTS:
- Short, simple paragraphs (4-5 sentences, 60-80 words total)
- Everyday situations, simple descriptions and actions
- Simple sequences with time markers: last week, yesterday, today, then, finally
- Sentence length: 6-10 words each
- Can include: Simple past tense, basic conjunctions (and, but, because)
- Vocabulary: Everyday life, school, activities, simple actions
- Example style: "Last week, a new family moved into the house next to mine. They have a small dog that is very friendly. Yesterday, the dog ran into our garden, and we played with it for a while. I think we will be good friends."

QUESTION DESIGN (~70-80% literal, ~20-30% simple inference):
- ~70-80% literal questions (direct information from the text)
- ~20-30% very simple inference (e.g. "Why did...?" when answer is clearly stated or obvious from text)
- Question types:
  * When did...? / What is true about...? (literal)
  * Why did...? (simple inference - answer clearly supported in text)
  * Simple sequencing questions (What happened first/next?)
- Generate 2-3 questions (mostly literal with 1 simple inference if appropriate)`
      
      case 3: // B1.1 - Intermediate
        return `CEFR Level: B1.1 - Intermediate / Threshold

TEXT REQUIREMENTS:
- Short to medium length (5-6 sentences, 80-100 words total)
- Clear narrative with sequence of events
- Basic narrative structures with a simple problem/solution or sequence
- Sentence length: 8-12 words each
- Can include: Past tense, compound sentences, basic explanations, simple cause-effect
- Vocabulary: Varied but accessible, some descriptive words
- Example style: "Emma was on her way to the concert when she realized she couldn't find her ticket. She checked her pockets and her bag twice but still didn't see it. Finally, she remembered leaving it on the kitchen table. She hurried back home and found the ticket exactly where she had left it."

QUESTION DESIGN (~50-60% literal, ~40-50% inference):
- ~50-60% literal questions (Where did...? / What did...?)
- ~40-50% simple inference / interpretation
- Question types:
  * Literal detail questions (Where did...? / What did...?)
  * Simple inference about actions (Why did...? - answer clearly supported)
  * Simple inference about feelings (How did...feel? - based on actions described)
- Generate 3 questions (mix: 1-2 literal, 1-2 simple inference)`
      
      case 4: // B1.2 - Intermediate+
        return `CEFR Level: B1.2 - Intermediate+ / Threshold

TEXT REQUIREMENTS:
- More coherent texts (6-7 sentences, 100-120 words total)
- Explanations and simpler arguments, more complex narratives
- Sentence length: 10-14 words each
- Can include: Various tenses, cause-effect relationships, internal thoughts
- Vocabulary: More varied vocabulary, some abstract concepts

QUESTION DESIGN (~50-60% literal, ~40-50% inference):
- ~50-60% literal questions
- ~40-50% inference / interpretation
- Question types:
  * Literal detail questions
  * Simple inference (how someone feels, why someone does something)
  * Main idea / summary questions
  * Simple "What do you think will happen next?" that is logically grounded in the text
- Generate 3-4 questions (mix of literal and inference)`
      
      case 5: // B2.1 - Upper Intermediate
        return `CEFR Level: B2.1 - Upper Intermediate / Vantage

TEXT REQUIREMENTS:
- Medium length (4-5 sentences, but more complex, 100-120 words total)
- More complex ideas, opinions, internal conflict, and some abstract content
- Deeper reasoning, character motivations, mixed feelings
- More variation in vocabulary and sentence structure
- Sentence length: 12-16 words each
- Can include: Complex sentences, abstract topics, conditional thinking
- Vocabulary: Advanced vocabulary, idiomatic expressions, nuanced language
- Example style: "David had planned to spend his holiday visiting old friends, but a sudden work opportunity changed everything. His company offered him a short-term position abroad—something he had always dreamed of. Although he felt guilty about canceling his plans, he knew this chance might not come again."

QUESTION DESIGN (~30-40% literal, ~60-70% inference):
- ~30-40% literal questions (What changed...? / What did...?)
- ~60-70% inference, interpretation, and relationships
- Question types:
  * Literal: What changed...? / What did...?
  * Inference about feelings and attitudes (How did...feel? - requires understanding internal conflict)
  * Complex inference (What can be inferred about...? - requires connecting multiple pieces of information)
- Generate 3 questions (1 literal, 2 inference)`
      
      case 6: // B2.2 - Upper Intermediate+
        return `CEFR Level: B2.2 - Upper Intermediate+ / Vantage

TEXT REQUIREMENTS:
- Medium length (5-6 sentences, more complex, 120-140 words total)
- More complex ideas, opinions, and some abstract content
- Complex texts, arguments develop step by step
- Abstract topics, layered meanings
- Sentence length: 14-18 words each
- Can include: Advanced structures, style markers, subtle implications
- Vocabulary: Sophisticated vocabulary, nuanced expressions

QUESTION DESIGN (~30-40% literal, ~60-70% inference):
- ~30-40% literal questions
- ~60-70% inference, interpretation, and relationships
- Question types:
  * Main idea and supporting details
  * Inference about feelings, attitudes, and reasons
  * Comparing and contrasting information within the text
  * Interpreting simple implicit messages
- Generate 3-4 questions (mostly inference with some literal)`
      
      case 7: // C1.1 - Advanced
        return `CEFR Level: C1.1 - Advanced / Effective Operational Proficiency

TEXT REQUIREMENTS:
- Medium to longer length (4-5 sentences, but very complex, 120-150 words total)
- Abstract topics, nuanced argumentation, or layered narrative
- Complex sentence structure with multiple clauses
- Subtle details, implications, and layered meanings
- Sentence length: 16-20 words each
- Can include: Technical texts, specialized language, subtle hints
- Vocabulary: Advanced and specialized vocabulary, nuanced expressions
- Example style: "When Maria discovered the old letter hidden behind the bookshelf, she noticed that it ended abruptly, as if the writer had been interrupted mid-sentence. The handwriting was elegant yet hurried, hinting at both intention and anxiety. Although Maria had no idea who wrote it or why it was hidden, the letter's tone suggested that its contents were never meant for public eyes."

QUESTION DESIGN (mostly inferential, interpretive, and evaluative):
- Mostly inferential, interpretive, and evaluative questions
- Question types:
  * "What does...suggest?" (interpreting implications)
  * "What does...imply?" (understanding subtle meanings)
  * "What can be inferred about...?" (complex inference requiring synthesis)
- Generate 3 questions (all inference and interpretation)`
      
      case 8: // C1.2 - Advanced+
        return `CEFR Level: C1.2 - Advanced+ / Effective Operational Proficiency

TEXT REQUIREMENTS:
- Medium to longer length (5-6 sentences, very complex, 150-180 words total)
- Abstract topics, nuanced argumentation, or layered narrative
- Technical texts, specialized language
- Irony and nuanced tone may occur
- Sentence length: 18-22 words each
- Can include: Implicit meanings, subtext, sophisticated reasoning
- Vocabulary: Highly specialized vocabulary, academic language

QUESTION DESIGN (mostly inferential, interpretive, and evaluative):
- Mostly inferential, interpretive, and evaluative questions
- Question types:
  * Author's intention or attitude
  * Interpreting tone and nuance
  * Identifying assumptions or implications
  * Explaining how parts of the text connect (structure, arguments)
- Generate 3-4 questions (all inference and interpretation)`
      
      case 9: // C2.1 - Mastery
        return `CEFR Level: C2.1 - Mastery / Proficiency

TEXT REQUIREMENTS:
- Complex, sophisticated text (4-5 sentences, extremely complex, 150-200 words total)
- Can contain subtle irony, implicit references, and complex argumentation
- Subtle style, advanced idioms and metaphors
- Requires reading between the lines, understanding patterns and implications
- Sentence length: 20-25 words each
- Can include: Literary devices, cultural references, sophisticated reasoning
- Vocabulary: Advanced idioms, metaphors, nuanced language, academic discourse
- Example style: "Long before the committee officially announced its policy shift, subtle indicators hinted at an internal change of direction. Meetings grew shorter, public statements became deliberately vague, and key figures appeared increasingly absent from scheduled discussions. To outside observers, these fragments might have seemed coincidental, but taken together, they formed a coherent pattern: the decision had already been made privately, and the public announcement was merely a formality."

QUESTION DESIGN (very high-level inference, evaluation, and critical thinking):
- Very high-level inference, evaluation, and critical thinking
- Question types:
  * "What do...suggest?" (interpreting subtle patterns and implications)
  * "Why were...?" (understanding motivations and strategies)
  * "What is the best interpretation of...?" (critical evaluation and synthesis)
- Generate 3 questions (all high-level inference and evaluation)`
      
      case 10: // C2.2 - Mastery+
        return `CEFR Level: C2.2 - Mastery+ / Proficiency

TEXT REQUIREMENTS:
- Complex, sophisticated text (5-6 sentences, extremely complex, 200-250 words total)
- Can contain subtle irony, implicit references, and complex argumentation
- Scientific articles, literary works, academic discourse
- Deep reasoning, multiple layers of meaning
- Sentence length: 22-28 words each
- Can include: Critical analysis, complex arguments, sophisticated rhetorical devices
- Vocabulary: Highly sophisticated, academic vocabulary, nuanced academic discourse

QUESTION DESIGN (very high-level inference, evaluation, and critical thinking):
- Very high-level inference, evaluation, and critical thinking
- Question types:
  * Critical evaluation of ideas in the text
  * Interpreting subtle hints or subtext
  * Comparing perspectives within the text
  * Discussing alternative interpretations
- Generate 3 questions (all high-level inference and evaluation)`
    }
  }
  
  // Fallback to old logic if no CEFR level
  const baseDifficulty = blockIndex === 0 ? 'easy' : blockIndex === 1 ? 'medium' : 'hard'
  const finalDifficulty = difficulty === 'easy' ? baseDifficulty : difficulty === 'medium' ? 'medium' : 'hard'
  
  switch (finalDifficulty) {
    case 'easy':
      return `Difficulty: VERY EASY
- Use simple, short sentences (5-10 words each)
- Use basic vocabulary appropriate for grade 6 students learning English as a second language
- Text should be 3-5 sentences long (50-80 words total)
- Focus on simple present tense and basic sentence structures
- Use words from the word list naturally in context
- Generate 2-3 questions (mix of fact, vocabulary, and inference)`
    
    case 'medium':
      return `Difficulty: MEDIUM
- Use medium-length sentences (8-15 words each)
- Include some varied vocabulary but keep it accessible
- Text should be 4-6 sentences long (80-120 words total)
- Can include past tense and some compound sentences
- Use words from the word list in varied contexts
- Generate 3-5 questions (mix of fact, vocabulary, and inference)`
    
    case 'hard':
      return `Difficulty: HARD
- Use longer, more complex sentences (12-20 words each)
- Include varied vocabulary and more advanced structures
- Text should be 5-8 sentences long (120-180 words total)
- Can include various tenses, passive voice, and complex sentence structures
- Use words from the word list in sophisticated contexts
- Generate 5-7 questions (mix of fact, vocabulary, and inference)`
  }
}

function getQuestionCount(difficulty: 'easy' | 'medium' | 'hard', blockIndex: number, cefrLevel?: number): { min: number; max: number } {
  // If CEFR level is provided, use it for precise question count
  if (cefrLevel !== undefined) {
    switch (cefrLevel) {
      case 1: // A1 - 3 questions in example
        return { min: 3, max: 3 }
      case 2: // A2 - 3 questions in example
        return { min: 3, max: 3 }
      case 3: // B1.1 - 3 questions in example
        return { min: 3, max: 3 }
      case 4: // B1.2 - 3-4 questions
        return { min: 3, max: 4 }
      case 5: // B2.1 - 3 questions in example
        return { min: 3, max: 3 }
      case 6: // B2.2 - 3-4 questions
        return { min: 3, max: 4 }
      case 7: // C1.1 - 3 questions in example
        return { min: 3, max: 3 }
      case 8: // C1.2 - 3-4 questions
        return { min: 3, max: 4 }
      case 9: // C2.1 - 3 questions in example
        return { min: 3, max: 3 }
      case 10: // C2.2 - 3 questions
        return { min: 3, max: 3 }
    }
  }
  
  // Fallback to old logic if no CEFR level
  const baseDifficulty = blockIndex === 0 ? 'easy' : blockIndex === 1 ? 'medium' : 'hard'
  const finalDifficulty = difficulty === 'easy' ? baseDifficulty : difficulty === 'medium' ? 'medium' : 'hard'
  
  switch (finalDifficulty) {
    case 'easy':
      return { min: 2, max: 3 }
    case 'medium':
      return { min: 3, max: 5 }
    case 'hard':
      return { min: 5, max: 7 }
  }
}

// Different text themes/genres for variation
const TEXT_THEMES = [
  'adventure story',
  'mystery story',
  'science fiction story',
  'fantasy story',
  'realistic fiction',
  'informational text about animals',
  'informational text about nature',
  'informational text about history',
  'informational text about science',
  'biographical story',
  'fairy tale',
  'comedy story',
  'detective story',
  'travel story',
  'sports story'
]

function getRandomTheme(): string {
  return TEXT_THEMES[Math.floor(Math.random() * TEXT_THEMES.length)]
}

function buildPrompt(words: string[], blockIndex: number, difficulty: 'easy' | 'medium' | 'hard', cefrLevel?: number): { system: string; user: string } {
  const difficultyGuidance = getDifficultyGuidance(difficulty, blockIndex, cefrLevel)
  const theme = getRandomTheme()
  
  const system = `You are an English language teacher creating reading comprehension exercises for Swedish students in grade 6 who are learning English as a second language.

Your task is to:
1. Create a short reading text that naturally incorporates words from the provided word list
2. Generate 3-5 comprehension questions about the text
3. Vary the text style, genre, and topic to keep it interesting and engaging

${difficultyGuidance}

TEXT VARIATION:
- Use different genres and themes: ${TEXT_THEMES.join(', ')}
- Vary narrative styles (first person, third person, descriptive, dialogue)
- Include different topics and settings to keep students engaged
- Make each text unique and interesting

Question Types (follow the CEFR level guidelines above for question distribution):

1. FACT/LITERAL questions: Direct questions about information explicitly stated in the text
   Example: "What color was the cat?" or "Where did the story take place?" or "Who is the main character?"
   Always provide 4 multiple choice options (one correct, three plausible distractors)
   Use for: A1-A2 (80-100% of questions), B1 (50-60%), B2 (30-40%), C1-C2 (minimal)
   
2. VOCABULARY questions: Questions about word meanings (explained in English)
   Example: "What does 'enormous' mean?" or "What is the meaning of 'disappointed'?"
   Always provide 4 multiple choice options where one is correct and others are plausible distractors
   Include an explanation field explaining why the correct answer is correct
   Use sparingly, mainly for lower levels (A1-B1)
   
3. INFERENCE questions: Questions that require understanding beyond what's explicitly stated
   - Simple inference (A2-B1): "Why does she...?" with obvious clues, "How does the character feel?"
   - Complex inference (B2): Feelings, attitudes, reasons, comparing/contrasting, implicit messages
   - Advanced inference (C1): Author's intention, tone, nuance, assumptions, implications, text structure
   - Critical evaluation (C2): Subtle hints, subtext, perspectives, alternative interpretations
   Always provide 4 multiple choice options (one correct, three plausible)
   Include an explanation field explaining why the correct answer is correct
   Use for: A2 (20-30%), B1 (40-50%), B2 (60-70%), C1-C2 (mostly all questions)

IMPORTANT RULES:
- The text MUST naturally include at least 3-5 words from the provided word list
- Use words in their correct grammatical forms (plurals, verb tenses, etc.)
- Questions should be appropriate for grade 6 students (age 12)
- All questions should be answerable from the text
- ALL questions must have 4 multiple choice options (no open-ended questions)
- For vocabulary and inference questions, include an "explanation" field that explains why the correct answer is correct
- Generate the exact number of questions specified for the difficulty level

Output JSON format:
{
  "text": "The reading comprehension text here...",
  "usedWords": ["word1", "word2", "word3"], // List of words from the word list that appear in the text
  "questions": [
    {
      "id": "q1",
      "type": "fact",
      "question": "What color was the cat?",
      "correctAnswer": "black",
      "options": ["black", "white", "brown", "gray"],
      "explanation": "The text explicitly states that the cat was black."
    },
    {
      "id": "q2",
      "type": "vocabulary",
      "question": "What does 'enormous' mean?",
      "correctAnswer": "very large",
      "options": ["very large", "very small", "very fast", "very slow"],
      "explanation": "'Enormous' means very large or huge. In the text, it describes something that is very big."
    },
    {
      "id": "q3",
      "type": "inference",
      "question": "How did the character feel at the end?",
      "correctAnswer": "happy",
      "options": ["happy", "sad", "angry", "confused"],
      "explanation": "The character smiled and laughed at the end, which shows they were happy."
    }
  ]
}`

  const questionCount = getQuestionCount(difficulty, blockIndex, cefrLevel)
  
  const user = `Generate a reading comprehension text and questions.

Word list: ${JSON.stringify(words)}
Block index: ${blockIndex}
Difficulty: ${difficulty}
${cefrLevel ? `CEFR Level: ${cefrLevel}` : ''}
Question count: ${questionCount.min}-${questionCount.max} questions
Theme/genre: ${theme}

Make sure to:
- Use at least 3-5 words from the word list naturally in the text
- List all words from the word list that appear in the text in the "usedWords" array
- Create exactly ${questionCount.min === questionCount.max ? questionCount.min : `${questionCount.min}-${questionCount.max}`} questions following the CEFR level guidelines above
- Make the text engaging and age-appropriate with a ${theme} theme
- Vary the writing style and content to be different from previous texts
- Ensure all questions are answerable from the text
- ALL questions must have exactly 4 multiple choice options
- Include explanations for vocabulary and inference questions
- Follow the question type distribution specified for this CEFR level
- Make the text unique and interesting - avoid repetitive patterns

Respond with JSON only (no explanations).`

  return { system, user }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = RequestSchema.parse(body)
    
    const { words, blockIndex, difficulty, cefrLevel } = validated
    
    // Build prompt
    const { system, user } = buildPrompt(words, blockIndex, difficulty, cefrLevel)
    
    // Call OpenAI with varied temperature for more variation
    const openai = getOpenAI()
    // Vary temperature between 0.8-1.0 for more creative and varied texts
    const temperature = 0.8 + (Math.random() * 0.2) // 0.8 to 1.0
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: temperature,
      response_format: { type: 'json_object' }
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      )
    }
    
    // Parse and validate response
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON response from OpenAI', details: String(e) },
        { status: 500 }
      )
    }
    
    // Validate structure
    const validatedResponse = ResponseSchema.parse(parsed)
    
    return NextResponse.json(validatedResponse)
    
  } catch (error: any) {
    console.error('Block reading generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate text', details: error.message },
      { status: 500 }
    )
  }
}

