import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai'

type StoryGapResponse = {
  gap_text: string
  solution_text: string
  used_words: string[]
  gaps_meta: Array<{
    index: number
    correct: string
    why_unique: string
    rejects: Array<{ word: string; reason: string }>
  }>
  notes?: string[]
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    let wordSet: string[] = Array.isArray(body?.wordSet) ? body.wordSet : []
    
    console.log('Story Gap API - Received request:', { wordSet, difficulty: body?.difficulty })

    if (!Array.isArray(wordSet) || wordSet.length < 1) {
      console.log('Story Gap API - Invalid input:', { wordSet })
      return NextResponse.json({ error: 'invalid_input', message: 'Provide { wordSet: string[] } with 1–8 words.' }, { status: 400 })
    }

    // Cap at 8 words per rules
    const capped = wordSet.filter(w => typeof w === 'string').slice(0, 8)
    if (capped.length < 1) {
      return NextResponse.json({ error: 'invalid_words', message: 'At least 1 valid word required.' }, { status: 400 })
    }

    const openai = getOpenAI()
    const reqDifficulty = (body?.difficulty || 'green') as 'green' | 'yellow' | 'red'
    const levelGuidelines = reqDifficulty === 'green'
      ? 'Use very simple language (CEFR A1–A2), one short sentence per word.'
      : reqDifficulty === 'yellow'
      ? 'Use moderate language (A2–B1), one sentence per word with clear cues.'
      : 'Use more advanced but still accessible language (B1–B2), nuanced cues.'

    const systemSimple = `You are generating a sentence-gap exercise. Be creative and varied with your sentences!

Goal: Given a word set (1–8 words), create EXACTLY one independent sentence PER word (N sentences total). Each sentence includes exactly ONE target word from the set. Then produce a cloze version by replacing that target word with "______".
Structure: One gap per sentence. Each sentence must stand alone and be unambiguous. Difficulty: ${levelGuidelines}

IMPORTANT: Create DIVERSE sentences with different structures, contexts, and styles. Avoid repetitive patterns. Vary sentence length and complexity naturally.

CRITICAL: NEVER use generic placeholder sentences like "The word is [word]." or "This is a [word]." Each sentence must be a REAL, MEANINGFUL sentence that naturally incorporates the target word in context. Examples of GOOD sentences:
- "She learned the important lesson from her childhood." (for "learned")
- "After a long journey, they arrived safely at their destination." (for "arrived")
- "The children played on the swing in the backyard." (for "swing")
Examples of BAD sentences to NEVER use:
- "The word is learned."
- "This is a swing."
- "The word is arrived."

Hard rules:
- Use each provided word exactly once (no duplicates). There must be exactly N blanks for N words.
- Use the EXACT surface form (case-insensitive) of each word (no inflection/synonym).
- CRITICAL: Do NOT repeat any part of the target word/phrase within the same sentence. For example, if the target is "save our seeds", do NOT write "We must save our seeds our seeds" - write "We must save our seeds for next year" instead.
- CRITICAL: For multi-word phrases, ensure NO part of the phrase appears in other sentences. For example, if you have "justice and freedom" and "equal rights" as targets, do NOT write "Everyone deserves equal rights and freedom" in one sentence and "We all need justice and freedom" in another - this creates ambiguity because "and freedom" appears in both. Instead, write completely separate sentences like "Everyone deserves equal rights in society" and "We all need justice and freedom to thrive."
- CRITICAL: NEVER create placeholder sentences. Every sentence must be meaningful and contextually appropriate.
- CRITICAL: When using multi-word phrases, ensure each phrase appears as a complete unit in its sentence, and NO component words from one phrase appear in sentences for other phrases. This prevents confusion and ambiguity.
- Output JSON with keys: gap_text, solution_text, used_words (same order as sentences), gaps_meta, notes[]. For GREEN/YELLOW keep gaps_meta minimal: [{"index":1,"correct":"word"}] (omit long explanations).
- IMPORTANT: gap_text and solution_text must be SINGLE STRINGS (not arrays). Separate sentences with a space or newline. Do NOT output arrays for these fields.

Clarity rules:
- Make the sentence cue strong enough that no other word in the set could fit (collocations, selectional restrictions, determiners, agreement).
- Keep simple, classroom-appropriate language with correct prepositions (e.g., "above the tree"). Avoid tautology.
- CONTEXTUAL FIT: Each word must fit naturally and logically in its sentence context. Avoid forcing words into awkward or illogical positions.
- SEMANTIC COHERENCE: The sentence should make sense with the target word in place. Avoid nonsensical combinations.
- COLLOCATION AWARENESS: Use words in contexts where they naturally belong (e.g., 'heart' in medical/emotional contexts, not 'heart' as a verb).
- Grammar compatibility: Use each exact surface form in a frame where it is grammatical without extra particles (e.g., use "starve" as a bare verb if preceded by a modal; avoid forcing "to starve" where a bare verb is required). Choose frames that naturally host the provided form.
- If the target starts with "to ", license it with an appropriate matrix verb or purpose frame (e.g., "begin to …", "need to …", "try to …", "plan to …", "in order to …"). Never place it after a modal (can/will/should…).
- If the target is a bare verb (no leading "to"), prefer frames that require the bare form (after modals, imperative) and do not add "to" before it.
- No duplication: Do NOT repeat a target word within its sentence, and do NOT repeat any component of a multi‑word target right after it (e.g., avoid "luxury home home"). Avoid duplicated tokens like "tragically tragically".

Validation (self-check before returning):
- Each word appears exactly once in solution_text; blanks = number of words.
- For each gap, other set-words should be wrong. Keep rejects concise (≤2).
- Each sentence must be contextually appropriate and make logical sense.
- Avoid ambiguous gaps where multiple words could plausibly fit.
- For 6+ words: Create shorter, simpler sentences (5-12 words) to avoid complexity and timeouts.
- Prioritize clarity over complexity when dealing with many words.`

    const systemBase = `You are an assistant generating rounds for a game called AI Story Gap.

Goal: Given a word set (1–8 words), generate EXACTLY one sentence PER word (N sentences total). Each sentence must naturally include exactly ONE target word from the set. Then produce a cloze version with blanks by replacing the target word in each sentence with "______".
Structure requirement: Exactly one target word per sentence (one gap per sentence). Do not create cross-sentence dependencies; each sentence must stand alone and be unambiguous.

Difficulty guidelines: ${levelGuidelines}

Critical constraint: ZERO ambiguity (otvetydigt)
- Every gap must be unambiguous: only its target word from the set can fit the sentence naturally and grammatically. It should be realistically solvable by a student given the surrounding sentence(s).
- Use multiple and consistent discriminators for each target: collocations, fixed expressions, selectional restrictions, determiners, agreement, tense/aspect, semantic role, and world knowledge cues.
- Prefer concrete cues over vague hints. Avoid minimal contexts like "I saw a ____" unless you add unique anchor cues (e.g., idioms, unit nouns, fixed prepositions).

Hard constraints:
- Use each provided set-word exactly once across the entire solution_text (no duplicates) so there are exactly N gaps for N words.
- Treat multi-word phrases as atomic when they are used as targets in gaps.
- Do not introduce synonyms or near-duplicates as targets beyond the set; the intended answers must come from the provided set.
- CRITICAL: Do NOT repeat any part of the target word/phrase within the same sentence. For example, if the target is "save our seeds", do NOT write "We must save our seeds our seeds" - write "We must save our seeds for next year" instead.
- CRITICAL: For multi-word phrases, ensure NO component words from one phrase appear in sentences for other phrases. For example, if you have "justice and freedom" and "equal rights" as targets, do NOT write "Everyone deserves equal rights and freedom" and "We all need justice and freedom" - this creates ambiguity. Instead, write completely separate sentences like "Everyone deserves equal rights in society" and "We all need justice and freedom to thrive" where each phrase is self-contained.
- CRITICAL: Each multi-word phrase must appear as a complete, atomic unit in its sentence. Do NOT allow component words from one phrase to appear in other sentences, as this creates confusion about which phrase belongs where.
 - Use the EXACT surface form of each set-word/phrase as provided (case-insensitive) in solution_text. Do NOT inflect, conjugate, or replace with a synonym (e.g., use "fear", not "afraid"; use "pick up" exactly with the same spacing, not "picked up" or "pick-up").
 - When repeating a set-word, always repeat the exact surface form.

Output JSON only with EXACT keys and structure:
{
  "gap_text": "string",
  "solution_text": "string",
  "used_words": ["w1","w2",...],
  "gaps_meta": [
    { "index": 1, "correct": "word", "why_unique": "string", "rejects": [ {"word":"other","reason":"..."} ] }
  ],
  "notes": []
}

Rules:
- Include all provided set-words at least once in solution_text.
- In gap_text, replace EACH occurrence of a used set-word with "______".
- Ensure each gap is uniquely solvable by its correct word and not others in the set.
- Keep language simple, school-friendly, and grammatically correct.

Quality constraints:
- Keep the story logically coherent across sentences; avoid contradictions or abrupt topic shifts.
- Maintain consistent point of view, tense, and register unless motivated by the plot.
- Avoid odd or unnatural phrasings; favor idiomatic, classroom-appropriate language.
 - Sense and part-of-speech anchoring: Use each target in a context that fixes its intended sense and grammatical role. Prefer collocations that competitors cannot satisfy.
   Examples: use "still water" (motionless/calm) rather than temporal "still"; avoid vague uses like "we were still happy".
 - Habitat/behavior coherence: pair animals with typical environments and behaviors (whales in the ocean; owls fly/hoot; foxes on land; salmon swim). Do not misidentify the same entity with different species.
 - Preposition clarity: Spatial prepositions (e.g., "above", "under", "near") must attach to an explicit head. Prefer grammatical frames like "X is above the Y" or "He saw X above the Y". Avoid ungrammatical frames like "I saw above a tree".
 - Concision/no tautology: Avoid redundant phrases (e.g., "make noise with the sputtering sound"). Use a single, clear predicate and purpose (e.g., "He banged pots and pans to send signals.").
 - Prefer simple SVO with a clear purpose clause when cueing verbs (e.g., "to send signals").
 - Grammar compatibility: Use each exact surface form in a grammatical frame (e.g., bar verb after modals; license "to …" with a matrix verb/purpose frame; include "been" in present perfect passive: "has been taken by …").
 - Function words on GREEN/YELLOW (modals like could/should/might; prepositions like since) must use fixed templates that uniquely license them (e.g., "If I had more time, I ___ help you" for could). Prefer content-words as targets when possible.
 - Multi‑word noun phrases (e.g., "black belt", "banana sandwich", "an amazing story") must be used as noun phrases with appropriate determiners/verbs (e.g., "earn/get/have a black belt", "make/eat a banana sandwich", "tell an amazing story"); do not use them as verbs.
 - No duplication: do not repeat the target word or a component of a multi‑word target within its sentence.

Validation checklist (follow before returning JSON):
- For every word in wordSet, it appears at least once in solution_text (count>=1).
- Number of blanks in gap_text equals the total number of occurrences of used_words in solution_text.
 - For each gap in gap_text, verify that substituting any other set-word makes the sentence ungrammatical, semantically wrong, or pragmatically odd. If any alternative could fit, strengthen the cues.
 - Keep rejects concise: at most 3 items per gap, with brief reasons.
 - Run a final self-check to remove awkward phrasing and ensure natural, idiomatic language while keeping all constraints.
 - Check that each sentence with a gap strongly cues exactly one target word and that "still" (if present) is used in a collocation that excludes other targets (e.g., "still water" or "stand still").
 - Check preposition attachment: sentences like "I saw above a tree" must be rewritten to a grammatical construction (e.g., "I saw a drone above the tree").
`

    async function callModel(feedback?: string, plan?: any): Promise<{ raw: string; parsed: StoryGapResponse | null }> {
      const modelsToTry = ['gpt-5-mini', 'gpt-4o-mini'] // Fallback to gpt-4o-mini if gpt-5-mini fails
      
      for (const modelName of modelsToTry) {
        try {
          const messages = [
            { role: 'system' as const, content: systemSimple },
            { role: 'user' as const, content: JSON.stringify({ wordSet: capped, difficulty: reqDifficulty, plan: plan || null }) },
          ]
          if (feedback) messages.push({ role: 'user' as const, content: feedback })
          
          console.log('Story Gap API - Calling OpenAI with:', { 
            model: modelName, 
            wordCount: capped.length, 
            difficulty: reqDifficulty,
            hasFeedback: !!feedback 
          })
          
          const completion = await openai.chat.completions.create({
            model: modelName,
            temperature: reqDifficulty === 'red' ? 0.3 : 0.7, // Increased temperature for better variation
            max_tokens: reqDifficulty === 'red' ? 1000 : 700,
            messages,
          })
          
          const raw = completion.choices?.[0]?.message?.content?.trim() || ''
          console.log('Story Gap API - OpenAI response:', { 
            model: modelName,
            rawLength: raw.length, 
            rawPreview: raw.substring(0, 200),
            hasChoices: !!completion.choices?.[0]
          })
          
          if (!raw) {
            console.log(`Story Gap API - Empty response from ${modelName}, trying next model...`)
            continue
          }
          
          let parsed: StoryGapResponse | null = null
          try {
            parsed = JSON.parse(raw) as StoryGapResponse
            console.log('Story Gap API - Successfully parsed JSON')
          } catch (parseError) {
            console.log('Story Gap API - JSON parse failed, trying to extract JSON from raw:', parseError)
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) {
              try { 
                parsed = JSON.parse(m[0]) as StoryGapResponse
                console.log('Story Gap API - Successfully extracted and parsed JSON')
              } catch (extractError) {
                console.log('Story Gap API - Failed to extract JSON:', extractError)
              }
            }
          }
          
          if (parsed) {
            return { raw, parsed }
          }
        } catch (error: any) {
          console.error(`Story Gap API - OpenAI call failed with ${modelName}:`, {
            error: error?.message,
            code: error?.code,
            status: error?.status,
            type: error?.type
          })
          
          // If it's a model not found error, try next model
          if (error?.code === 'model_not_found' || error?.status === 404 || error?.message?.includes('model')) {
            console.log(`Story Gap API - Model ${modelName} not available, trying next model...`)
            continue
          }
          
          // For other errors, if this is the last model, return empty
          if (modelName === modelsToTry[modelsToTry.length - 1]) {
            return { raw: '', parsed: null }
          }
        }
      }
      
      // All models failed
      console.error('Story Gap API - All models failed')
      return { raw: '', parsed: null }
    }

    // Planning step: assign each word to a sentence and role before generation
    async function callPlan(): Promise<{ raw: string; plan: Array<{ word: string; sentence: number; role: string; cue?: string }> | null }> {
      const modelsToTry = ['gpt-5-mini', 'gpt-4o-mini'] // Fallback to gpt-4o-mini if gpt-5-mini fails
      
      for (const modelName of modelsToTry) {
        try {
          const plannerSystem = `You plan a cloze exercise with independent sentences. Return compact JSON only.
Schema: { "plan": [ { "word": "string", "sentence": 1, "role": "subject|object|verb|adj|adv|prep-phrase|collocation", "cue": "<=6 words" } ] }
Rules:
- One distinct target per sentence, exactly one sentence per target.
- Create exactly N sentences where N = wordSet.length and use each target exactly once.
- Roles must be unique enough to avoid collisions; keep cues short.`
          const completion = await openai.chat.completions.create({
            model: modelName,
            temperature: 0,
            max_tokens: 220,
            messages: [
              { role: 'system', content: plannerSystem },
              { role: 'user', content: JSON.stringify({ wordSet: capped, difficulty: reqDifficulty }) },
            ],
          })
          const raw = completion.choices?.[0]?.message?.content?.trim() || ''
          if (!raw) {
            console.log(`Story Gap API - Empty response from ${modelName} in callPlan, trying next model...`)
            continue
          }
          let planObj: any = null
          try { planObj = JSON.parse(raw) } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) { try { planObj = JSON.parse(m[0]) } catch {} }
          }
          const plan = Array.isArray(planObj?.plan) ? planObj.plan : null
          if (plan) {
            return { raw, plan }
          }
        } catch (error: any) {
          console.error(`Story Gap API - callPlan failed with ${modelName}:`, {
            error: error?.message,
            code: error?.code,
            status: error?.status
          })
          
          // If it's a model not found error, try next model
          if (error?.code === 'model_not_found' || error?.status === 404 || error?.message?.includes('model')) {
            console.log(`Story Gap API - Model ${modelName} not available in callPlan, trying next model...`)
            continue
          }
          
          // For other errors, if this is the last model, return empty
          if (modelName === modelsToTry[modelsToTry.length - 1]) {
            return { raw: '', plan: null }
          }
        }
      }
      
      return { raw: '', plan: null }
    }

    function normalizeResponse(resp: any, expectedWords: string[]): StoryGapResponse | null {
      if (!resp || typeof resp !== 'object') return null
      let gapText: string = ''
      let solutionText: string = ''
      const used: string[] = Array.isArray(resp.used_words) ? resp.used_words.map((w: any) => String(w || '')) : expectedWords
      // Normalize gap_text
      if (typeof resp.gap_text === 'string') gapText = resp.gap_text
      else if (Array.isArray(resp.gap_text)) gapText = resp.gap_text.filter((s: any) => typeof s === 'string').join(' ')
      else gapText = ''
      // Normalize solution_text
      if (typeof resp.solution_text === 'string') solutionText = resp.solution_text
      else if (Array.isArray(resp.solution_text)) {
        // If model returned only words, rebuild from gapText and used words
        const arr = resp.solution_text.filter((s: any) => typeof s === 'string') as string[]
        if (arr.length === used.length && /______/.test(gapText)) {
          solutionText = rebuildSolutionFromGap(gapText, used)
        } else {
          solutionText = arr.join(' ')
        }
      } else {
        if (/______/.test(gapText)) solutionText = rebuildSolutionFromGap(gapText, used)
        else solutionText = ''
      }
      // If gapText lacks blanks, try to rebuild from solution + used words (sentence-per-word assumption)
      if (!/______/.test(gapText) && typeof solutionText === 'string' && used.length > 0) {
        const rebuilt = rebuildGapFromSolution(solutionText, used)
        if (rebuilt) gapText = rebuilt
      }
      // Fix gaps_meta indexes to be 1-based
      let gapsMetaRaw = Array.isArray(resp.gaps_meta) ? resp.gaps_meta : []
      let gapsMeta = gapsMetaRaw.map((g: any, i: number) => ({
        index: typeof g?.index === 'number' ? (g.index === 0 ? 1 : g.index) : (Number(g?.index) || (i + 1)),
        correct: String(g?.correct || (used[i] || '')),
        why_unique: String(g?.why_unique || ''),
        rejects: Array.isArray(g?.rejects) ? g.rejects.slice(0, 2).map((r: any) => ({ word: String(r?.word || ''), reason: String(r?.reason || '') })) : [],
      }))
      if (gapsMeta.length === 0) {
        gapsMeta = expectedWords.map((w, i) => ({ index: i + 1, correct: w, why_unique: '', rejects: [] }))
      }
      return {
        gap_text: String(gapText || ''),
        solution_text: String(solutionText || ''),
        used_words: expectedWords,
        gaps_meta: gapsMeta,
        notes: Array.isArray(resp.notes) ? resp.notes : []
      }
    }

    function rebuildSolutionFromGap(gapText: string, wordsInOrder: string[]): string {
      let idx = 0
      return gapText.replace(/______+/g, () => {
        const w = wordsInOrder[idx] ?? ''
        idx++
        return w
      })
    }

    function rebuildGapFromSolution(solution: string, wordsInOrder: string[]): string | null {
      // Split into sentences and replace one target per sentence in order
      const sents = String(solution || '').split(/(?<=[.!?])\s+/).filter(Boolean)
      if (sents.length < wordsInOrder.length) return null
      const out: string[] = []
      let wi = 0
      for (let i = 0; i < sents.length && wi < wordsInOrder.length; i++) {
        const target = wordsInOrder[wi]
        const re = new RegExp(`(^|[^A-Za-zÅÄÖåäö])${escapeRegex(target)}([^A-Za-zÅÄÖåäö]|$)`, 'i')
        if (re.test(sents[i])) {
          out.push(sents[i].replace(re, (m, p1, p2) => `${p1}______${p2}`))
          wi++
        } else {
          out.push(sents[i])
        }
      }
      // Append remaining sentences as-is
      for (let j = out.length; j < sents.length; j++) out.push(sents[j])
      const result = out.join(' ')
      return /______/.test(result) ? result : null
    }

    async function challengeAmbiguity(parsed: StoryGapResponse): Promise<{ ok: boolean; ambiguous: Array<{ index: number; alternatives: string[]; reason?: string }> }> {
      const modelsToTry = ['gpt-5-mini', 'gpt-4o-mini'] // Fallback to gpt-4o-mini if gpt-5-mini fails
      
      for (const modelName of modelsToTry) {
        try {
          const challengeSystem = `You are a strict validator for a cloze (gap) exercise.

Task: Given gap_text (with blanks as ______), solution_text, and the set of allowed words, check each blank and decide if ANY other word from the set (besides the intended one) could plausibly fit (grammatically, semantically, pragmatically).

Return compact JSON only: { "ok": boolean, "ambiguous": [ { "index": n, "alternatives": ["word"], "reason": "why" } ] }.
If everything is unambiguous, use ok=true and ambiguous=[]. Keep responses short.`

          const payload = {
            wordSet: capped,
            gap_text: String(parsed.gap_text || ''),
            solution_text: String(parsed.solution_text || '')
          }
          const completion = await openai.chat.completions.create({
            model: modelName,
            temperature: 0,
            max_tokens: 250,
            messages: [
              { role: 'system', content: challengeSystem },
              { role: 'user', content: JSON.stringify(payload) }
            ]
          })
          const raw = completion.choices?.[0]?.message?.content?.trim() || ''
          if (!raw) {
            console.log(`Story Gap API - Empty response from ${modelName} in challengeAmbiguity, trying next model...`)
            continue
          }
          let parsedResp: { ok: boolean; ambiguous: Array<{ index: number; alternatives: string[]; reason?: string }> } | null = null
          try {
            parsedResp = JSON.parse(raw)
          } catch {
            const m = raw.match(/\{[\s\S]*\}/)
            if (m) {
              try { parsedResp = JSON.parse(m[0]) } catch {}
            }
          }
          if (parsedResp && typeof parsedResp.ok === 'boolean' && Array.isArray(parsedResp.ambiguous)) {
            return parsedResp
          }
        } catch (error: any) {
          console.error(`Story Gap API - challengeAmbiguity failed with ${modelName}:`, {
            error: error?.message,
            code: error?.code,
            status: error?.status
          })
          
          // If it's a model not found error, try next model
          if (error?.code === 'model_not_found' || error?.status === 404 || error?.message?.includes('model')) {
            console.log(`Story Gap API - Model ${modelName} not available in challengeAmbiguity, trying next model...`)
            continue
          }
          
          // For other errors, if this is the last model, assume ok to avoid extra tokens
          if (modelName === modelsToTry[modelsToTry.length - 1]) {
            return { ok: true, ambiguous: [] }
          }
        }
      }
      
      // On challenge failure, assume ok to avoid extra tokens
      return { ok: true, ambiguous: [] }
    }

    function lintGrammar(solution: string, used: string[]): { ok: boolean; issues: Array<{ sentence: number; reason: string }> } {
      const sents = String(solution || '').split(/(?<=[.!?])\s+/).filter(Boolean)
      const issues: Array<{ sentence: number; reason: string }> = []
      const modalTo = /(\bcan|\bcould|\bwill|\bwould|\bmay|\bmight|\bshould|\bshall|\bmust)\s+to\s+[a-z]+/i
      const auxTokens = ['has','have','had','was','were','is','are','be','been','being','get','got','gotten']
      const irregularPart = new Set(['given','taken','made','done','seen','known','shown','gone','broken','written','bought','brought','thought','caught','left','felt','kept','built','heard','taught','paid','said','told','found','put','set','cut','eaten','drunk','spoken','driven','flown','grown','worn','chosen','begun','become','forgotten','forgiven','fallen'])
      const usedLower = used.map(w => String(w || '').toLowerCase())
      function isParticiple(word: string): boolean {
        const w = word.toLowerCase().trim()
        if (w.startsWith('to ')) return false
        return irregularPart.has(w) || /[a-z]{2,}ed$/.test(w)
      }
      for (let i = 0; i < sents.length; i++) {
        const s = sents[i]
        if (modalTo.test(s)) {
          issues.push({ sentence: i + 1, reason: 'modal+to+verb pattern' })
        }
        // duplicate token check (e.g., "home home", "tragically tragically")
        if (/(\b\w+)(\s+\1)\b/i.test(s)) {
          issues.push({ sentence: i + 1, reason: 'duplicated token' })
        }
        // Check for target word repetition within the same sentence
        for (const w of usedLower) {
          if (!w) continue
          const wordRegex = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi')
          const matches = s.match(wordRegex) || []
          if (matches.length > 1) {
            issues.push({ sentence: i + 1, reason: `duplicated target word "${w}" in same sentence` })
          }
        }
        // perfect without 'been' in passive-like frame (has/have/had ... participle ... by/from/into/out of/to)
        const perfectNoBeenPassive = /(\bhas|\bhave|\bhad)\b(?:(?!\bbeen\b).)*\b([A-Za-z]+ed|given|taken|made|done|seen|known|shown|gone|broken|written|bought|brought|thought|caught|left|felt|kept|built|heard|taught|paid|said|told|found|put|set|cut|eaten|drunk|spoken|driven|flown|grown|worn|chosen|begun|become|forgotten|forgiven|fallen)\b(?:(?![.!?]).)*(\bby\b|\bfrom\b|\binto\b|\bout of\b|\bto\b)/i
        if (perfectNoBeenPassive.test(s)) {
          issues.push({ sentence: i + 1, reason: "perfect passive missing 'been'" })
        }
        // NP target used as verb (heuristic: multiword with space used before a direct object without support verb)
        if (/\b(black belt|banana sandwich|an amazing story)\b\s+\w+\b/i.test(s) && !/\b(earn|get|have|make|eat|tell)\b/i.test(s)) {
          issues.push({ sentence: i + 1, reason: 'np-target used as verb' })
        }
        for (const w of usedLower) {
          if (!w) continue
          const regex = new RegExp(`(^|[^A-Za-zÅÄÖåäö])${escapeRegex(w)}([^A-Za-zÅÄÖåäö]|$)`, 'i')
          if (!regex.test(s)) continue
          // If word starts with 'to ', ensure licensed; if bare participle, ensure auxiliary
          if (w.startsWith('to ')) {
            const licensers = ['want to','need to','try to','plan to','decide to','begin to','start to','hope to','learn to','agree to','appear to','seem to','in order to']
            const ok = licensers.some(l => s.toLowerCase().includes(l))
            if (!ok) issues.push({ sentence: i + 1, reason: `infinitive not licensed for "${w}"` })
          } else if (isParticiple(w)) {
            const hasAux = auxTokens.some(a => new RegExp(`\b${a}\b`, 'i').test(s)) || /^\s*given\b/i.test(s)
            if (!hasAux) issues.push({ sentence: i + 1, reason: `participle "${w}" lacks auxiliary` })
          }
        }
      }
      return { ok: issues.length === 0, issues }
    }

    function validateOnce(parsed: StoryGapResponse) {
      const text = String(parsed.solution_text || '')
      const expectedWords: string[] = capped.map(w => String(w || ''))
      const lc = text.toLowerCase()
      // Count total occurrences of each expected word (from selected set)
      const counts: Record<string, number> = {}
      let totalOccurrences = 0
      for (const w of expectedWords) {
        const token = String(w || '')
        const re = new RegExp(`(^|[^a-zA-ZåäöÅÄÖ])${escapeRegex(token.toLowerCase())}([^a-zA-ZåäöÅÄÖ]|$)`, 'g')
        let c = 0
        while (re.exec(lc)) c++
        counts[token] = c
        totalOccurrences += c
      }
      // Sentence-per-word mode: exactly once per word for all difficulties
      const gapCount = (String(parsed.gap_text || '').match(/______+/g) || []).length
      const bad = Object.entries(counts).filter(([, c]) => c !== 1)
      if (bad.length > 0) {
        return { ok: false as const, reason: 'must_be_once', details: { counts, used: expectedWords, gap_text: parsed.gap_text, solution_text: parsed.solution_text } }
      }
      if (gapCount !== expectedWords.length) {
        return { ok: false as const, reason: 'gap_count_mismatch', details: { gapCount, expected: expectedWords.length } }
      }
      
      // Additional contextual validation
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
      const contextualIssues: string[] = []
      
      // Check for overlapping multi-word phrases across sentences
      // This prevents cases like "equal rights and freedom" in one sentence and "justice and freedom" in another
      const multiWordPhrases = expectedWords.filter(w => String(w).trim().split(/\s+/).length > 1)
      if (multiWordPhrases.length > 1) {
        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i].toLowerCase()
          for (const phrase1 of multiWordPhrases) {
            const words1 = String(phrase1).trim().toLowerCase().split(/\s+/)
            // Check if any component word from phrase1 appears in other sentences
            for (let j = 0; j < sentences.length; j++) {
              if (i === j) continue
              const otherSentence = sentences[j].toLowerCase()
              // Check if any component word from phrase1 appears in otherSentence
              for (const word of words1) {
                if (word.length < 3) continue // Skip very short words like "a", "an", "of"
                const wordRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i')
                if (wordRegex.test(otherSentence)) {
                  // Check if this word is part of another phrase
                  for (const phrase2 of multiWordPhrases) {
                    if (phrase1 === phrase2) continue
                    const words2 = String(phrase2).trim().toLowerCase().split(/\s+/)
                    if (words2.includes(word)) {
                      // Found overlap - check if phrase1 is in sentence i and phrase2 is in sentence j
                      const phrase1Regex = new RegExp(`\\b${escapeRegex(String(phrase1).trim().toLowerCase())}\\b`, 'i')
                      const phrase2Regex = new RegExp(`\\b${escapeRegex(String(phrase2).trim().toLowerCase())}\\b`, 'i')
                      if (phrase1Regex.test(sentence) && phrase2Regex.test(otherSentence)) {
                        contextualIssues.push(`Sentence ${i + 1} and ${j + 1}: Overlapping phrases "${phrase1}" and "${phrase2}" share component word "${word}"`)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Check for obviously illogical sentences
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i]
        const lowerSentence = sentence.toLowerCase()
        
        // Check for nonsensical combinations
        if (lowerSentence.includes('heart') && (lowerSentence.includes('run') || lowerSentence.includes('walk'))) {
          if (!lowerSentence.includes('heart rate') && !lowerSentence.includes('heart beat')) {
            contextualIssues.push(`Sentence ${i + 1}: "heart" used inappropriately with action verbs`)
          }
        }
        
        // Check for awkward word placements
        if (lowerSentence.includes('the') && lowerSentence.includes('is') && lowerSentence.includes('very')) {
          const words = sentence.split(/\s+/)
          const theIndex = words.findIndex(w => w.toLowerCase() === 'the')
          const isIndex = words.findIndex(w => w.toLowerCase() === 'is')
          const veryIndex = words.findIndex(w => w.toLowerCase() === 'very')
          
          if (theIndex !== -1 && isIndex !== -1 && veryIndex !== -1) {
            if (theIndex > isIndex || veryIndex < isIndex) {
              contextualIssues.push(`Sentence ${i + 1}: Awkward word order`)
            }
          }
        }
        
        // Check for grammatical errors with "had ever been"
        if (lowerSentence.includes('had ever been')) {
          // Check if it's used incorrectly with passive voice
          if (lowerSentence.includes('had ever been seen') || 
              lowerSentence.includes('had ever been taken') || 
              lowerSentence.includes('had ever been done') ||
              lowerSentence.includes('had ever been made')) {
            contextualIssues.push(`Sentence ${i + 1}: "had ever been" used incorrectly with passive voice`)
          }
        }
        
        // Check for other common grammatical errors
        if (lowerSentence.includes('i had ever been') && lowerSentence.includes('seen')) {
          contextualIssues.push(`Sentence ${i + 1}: Incorrect passive voice construction with "I had ever been seen"`)
        }
      }
      
      if (contextualIssues.length > 0) {
        return { ok: false as const, reason: 'contextual_issues', details: { issues: contextualIssues } }
      }
      
      return { ok: true as const }
    }

    // Skip planning for all difficulties to improve speed
    // Planning adds extra API call overhead without significant benefit
    console.log('Story Gap API - Starting generation for words:', capped)
    const planResp = { raw: '', plan: null }
    let attempt = await callModel(undefined, planResp.plan)
    console.log('Story Gap API - First attempt result:', { 
      parsed: !!attempt.parsed, 
      rawLength: attempt.raw?.length || 0,
      rawPreview: attempt.raw?.substring(0, 100) || 'No raw content'
    })
    
    if (!attempt.parsed) {
      console.log('Story Gap API - Model output invalid, trying to normalize')
      // Try to normalize raw into expected schema if possible
      try {
        const rawObj = JSON.parse(attempt.raw)
        const normalized = normalizeResponse(rawObj, capped)
        if (normalized) {
          const checkN = validateOnce(normalized)
          if ((checkN as any).ok) {
            console.log('Story Gap API - Successfully normalized raw output')
            return NextResponse.json(normalized)
          }
        }
      } catch (e) {
        console.log('Story Gap API - Failed to normalize raw output:', e)
      }
      return NextResponse.json({ error: 'model_output_invalid', raw: attempt.raw }, { status: 502 })
    }
    let check = validateOnce(attempt.parsed)
    console.log('Story Gap API - Validation result:', { 
      ok: (check as any).ok, 
      reason: (check as any).reason,
      details: (check as any).details 
    })
    
    if ((check as any).ok) {
      // Check for placeholder sentences like "The word is..."
      const solutionText = String(attempt.parsed.solution_text || '').toLowerCase()
      const gapText = String(attempt.parsed.gap_text || '').toLowerCase()
      const hasPlaceholderSentences = solutionText.includes('the word is') || gapText.includes('the word is')
      
      if (hasPlaceholderSentences) {
        console.log('Story Gap API - Detected placeholder sentences, regenerating...')
        const feedbackPlaceholder = `Your output contained placeholder sentences like "The word is [word]." which are not allowed. 
Create REAL, MEANINGFUL sentences that naturally incorporate each target word in context. 
Examples: "She learned the important lesson from her childhood." NOT "The word is learned."
Regenerate with proper sentences. Keep JSON schema.`
        const second = await callModel(feedbackPlaceholder, planResp.plan)
        if (second.parsed && (validateOnce(second.parsed) as any).ok) {
          const secondSolution = String(second.parsed.solution_text || '').toLowerCase()
          const secondGap = String(second.parsed.gap_text || '').toLowerCase()
          if (!secondSolution.includes('the word is') && !secondGap.includes('the word is')) {
            const normalized2 = { ...second.parsed, used_words: capped }
            return NextResponse.json(normalized2)
          }
        }
        // If regeneration still has placeholders, continue to grammar check
      }
      
      // Simplified validation: skip expensive ambiguity challenge for speed
      // Only run lightweight grammar lint for all difficulties
      const lintG = lintGrammar(attempt.parsed.solution_text, capped)
      if (lintG.ok) {
        const normalized = { ...attempt.parsed, used_words: capped }
        return NextResponse.json(normalized)
      } else {
        // Only retry once for grammar issues to avoid long waits
        const reasons = lintG.issues.map(i => `#${i.sentence}:${i.reason}`).join(', ')
        const feedbackFix = `Fix grammar issues (${reasons}).
Ensure: no modal+to+verb, license infinitives, add 'been' in perfect passive, provide auxiliaries for participles, and remove duplicated tokens. Keep JSON schema.`
        const second = await callModel(feedbackFix, planResp.plan)
        if (second.parsed && (validateOnce(second.parsed) as any).ok) {
          const lint2 = lintGrammar(second.parsed.solution_text, capped)
          const normalized2 = { ...second.parsed, used_words: capped }
          if (lint2.ok) return NextResponse.json(normalized2)
        }
        // Return original even with minor grammar issues rather than failing
        const normalized = { ...attempt.parsed, used_words: capped }
        return NextResponse.json(normalized)
      }
    }
    // Multiple corrective retries for better success rate
    const details = (check as any).details || {}
    const counts = (details.counts || {}) as Record<string, number>
    const missingList = Object.entries(counts)
      .filter(([, c]) => (c as number) < 1)
      .map(([w]) => w)
    
    // Try up to 2 retries (reduced from 3 for speed)
    for (let retry = 0; retry < 2; retry++) {
      const checkReason = (check as any).reason
      const checkDetails = (check as any).details || {}
      const contextualIssues = checkReason === 'contextual_issues' ? (checkDetails.issues || []) : []
      const hasOverlapIssue = contextualIssues.some((issue: string) => issue.includes('Overlapping phrases'))
      
      let feedback = `Your previous output failed validation (${checkReason}).
Regenerate and ensure:
- Every provided word appears at least once. Missing words: [${missingList.join(', ')}].
- Use the EXACT surface form of each provided word/phrase (no inflections, no synonyms).
- CRITICAL: Each word must fit naturally and logically in its sentence context.
- Create sentences that make logical sense with the target word in place.
- Use words in contexts where they naturally belong.
- Replace every occurrence of a set-word in solution_text with a blank in gap_text.
- Keep unambiguous gaps and the JSON schema.
- Avoid ambiguous gaps where multiple words could plausibly fit.
- GRAMMAR: Avoid incorrect passive voice constructions like "I had ever been seen" - use "I had ever seen" instead.
- GRAMMAR: Ensure "had ever been" is used correctly (e.g., "I had ever been there" not "I had ever been seen").`
      
      if (hasOverlapIssue) {
        feedback += `\n\nCRITICAL: You have overlapping multi-word phrases. For example, if you have "justice and freedom" and "equal rights" as targets, do NOT write "Everyone deserves equal rights and freedom" in one sentence and "We all need justice and freedom" in another. Instead, write completely separate sentences where each phrase appears as a complete, self-contained unit with NO shared component words appearing in other sentences. Each multi-word phrase must be isolated to its own sentence.`
      }

      if (retry === 1) {
        feedback += `\n\nFINAL ATTEMPT: Create SIMPLE, SHORT sentences (5-8 words each). Use basic patterns like "The [word] is here." or "I see the [word]." for each missing word.`
      }

      attempt = await callModel(feedback, planResp.plan)
      if (!attempt.parsed) continue
      
      check = validateOnce(attempt.parsed)
      if ((check as any).ok) {
        // Skip ambiguity challenge for speed - return immediately on validation success
        const normalized = { ...attempt.parsed, used_words: capped }
        return NextResponse.json(normalized)
      }
    }

    // All retries failed - return error instead of unusable fallback
    console.log('Story Gap API - All retries failed, returning error response')
    return NextResponse.json({
      error: 'generation_failed',
      message: 'Unable to generate valid sentences for all words. Please try again.',
      wordSet: capped,
      retryable: true,
      details: {
        reason: (check as any).reason || 'validation_failed',
        missingWords: Object.entries((check as any).details?.counts || {})
          .filter(([, count]) => (count as number) < 1)
          .map(([word]) => word),
        attempts: 3
      }
    }, { status: 422 })
  } catch (e: any) {
    console.error('Story Gap API - Top level error:', e)
    const status = typeof e?.status === 'number' ? e.status : 500
    return NextResponse.json({ 
      error: 'story_gap_failed', 
      message: e?.message, 
      code: e?.code,
      details: e?.details || 'Unknown error occurred'
    }, { status })
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceSequential(solution: string, expectedWords: string[]): string {
  let text = solution
  const lc = text.toLowerCase()
  const taken: boolean[] = new Array(expectedWords.length).fill(false)
  for (let i = 0; i < expectedWords.length; i++) {
    const w = expectedWords[i]
    const re = new RegExp(`(^|[^A-Za-zÅÄÖåäö])${escapeRegex(w.toLowerCase())}([^A-Za-zÅÄÖåäö]|$)`, 'i')
    if (re.test(text)) {
      text = text.replace(re, (m, p1, p2) => `${p1}______${p2}`)
      taken[i] = true
    }
  }
  return text
}

function tryLocalFixDuplicates(parsed: StoryGapResponse): StoryGapResponse | null {
  try {
    const used = Array.isArray(parsed.used_words) ? parsed.used_words : []
    let text = String(parsed.solution_text || '')
    const lc = text.toLowerCase()
    const counts: Record<string, number> = {}
    for (const w of used) {
      const token = String(w || '')
      const re = new RegExp(`(^|[^a-zA-ZåäöÅÄÖ])${escapeRegex(token.toLowerCase())}([^a-zA-ZåäöÅÄÖ]|$)`, 'g')
      let c = 0
      while (re.exec(lc)) c++
      counts[token] = c
    }
    
    // Check for problematic duplicates that create awkward sentences
    const problematicDuplicates = Object.entries(counts).filter(([word, count]) => {
      if (count <= 1) return false
      // Check if the word appears multiple times in the same sentence
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase()
        const wordLower = word.toLowerCase()
        const wordMatches = (sentenceLower.match(new RegExp(`\\b${escapeRegex(wordLower)}\\b`, 'g')) || []).length
        if (wordMatches > 1) return true
      }
      return false
    })
    
    // If we have problematic duplicates, try to fix them
    if (problematicDuplicates.length > 0) {
      // For now, return null to force regeneration instead of creating awkward sentences
      return null
    }
    
    // Replace extra occurrences beyond the first (only if they're in different sentences)
    for (const w of used) {
      const token = String(w)
      const count = counts[token] || 0
      if (count <= 1) continue
      const replacement = pickSafeReplacement(token)
      // Replace occurrences 2..N with a callback that skips first
      const re = new RegExp(`(\b)${escapeRegex(token)}(\b)`, 'gi')
      let seen = 0
      text = text.replace(re, (m, p1, p2) => {
        seen++
        if (seen === 1) return m
        // preserve case basic: if original capitalized, capitalize replacement
        const cap = m[0] === m[0].toUpperCase()
        const rep = cap ? capitalize(replacement) : replacement
        return `${p1}${rep}${p2}`
      })
    }
    return { ...parsed, solution_text: text }
  } catch {
    return null
  }
}

function finalizeToExactN(parsed: StoryGapResponse, expectedWords: string[]): StoryGapResponse | null {
  try {
    const used = expectedWords
    let work: StoryGapResponse = { ...parsed, used_words: used }
    // De-duplicate usages in solution
    const fixedDup = tryLocalFixDuplicates(work)
    if (fixedDup) work = fixedDup
    // Count occurrences
    const lc = work.solution_text.toLowerCase()
    const counts: Record<string, number> = {}
    for (const w of used) {
      const re = new RegExp(`(^|[^a-zA-ZåäöÅÄÖ])${escapeRegex(w.toLowerCase())}([^a-zA-ZåäöÅÄÖ]|$)`, 'g')
      let c = 0
      while (re.exec(lc)) c++
      counts[w] = c
    }
    const missing: string[] = used.filter(w => (counts[w] || 0) < 1)
    if (missing.length > 0) {
      // Create proper sentences instead of generic fallback
      const extrasSol = missing.map((w, i) => {
        const templates = [
          `The ${w} is beautiful.`,
          `I love the ${w}.`,
          `This ${w} is special.`,
          `The ${w} looks amazing.`,
          `I found the ${w}.`,
          `The ${w} is here.`,
          `This is a ${w}.`,
          `I see the ${w}.`
        ]
        return templates[i % templates.length]
      }).join(' ')
      
      const extrasGap = missing.map((w, i) => {
        const templates = [
          `The ______ is beautiful.`,
          `I love the ______.`,
          `This ______ is special.`,
          `The ______ looks amazing.`,
          `I found the ______.`,
          `The ______ is here.`,
          `This is a ______.`,
          `I see the ______.`
        ]
        return templates[i % templates.length]
      }).join(' ')
      
      work.solution_text = `${work.solution_text} ${extrasSol}`.trim()
      work.gap_text = `${work.gap_text} ${extrasGap}`.trim()
    }
    // Rebuild gap to match occurrences
    // const rebuilt = rebuildGapFromSolution(work.solution_text, used)
    // if (rebuilt) work.gap_text = rebuilt
    // As last resort, sequential replacement
    const blanks = (work.gap_text.match(/______+/g) || []).length
    if (blanks !== used.length) {
      work.gap_text = replaceSequential(work.solution_text, used)
    }
    // Rebuild meta 1..N
    work.gaps_meta = used.map((w, i) => ({ index: i + 1, correct: w, why_unique: 'finalize', rejects: [] }))
    return work
  } catch {
    return null
  }
}

function pickSafeReplacement(token: string): string {
  const t = token.toLowerCase()
  const cereals = new Set(['maize','corn','rice','oats','wheat','barley','rye'])
  if (cereals.has(t)) return 'the grain'
  if (t === 'make sure') return 'ensure'
  if (t === 'grow') return 'cultivate'
  if (t === 'grew') return 'cultivated'
  if (t === 'disappear') return 'vanish'
  if (t === 'in the future') return 'later on'
  if (t === 'save our seeds') return 'preserve them'
  if (t === 'spare copy') return 'backup'
  if (t === 'dramatic') return 'significant'
  if (t === 'store') return 'keep'
  if (t === 'needle') return 'tool'
  if (t === 'birch') return 'tree'
  if (t.includes(' ')) return 'it'
  // Fallback heuristics: verb-ish forms
  if (/(ed|ing)$/.test(t)) return 'did so'
  return 'it'
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

function lintGrammar(text: string, expectedWords: string[]): { ok: boolean; issues: Array<{ sentence: number; reason: string }> } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  const issues: Array<{ sentence: number; reason: string }> = []
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const lowerSentence = sentence.toLowerCase()
    
    // Check for incorrect passive voice with "had ever been"
    if (lowerSentence.includes('had ever been')) {
      if (lowerSentence.includes('had ever been seen') || 
          lowerSentence.includes('had ever been taken') || 
          lowerSentence.includes('had ever been done') ||
          lowerSentence.includes('had ever been made')) {
        issues.push({ sentence: i + 1, reason: 'Incorrect passive voice: "had ever been" + past participle' })
      }
    }
    
    // Check for other common grammatical errors
    if (lowerSentence.includes('i had ever been') && lowerSentence.includes('seen')) {
      issues.push({ sentence: i + 1, reason: 'Incorrect construction: "I had ever been seen" should be "I had ever seen"' })
    }
    
    // Check for modal + to + verb errors
    if (lowerSentence.includes('could to') || lowerSentence.includes('should to') || lowerSentence.includes('would to')) {
      issues.push({ sentence: i + 1, reason: 'Modal + to + verb error' })
    }
    
    // Check for unlicensed infinitives
    if (lowerSentence.includes('to be') && !lowerSentence.includes('want to be') && !lowerSentence.includes('need to be')) {
      if (!lowerSentence.includes('going to be') && !lowerSentence.includes('supposed to be')) {
        issues.push({ sentence: i + 1, reason: 'Unlicensed infinitive: "to be" without proper context' })
      }
    }
  }
  
  return { ok: issues.length === 0, issues }
}


