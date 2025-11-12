'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, type TrackingContext, updateStudentProgress } from '@/lib/tracking'
import WordSelector from './WordSelector'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateStoryGapScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'

interface StoryGapGameProps {
  words: string[]
  translations?: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (points: number, newTotal?: number, gameType?: string) => void
  gridConfig?: GridConfig[]
}

type GapMeta = { index: number; correct: string; why_unique: string; rejects: Array<{ word: string; reason: string }> }

export default function StoryGapGame({ words, translations = {}, onClose, trackingContext, themeColor, onScoreUpdate, gridConfig }: StoryGapGameProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gapText, setGapText] = useState('')
  const [solutionText, setSolutionText] = useState('')
  const [usedWords, setUsedWords] = useState<string[]>([])
  const [gapsMeta, setGapsMeta] = useState<GapMeta[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [checked, setChecked] = useState(false)
  const [correctMap, setCorrectMap] = useState<Record<number, boolean>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(1)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [selectedGrid, setSelectedGrid] = useState<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] } | null>(null)
  const [difficulty, setDifficulty] = useState<'green' | 'yellow' | 'red' | null>(null)
  const [showGridSelector, setShowGridSelector] = useState(true)
  const [showWordSelector, setShowWordSelector] = useState(false)
  const [wordsSelected, setWordsSelected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)
  const [isRetrying, setIsRetrying] = useState(false)

  const shuffle = (arr: string[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const uniquePreserve = (arr: string[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const w of arr) {
      const key = String(w).trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(String(w).trim())
    }
    return out
  }

  const retryGeneration = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    setError(null)
    setRetryCount(prev => prev + 1)
    
    // Trigger regeneration by resetting wordsSelected and then setting it back
    // This will cause the useEffect to run again
    setWordsSelected(false)
    setTimeout(() => {
      setWordsSelected(true)
      setIsRetrying(false)
    }, 100)
  }

  // Fallback: create gaps from a full solution if API returns no blanks
  const makeFallbackGaps = (solution: string, pool: string[], maxGaps = 8): { gap: string; meta: GapMeta[] } => {
    console.log('Debug - makeFallbackGaps called with:', { solution, pool, maxGaps })
    const lowerPool = (pool || []).map(w => String(w).trim()).filter(Boolean)
    if (!solution || lowerPool.length === 0) {
      return { gap: solution, meta: [] }
    }
    
    // Check if solution is malformed (like the jumbled text in the image)
    if (solution.includes('#') || solution.split(' ').length > pool.length * 3 || solution.includes('The word is')) {
      console.log('Debug - creating simple fallback sentences due to malformed solution')
      const simpleSentences: string[] = []
      const meta: GapMeta[] = []
      
      for (let i = 0; i < Math.min(pool.length, maxGaps); i++) {
        const word = pool[i]
        // Create simple, clear sentences
        const templates = [
          `The ${word} is important.`,
          `I see the ${word}.`,
          `This is a ${word}.`,
          `The ${word} looks good.`,
          `I like the ${word}.`,
          `We need the ${word}.`,
          `The ${word} is here.`,
          `This ${word} is nice.`
        ]
        const sentence = templates[i % templates.length]
        const gapSentence = sentence.replace(word, '______')
        simpleSentences.push(gapSentence)
        meta.push({ index: i + 1, correct: word, why_unique: 'fallback', rejects: [] })
      }
      
      return { gap: simpleSentences.join(' '), meta }
    }
    
    // Split solution into sentences first
    const sentences = solution.split(/(?<=[.!?])\s+/).filter(Boolean)
    const meta: GapMeta[] = []
    const gaps: string[] = []
    let gapIndex = 1
    
    // Process each sentence and find one word from pool to replace
    for (let i = 0; i < sentences.length && gapIndex <= maxGaps; i++) {
      const sentence = sentences[i]
      let foundWord = false
      
      // Try to find a word from the pool in this sentence
      for (const word of lowerPool) {
        if (foundWord) break
        const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\]/g, r => `\\${r}`)}\\b`, 'i')
        if (re.test(sentence)) {
          const gapSentence = sentence.replace(re, '______')
          gaps.push(gapSentence)
          meta.push({ index: gapIndex, correct: word, why_unique: 'fallback', rejects: [] })
          gapIndex += 1
          foundWord = true
        }
      }
      
      // If no word found in this sentence, add it as-is
      if (!foundWord) {
        gaps.push(sentence)
      }
    }
    
    const result = { gap: gaps.join(' '), meta }
    console.log('Debug - makeFallbackGaps result:', result)
    return result
  }

  const buildMetaFromSolution = (solution: string, pool: string[], count: number): GapMeta[] => {
    console.log('Debug - buildMetaFromSolution called with:', { solution, pool, count })
    const meta: GapMeta[] = []
    const used = new Set<string>()
    
    // Create a normalized pool map for exact matching
    const poolMap = new Map<string, string>()
    for (const word of pool) {
      const normalized = String(word).trim().toLowerCase()
      poolMap.set(normalized, normalized)
    }
    
    // Split solution into sentences to match gap order
    const sentences = solution.split(/(?<=[.!?])\s+/).filter(Boolean)
    let gapIndex = 1
    
    // Process each sentence and find one word from pool to map
    for (let i = 0; i < sentences.length && gapIndex <= count; i++) {
      const sentence = sentences[i]
      const sentenceLower = sentence.toLowerCase()
      let foundWord = false
      
      // Try to find a word from the pool in this sentence
      // Sort by length (longest first) to match multi-word phrases before single words
      const sortedPool = [...pool].sort((a, b) => b.length - a.length)
      
      for (const word of sortedPool) {
        if (foundWord) break
        const key = String(word).trim().toLowerCase()
        if (used.has(key)) continue
        
        // Use word boundary regex to match whole words only
        // Escape special regex characters in the word
        const escapedWord = key.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`)
        const re = new RegExp(`\\b${escapedWord}\\b`, 'i')
        
        if (re.test(sentence)) {
          // Verify that the match is actually the word from pool (not a substring)
          const match = sentenceLower.match(re)
          if (match) {
            const matchedText = match[0].toLowerCase().trim()
            // Ensure exact match (handles case differences)
            if (matchedText === key && poolMap.has(key)) {
              meta.push({ index: gapIndex, correct: key, why_unique: 'derived', rejects: [] })
              used.add(key)
              gapIndex += 1
              foundWord = true
            }
          }
        }
      }
    }
    
    console.log('Debug - built meta:', meta)
    return meta
  }

  // Handle word selection from WordSelector
  const handleGridSelected = (grids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => {
    if (grids.length === 0) return
    
    // Sentence Gap only allows 1 grid (max 6 words)
    const grid = grids[0]
    setSelectedGrid(grid)
    setSelectedWords(grid.words)
    setShowGridSelector(false)
    setWordsSelected(true)
  }

  const handleWordsSelected = (words: string[]) => {
    setSelectedWords(words)
    setShowWordSelector(false)
    setWordsSelected(true)
  }

  // Only auto-pick words if GridSelector is not shown (fallback)
  useEffect(() => {
    if (!showGridSelector && !wordsSelected && selectedWords.length === 0) {
      const pool = Array.isArray(words) ? uniquePreserve(words) : []
      const pick = shuffle(pool).slice(0, Math.min(8, pool.length))
      setSelectedWords(pick)
      setWordsSelected(true)
    }
  }, [words, showGridSelector, wordsSelected, selectedWords.length])

  useEffect(() => {
    startedAtRef.current = Date.now()
    console.log('🎮 Story Gap: Game started (session will be created server-side)')
    setSessionId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!difficulty || !wordsSelected || selectedWords.length === 0) return
    
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const controller = new AbortController()
        // Increase timeout for more words (60s + 10s per word)
        const timeoutMs = 60000 + (selectedWords.length * 10000)
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
        
        // Convert Swedish words to English before sending to API
        // selectedWords might be Swedish (from gridConfig), but API needs English words
        const englishWords: string[] = []
        const allTranslations = selectedGrid?.translations || translations
        
        for (const word of selectedWords) {
          // Check if word is already English (contains common English letters/patterns)
          // or if it's Swedish and needs translation
          const translation = allTranslations[word.toLowerCase()]
          if (translation && translation !== `[${word}]`) {
            // Word is Swedish, use English translation
            englishWords.push(translation)
          } else {
            // Assume word is already English, or no translation found
            englishWords.push(word)
          }
        }
        
        console.log('📝 Story Gap: Converting words for API:', {
          original: selectedWords,
          english: englishWords
        })
        
        // Add retry logic with exponential backoff
        let lastError: Error | null = null
        let data: any = null
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const res = await fetch('/api/story-gap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                wordSet: englishWords, 
                difficulty,
                retryAttempt: attempt 
              }),
              signal: controller.signal,
            })
            
            if (!res.ok) {
              // Check if it's a generation failure that we can retry
              let parsedBody: any = null
              try { parsedBody = await res.json() } catch { parsedBody = null }
              
              if (parsedBody?.error === 'generation_failed' && parsedBody?.retryable) {
                // This is a retryable generation failure
                if (attempt < maxRetries) {
                  console.log(`Generation failed, retrying... (${attempt + 1}/${maxRetries})`)
                  const delay = Math.pow(2, attempt) * 1000
                  await new Promise(resolve => setTimeout(resolve, delay))
                  continue
                } else {
                  // All retries exhausted, show error message
                  setError(`Could not generate sentences for all words. Please try again. (${parsedBody.details?.missingWords?.join(', ') || 'unknown error'})`)
                  return
                }
              } else {
                // Other error types
                const t = typeof parsedBody === 'object' ? JSON.stringify(parsedBody) : (await res.text())
                throw new Error(`Story generation failed (${res.status}): ${t || 'unknown error'}`)
              }
            } else {
              const responseData = await res.json()
              
              // Validate API response quality before accepting it
              const incomingGap = String(responseData.gap_text || '')
              const incomingSolution = String(responseData.solution_text || '')
              const target = Math.min(8, selectedWords.length)
              const incomingBlanks = (incomingGap.match(/______+/g) || []).length
              
              // Check for malformed content that would make the game unplayable
              const hasMalformedContent = incomingGap.includes('#') || 
                incomingGap.includes('portable stove just as cub stamp') ||
                incomingGap.includes('The word is') ||
                incomingGap.includes('blue whale seal back off')
              
              // Also check solution text for "The word is" patterns
              const solutionHasBadPatterns = incomingSolution.includes('The word is')
              
              console.log('Debug - validation:', { target, incomingBlanks, hasMalformedContent, solutionHasBadPatterns })
              
              if (!incomingGap || incomingBlanks === 0 || incomingBlanks !== target || hasMalformedContent || solutionHasBadPatterns) {
                console.log('Debug - API returned unusable content, retrying...')
                // If we haven't exceeded retries, try again automatically
                if (attempt < maxRetries) {
                  console.log(`Retrying due to malformed content (attempt ${attempt + 1}/${maxRetries})`)
                  const delay = Math.pow(2, attempt) * 1000
                  await new Promise(resolve => setTimeout(resolve, delay))
                  continue
                } else {
                  // All retries exhausted
                  setError('The API returned invalid sentences. Please try again.')
                  return
                }
              }
              
              // Validation passed, use this data
              data = responseData
              break // Success
            }
          } catch (err) {
            lastError = err as Error
            if (attempt < maxRetries) {
              // Exponential backoff: wait 1s, 2s, 4s
              const delay = Math.pow(2, attempt) * 1000
              console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            } else {
              throw lastError
            }
          }
        }
        
        if (!data) {
          throw lastError || new Error('No data received')
        }
        
        const incomingGap = String(data.gap_text || '')
        const incomingSolution = String(data.solution_text || '')
        console.log('Debug - API response:', { incomingGap, incomingSolution, gaps_meta: data.gaps_meta })
        
        let finalGap = incomingGap
        let finalMeta: GapMeta[] = Array.isArray(data.gaps_meta) ? data.gaps_meta : []
        
        // Validate and normalize gapsMeta from API
        if (Array.isArray(finalMeta) && finalMeta.length > 0) {
          // Create a set of valid English words for validation
          const validWordsSet = new Set(englishWords.map(w => String(w).trim().toLowerCase()))
          
          // Validate each meta entry
          const validatedMeta: GapMeta[] = []
          for (const meta of finalMeta) {
            const correctWord = String(meta.correct || '').trim().toLowerCase()
            // Only include meta if the correct word is in our word pool
            if (correctWord && validWordsSet.has(correctWord)) {
              validatedMeta.push({
                ...meta,
                correct: correctWord // Normalize to lowercase
              })
            } else {
              console.warn(`Debug - Invalid meta entry: correct="${meta.correct}" not in word pool`, { meta, validWords: Array.from(validWordsSet) })
            }
          }
          
          // If validation removed entries, we need to rebuild
          if (validatedMeta.length !== finalMeta.length) {
            console.log('Debug - Some meta entries were invalid, rebuilding from solution')
            finalMeta = []
          } else {
            finalMeta = validatedMeta
          }
        }
        
        // If meta is missing or count mismatch with blanks, derive it from solution
        // Use englishWords for matching since solution_text contains English words
        const blanksCountTmp = (String(finalGap || '').match(/______+/g) || []).length
        console.log('Debug - before buildMetaFromSolution:', { blanksCountTmp, finalMetaLength: finalMeta.length })
        if (!Array.isArray(finalMeta) || finalMeta.length !== blanksCountTmp) {
          console.log('Debug - calling buildMetaFromSolution with englishWords')
          finalMeta = buildMetaFromSolution(incomingSolution, englishWords, blanksCountTmp)
        }
        // Ensure we have exactly 'target' blanks by appending simple deterministic sentences for missing words
        // Match against englishWords since solution_text contains English
        const haveSet = new Set(finalMeta.map(m => String(m.correct || '').toLowerCase()))
        const missing: string[] = []
        for (let i = 0; i < englishWords.length; i++) {
          const engWord = englishWords[i]
          const key = String(engWord).trim().toLowerCase()
          if (!key) continue
          if (!haveSet.has(key)) {
            // Store the Swedish word for missing list (for display/fallback)
            missing.push(selectedWords[i] || engWord)
          }
        }
        if (missing.length > 0) {
          const extrasGap: string[] = []
          const extrasSol: string[] = []
          const sentenceTemplates = [
            { sol: (w: string) => `The ${w} is important.`, gap: `The ______ is important.` },
            { sol: (w: string) => `I see the ${w}.`, gap: `I see the ______.` },
            { sol: (w: string) => `This is a ${w}.`, gap: `This is a ______.` },
            { sol: (w: string) => `The ${w} looks good.`, gap: `The ______ looks good.` },
            { sol: (w: string) => `I like the ${w}.`, gap: `I like the ______.` },
            { sol: (w: string) => `We need the ${w}.`, gap: `We need the ______.` },
            { sol: (w: string) => `The ${w} is here.`, gap: `The ______ is here.` },
            { sol: (w: string) => `This ${w} is nice.`, gap: `This ______ is nice.` },
            { sol: (w: string) => `I found the ${w}.`, gap: `I found the ______.` },
            { sol: (w: string) => `The ${w} is beautiful.`, gap: `The ______ is beautiful.` }
          ]
          
          for (let i = 0; i < missing.length; i++) {
            const swedishWord = missing[i]
            // Find corresponding English word for solution text
            const swedishIndex = selectedWords.findIndex(w => w.toLowerCase() === swedishWord.toLowerCase())
            const engWord = swedishIndex >= 0 ? englishWords[swedishIndex] : swedishWord
            const template = sentenceTemplates[i % sentenceTemplates.length]
            const sol = template.sol(engWord)
            const gap = template.gap
            extrasSol.push(sol)
            extrasGap.push(gap)
            // Store English word in meta.correct, but keep Swedish for matching
            finalMeta.push({ 
              index: finalMeta.length + 1, 
              correct: String(engWord).toLowerCase(), 
              why_unique: 'appended', 
              rejects: [] 
            } as GapMeta & { swedishWord?: string })
            // Add Swedish word mapping
            const lastMeta = finalMeta[finalMeta.length - 1] as any
            lastMeta.swedishWord = swedishWord
          }
          finalGap = `${finalGap} ${extrasGap.join(' ')}`.trim()
          // If incomingSolution was empty, build from gap; else append as well
          if (incomingSolution && incomingSolution.trim()) {
            setSolutionText(`${incomingSolution} ${extrasSol.join(' ')}`.trim())
          } else {
            setSolutionText(extrasSol.join(' ').trim())
          }
        }
        setGapText(finalGap)
        if (!(missing.length > 0)) setSolutionText(incomingSolution)
        // Show available words in random order (decoupled from sentence order)
        // Use English words for display since sentences are in English
        setUsedWords(shuffle(englishWords))
        // Update gapsMeta to include Swedish word mapping for answer checking
        // gapsMeta.correct contains English words (from API), but we need to match Swedish user answers
        const updatedMeta = finalMeta.map(meta => {
          // Find the Swedish word that corresponds to this English word
          const engWord = String(meta.correct || '').toLowerCase()
          const engIndex = englishWords.findIndex(w => w.toLowerCase() === engWord)
          const swedishWord = engIndex >= 0 ? selectedWords[engIndex] : meta.correct
          return {
            ...meta,
            correct: meta.correct, // Keep English for internal matching
            swedishWord: swedishWord // Add Swedish for user answer matching
          }
        })
        setGapsMeta(updatedMeta as GapMeta[])
        // Prepare answer slots based on number of blanks
        const blanksCount = (String(finalGap || '').match(/______+/g) || []).length
        const init: Record<number, string> = {}
        for (let i = 1; i <= blanksCount; i++) init[i] = ''
        setAnswers(init)
        console.log('Debug - final state:', { finalGap, finalMeta, blanksCount, init })
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          setError('Generation took too long. Please try again or select a different difficulty level.')
        } else {
          setError(e?.message || 'Failed to generate story.')
        }
      } finally {
        setLoading(false)
      }
    }
    if (selectedWords.length >= 1 && difficulty && wordsSelected) run()
  }, [selectedWords, difficulty, wordsSelected])

  const blanks = useMemo(() => (gapText.match(/______+/g) || []).length, [gapText])

  const allAnswered = useMemo(() => {
    for (let i = 1; i <= blanks; i++) {
      if (!answers[i] || !answers[i].trim()) return false
    }
    return true
  }, [answers, blanks])

  const allCorrect = useMemo(() => {
    if (!checked) return false
    for (let i = 1; i <= blanks; i++) {
      if (!correctMap[i]) return false
    }
    return true
  }, [checked, correctMap, blanks])

  const checkAnswersVisual = () => {
    const map: Record<number, boolean> = {}
    console.log('Debug - gapsMeta:', gapsMeta)
    console.log('Debug - answers:', answers)
    
    // Get all correct words (English and Swedish) for validation
    const allCorrectWords = new Set<string>()
    for (const meta of gapsMeta) {
      const englishWord = String(meta.correct || '').trim().toLowerCase()
      if (englishWord) allCorrectWords.add(englishWord)
      const swedishWord = (meta as any).swedishWord
      if (swedishWord) {
        const swedishLower = String(swedishWord).trim().toLowerCase()
        if (swedishLower) allCorrectWords.add(swedishLower)
      }
    }
    
    for (const meta of gapsMeta) {
      const userInput = String(answers[meta.index] || '').trim()
      const userLower = userInput.toLowerCase()
      
      // meta.correct is English, and user answers are now also in English (from usedWords)
      // But we still support Swedish answers in case user types manually
      const swedishWord = (meta as any).swedishWord
      const englishWord = String(meta.correct || '').trim().toLowerCase()
      const correctSwedish = swedishWord ? String(swedishWord).trim().toLowerCase() : null
      
      // Split user input into words to handle cases where user types multiple words
      const userWords = userLower.split(/\s+/).filter(w => w.length > 0)
      
      // STRICT MATCHING: Only accept exact matches
      // If user types multiple words, only accept if the entire input matches exactly
      // OR if the first word matches exactly (to handle accidental extra spaces/words)
      let matches = false
      
      if (userWords.length === 0) {
        // Empty input
        matches = false
      } else if (userWords.length === 1) {
        // Single word: exact match required
        matches = userLower === englishWord || (correctSwedish !== null && userLower === correctSwedish)
      } else {
        // Multiple words: Only accept if:
        // 1. The entire input matches exactly (for multi-word answers like "above all")
        // 2. OR the first word matches exactly AND there are no other valid correct words in the input
        const fullMatch = userLower === englishWord || (correctSwedish !== null && userLower === correctSwedish)
        const firstWordMatch = userWords[0] === englishWord || (correctSwedish !== null && userWords[0] === correctSwedish)
        
        if (fullMatch) {
          matches = true
        } else if (firstWordMatch) {
          // Check if any other word in the input is also a correct answer for a different gap
          // If so, reject this answer to prevent ambiguity
          let hasOtherCorrectWord = false
          for (let i = 1; i < userWords.length; i++) {
            if (allCorrectWords.has(userWords[i])) {
              hasOtherCorrectWord = true
              break
            }
          }
          // Only accept if first word matches and no other words are correct answers
          matches = !hasOtherCorrectWord
        }
      }
      
      console.log(`Debug - Gap ${meta.index}: user="${userInput}" (words: [${userWords.join(', ')}]), correctEnglish="${englishWord}", correctSwedish="${correctSwedish}", match=${matches}`)
      map[meta.index] = matches
    }
    console.log('Debug - correctMap:', map)
    setCorrectMap(map)
    setChecked(true)
  }

  const submit = async () => {
    if (submitted) return
    
    // Use the new universal scoring system: +2 per correct, -1 per wrong click
    const totalGaps = gapsMeta.length
    const correctAnswers = Object.values(correctMap).filter(Boolean).length
    const wrongAttempts = 0 // Story gap doesn't track wrong attempts separately
    const scoreResult = calculateStoryGapScore(correctAnswers, totalGaps, wrongAttempts)
    
    setScore(scoreResult.pointsAwarded)
    setSubmitted(true)
    
    // INSTANT UI UPDATE: Send points to parent for immediate UI update
    if (onScoreUpdate) onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'story_gap')
    
    // BACKGROUND SYNC: Update database in background (non-blocking)
    // NOTE: Database sync handled by handleScoreUpdate in student dashboard via onScoreUpdate
    // No need to call updateStudentProgress here to avoid duplicate sessions
    const started = startedAtRef.current
    if (started) {
      const duration = Math.max(1, Math.floor((Date.now() - started) / 1000))
      void endGameSession(sessionId, 'story_gap', { 
        score: scoreResult.pointsAwarded, 
        durationSec: duration, 
        accuracyPct: scoreResult.accuracy,
        details: { blanks: totalGaps, correctAnswers, totalGaps } 
      })
    } else {
      void endGameSession(sessionId, 'story_gap', { 
        score: scoreResult.pointsAwarded, 
        accuracyPct: scoreResult.accuracy,
        details: { blanks: totalGaps, correctAnswers, totalGaps } 
      })
    }
  }

  const usedByIndex = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [k, v] of Object.entries(answers)) {
      const val = String(v || '').trim().toLowerCase()
      if (!val) continue
      map[val] = Number(k)
    }
    return map
  }, [answers])

  const handlePickWord = (word: string) => {
    if (!activeIndex) return
    const lower = String(word).toLowerCase()
    const prevIndex = usedByIndex[lower]
    setAnswers(prev => {
      const next = { ...prev }
      // clear previous usage of this word in another blank
      if (prevIndex && prevIndex !== activeIndex) next[prevIndex] = ''
      next[activeIndex] = word
      return next
    })
  }

  const renderGapSentences = () => {
    const sents = String(gapText || '').split(/(?<=[.!?])\s+/).filter(Boolean)
    let counter = 0
    return (
      <div className="space-y-3">
        {sents.map((sentence, si) => {
          const parts = sentence.split(/(______+)/)
          let rendered: React.ReactNode[] = []
          const startIdx = counter + 1
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (/^_{6,}$/.test(part)) {
              counter += 1
              const idx = counter
              rendered.push(
                <input
                  key={`gap-${si}-${i}`}
                  type="text"
                  autoComplete="off"
                  value={answers[idx] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                  onFocus={() => setActiveIndex(idx)}
                  placeholder={`#${idx}`}
                  className="inline-block align-baseline mx-1 px-2 py-0.5 rounded bg-gray-50 border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder:text-gray-500"
                  style={{ minWidth: '7ch', maxWidth: '22ch' }}
                />
              )
            } else {
              rendered.push(<span key={`t-${si}-${i}`}>{part}</span>)
            }
          }
          const endIdx = counter
          let isCorrect: boolean | null = null
          if (checked && endIdx >= startIdx) {
            let ok = true
            for (let j = startIdx; j <= endIdx; j++) {
              if (!correctMap[j]) { ok = false; break }
            }
            isCorrect = ok
          }
          const frameClass = isCorrect === null
            ? ''
            : isCorrect
              ? 'border border-emerald-500/70 bg-emerald-100'
              : 'border border-rose-500/70 bg-red-100'
          return (
            <div key={`s-${si}`} className="flex items-start gap-2">
              <div className="text-xs text-gray-600 pt-1">{si + 1}.</div>
              <div className={`whitespace-pre-wrap leading-7 flex-1 rounded-md px-2 ${frameClass}`}>{rendered}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading && difficulty) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-md w-full shadow-2xl relative bg-white text-gray-800 border-2 border-indigo-300 animate-pulse text-center">
          <div className="text-lg text-gray-800 font-semibold">Generating gap-sentences...</div>
          <div className="mt-2 text-sm text-gray-600">
            {retryCount > 0 ? `Retry attempt ${retryCount}/${maxRetries}` : 'Please wait while we create your story'}
          </div>
          {retryCount > 0 && (
            <div className="mt-2 text-xs text-blue-600">
              Improving sentence quality...
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative bg-white text-gray-800 border border-gray-200">
          <div className="text-red-600 mb-4">
            <h3 className="font-semibold mb-2">Ett fel uppstod vid generering av meningar</h3>
            <p className="text-sm">{error}</p>
          </div>
          <div className="flex gap-3">
            {retryCount < maxRetries && (
              <button 
                onClick={() => {
                  setError(null)
                  setRetryCount(prev => prev + 1)
                }} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Försök igen ({retryCount + 1}/{maxRetries})
              </button>
            )}
            <button 
              onClick={() => {
                setShowWordSelector(true)
                setWordsSelected(false)
                setRetryCount(0)
                setError(null)
              }} 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Välj andra ord
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-800 rounded hover:bg-gray-200">
              Stäng
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100 relative my-4 text-center">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📝</span>
            </div>
            <div className="ml-3">
              <h2 className="text-2xl font-bold text-gray-800">Sentence Gap</h2>
              <p className="text-sm text-gray-600">Game Complete!</p>
            </div>
          </div>

          {/* Score Display */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-6 border border-purple-200">
            <div className="text-3xl font-bold text-purple-800 mb-2">Poäng: {score} / {blanks * 2}</div>
            <div className="text-lg text-purple-600">Rätt: {Math.floor(score / 2)} / {blanks}</div>
          </div>

          <button 
            onClick={onClose} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-8 rounded-2xl font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Stäng
          </button>
        </div>
      </div>
    )
  }

  const sentences = solutionText.split(/(?<=[.!?])\s+/).filter(Boolean)

  // Color grid selection screen
  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={handleGridSelected}
        onClose={onClose}
        minGrids={1}
        maxGrids={1}
        wordsPerGrid={6}
        title="Select Color Grid"
        description="Choose one color grid to practice with (max 6 words)"
        gridConfig={gridConfig}
      />
    )
  }

  // Difficulty pre-selection screen
  if (!difficulty) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-2xl w-full text-center shadow-2xl relative bg-white text-gray-800 border border-gray-200">
          {/* Top Progress Bar */}
          <div className="h-1 rounded-md mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          {/* Header */}
          <div className="mb-8">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2">Sentence Gap</h2>
            <p className="text-gray-600 text-sm">Choose difficulty level</p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Välj svårighetsgrad</h3>
            <p className="text-gray-600 text-sm mb-6">Texten genereras först efter att du valt nivå.</p>
            
            <div className="flex items-center justify-center gap-4">
              <button 
                className="px-8 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex flex-col items-center gap-2"
                onClick={() => setDifficulty('green')}
              >
                <span className="text-3xl">🟢</span>
                <span>Green</span>
              </button>
              <button 
                className="px-8 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex flex-col items-center gap-2"
                onClick={() => setDifficulty('yellow')}
              >
                <span className="text-3xl">🟡</span>
                <span>Yellow</span>
              </button>
              <button 
                className="px-8 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex flex-col items-center gap-2"
                onClick={() => setDifficulty('red')}
              >
                <span className="text-3xl">🔴</span>
                <span>Red</span>
              </button>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 w-full max-w-6xl shadow-2xl border border-gray-100 relative my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📝</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Sentence Gap</h2>
              <p className="text-sm text-gray-600">Fill in the missing words</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
          >
            <span className="text-gray-600 text-xl">×</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
              <div className="text-red-600 text-lg mb-3">⚠️</div>
              <div className="text-red-800 font-semibold mb-4">{error}</div>
              <button
                onClick={retryGeneration}
                disabled={isRetrying}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:shadow-lg"
              >
                {isRetrying ? 'Försöker igen...' : 'Försök igen'}
              </button>
            </div>
          </div>
        )}

        {/* Difficulty Indicator */}
        <div className="mb-6">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-2xl border border-blue-200">
            <span className="text-blue-600">📊</span>
            <span className="text-sm font-medium text-blue-800">
              {difficulty ? `Current level: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}` : 'Välj svårighetsgrad för att generera meningarna.'}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 p-6">
              {renderGapSentences()}
            </div>
            <div className="mt-3 text-sm text-gray-600 font-medium">Active blank: {activeIndex ?? '—'}</div>
            {/* Hints removed per requirements */}
          </div>

          <div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border-2 border-blue-200 p-6">
              <div className="text-lg font-bold mb-4 text-gray-800 flex items-center">
                <span className="mr-2">📚</span>
                Available words
              </div>
              <div className="flex flex-wrap gap-3">
                {usedWords.map((w, i) => {
                  const key = String(w).toLowerCase()
                  const isUsed = !!usedByIndex[key]
                  return (
                    <span
                      key={`${w}-${i}`}
                      className={`select-none px-4 py-2 rounded-2xl border-2 text-sm font-medium transition-all ${
                        isUsed 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400 text-white shadow-lg' 
                          : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                      title={isUsed ? 'Used in a blank' : 'Not used yet'}
                    >
                      {w}
                    </span>
                  )
                })}
              </div>
              <div className="mt-4 text-sm text-blue-600 font-medium">💡 Type the words into the blanks. Used words stay blue.</div>
            </div>
          </div>
        </div>

        {/* Progress and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-2xl border border-purple-200">
            <span className="text-sm font-medium text-purple-800">
              Blanks: {blanks} • Filled: {Object.values(answers).filter(v => String(v || '').trim()).length}
            </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={checkAnswersVisual} 
              disabled={!allAnswered || submitted} 
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg hover:shadow-xl disabled:shadow-lg"
            >
              Check
            </button>
            <button 
              onClick={submit} 
              disabled={!allAnswered || submitted} 
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg hover:shadow-xl disabled:shadow-lg"
            >
              Submit
            </button>
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Close
            </button>
          </div>
        </div>

        {submitted && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-100 to-green-100 px-6 py-3 rounded-2xl border border-emerald-200">
              <span className="text-emerald-600">🎯</span>
              <span className="font-semibold text-emerald-800">
                Rätt: {Math.floor(score / 2)} / {blanks} • Poäng: {score} / {blanks * 2}
              </span>
            </div>
          </div>
        )}

        {/* Facit removed per requirements */}
      </div>
    </div>
  )
}


