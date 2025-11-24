import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { getOpenAI } from '@/lib/openai'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for caching (optional - cache works without it)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as any

// ---------- Types ----------
const ResponseSchema = z.object({
  gap_text: z.string().min(1),
  solution_text: z.string().min(1),
  used_words: z.array(z.string()),
  gaps_meta: z.array(z.object({
    index: z.number().int().positive(),
    correct: z.string().min(1)
  })),
  notes: z.array(z.string()).optional()
})

type SentenceGapResponse = z.infer<typeof ResponseSchema>

// ---------- Utils ----------
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Robust phrase matching (whole word/phrase, case-insensitive)
function phraseRegex(word: string): RegExp {
  return new RegExp(`(?<!\\w)${escapeRegExp(word)}(?!\\w)`, 'i')
}

// NFC normalize + trim + collapse spaces
function norm(s: string) {
  return s.normalize('NFC').trim().replace(/\s+/g, ' ')
}

function isPlaceholderLine(line: string) {
  const l = line.toLowerCase()
  return l.includes('the word is') || l.startsWith('this is a ') || l.startsWith('this is an ')
}

// Disallow weird chars that often break prompts
const FORBIDDEN = /[#@/\\<>`]|[{|}]|_{3,}/

function preflightWordSet(raw: string[]) {
  const errors: string[] = []
  const words = raw.map(norm).filter(Boolean)

  // Duplicates are allowed (e.g., "told" can be both past simple and past participle)
  // We'll track them but not error - they can be used interchangeably
  const seen = new Map<string, number>()
  for (const w of words) {
    const key = w.toLowerCase()
    seen.set(key, (seen.get(key) || 0) + 1)
  }

  // Forbidden chars
  for (const w of words) {
    if (FORBIDDEN.test(w)) errors.push(`Forbidden character(s) in word: "${w}"`)
  }

  // Substrings / component overlap: if any word is contained in another at word boundaries
  // Exception: duplicates are allowed (same word can appear multiple times)
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < words.length; j++) {
      if (i === j) continue
      const a = words[i].toLowerCase()
      const b = words[j].toLowerCase()
      // Skip if it's the same word (duplicate - allowed)
      if (a === b) continue
      // Only flag if a is a whole-word substring inside b
      const re = new RegExp(`(?<!\\w)${escapeRegExp(a)}(?!\\w)`, 'i')
      if (re.test(b)) {
        errors.push(`Component overlap between "${words[i]}" and "${words[j]}"`)
      }
    }
  }

  return { words, errors }
}

