'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, type TrackingContext, updateStudentProgress } from '@/lib/tracking'
import WordSelector from './WordSelector'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateStoryGapScore } from '@/lib/gameScoring'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'
import MagicalProgressBar from '@/components/MagicalProgressBar'

interface StoryGapGameProps {
  words: string[]
  translations?: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onScoreUpdate?: (points: number, newTotal?: number, gameType?: string) => void
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, adapt behavior for session mode
}

type GapMeta = { index: number; correct: string; why_unique: string; rejects: Array<{ word: string; reason: string }> }

export default function StoryGapGame({ words, translations = {}, onClose, trackingContext, themeColor, onScoreUpdate, gridConfig, sessionMode = false }: StoryGapGameProps) {
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
  // In session mode, show grid selector if there are multiple blocks, otherwise skip it
  // In non-session mode, always show grid selector
  const [showGridSelector, setShowGridSelector] = useState(() => {
    if (sessionMode && gridConfig && gridConfig.length > 1) {
      return true // Show selector in session mode if multiple blocks
    }
    return !sessionMode // Show selector in non-session mode, skip if session mode with 1 or 0 blocks
  })
  const [showWordSelector, setShowWordSelector] = useState(false)
  const [wordsSelected, setWordsSelected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)
  const [isRetrying, setIsRetrying] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatusText, setLoadingStatusText] = useState('Charging spell...')

  const shuffle = (arr: string[]) => {
    const a = [...arr]
    // Use crypto.getRandomValues for better randomness if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomValues = new Uint32Array(a.length)
      crypto.getRandomValues(randomValues)
      for (let i = a.length - 1; i > 0; i--) {
        const j = randomValues[i] % (i + 1)
        ;[a[i], a[j]] = [a[j], a[i]]
      }
    } else {
      // Fallback to Math.random with timestamp seed for better variation
      const seed = Date.now() + Math.random()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor((seed * (i + 1)) % (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      // Additional shuffle pass with Math.random
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
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

  // Safe fallback templates (never use placeholders)
  const SAFE_TEMPLATES = [
    (w: string) => `I left the ${w} on the kitchen counter.`,
    (w: string) => `Did you remember the ${w} before we left?`,
    (w: string) => `Tomorrow, we will discuss the ${w} in class.`,
    (w: string) => `She whispered the ${w} and closed the door.`,
    (w: string) => `Only the ${w} fits this narrow space.`,
    (w: string) => `Please attach the ${w} to the email.`,
    (w: string) => `They stored the ${w} in the attic.`,
    (w: string) => `What a relief the ${w} brought today.`
  ]

  // Safe fallback generator (only used if server fails completely)
  const makeSafeFallback = (wordSet: string[]): { gap_text: string; solution_text: string; used_words: string[]; gaps_meta: GapMeta[] } | null => {
    if (!wordSet || wordSet.length === 0) return null
    
    const gapLines: string[] = []
    const solLines: string[] = []
    const meta: GapMeta[] = []
    const usedWords: string[] = []
    
    for (let i = 0; i < wordSet.length; i++) {
      const word = wordSet[i]
      if (!word || word.trim().length === 0) continue
      
      const template = SAFE_TEMPLATES[i % SAFE_TEMPLATES.length]
      const solution = template(word)
      const gap = solution.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '______')
      solLines.push(solution)
      gapLines.push(gap)
      meta.push({ index: i + 1, correct: word.toLowerCase(), why_unique: 'fallback', rejects: [] })
      usedWords.push(word)
    }
    
    if (gapLines.length === 0 || solLines.length === 0) return null
    
    return {
      gap_text: gapLines.join('\n'),
      solution_text: solLines.join('\n'),
      used_words: usedWords,
      gaps_meta: meta
    }
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

  // In session mode, handle grid selection based on number of blocks
  // If only 1 block in gridConfig, use it directly; if multiple, show selector
  useEffect(() => {
    if (sessionMode && gridConfig && gridConfig.length === 1 && !wordsSelected) {
      // Only 1 block - use it directly without showing selector
      const singleBlock = gridConfig[0]
      const blockWords = Array.isArray(singleBlock.words) 
        ? singleBlock.words.map(w => typeof w === 'string' ? w : (w as any).en || '')
        : []
      const pick = shuffle([...blockWords]).slice(0, Math.min(6, blockWords.length))
      setSelectedWords(pick)
      setSelectedGrid({
        words: pick,
        translations: singleBlock.translations || {},
        colorScheme: singleBlock.colorScheme || COLOR_GRIDS[0]
      })
      setWordsSelected(true)
      setShowGridSelector(false)
      // Don't auto-select difficulty - let user choose
    } else if (sessionMode && gridConfig && gridConfig.length > 1 && !wordsSelected) {
      // Multiple blocks - show selector (already set in useState)
      // Don't auto-select words, wait for user to choose grid
    } else if (sessionMode && words && words.length > 0 && !wordsSelected && (!gridConfig || gridConfig.length === 0)) {
      // Fallback: if no gridConfig but words provided, use words directly
      const pick = shuffle([...words]).slice(0, Math.min(6, words.length))
      setSelectedWords(pick)
      setWordsSelected(true)
      setShowGridSelector(false)
    } else if (!showGridSelector && !wordsSelected && selectedWords.length === 0) {
      // Non-session mode fallback
      const pool = Array.isArray(words) ? uniquePreserve(words) : []
      const pick = shuffle(pool).slice(0, Math.min(8, pool.length))
      setSelectedWords(pick)
      setWordsSelected(true)
    }
  }, [words, showGridSelector, wordsSelected, selectedWords.length, sessionMode, gridConfig])

  useEffect(() => {
    startedAtRef.current = Date.now()
    console.log('🎮 Story Gap: Game started (session will be created server-side)')
    setSessionId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!difficulty || !wordsSelected || selectedWords.length === 0) return
    
    const run = async () => {
      let progressInterval: NodeJS.Timeout | null = null
      let statusInterval: NodeJS.Timeout | null = null
      
      try {
        setLoading(true)
        setError(null)
        setLoadingProgress(0)
        setLoadingStatusText('Charging spell...')
        
        // Simulate progress during loading
        progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 90) return prev // Don't go above 90% until done
            const increment = Math.random() * 8 + 2 // Random increment between 2-10%
            return Math.min(prev + increment, 90)
          })
        }, 300)

        // Update status text based on progress
        statusInterval = setInterval(() => {
          setLoadingStatusText(prev => {
            const statuses = [
              'Charging spell...',
              'Aligning sentences...',
              'Mixing word potions...',
              'Weaving magic...',
              'Casting grammar...'
            ]
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
            return randomStatus !== prev ? randomStatus : prev
          })
        }, 1500)
        
        // No timeout - let generation take as long as needed
        
        // In session mode, selectedWords are already English
        // Otherwise, convert Swedish words to English before sending to API
        let englishWords: string[] = []
        
        if (sessionMode) {
          // In session mode, words are already English
          englishWords = [...selectedWords]
        } else {
          // Convert Swedish words to English before sending to API
          // selectedWords might be Swedish (from gridConfig), but API needs English words
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
        }
        
        // Shuffle word order for variation in each session
        const shuffledEnglishWords = shuffle(englishWords)
        
        console.log('📝 Story Gap: Converting words for API:', {
          sessionMode,
          original: selectedWords,
          english: englishWords,
          shuffled: shuffledEnglishWords
        })
        
        // Add retry logic with exponential backoff
        let lastError: Error | null = null
        let data: any = null
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Don't show retry attempts to user - just continue silently
            if (attempt > 0) {
              setRetryCount(attempt)
              setIsRetrying(true)
            }
            
            const res = await fetch('/api/story-gap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                wordSet: shuffledEnglishWords, 
                difficulty,
                retryAttempt: attempt 
              }),
            })
            
            if (!res.ok) {
              // Check if it's a generation failure that we can retry
              let parsedBody: any = null
              try { parsedBody = await res.json() } catch { parsedBody = null }
              
              // Check error type and provide helpful message
              const errorType = parsedBody?.error || 'unknown'
              const errorDetails = parsedBody?.details || 'unknown error'
              
              if (attempt < maxRetries) {
                console.log(`Generation failed (${errorType}), retrying... (${attempt + 1}/${maxRetries})`)
                const delay = Math.pow(2, attempt) * 1000
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
              } else {
                // All retries exhausted - use fallback generator
                console.warn('API failed, using fallback generator', { errorType, errorDetails })
                const fallbackData = makeSafeFallback(shuffledEnglishWords)
                if (fallbackData) {
                  data = fallbackData
                  break
                } else {
                  setError(`Could not generate sentences. Please try again or select different words.`)
                  return
                }
              }
            } else {
              const responseData = await res.json()
              
              // Server now validates everything, so we trust the response structure
              // Split by lines (not punctuation) as per new spec
              const incomingGap = String(responseData.gap_text || '')
              const incomingSolution = String(responseData.solution_text || '')
              const gapLines = incomingGap.split(/\r?\n/).filter(Boolean)
              const solLines = incomingSolution.split(/\r?\n/).filter(Boolean)
              const target = englishWords.length
              
              // Basic validation: line counts should match
              if (gapLines.length !== target || solLines.length !== target) {
                console.warn('Line count mismatch, retrying...', { gapLines: gapLines.length, solLines: solLines.length, target })
                if (attempt < maxRetries) {
                  const delay = Math.pow(2, attempt) * 1000
                  await new Promise(resolve => setTimeout(resolve, delay))
                  continue
                } else {
                  setError('Could not generate sentences for all words. Please try again.')
                  return
                }
              }
              
              // Validation passed, use this data
              data = responseData
              setRetryCount(0) // Reset on success
              setIsRetrying(false)
              if (progressInterval) clearInterval(progressInterval)
              if (statusInterval) clearInterval(statusInterval)
              setLoadingProgress(100)
              setLoadingStatusText('Spell complete!')
              break // Success
            }
          } catch (err) {
            lastError = err as Error
            if (attempt < maxRetries) {
              // Faster exponential backoff: wait 0.3s, 0.6s
              const delay = Math.pow(2, attempt) * 300
              console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`)
              setRetryCount(attempt + 1)
              setIsRetrying(true)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            } else {
              setRetryCount(0)
              setIsRetrying(false)
              if (progressInterval) clearInterval(progressInterval)
              if (statusInterval) clearInterval(statusInterval)
              throw lastError
            }
          }
        }
        
        if (progressInterval) clearInterval(progressInterval)
        if (statusInterval) clearInterval(statusInterval)
        
        if (!data) {
          throw lastError || new Error('No data received')
        }
        
        // Ensure progress is at 100% before finishing
        setLoadingProgress(100)
        setLoadingStatusText('Spell complete!')
        
        // Server provides validated data with line-based structure
        // Trust server-provided gaps_meta (order matches wordSet)
        const incomingGap = String(data.gap_text || '')
        const incomingSolution = String(data.solution_text || '')
        const gapLines = incomingGap.split(/\r?\n/).filter(Boolean)
        const solLines = incomingSolution.split(/\r?\n/).filter(Boolean)
        
        // Use server-provided gaps_meta verbatim (already validated)
        let finalMeta: GapMeta[] = Array.isArray(data.gaps_meta) ? data.gaps_meta.map((m: any) => ({
          index: m.index,
          correct: String(m.correct || '').trim().toLowerCase(),
          why_unique: 'server',
          rejects: []
        })) : []
        
        // Ensure gaps_meta matches wordSet order and length (use shuffled order)
        if (finalMeta.length !== shuffledEnglishWords.length) {
          console.warn('gaps_meta length mismatch, using fallback')
          // Use safe fallback if server meta is invalid
          const fallback = makeSafeFallback(shuffledEnglishWords)
          if (fallback) {
            setGapText(fallback.gap_text)
            setSolutionText(fallback.solution_text)
            finalMeta = fallback.gaps_meta
          } else {
            setError('Could not generate sentences. Please try again.')
            return
          }
        } else {
          // Use server data as-is (line-based)
          setGapText(incomingGap)
          setSolutionText(incomingSolution)
        }
        
        // Add word mapping for answer checking
        // In session mode, selectedWords are already English, so no need to map to Swedish
        const updatedMeta = finalMeta.map((meta, idx) => {
          const engWord = meta.correct
          if (sessionMode) {
            // In session mode, words are already English, no Swedish mapping needed
            return {
              ...meta,
              swedishWord: null
            }
          } else {
            // Map English words back to Swedish for answer checking
            const engIndex = englishWords.findIndex(w => w.trim().toLowerCase() === engWord)
            const swedishWord = engIndex >= 0 ? selectedWords[engIndex] : null
            
            return {
              ...meta,
              swedishWord: swedishWord // Add Swedish for user answer matching
            }
          }
        })
        setGapsMeta(updatedMeta as GapMeta[])
        
        // Show available words in random order (decoupled from sentence order)
        // Shuffle multiple times to ensure different order each session
        let shuffled = shuffle(englishWords)
        shuffled = shuffle(shuffled) // Double shuffle for better randomization
        setUsedWords(shuffled)
        
        // Prepare answer slots: one per line (one blank per line)
        const blanksCount = gapLines.length
        const init: Record<number, string> = {}
        for (let i = 1; i <= blanksCount; i++) init[i] = ''
        setAnswers(init)
        
        console.log('📝 Story Gap - Data loaded', { 
          gapLines: gapLines.length, 
          solLines: solLines.length, 
          metaCount: finalMeta.length,
          blanksCount 
        })
      } catch (e: any) {
        setError(e?.message || 'Failed to generate story.')
        setLoadingProgress(0)
        setLoadingStatusText('Charging spell...')
        if (progressInterval) clearInterval(progressInterval)
        if (statusInterval) clearInterval(statusInterval)
      } finally {
        setLoading(false)
        // Ensure intervals are cleared
        if (progressInterval) clearInterval(progressInterval)
        if (statusInterval) clearInterval(statusInterval)
      }
    }
    if (selectedWords.length >= 1 && difficulty && wordsSelected) run()
  }, [selectedWords, difficulty, wordsSelected])

  // Count blanks: one per line (deterministic structure)
  const blanks = useMemo(() => {
    const gapLines = String(gapText || '').split(/\r?\n/).filter(Boolean)
    return gapLines.length // One blank per line
  }, [gapText])

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
    
    // Normalize function for consistent matching
    const normalize = (s: string) => s.trim().toLowerCase()
    
    // Build set of all acceptable answers per gap (English and Swedish)
    // For duplicates: same word can be correct for multiple gaps
    const acceptableAnswers = new Map<number, Set<string>>()
    for (const meta of gapsMeta) {
      const correct = normalize(meta.correct)
      const swedishWord = (meta as any).swedishWord
      const acceptable = new Set([correct])
      if (swedishWord) {
        acceptable.add(normalize(swedishWord))
      }
      acceptableAnswers.set(meta.index, acceptable)
    }
    
    // Strict matching: exact case-insensitive match
    // Duplicate words can match multiple gaps (interchangeable)
    // This works the same way in both session mode and non-session mode
    for (const meta of gapsMeta) {
      const userInput = String(answers[meta.index] || '').trim()
      const normalizedInput = normalize(userInput)
      const acceptable = acceptableAnswers.get(meta.index) || new Set()
      const currentCorrect = normalize(meta.correct)
      
      // For single-word inputs: exact match required
      // For multi-word inputs: exact match of entire phrase OR exact match of first word
      // (but only if no other words in input are correct answers for other gaps)
      let matches = false
      
      if (normalizedInput.length === 0) {
        matches = false
      } else {
        // Check full match first
        matches = acceptable.has(normalizedInput)
        
        // If no full match, check if it matches any duplicate word (same word in other gaps)
        if (!matches) {
          // Check if this input matches the same word used in other gaps (duplicate)
          for (const otherMeta of gapsMeta) {
            if (otherMeta.index === meta.index) continue // Skip current gap
            const otherCorrect = normalize(otherMeta.correct)
            if (otherCorrect === currentCorrect) {
              // Same word (duplicate), check if input matches
              const otherAcceptable = acceptableAnswers.get(otherMeta.index) || new Set()
              if (otherAcceptable.has(normalizedInput)) {
                matches = true
                break
              }
            }
          }
        }
        
        // If no full match and multi-word, check first word
        if (!matches && normalizedInput.includes(' ')) {
          const firstWord = normalizedInput.split(/\s+/)[0]
          if (acceptable.has(firstWord)) {
            // Check if any other word in input is a correct answer for another gap
            // Exception: if it's a duplicate word (same word in multiple gaps), allow it
            const otherWords = normalizedInput.split(/\s+/).slice(1)
            let hasOtherCorrect = false
            for (const word of otherWords) {
              for (const [idx, acc] of acceptableAnswers.entries()) {
                if (idx !== meta.index && acc.has(word)) {
                  // Check if this word is also correct for current gap (duplicate)
                  const otherCorrect = gapsMeta.find(m => m.index === idx)?.correct
                  if (normalize(otherCorrect || '') === currentCorrect) {
                    // Same word (duplicate), allow it
                    continue
                  }
                  hasOtherCorrect = true
                  break
                }
              }
              if (hasOtherCorrect) break
            }
            matches = !hasOtherCorrect
          }
        }
      }
      
      map[meta.index] = matches
    }
    
    setCorrectMap(map)
    setChecked(true)
  }

  const submit = async () => {
    if (submitted) return
    
    // Check answers first if not already checked
    if (!checked) {
      checkAnswersVisual()
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Use the new universal scoring system: +2 per correct, -1 per wrong click
    const totalGaps = gapsMeta.length
    const correctAnswers = Object.values(correctMap).filter(Boolean).length
    const wrongAttempts = 0 // Story gap doesn't track wrong attempts separately
    const scoreResult = calculateStoryGapScore(correctAnswers, totalGaps, wrongAttempts)
    
    setScore(scoreResult.pointsAwarded)
    setSubmitted(true)
    
    // INSTANT UI UPDATE: Send points to parent for immediate UI update
    if (onScoreUpdate) {
      if (sessionMode) {
        // In session mode, pass correctAnswers and totalGaps for percentage calculation
        onScoreUpdate(correctAnswers, totalGaps, 'story_gap')
        // Automatically close after a brief delay in session mode if 100% correct
        if (correctAnswers === totalGaps) {
          setTimeout(() => {
            onClose()
          }, 500) // Small delay to show completion
        }
      } else {
        onScoreUpdate(scoreResult.accuracy, scoreResult.pointsAwarded, 'story_gap')
      }
    }
    
    // BACKGROUND SYNC: Update database in background (non-blocking) - only if not in session mode
    if (!sessionMode) {
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
    // Keep original case for display, but use lowercase for tracking
    const normalizedWord = String(word).trim().toLowerCase()
    
    // Check if this word is allowed to be used in multiple gaps (duplicate in wordSet)
    const wordCount = usedWords.filter(w => w.trim().toLowerCase() === normalizedWord).length
    const isDuplicate = wordCount > 1
    
    const prevIndex = usedByIndex[normalizedWord]
    setAnswers(prev => {
      const next = { ...prev }
      // Only clear previous usage if word is NOT a duplicate (duplicates can be used multiple times)
      if (!isDuplicate && prevIndex && prevIndex !== activeIndex) {
        next[prevIndex] = ''
      }
      // Store word as-is for display, matching will be case-insensitive
      next[activeIndex] = String(word).trim()
      return next
    })
  }

  const renderGapSentences = () => {
    // Split by lines (not punctuation) as per new spec
    const gapLines = String(gapText || '').split(/\r?\n/).filter(Boolean)
    
    return (
      <div className="space-y-3">
        {gapLines.map((line, lineIdx) => {
          const parts = line.split(/(______+)/)
          let rendered: React.ReactNode[] = []
          const gapIndex = lineIdx + 1 // 1-based index
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (/^_{6,}$/.test(part)) {
              // Exactly one blank per line
              rendered.push(
                <input
                  key={`gap-${lineIdx}-${i}`}
                  type="text"
                  autoComplete="off"
                  value={answers[gapIndex] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [gapIndex]: e.target.value }))}
                  onFocus={() => setActiveIndex(gapIndex)}
                  placeholder={`#${gapIndex}`}
                  className="inline-block align-baseline mx-1 px-2 py-0.5 rounded bg-gray-50 border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder:text-gray-500"
                  style={{ minWidth: '7ch', maxWidth: '22ch' }}
                />
              )
            } else {
              rendered.push(<span key={`t-${lineIdx}-${i}`}>{part}</span>)
            }
          }
          
          // Check correctness for this line
          let isCorrect: boolean | null = null
          if (checked) {
            isCorrect = correctMap[gapIndex] === true
          }
          
          const frameClass = isCorrect === null
            ? ''
            : isCorrect
              ? 'border border-emerald-500/70 bg-emerald-100'
              : 'border border-rose-500/70 bg-red-100'
          
          return (
            <div key={`line-${lineIdx}`} className="flex items-start gap-2">
              <div className="text-xs text-gray-600 pt-1">{lineIdx + 1}.</div>
              <div className={`whitespace-pre-wrap leading-7 flex-1 rounded-md px-2 ${frameClass}`}>{rendered}</div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading && difficulty) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
        <div className="rounded-3xl p-8 max-w-lg w-full shadow-2xl relative bg-white border-2 border-gray-200 text-center">
          <div className="mb-6">
            <div className="text-2xl text-gray-800 font-bold mb-2">Spell School</div>
            <div className="text-sm text-gray-600">Preparing your word set...</div>
          </div>
          <MagicalProgressBar progress={loadingProgress} statusText={loadingStatusText} />
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

  // In session mode, don't show completion screen - just close automatically if 100% correct
  if (submitted && !sessionMode) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-lg border border-gray-200 relative my-4 text-center">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <h2 className="text-2xl font-bold text-gray-900">Sentence Gap</h2>
              <p className="text-sm text-gray-600">Game Complete!</p>
            </div>
          </div>

          {/* Score Display */}
          <div className="bg-teal-50 rounded-lg p-6 mb-6 border border-teal-200">
            <div className="text-3xl font-bold text-teal-900 mb-2">Score: {score} / {blanks * 2}</div>
            <div className="text-lg text-teal-700">Correct: {Math.floor(score / 2)} / {blanks}</div>
          </div>

          <button 
            onClick={onClose} 
            className="bg-teal-500 hover:bg-teal-600 text-white py-3 px-8 rounded-lg font-semibold transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    )
  }
  
  // In session mode, if submitted and 100% correct, don't render anything (will close automatically)
  if (submitted && sessionMode) {
    const totalGaps = gapsMeta.length
    const correctAnswers = Object.values(correctMap).filter(Boolean).length
    if (correctAnswers === totalGaps) {
      return null // Will close automatically
    }
  }

  const sentences = solutionText.split(/(?<=[.!?])\s+/).filter(Boolean)

  // Color grid selection screen
  if (showGridSelector) {
    // Convert gridConfig to the format ColorGridSelector expects
    // ColorGridSelector expects { color: string, index: number } but we receive { colorScheme: ... }
    const convertedGridConfig = gridConfig?.map((config: any, index: number) => ({
      words: config.words || [],
      color: config.colorScheme?.hex || config.color || COLOR_GRIDS[index % COLOR_GRIDS.length].hex,
      index: config.index !== undefined ? config.index : index,
      translations: config.translations || {}
    })) || undefined
    
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
        gridConfig={convertedGridConfig}
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


