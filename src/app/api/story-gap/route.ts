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

    if (!Array.isArray(wordSet) || wordSet.length < 2) {
      return NextResponse.json({ error: 'invalid_input', message: 'Provide { wordSet: string[] } with 2–10 words.' }, { status: 400 })
    }

    // Cap at 8 words per rules
    const capped = wordSet.filter(w => typeof w === 'string').slice(0, 8)
    if (capped.length < 2) {
      return NextResponse.json({ error: 'invalid_words', message: 'At least 2 valid words required.' }, { status: 400 })
    }

    const openai = getOpenAI()
    const reqDifficulty = (body?.difficulty || 'green') as 'green' | 'yellow' | 'red'
    const levelGuidelines = reqDifficulty === 'green'
      ? 'Use very simple language (CEFR A1–A2), one short sentence per word.'
      : reqDifficulty === 'yellow'
      ? 'Use moderate language (A2–B1), one sentence per word with clear cues.'
      : 'Use more advanced but still accessible language (B1–B2), nuanced cues.'

    const systemSimple = `You are generating a sentence-gap exercise.

Goal: Given a word set (5–10 words), create EXACTLY one independent sentence PER word (N sentences total). Each sentence includes exactly ONE target word from the set. Then produce a cloze version by replacing that target word with "______".
Structure: One gap per sentence. Each sentence must stand alone and be unambiguous. Difficulty: ${levelGuidelines}

Hard rules:
- Use each provided word exactly once (no duplicates). There must be exactly N blanks for N words.
- Use the EXACT surface form (case-insensitive) of each word (no inflection/synonym).
- Output JSON with keys: gap_text, solution_text, used_words (same order as sentences), gaps_meta, notes[]. For GREEN/YELLOW keep gaps_meta minimal: [{"index":1,"correct":"word"}] (omit long explanations).
- IMPORTANT: gap_text and solution_text must be SINGLE STRINGS (not arrays). Separate sentences with a space or newline. Do NOT output arrays for these fields.

Clarity rules:
- Make the sentence cue strong enough that no other word in the set could fit (collocations, selectional restrictions, determiners, agreement).
- Keep simple, classroom-appropriate language with correct prepositions (e.g., "above the tree"). Avoid tautology.
 - Grammar compatibility: Use each exact surface form in a frame where it is grammatical without extra particles (e.g., use "starve" as a bare verb if preceded by a modal; avoid forcing "to starve" where a bare verb is required). Choose frames that naturally host the provided form.
 - If the target starts with "to ", license it with an appropriate matrix verb or purpose frame (e.g., "begin to …", "need to …", "try to …", "plan to …", "in order to …"). Never place it after a modal (can/will/should…).
 - If the target is a bare verb (no leading "to"), prefer frames that require the bare form (after modals, imperative) and do not add "to" before it.
 - No duplication: Do NOT repeat a target word within its sentence, and do NOT repeat any component of a multi‑word target right after it (e.g., avoid "luxury home home"). Avoid duplicated tokens like "tragically tragically".

Validation (self-check before returning):
- Each word appears exactly once in solution_text; blanks = number of words.
- For each gap, other set-words should be wrong. Keep rejects concise (≤2).`

    const systemBase = `You are an assistant generating rounds for a game called AI Story Gap.

Goal: Given a word set (5–10 words), generate EXACTLY one sentence PER word (N sentences total). Each sentence must naturally include exactly ONE target word from the set. Then produce a cloze version with blanks by replacing the target word in each sentence with "______".
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
      const messages = [
        { role: 'system' as const, content: systemSimple },
        { role: 'user' as const, content: JSON.stringify({ wordSet: capped, difficulty: reqDifficulty, plan: plan || null }) },
      ]
      if (feedback) messages.push({ role: 'user' as const, content: feedback })
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: reqDifficulty === 'red' ? 0.1 : 0,
        max_tokens: reqDifficulty === 'red' ? 1000 : 700,
        messages,
      })
      const raw = completion.choices?.[0]?.message?.content?.trim() || ''
      let parsed: StoryGapResponse | null = null
      try {
        parsed = JSON.parse(raw) as StoryGapResponse
      } catch {
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) {
          try { parsed = JSON.parse(m[0]) as StoryGapResponse } catch {}
        }
      }
      return { raw, parsed }
    }

    // Planning step: assign each word to a sentence and role before generation
    async function callPlan(): Promise<{ raw: string; plan: Array<{ word: string; sentence: number; role: string; cue?: string }> | null }> {
      try {
        const plannerSystem = `You plan a cloze exercise with independent sentences. Return compact JSON only.