function buildPrompt(opts: {
  wordSet: string[]
  difficulty: 'green' | 'yellow' | 'red'
  signature: string
  includeAnimalGuidance: boolean
}) {
  const { wordSet, difficulty, signature, includeAnimalGuidance } = opts

  // Animal guidance only if animals detected
  const animalGuidance = includeAnimalGuidance ? `\n- If animals appear, include distinctive, unambiguous cues (habitat/behavior/features).` : ''

  // Difficulty-specific guidance
  const difficultyGuidance = {
    green: `GREEN LEVEL (Easiest):
- Use ONLY very simple, common words (CEFR A1 level).
- Keep sentences VERY SHORT: 4-7 words maximum.
- Use simple present tense, basic structures (Subject-Verb-Object).
- Avoid complex grammar, idioms, or advanced vocabulary.
- Make sentences clear and straightforward.`,
    yellow: `YELLOW LEVEL (Moderate):
- Use moderate vocabulary (CEFR A2-B1 level).
- Keep sentences moderate length: 6-10 words.
- Can use simple past/future tenses, basic clauses.
- Some variety in structure but still accessible.`,
    red: `RED LEVEL (Advanced):
- Use more advanced vocabulary and structures (CEFR B1-B2 level).
- Longer sentences: 8-15 words, can include clauses.
- Complex tenses, varied structures, nuanced expressions.
- More sophisticated language while remaining clear.`
  }[difficulty]

  // Single prompt - minimize reasoning, output JSON directly
  const system = `Generate sentence-gap exercise. Output JSON directly. Be concise.

${difficultyGuidance}

Rules:
- CRITICAL ORDER REQUIREMENT: The order MUST match wordSet exactly.
  * solution_text[0] must contain wordSet[0]
  * solution_text[1] must contain wordSet[1]
  * solution_text[2] must contain wordSet[2]
  * ... and so on for all N words
  * gaps_meta[0].correct must equal wordSet[0] (lowercase)
  * gaps_meta[1].correct must equal wordSet[1] (lowercase)
  * ... and so on
  * used_words must be EXACTLY wordSet in the SAME ORDER: ["wordSet[0]", "wordSet[1]", ...]
- Exactly N lines in gap_text and N lines in solution_text (one per word in wordSet order).
- One line = one sentence. One "______" per gap line. 
- CRITICAL: Every line MUST end with a period (.), exclamation (!), or question mark (?).
- Use the EXACT surface form wordSet[i] in solution_text[i] (case-insensitive ok).
- No placeholders ("The word is...", "This is a...").
- No component overlap between multi-word targets across different lines.
- Vary structure, tense, perspective, and context across lines.${animalGuidance}
- Duplicate words in wordSet are allowed - use them in different contexts.
- CRITICAL UNIQUENESS REQUIREMENT: Each gap word/phrase must be UNIQUE to its sentence.
  * wordSet[i] should ONLY fit grammatically and semantically in sentence[i]
  * wordSet[i] should NOT fit naturally in any other sentence (sentence[j] where j ≠ i)
  * Create distinct contexts, subjects, verbs, or sentence structures so each word is clearly tied to ONE specific sentence
  * For example: if wordSet contains "by day" and "by night", create sentences where "by day" only fits one context and "by night" only fits another
  * Avoid generic sentences where multiple words could fit - make each sentence specific to its target word
- IMPORTANT: Generate UNIQUE sentences different from previous runs. Vary wording, context, and examples.

Output JSON only (no explanations, no reasoning):
{
  "gap_text": "line1\\nline2\\n...",
  "solution_text": "line1\\nline2\\n...",
  "used_words": ["word1", "word2", ...],
  "gaps_meta": [{"index": 1, "correct": "word1"}, ...],
  "notes": []
}`.trim()

  const user = `Generate unique sentences for this run.

CRITICAL: Maintain exact order:
- wordSet[0]="${wordSet[0]}" → solution_text[0] must contain "${wordSet[0]}", gaps_meta[0].correct="${wordSet[0].toLowerCase()}"
- wordSet[1]="${wordSet[1]}" → solution_text[1] must contain "${wordSet[1]}", gaps_meta[1].correct="${wordSet[1].toLowerCase()}"
${wordSet.length > 2 ? `- wordSet[2]="${wordSet[2]}" → solution_text[2] must contain "${wordSet[2]}", gaps_meta[2].correct="${wordSet[2].toLowerCase()}"` : ''}
${wordSet.length > 3 ? `- wordSet[3]="${wordSet[3]}" → solution_text[3] must contain "${wordSet[3]}", gaps_meta[3].correct="${wordSet[3].toLowerCase()}"` : ''}
${wordSet.length > 4 ? `- wordSet[4]="${wordSet[4]}" → solution_text[4] must contain "${wordSet[4]}", gaps_meta[4].correct="${wordSet[4].toLowerCase()}"` : ''}
${wordSet.length > 5 ? `- wordSet[5]="${wordSet[5]}" → solution_text[5] must contain "${wordSet[5]}", gaps_meta[5].correct="${wordSet[5].toLowerCase()}"` : ''}
${wordSet.length > 6 ? `- wordSet[6]="${wordSet[6]}" → solution_text[6] must contain "${wordSet[6]}", gaps_meta[6].correct="${wordSet[6].toLowerCase()}"` : ''}
${wordSet.length > 7 ? `- wordSet[7]="${wordSet[7]}" → solution_text[7] must contain "${wordSet[7]}", gaps_meta[7].correct="${wordSet[7].toLowerCase()}"` : ''}

CRITICAL: Each word/phrase must be UNIQUE to its sentence:
- "${wordSet[0]}" should ONLY fit in sentence 1, not in any other sentence
- "${wordSet[1]}" should ONLY fit in sentence 2, not in any other sentence
${wordSet.length > 2 ? `- "${wordSet[2]}" should ONLY fit in sentence 3, not in any other sentence` : ''}
${wordSet.length > 3 ? `- "${wordSet[3]}" should ONLY fit in sentence 4, not in any other sentence` : ''}
${wordSet.length > 4 ? `- "${wordSet[4]}" should ONLY fit in sentence 5, not in any other sentence` : ''}
${wordSet.length > 5 ? `- "${wordSet[5]}" should ONLY fit in sentence 6, not in any other sentence` : ''}
${wordSet.length > 6 ? `- "${wordSet[6]}" should ONLY fit in sentence 7, not in any other sentence` : ''}
${wordSet.length > 7 ? `- "${wordSet[7]}" should ONLY fit in sentence 8, not in any other sentence` : ''}
- Create distinct contexts so each word is clearly tied to ONE specific sentence
- Avoid generic sentences where multiple words could fit

sig=${signature} difficulty=${difficulty}
wordSet=${JSON.stringify(wordSet)}
used_words must be EXACTLY: ${JSON.stringify(wordSet)}

Respond with JSON only.`.trim()

  return { system, user }
}

function looksLikeAnimal(word: string) {
  const animals = ['cat', 'dog', 'fox', 'bear', 'owl', 'whale', 'elephant', 'giraffe', 'penguin', 'eagle', 'lion', 'tiger', 'wolf', 'deer', 'seal', 'dolphin', 'shark', 'horse', 'cow', 'sheep', 'goat', 'chicken', 'duck', 'bird', 'fish', 'rabbit', 'mouse', 'rat', 'hamster', 'turtle', 'snake', 'lizard', 'frog', 'spider', 'bee', 'butterfly', 'ant', 'fly', 'mosquito', 'worm', 'snail', 'otter', 'moose', 'elk', 'bison', 'leopard', 'cheetah', 'zebra', 'hippo', 'rhino', 'monkey', 'ape', 'gorilla', 'chimpanzee', 'panda', 'koala', 'kangaroo']
  return animals.includes(word.toLowerCase())
}

type RetryResult = { ok: true; data: SentenceGapResponse } | { ok: false; error: any; retryable: boolean; details?: any }

// Hedged requests helper - race two calls and take first successful response
async function firstFast<T>(
  calls: Array<() => Promise<T>>
): Promise<T> {
  // Use Promise.allSettled to wait for all, then take first successful
  // No timeout - let requests complete naturally
  const results = await Promise.allSettled(
    calls.map(fn => fn())
  )
  
  // Find first successful result
  for (const result of results) {
    if (result.status === 'fulfilled') {
      return result.value
    }
  }
  
  // If all failed, throw first error
  const firstRejected = results.find(r => r.status === 'rejected')
  if (firstRejected && firstRejected.status === 'rejected') {
    throw firstRejected.reason
  }
  throw new Error('All requests failed')
}