Schema: { "plan": [ { "word": "string", "sentence": 1, "role": "subject|object|verb|adj|adv|prep-phrase|collocation", "cue": "<=6 words" } ] }
Rules:
- One distinct target per sentence, exactly one sentence per target.
- Create exactly N sentences where N = wordSet.length and use each target exactly once.
- Roles must be unique enough to avoid collisions; keep cues short.`
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 220,
          messages: [
            { role: 'system', content: plannerSystem },
            { role: 'user', content: JSON.stringify({ wordSet: capped, difficulty: reqDifficulty }) },
          ],
        })
        const raw = completion.choices?.[0]?.message?.content?.trim() || ''
        let planObj: any = null
        try { planObj = JSON.parse(raw) } catch {
          const m = raw.match(/\{[\s\S]*\}/)
          if (m) { try { planObj = JSON.parse(m[0]) } catch {} }
        }
        const plan = Array.isArray(planObj?.plan) ? planObj.plan : null
        return { raw, plan }
      } catch {
        return { raw: '', plan: null }
      }
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
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 250,
          messages: [
            { role: 'system', content: challengeSystem },
            { role: 'user', content: JSON.stringify(payload) }
          ]
        })
        const raw = completion.choices?.[0]?.message?.content?.trim() || ''
        let parsedResp: { ok: boolean; ambiguous: Array<{ index: number; alternatives: string[]; reason?: string }> } | null = null
        try {
          parsedResp = JSON.parse(raw)
        } catch {
          const m = raw.match(/\{[\s\S]*\}/)
          if (m) {
            try { parsedResp = JSON.parse(m[0]) } catch {}
          }
        }
        if (!parsedResp || typeof parsedResp.ok !== 'boolean' || !Array.isArray(parsedResp.ambiguous)) {
          return { ok: true, ambiguous: [] }
        }
        return parsedResp
      } catch {
        // On challenge failure, assume ok to avoid extra tokens
        return { ok: true, ambiguous: [] }
      }
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
      return { ok: true as const }
    }

    // First attempt: Green/Yellow skip planning for speed; Red uses planning
    const planResp = reqDifficulty === 'red' ? await callPlan() : { raw: '', plan: null }
    let attempt = await callModel(undefined, planResp.plan)
    if (!attempt.parsed) {
      // Try to normalize raw into expected schema if possible
      try {
        const rawObj = JSON.parse(attempt.raw)
        const normalized = normalizeResponse(rawObj, capped)
        if (normalized) {
          const checkN = validateOnce(normalized)
          if ((checkN as any).ok) return NextResponse.json(normalized)
        }
      } catch {}
      return NextResponse.json({ error: 'model_output_invalid', raw: attempt.raw }, { status: 502 })
    }
    let check = validateOnce(attempt.parsed)
    if ((check as any).ok) {
      if (reqDifficulty === 'red') {
        // Only RED runs ambiguity challenge
        const challenge = await challengeAmbiguity(attempt.parsed)
        const lint = lintGrammar(attempt.parsed.solution_text, capped)
        if ((challenge.ok || challenge.ambiguous.length === 0) && lint.ok) {
          const normalized = { ...attempt.parsed, used_words: capped }
          return NextResponse.json(normalized)
        }
        // One corrective regeneration with targeted feedback
        const ambList = challenge.ambiguous
          .map(a => `#${a.index} -> alternatives: [${a.alternatives.join(', ')}]${a.reason ? ` (${a.reason})` : ''}`)
          .join('; ')
        const feedbackAmb = `Your gaps are ambiguous: ${ambList}.
Also fix grammar issues like modal+to+verb and unlicensed infinitives/participles. Strengthen sentences so ONLY the intended target fits. Keep JSON schema.`
        let second = await callModel(feedbackAmb, planResp.plan)
        if (second.parsed && (validateOnce(second.parsed) as any).ok) {
          const challenge2 = await challengeAmbiguity(second.parsed)
          const lint2 = lintGrammar(second.parsed.solution_text, capped)
          if ((challenge2.ok || challenge2.ambiguous.length === 0) && lint2.ok) {
            const normalized = { ...second.parsed, used_words: capped }
            return NextResponse.json(normalized)
          }
        }
        const withNotes = { ...attempt.parsed, used_words: capped, notes: [`Ambiguous gaps flagged: ${challenge.ambiguous.map(a => `#${a.index}`).join(', ')}`] }
        return NextResponse.json(withNotes)
      }
      // GREEN/YELLOW: run lightweight grammar lint; if fails, do one corrective regen
      const lintG = lintGrammar(attempt.parsed.solution_text, capped)
      if (lintG.ok) {
        const normalized = { ...attempt.parsed, used_words: capped }
        return NextResponse.json(normalized)
      } else {
        const reasons = lintG.issues.map(i => `#${i.sentence}:${i.reason}`).join(', ')
        const feedbackFix = `Fix grammar issues (${reasons}).
Ensure: no modal+to+verb, license infinitives, add 'been' in perfect passive, provide auxiliaries for participles, and remove duplicated tokens. Keep JSON schema.`
        const second = await callModel(feedbackFix, planResp.plan)
        if (second.parsed && (validateOnce(second.parsed) as any).ok) {
          const lint2 = lintGrammar(second.parsed.solution_text, capped)
          const normalized2 = { ...second.parsed, used_words: capped }
          if (lint2.ok) return NextResponse.json(normalized2)
        }
        const withNotes = { ...attempt.parsed, used_words: capped, notes: ['Grammar lint: automatic correction failed; please review sentences'] }
        return NextResponse.json(withNotes)
      }
    }
    // Single corrective retry to reduce token usage
    const details = (check as any).details || {}
    const counts = (details.counts || {}) as Record<string, number>
    const missingList = Object.entries(counts)
      .filter(([, c]) => (c as number) < 1)
      .map(([w]) => w)
    const feedback = `Your previous output failed validation (${(check as any).reason}).
Regenerate and ensure:
- Every provided word appears at least once. Missing words: [${missingList.join(', ')}].
- Use the EXACT surface form of each provided word/phrase (no inflections, no synonyms). For example, use "fear" (not "afraid"), and "pick up" exactly (not "picked up" or "pick-up").
- Replace every occurrence of a set-word in solution_text with a blank in gap_text.
- Keep unambiguous gaps and the JSON schema.`

    attempt = await callModel(feedback, planResp.plan)
    if (!attempt.parsed) {
      return NextResponse.json({ error: 'model_output_invalid_retry', raw: attempt.raw, first: details }, { status: 502 })
    }
    check = validateOnce(attempt.parsed)
    if ((check as any).ok) {
      if (reqDifficulty === 'red') {
        const challenge = await challengeAmbiguity(attempt.parsed)
        if (challenge.ok || challenge.ambiguous.length === 0) {
          const normalized = { ...attempt.parsed, used_words: capped }
          return NextResponse.json(normalized)
        }
        const withNotes = { ...attempt.parsed, used_words: capped, notes: [`Ambiguous gaps flagged: ${challenge.ambiguous.map(a => `#${a.index}`).join(', ')}`] }
        return NextResponse.json(withNotes)
      }
      const normalized = { ...attempt.parsed, used_words: capped }
      return NextResponse.json(normalized)
    }

    // Return best-effort with notes to avoid breaking the UI before exercise
    const withNotes = { ...attempt.parsed, used_words: capped, notes: [`Validation failed: ${(check as any).reason}`] }
    return NextResponse.json(withNotes)
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500
    return NextResponse.json({ error: 'story_gap_failed', message: e?.message, code: e?.code }, { status })
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    // Replace extra occurrences beyond the first
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

function pickSafeReplacement(token: string): string {
  const t = token.toLowerCase()
  const cereals = new Set(['maize','corn','rice','oats','wheat','barley','rye'])
  if (cereals.has(t)) return 'the grain'
  if (t === 'make sure') return 'ensure'
  if (t === 'grow') return 'cultivate'
  if (t === 'grew') return 'cultivated'
  if (t === 'disappear') return 'vanish'
  if (t === 'in the future') return 'later on'
  if (t.includes(' ')) return 'it'
  // Fallback heuristics: verb-ish forms
  if (/(ed|ing)$/.test(t)) return 'did so'
  return 'it'
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}