async function callModelOnce(params: {
  wordSet: string[]
  difficulty: 'green' | 'yellow' | 'red'
  signature: string
}): Promise<RetryResult> {
  const startTime = Date.now()
  let promptBuildTime = 0
  let apiCallTime = 0
  let parseTime = 0
  
  const promptStart = Date.now()
  const includeAnimalGuidance = params.wordSet.some(looksLikeAnimal)
  const { system, user } = buildPrompt({
    wordSet: params.wordSet,
    difficulty: params.difficulty,
    signature: params.signature,
    includeAnimalGuidance
  })
  promptBuildTime = Date.now() - promptStart
  
  // Dynamic max_tokens: Optimized for gpt-4o-mini (no reasoning tokens overhead)
  // Need enough tokens for JSON structure + all sentences
  const N = params.wordSet.length
  let maxTokens: number
  if (params.difficulty === 'green') {
    maxTokens = 200 + 30 * N  // Green: shorter sentences but need room for JSON
  } else if (params.difficulty === 'yellow') {
    maxTokens = 250 + 35 * N  // Yellow: moderate
  } else {
    maxTokens = 300 + 40 * N  // Red: more complex
  }
  // Cap at reasonable max but higher to avoid truncation
  if (maxTokens > 500) maxTokens = 500
  
  const openai = getOpenAI()
  
  console.log('📊 Story Gap - Timing breakdown start', {
    promptBuildTime,
    systemLength: system.length,
    userLength: user.length,
    totalPromptTokens: Math.ceil((system.length + user.length) / 4) // Rough estimate
  })

  // JSON schema for response format (if supported)
  const jsonSchemaForAPI = {
    name: "SentenceGapResponse",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        gap_text: { type: "string" },
        solution_text: { type: "string" },
        used_words: { type: "array", items: { type: "string" } },
        gaps_meta: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer" },
              correct: { type: "string" }
            },
            required: ["index", "correct"],
            additionalProperties: true
          }
        },
        notes: { type: "array", items: { type: "string" } }
      },
      required: ["gap_text", "solution_text", "used_words", "gaps_meta", "notes"]
    }
  }

  try {
    // Using gpt-4o-mini - more reliable, no reasoning tokens overhead
    const model = 'gpt-4o-mini'
    
    // Temperature per difficulty
    let temperature: number
    if (params.difficulty === 'green') {
      temperature = 0.65
    } else if (params.difficulty === 'yellow') {
      temperature = 0.7
    } else {
      temperature = 0.75
    }
    
    const completionParams: any = {
      model: model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: maxTokens,  // gpt-4o-mini uses max_tokens
      temperature: temperature,
      top_p: 0.9,
      presence_penalty: 0.35
    }

    // Try JSON schema if available (gpt-5-mini may support it)
    try {
      completionParams.response_format = { 
        type: 'json_schema', 
        json_schema: jsonSchemaForAPI 
      } as any
    } catch (e) {
      // If not supported, continue without it
    }
    let completion: any
    let latency: number
    let content: string = ''

    try {
      const apiStart = Date.now()
      completion = await openai.chat.completions.create(completionParams)
      apiCallTime = Date.now() - apiStart
      latency = Date.now() - startTime
      content = completion.choices?.[0]?.message?.content ?? ''
      
      console.log('📊 Story Gap - API call completed', {
        apiCallTime,
        totalLatency: latency,
        promptBuildTime,
        contentLength: content.length,
        finishReason: completion?.choices?.[0]?.finish_reason,
        usage: completion?.usage,
        tokensUsed: completion?.usage?.total_tokens,
        completionTokens: completion?.usage?.completion_tokens
      })
      
      if (!content || content.trim().length === 0) {
        console.error('📊 Story Gap - Empty response from model', { 
          model: completionParams.model,
          finishReason: completion?.choices?.[0]?.finish_reason,
          usage: completion?.usage
        })
        return { ok: false, error: 'empty_response', retryable: true, details: 'Model returned empty content' }
      }
    } catch (error: any) {
      const latency = Date.now() - startTime
      console.error('📊 Story Gap - API call failed', {
        error: error?.message,
        code: error?.code,
        status: error?.status,
        latency,
        wordSet: params.wordSet
      })
      return { ok: false, error: 'api_error', retryable: true, details: error?.message ?? String(error) }
    }

    let parsed: SentenceGapResponse | null = null

    try {
      const parseStart = Date.now()
      // Try to extract JSON from response
      let jsonStr = content.trim()
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        const match = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
        if (match) jsonStr = match[1]
      }
      // Extract JSON object (try to handle incomplete JSON)
      let jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        parseTime = Date.now() - parseStart
        console.error('📊 Story Gap - No JSON found in response', { 
          content: content.substring(0, 200),
          contentLength: content.length,
          finishReason: completion?.choices?.[0]?.finish_reason,
          parseTime
        })
        return { ok: false, error: 'invalid_json', retryable: true, details: 'No JSON object found in response' }
      }

      let json: any
      try {
        json = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        parseTime = Date.now() - parseStart
        // If JSON is incomplete/truncated, check if it's due to token limit
        if (completion?.choices?.[0]?.finish_reason === 'length') {
          console.error('📊 Story Gap - JSON truncated due to token limit', { 
            contentLength: content.length,
            finishReason: completion?.choices?.[0]?.finish_reason,
            parseTime
          })
          return { ok: false, error: 'truncated_response', retryable: true, details: 'Response was truncated. Try with fewer words or lower difficulty.' }
        }
        throw parseError
      }
      
      if (json && json.error) {
        parseTime = Date.now() - parseStart
        console.error('📊 Story Gap - Model returned error', { error: json.error, details: json.details, parseTime })
        return { ok: false, error: 'model_validation_failed', retryable: true, details: json }
      }

      // Normalize: Convert arrays to strings if needed
      if (Array.isArray(json.gap_text)) {
        json.gap_text = json.gap_text.join('\n')
      }
      if (Array.isArray(json.solution_text)) {
        json.solution_text = json.solution_text.join('\n')
      }
      
      // Normalize gaps_meta: Ensure index is 1-based and positive
      if (Array.isArray(json.gaps_meta)) {
        json.gaps_meta = json.gaps_meta.map((meta: any, idx: number) => ({
          index: meta.index > 0 ? meta.index : (idx + 1),
          correct: String(meta.correct || '').trim().toLowerCase()
        }))
      }
      
      // Normalize notes: Convert string to array if needed
      if (json.notes !== undefined) {
        if (typeof json.notes === 'string') {
          json.notes = json.notes.trim() ? [json.notes] : []
        } else if (!Array.isArray(json.notes)) {
          json.notes = []
        }
      } else {
        json.notes = []
      }

      parsed = ResponseSchema.parse(json)
      parseTime = Date.now() - parseStart
      
      console.log('📊 Story Gap - Parse completed', {
        parseTime,
        totalLatency: Date.now() - startTime
      })
    } catch (e) {
      parseTime = Date.now() - (startTime + promptBuildTime + apiCallTime)
      console.error('📊 Story Gap - JSON parse failed', { 
        error: e instanceof Error ? e.message : String(e), 
        content: content.substring(0, 200),
        parseTime,
        totalLatency: Date.now() - startTime
      })
      return { ok: false, error: 'invalid_json', retryable: true, details: e instanceof Error ? e.message : String(e) }
    }

    // Structural validation
    const validationStart = Date.now()
    const gapLines = parsed.gap_text.split(/\r?\n/).map(l => norm(l)).filter(Boolean)
    const solLines = parsed.solution_text.split(/\r?\n/).map(l => norm(l)).filter(Boolean)
    const N = params.wordSet.length
    const errs: string[] = []

    if (gapLines.length !== N) errs.push(`gap_text lines=${gapLines.length} != ${N}`)
    if (solLines.length !== N) errs.push(`solution_text lines=${solLines.length} != ${N}`)

    // used_words must equal wordSet in same order (case-insensitive compare)
    if (parsed.used_words.length !== N) {
      errs.push(`used_words length=${parsed.used_words.length} != ${N}`)
    } else {
      for (let i = 0; i < N; i++) {
        if (norm(parsed.used_words[i]).toLowerCase() !== norm(params.wordSet[i]).toLowerCase()) {
          errs.push(`used_words[${i}]="${parsed.used_words[i]}" != wordSet[${i}]="${params.wordSet[i]}"`)
        }
      }
    }

    // gaps_meta index and correct
    if (parsed.gaps_meta.length !== N) {
      errs.push(`gaps_meta length=${parsed.gaps_meta.length} != ${N}`)
      } else {
      for (let i = 0; i < N; i++) {
        const m = parsed.gaps_meta[i]
        if (m.index !== i + 1) errs.push(`gaps_meta[${i}].index=${m.index} != ${i + 1}`)
        const expected = norm(params.wordSet[i]).toLowerCase()
        if (norm(m.correct).toLowerCase() !== expected) {
          errs.push(`gaps_meta[${i}].correct="${m.correct}" != wordSet[${i}]="${params.wordSet[i]}"`)
        }
      }
    }

    // Per-line checks
    const lowerSet = params.wordSet.map(w => norm(w).toLowerCase())
    for (let i = 0; i < N; i++) {
      const target = lowerSet[i]
      const sol = solLines[i]
      const gap = gapLines[i]

      if (!sol || !gap) {
        errs.push(`Missing line ${i + 1}`)
        continue
      }

      // One blank
      const blanks = (gap.match(/______+/g) || []).length
      if (blanks !== 1) errs.push(`gap line ${i + 1} has ${blanks} blanks (expected 1)`)

      // Max 12 words per line (fast check) - warn but don't fail for slightly over
      const solWords = sol.trim().split(/\s+/).length
      if (solWords > 15) errs.push(`solution line ${i + 1} has ${solWords} words (max 15)`)
      const gapWords = gap.trim().split(/\s+/).length
      if (gapWords > 15) errs.push(`gap line ${i + 1} has ${gapWords} words (max 15)`)

      // Ends with period - auto-fix if missing
      let fixedSol = sol.trim()
      let fixedGap = gap.trim()
      if (!/[.!?]$/.test(fixedSol)) {
        fixedSol = fixedSol + '.'
      }
      if (!/[.!?]$/.test(fixedGap)) {
        fixedGap = fixedGap + '.'
      }
      
      // Update arrays with fixed versions
      solLines[i] = fixedSol
      gapLines[i] = fixedGap

      // Placeholder ban
      if (isPlaceholderLine(fixedSol)) errs.push(`solution line ${i + 1} contains placeholder: "${fixedSol.substring(0, 50)}"`)
      if (isPlaceholderLine(fixedGap)) errs.push(`gap line ${i + 1} contains placeholder: "${fixedGap.substring(0, 50)}"`)

      // Target appears in solution[i] (use fixed version)
      if (!phraseRegex(params.wordSet[i]).test(fixedSol)) {
        errs.push(`solution line ${i + 1} does not contain exact target "${params.wordSet[i]}"`)
      }

      // Other targets must not appear in this solution line (use fixed version)
      // Exception: if wordSet[j] is the same as wordSet[i] (duplicate), it's allowed
      for (let j = 0; j < N; j++) {
        if (j === i) continue
        const targetI = norm(params.wordSet[i]).toLowerCase()
        const targetJ = norm(params.wordSet[j]).toLowerCase()
        // Allow if it's the same word (duplicate - can be used in different contexts)
        if (targetI === targetJ) continue
        if (phraseRegex(params.wordSet[j]).test(fixedSol)) {
          errs.push(`solution line ${i + 1} contains other target "${params.wordSet[j]}"`)
        }
        // Also disallow components of multi-word targets
        // BUT: Ignore common words (articles, prepositions) that are part of multi-word phrases
        const parts = norm(params.wordSet[j]).split(' ')
        if (parts.length > 1) {
          const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
          for (const p of parts) {
            // Skip very short words and common words (they appear naturally in sentences)
            if (p.length < 3 || commonWords.has(p.toLowerCase())) continue
            const re = phraseRegex(p)
            if (re.test(fixedSol)) {
              // Only flag if the component word is NOT part of the full phrase in this sentence
              // (i.e., if "the worst" appears, "the" is OK; but if only "the" appears without "worst", flag it)
              const fullPhraseRegex = phraseRegex(params.wordSet[j])
              if (!fullPhraseRegex.test(fixedSol)) {
                errs.push(`solution line ${i + 1} contains component "${p}" of "${params.wordSet[j]}"`)
              }
            }
          }
        }
      }
    }
    
    // Update parsed data with fixed lines (with punctuation)
    parsed.solution_text = solLines.join('\n')
    parsed.gap_text = gapLines.join('\n')

    const validationTime = Date.now() - validationStart
    const totalLatency = Date.now() - startTime
    
    if (errs.length > 0) {
      console.error('📊 Story Gap - Validation failed', { 
        errors: errs, 
        wordSet: params.wordSet, 
        latency: totalLatency,
        timing: {
          promptBuild: promptBuildTime,
          apiCall: apiCallTime,
          parse: parseTime,
          validation: validationTime,
          total: totalLatency
        },
        breakdown: {
          promptBuildPct: Math.round((promptBuildTime / totalLatency) * 100),
          apiCallPct: Math.round((apiCallTime / totalLatency) * 100),
          parsePct: Math.round((parseTime / totalLatency) * 100),
          validationPct: Math.round((validationTime / totalLatency) * 100)
        }
      })
      return { ok: false, error: 'validation_failed', retryable: true, details: errs }
    }

    console.log('📊 Story Gap - Success', { 
      wordSet: params.wordSet, 
      difficulty: params.difficulty, 
      latency: totalLatency,
      attempt: params.signature.split('-').pop(),
      timing: {
        promptBuild: promptBuildTime,
        apiCall: apiCallTime,
        parse: parseTime,
        validation: validationTime,
        total: totalLatency
      },
      breakdown: {
        promptBuildPct: Math.round((promptBuildTime / totalLatency) * 100),
        apiCallPct: Math.round((apiCallTime / totalLatency) * 100),
        parsePct: Math.round((parseTime / totalLatency) * 100),
        validationPct: Math.round((validationTime / totalLatency) * 100)
      },
      bottleneck: apiCallTime > promptBuildTime + parseTime + validationTime ? 'API_CALL' : 
                  promptBuildTime > parseTime + validationTime ? 'PROMPT_BUILD' : 'OTHER',
      completionTokens: completion?.usage?.completion_tokens,
      totalTokens: completion?.usage?.total_tokens
    })
    return { ok: true, data: parsed }
  } catch (error: any) {
    const latency = Date.now() - startTime
    console.error('📊 Story Gap - API call failed', {
      error: error?.message,
      code: error?.code,
      status: error?.status,
      latency,
      wordSet: params.wordSet
    })
    return { ok: false, error: 'api_error', retryable: true, details: error?.message ?? String(error) }
  }
}

async function callModelWithRetries(input: {
  wordSet: string[]
  difficulty: 'green' | 'yellow' | 'red'
  retryAttempt?: number
}) {
  const startTime = Date.now()
  
  // Hedged requests (2 parallel calls) - no retries, no timeout, just let them finish
  // Use timestamp + random UUID + word order hash for unique signatures each time
  // This ensures variation even with cached word sets
  const wordOrderHash = crypto.createHash('md5').update(input.wordSet.join(',')).digest('hex').substring(0, 8)
  const sig1 = `${Date.now()}-${crypto.randomUUID()}-${wordOrderHash}-A`
  const sig2 = `${Date.now()}-${crypto.randomUUID()}-${wordOrderHash}-B`
  
  const makeCall = (sig: string) => async (): Promise<RetryResult> => {
    return callModelOnce({
      wordSet: input.wordSet,
      difficulty: input.difficulty,
      signature: sig
    })
  }
  
  try {
    // Hedged requests - take first successful response, no timeout
    console.log('📊 Story Gap - Starting hedged requests (no retries, no timeout)', { wordSet: input.wordSet, difficulty: input.difficulty })
    const result = await firstFast([
      makeCall(sig1),
      makeCall(sig2)
    ])
    
    console.log('📊 Story Gap - Request completed', { 
      ok: result.ok, 
      elapsed: Date.now() - startTime,
      error: result.ok ? undefined : result.error
    })
    
    return result
  } catch (error: any) {
    console.error('📊 Story Gap - Hedged requests failed', { error: error?.message, elapsed: Date.now() - startTime })
    return { ok: false, error: 'api_error', retryable: false, details: error?.message ?? String(error) }
  }
}

// ---------- Cache Functions ----------
function createWordSetHash(wordSet: string[], difficulty: string): string {
  const normalized = wordSet.map(w => w.toLowerCase().trim()).sort().join(',')
  return crypto.createHash('sha256').update(`${normalized}:${difficulty}`).digest('hex')
}

async function getCachedSentences(wordSetHash: string): Promise<SentenceGapResponse | null> {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('📊 Story Gap - Supabase not configured, skipping cache')
      return null
    }
    
    const { data, error } = await supabase
      .from('sentence_gap_cache')
      .select('gap_text, solution_text, used_words, gaps_meta, notes')
      .eq('word_set_hash', wordSetHash)
      .single()
    
    if (error || !data) return null
    
    // Update usage stats (non-blocking, don't fail if RPC doesn't exist)
    try {
      const { error: rpcError } = await supabase.rpc('increment_cache_use', { cache_hash: wordSetHash })
      if (rpcError) {
        // Fallback: manual update if RPC doesn't exist
        await supabase
          .from('sentence_gap_cache')
          .update({ 
            last_used_at: new Date().toISOString()
          })
          .eq('word_set_hash', wordSetHash)
      }
    } catch (e) {
      // Ignore cache update errors - not critical
      console.warn('📊 Story Gap - Cache update error (non-critical):', e)
    }
    
    return {
      gap_text: data.gap_text,
      solution_text: data.solution_text,
      used_words: data.used_words,
      gaps_meta: data.gaps_meta,
      notes: data.notes || []
    }
  } catch (e) {
    console.error('📊 Story Gap - Cache read error', e)
    return null
  }
}

async function cacheSentences(wordSetHash: string, wordSet: string[], difficulty: string, response: SentenceGapResponse) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('📊 Story Gap - Supabase not configured, skipping cache')
      return
    }
    
    await supabase
      .from('sentence_gap_cache')
      .upsert({
        word_set_hash: wordSetHash,
        word_set: wordSet,
        difficulty,
        gap_text: response.gap_text,
        solution_text: response.solution_text,
        used_words: response.used_words,
        gaps_meta: response.gaps_meta,
        notes: response.notes || [],
        last_used_at: new Date().toISOString(),
        use_count: 1
      }, {
        onConflict: 'word_set_hash',
        ignoreDuplicates: false
      })
  } catch (e) {
    console.error('📊 Story Gap - Cache write error', e)
    // Don't fail the request if caching fails
  }
}

// ---------- Route ----------
export async function POST(req: NextRequest) {
  const requestStart = Date.now()
  try {
    const body = await req.json()
    const wordSet: string[] = Array.isArray(body?.wordSet) ? body.wordSet : []
    const difficulty = (body?.difficulty ?? 'yellow') as 'green' | 'yellow' | 'red'

    // Preflight validation
    const { words, errors } = preflightWordSet(wordSet)
    if (errors.length) {
      console.error('📊 Story Gap - Preflight failed', { errors, wordSet })
      return NextResponse.json({ error: 'preflight_failed', retryable: false, details: errors }, { status: 400 })
    }

    if (words.length === 0) {
      return NextResponse.json({ error: 'invalid_input', retryable: false, details: 'Empty word set' }, { status: 400 })
    }

    if (words.length > 8) {
      return NextResponse.json({ error: 'invalid_input', retryable: false, details: 'Word set too large (max 8)' }, { status: 400 })
    }

    // Check cache first, but don't use it directly - always generate new sentences for variation
    // Cache is checked for reference but we always generate fresh sentences with shuffled order
    const wordSetHash = createWordSetHash(words, difficulty)
    const cached = await getCachedSentences(wordSetHash)
    if (cached) {
      console.log('📊 Story Gap - Cache exists (using as reference only, generating new sentences)', { wordSetHash })
      // Don't return cached - continue to generate new sentences for variation
    }

    // Generate new sentences
    const res = await callModelWithRetries({ wordSet: words, difficulty })
    const totalLatency = Date.now() - requestStart

    if (!res.ok) {
      console.error('📊 Story Gap - Generation failed', {
        error: res.error,
        retryable: res.retryable,
        details: res.details,
        latency: totalLatency,
        wordSet: words
      })
      return NextResponse.json({
        error: res.error === 'preflight_failed' ? 'preflight_failed' : 'generation_failed',
        retryable: !!res.retryable,
        details: res.details ?? res.error
      }, { status: res.error === 'preflight_failed' ? 400 : 502 })
    }

    // Cache successful generation
    if (res.ok && 'data' in res && res.data) {
      await cacheSentences(wordSetHash, words, difficulty, res.data)
    }

    console.log('📊 Story Gap - Request completed', { wordSet: words, difficulty, latency: totalLatency, cached: !!cached })
    if (res.ok && 'data' in res) {
      return NextResponse.json(res.data)
    } else {
      return NextResponse.json({ error: 'generation_failed' }, { status: 502 })
    }
  } catch (e: any) {
    const totalLatency = Date.now() - requestStart
    console.error('📊 Story Gap - Server error', {
      error: e?.message ?? String(e),
      latency: totalLatency
    })
    return NextResponse.json({
      error: 'server_error',
      retryable: false,
      details: e?.message ?? String(e)
    }, { status: 500 })
  }
}
