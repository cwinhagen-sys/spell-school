'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { startGameSession, endGameSession, logWordAttempt, type TrackingContext } from '@/lib/tracking'
import { supabase } from '@/lib/supabase'
import ColorGridSelector, { COLOR_GRIDS, GridConfig } from '@/components/ColorGridSelector'
import QuizFeedbackModal from '@/components/QuizFeedbackModal'

interface QuizGameProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  trackingContext?: TrackingContext
  themeColor?: string
  onSubmitScore: (score: number, total: number, evaluations: Evaluation[]) => Promise<void> | void
  gridConfig?: GridConfig[]
  sessionMode?: boolean // If true, skip grid selector and use gridConfig directly
}

type QuizItem = { prompt: string; answer: string; direction: 'en-to-sv' | 'sv-to-en' }
type Verdict = 'correct' | 'partial' | 'wrong' | 'empty'
type Evaluation = { prompt: string; expected: string; given: string; verdict: Verdict }
type SelectedGrid = {
  words: string[]
  translations: Record<string, string>
  colorScheme: typeof COLOR_GRIDS[number]
}

export default function QuizGame({ words, translations = {}, onClose, trackingContext, themeColor, onSubmitScore, gridConfig, sessionMode = false }: QuizGameProps) {
  const [items, setItems] = useState<QuizItem[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [score, setScore] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({})
  const [aiTotal, setAiTotal] = useState<number | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedDirection, setSelectedDirection] = useState<'both' | 'en-to-sv' | 'sv-to-en'>('both')
  const [selectedLanguageOrder, setSelectedLanguageOrder] = useState<'sv-en' | 'en-sv' | null>(null)
  const [currentBlock, setCurrentBlock] = useState(0)
  const [blocks, setBlocks] = useState<QuizItem[][]>([])
  const [blockColorSchemes, setBlockColorSchemes] = useState<Array<typeof COLOR_GRIDS[number]>>([])
  const [selectedGrids, setSelectedGrids] = useState<SelectedGrid[]>([])
  const [showGridSelector, setShowGridSelector] = useState(!sessionMode) // Skip grid selector in session mode
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)

  const totalSelectedWords = useMemo(
    () => selectedGrids.reduce((sum, grid) => sum + grid.words.length, 0),
    [selectedGrids]
  )

  const pairLookup = useMemo(() => {
    const map = new Map<string, { en: string; sv: string }>()

    const addPair = (enWord?: string | null, svWord?: string | null) => {
      if (!enWord || !svWord) return
      const pair = { en: enWord, sv: svWord }
      map.set(enWord.toLowerCase(), pair)
      map.set(svWord.toLowerCase(), pair)
    }

    Object.entries(translations || {}).forEach(([enWord, svWord]) => {
      if (typeof svWord === 'string') {
        addPair(enWord, svWord)
      }
    })

    if (gridConfig) {
      gridConfig.forEach(config => {
        config.words.forEach(word => {
          if (typeof word === 'object' && word.en && word.sv) {
            addPair(word.en, word.sv)
          }
        })
      })
    }

    return map
  }, [translations, gridConfig])

  const fallbackExplanation = (e: Evaluation): string => {
    // All feedback text has been removed - always return empty string
    return ''
  }

  const norm = (s: unknown) => String(s ?? '').toLowerCase().trim()
  const makeKey = (prompt: string, given: string, expected: string) => `${norm(prompt)}||${norm(given)}||${norm(expected)}`

  // Auto-configure for session mode
  useEffect(() => {
    if (!sessionMode || !gridConfig || gridConfig.length === 0) return

    // Convert gridConfig to selectedGrids format
    const grids: SelectedGrid[] = gridConfig.map((config, idx) => {
      const words: string[] = []
      const translations: Record<string, string> = {}

      config.words.forEach(word => {
        if (typeof word === 'string') {
          words.push(word)
          // Try to find translation from config.translations or translations prop
          const translation = config.translations?.[word.toLowerCase()] || translations[word.toLowerCase()]
          if (translation) {
            translations[word.toLowerCase()] = translation
          }
        } else if (typeof word === 'object' && word.en && word.sv) {
          words.push(word.sv) // Use Swedish word as the key word
          translations[word.sv.toLowerCase()] = word.en
        }
      })
      
      // Also merge config.translations if available
      if (config.translations) {
        Object.entries(config.translations).forEach(([key, value]) => {
          translations[key.toLowerCase()] = value as string
        })
      }

      return {
        words,
        translations,
        colorScheme: COLOR_GRIDS[idx % COLOR_GRIDS.length]
      }
    })

    setSelectedGrids(grids)
    setSelectedLanguageOrder('sv-en')
    setSelectedDirection('sv-to-en')
  }, [sessionMode, gridConfig])

  useEffect(() => {
    if (!selectedLanguageOrder || selectedGrids.length === 0) return

    const pairMap = new Map(pairLookup)
    const newBlocks: QuizItem[][] = []
    const newBlockColorSchemes: Array<typeof COLOR_GRIDS[number]> = []
    const allItems: QuizItem[] = []

    selectedGrids.forEach((grid) => {
      const blockItems: QuizItem[] = []
      const blockPairKeys = new Set<string>()

      grid.words.forEach(word => {
        if (!word) return
        const normalized = word.toLowerCase()

        let pair = pairMap.get(normalized)

        if (!pair) {
          const gridTranslation = grid.translations?.[normalized]
          if (gridTranslation) {
            const translationLower = gridTranslation.toLowerCase()
            pair = pairMap.get(translationLower)

            if (!pair) {
              pair = { en: gridTranslation, sv: word }
              pairMap.set(word.toLowerCase(), pair)
              pairMap.set(gridTranslation.toLowerCase(), pair)
            }
          }
        }

        if (!pair) return

        const pairKey = `${pair.en.toLowerCase()}||${pair.sv.toLowerCase()}`
        if (blockPairKeys.has(pairKey)) return
        blockPairKeys.add(pairKey)

        const pushItem = (prompt: string, answer: string, direction: 'en-to-sv' | 'sv-to-en') => {
          const item = { prompt, answer, direction }
          blockItems.push(item)
          allItems.push(item)
        }

        if (selectedDirection === 'both' || selectedDirection === 'sv-to-en') {
          // Swedish to English: Show Swedish word, student writes English translation
          pushItem(pair.sv, pair.en, 'sv-to-en')
        }
        if (selectedDirection === 'both' || selectedDirection === 'en-to-sv') {
          // English to Swedish: Show English word, student writes Swedish translation
          pushItem(pair.en, pair.sv, 'en-to-sv')
        }
      })

      if (blockItems.length > 0) {
        newBlocks.push(blockItems)
        newBlockColorSchemes.push(grid.colorScheme)
      }
    })

    setBlocks(newBlocks)
    setBlockColorSchemes(newBlockColorSchemes)
    setItems(allItems)
    setAnswers(new Array(allItems.length).fill(''))
    setCurrentBlock(0)
  }, [selectedLanguageOrder, selectedDirection, selectedGrids, pairLookup])

  // Start game session when quiz starts (after language selection)
  useEffect(() => {
    if (!selectedLanguageOrder || selectedGrids.length === 0) return
    
    const startSession = async () => {
      const session = await startGameSession('quiz', trackingContext)
      if (session) {
        setSessionId(session.id)
        startedAtRef.current = Date.now()
      }
    }
    startSession()
  }, [selectedLanguageOrder, selectedGrids.length, trackingContext])

  useEffect(() => {
    if (!showLanguageSelection && !showGridSelector && selectedLanguageOrder) {
      startedAtRef.current = Date.now()
    }
  }, [trackingContext, showLanguageSelection, showGridSelector, selectedLanguageOrder])

  // Animate loading bar
  useEffect(() => {
    let rafId: number | null = null
    let startTime = 0
    if (aiLoading) {
      startTime = performance.now()
      const tick = (now: number) => {
        const elapsed = Math.max(0, now - startTime)
        const target = Math.min(95, (elapsed / 10000) * 95)
        setLoadingProgress(target)
        if (aiLoading) {
          rafId = window.requestAnimationFrame(tick)
        }
      }
      rafId = window.requestAnimationFrame(tick)
    } else {
      setLoadingProgress(100)
      window.setTimeout(() => setLoadingProgress(0), 400)
    }
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [aiLoading])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [submitted])

  const handleChange = (idx: number, val: string) => {
    setAnswers(prev => prev.map((a, i) => (i === idx ? val : a)))
  }

  // Get the global index for a word in the current block
  const getGlobalIndex = (blockIdx: number, wordIdx: number): number => {
    let globalIdx = 0
    for (let i = 0; i < blockIdx; i++) {
      globalIdx += blocks[i]?.length || 0
    }
    return globalIdx + wordIdx
  }

  // Get block color based on block index - enhanced stronger colors
  const getBlockColor = (blockIdx: number) => {
    return COLOR_GRIDS[blockIdx % COLOR_GRIDS.length]
  }

  // Navigation functions
  const goToNextBlock = () => {
    if (currentBlock < blocks.length - 1) {
      setCurrentBlock(currentBlock + 1)
    }
  }

  const goToPreviousBlock = () => {
    if (currentBlock > 0) {
      setCurrentBlock(currentBlock - 1)
    }
  }

  const goToBlock = (blockIdx: number) => {
    if (blockIdx >= 0 && blockIdx < blocks.length) {
      setCurrentBlock(blockIdx)
    }
  }

  // Levenshtein distance for partial credit
  const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        )
      }
    }
    return dp[m][n]
  }

  const normalizeTokens = (s: string): string[] => {
    const lowered = (s || '').toLowerCase().trim()
      .replace(/[-_]/g, ' ')
      .replace(/[^a-zåäöéèüï\s]/gi, '')
      .replace(/\s+/g, ' ')
    const stopwords = new Set(['av','och','att','en','ett','det','som','för','på','i','till','från','de','du','vi','ni'])
    const roughStem = (t: string) => t.endsWith('et') ? t.slice(0, -2) : (t.endsWith('en') ? t.slice(0, -2) : t)
    return lowered.split(' ').filter(Boolean).filter(t => !stopwords.has(t)).map(roughStem)
  }

  const calculateScore = (items: QuizItem[], answers: string[]): { score: number; evaluations: Evaluation[] } => {
    let total = 0
    const evals: Evaluation[] = []
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const given = norm(answers[i] || '')
      const expected = norm(item.answer)
      
      if (!given) {
        evals.push({ prompt: item.prompt, expected: item.answer, given: '', verdict: 'empty' })
        continue
      }
      
      const tokensGiven = normalizeTokens(given)
      const tokensExpected = normalizeTokens(expected)
      
      // Exact match
      if (given === expected) {
        total += 2
        evals.push({ prompt: item.prompt, expected: item.answer, given: answers[i], verdict: 'correct' })
        continue
      }
      
      // Check for synonym/paraphrase using token overlap
      const overlap = tokensGiven.filter(t => tokensExpected.includes(t)).length
      const totalTokens = Math.max(tokensGiven.length, tokensExpected.length)
      const overlapRatio = overlap / totalTokens
      
      if (overlapRatio >= 0.7) {
        total += 2
        evals.push({ prompt: item.prompt, expected: item.answer, given: answers[i], verdict: 'correct' })
        continue
      }
      
      // Partial credit using Levenshtein distance
      const distance = levenshtein(given, expected)
      const maxLen = Math.max(given.length, expected.length)
      const similarity = maxLen === 0 ? 1 : 1 - (distance / maxLen)
      
      if (similarity >= 0.8) {
        total += 2
        evals.push({ prompt: item.prompt, expected: item.answer, given: answers[i], verdict: 'correct' })
      } else if (similarity >= 0.6) {
        total += 1
        evals.push({ prompt: item.prompt, expected: item.answer, given: answers[i], verdict: 'partial' })
      } else {
        evals.push({ prompt: item.prompt, expected: item.answer, given: answers[i], verdict: 'wrong' })
      }
    }
    
    return { score: total, evaluations: evals }
  }

  const finalizeSubmission = async () => {
    if (finalized) return
    
    setFinalized(true)
    setAiLoading(true)
    
    const { score: calculatedScore, evaluations: calculatedEvaluations } = calculateScore(items, answers)
    
    console.log('📊 calculateScore result:', {
      items_count: items.length,
      answers_count: answers.length,
      calculatedScore,
      calculatedEvaluations_count: calculatedEvaluations.length,
      calculatedEvaluations_sample: calculatedEvaluations[0] || null
    })
    
    setScore(calculatedScore)
    setEvaluations(calculatedEvaluations)
    
    // Keep track of final evaluations to save (will be updated by AI if available)
    let finalEvaluations = calculatedEvaluations
    
    // AI grading
    try {
      const response = await fetch('/api/quiz-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item, idx) => ({
            prompt: item.prompt,
            expected: item.answer,
            given: answers[idx] || ''
          })),
          sourceLanguage: selectedDirection === 'sv-to-en' ? 'sv' : selectedDirection === 'en-to-sv' ? 'en' : 'en',
          targetLanguage: selectedDirection === 'sv-to-en' ? 'en' : selectedDirection === 'en-to-sv' ? 'sv' : 'sv'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🎯 Quiz API Response:', data)
        
        // Update evaluations with API results
        const apiEvaluations = data.results || []
        const newEvaluations = apiEvaluations.map((result: any) => ({
          prompt: result.prompt,
          expected: result.expected,
          given: result.given,
          verdict: result.verdict || 'wrong',
          points: result.points || 0,
          reason: result.reason,
          explanation_sv: result.explanation_sv,
          category: result.category
        }))
        
        // Update finalEvaluations to use AI results
        finalEvaluations = newEvaluations
        console.log('📊 AI grading updated evaluations:', {
          newEvaluations_count: newEvaluations.length,
          newEvaluations_sample: newEvaluations[0] || null
        })
        setEvaluations(newEvaluations)
        setAiTotal(data.total)
        
        // Create explanations map
        const explanations: Record<string, string> = {}
        apiEvaluations.forEach((result: any) => {
          const key = `${result.prompt}||${result.given}||${result.expected}`
          if (result.explanation_sv) {
            explanations[key] = result.explanation_sv
          }
        })
        setAiExplanations(explanations)
      }
    } catch (error) {
      console.error('AI grading failed:', error)
    } finally {
      setAiLoading(false)
    }
    
    // End game session with evaluations in details
    const finalScore = aiTotal ?? calculatedScore
    const totalPossible = items.length * 2 // 2 points per item
    const durationSec = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0
    const accuracyPct = totalPossible > 0 ? Math.round((finalScore / totalPossible) * 100) : 0
    
    // Ensure we have evaluations - use finalEvaluations (from AI or calculated)
    // Create a fresh copy of the array to avoid any reference issues
    const evaluationsToSave = finalEvaluations && finalEvaluations.length > 0 
      ? [...finalEvaluations] 
      : (calculatedEvaluations && calculatedEvaluations.length > 0 
          ? [...calculatedEvaluations] 
          : [])
    
    console.log('📊 QuizGame: Before saving, checking evaluations:', {
      finalEvaluations_length: finalEvaluations?.length || 0,
      calculatedEvaluations_length: calculatedEvaluations?.length || 0,
      evaluationsToSave_length: evaluationsToSave.length,
      evaluationsToSave_sample: evaluationsToSave[0] || null
    })
    
    // Save session with evaluations in details
    const sessionDetails = {
      evaluations: evaluationsToSave,
      total_possible: totalPossible,
      quiz_completed: true,
      started_at: startedAtRef.current ? new Date(startedAtRef.current).toISOString() : undefined
    }
    
    console.log('📊 QuizGame: Saving session with evaluations:', {
      sessionId,
      evaluations_count: evaluationsToSave.length,
      evaluations_sample: evaluationsToSave[0] || null,
      details: sessionDetails,
      details_evaluations_count: sessionDetails.evaluations.length,
      details_evaluations_is_array: Array.isArray(sessionDetails.evaluations),
      details_stringified: JSON.stringify(sessionDetails).substring(0, 500)
    })
    
    // Log what we're about to send
    const metricsToSend = {
      score: finalScore,
      durationSec,
      accuracyPct,
      details: sessionDetails
    }
    
    console.log('📊 QuizGame: About to call endGameSession with:', {
      metrics_details_type: typeof metricsToSend.details,
      metrics_details_evaluations_count: metricsToSend.details?.evaluations?.length || 0,
      metrics_details_evaluations_is_array: Array.isArray(metricsToSend.details?.evaluations),
      metrics_details_keys: Object.keys(metricsToSend.details || {})
    })
    
    await endGameSession(sessionId, 'quiz', metricsToSend, trackingContext)
    
    // Submit score with total and evaluations (for student_progress)
    // Use evaluationsToSave which contains the actual evaluation data
    await onSubmitScore(finalScore, totalPossible, evaluationsToSave)
    
    // In session mode, close immediately and show result in the session page
    if (sessionMode) {
      // Close quiz component - result will be shown in the purple box on select-game page
      onClose()
      return
    }
    
    // Show feedback modal after quiz is complete (only for non-session mode)
    setShowFeedbackModal(true)
  }

  const handleSubmit = () => {
    if (submitted) return
    setSubmitted(true)
    finalizeSubmission()
  }

  // Get current block data
  const currentBlockData = blocks[currentBlock] || []
  const blockColorScheme = blockColorSchemes[currentBlock] || getBlockColor(currentBlock)
  const answerLanguageLabel =
    selectedDirection === 'both'
      ? 'Answer in Swedish & English'
      : selectedDirection === 'sv-to-en'
        ? 'Answer in English'
        : 'Answer in Swedish'

  if (showGridSelector) {
    return (
      <ColorGridSelector
        words={words}
        translations={translations}
        onSelect={(grids) => {
          setSelectedGrids(grids)
          setShowGridSelector(false)
          setShowLanguageSelection(true)
          setSelectedLanguageOrder(null)
          setSelectedDirection('both')
          setBlocks([])
          setBlockColorSchemes([])
          setItems([])
          setAnswers([])
        }}
        onClose={onClose}
        minGrids={1}
        maxGrids={undefined}
        wordsPerGrid={6}
        title="Select Color Blocks"
        description="Choose which color blocks you want to use in the quiz"
        gridConfig={gridConfig}
      />
    )
  }

  // Language selection screen
  if (showLanguageSelection) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-4xl w-full text-center shadow-2xl relative bg-white text-gray-800 border border-gray-200">
          {/* Top Progress Bar */}
          <div className="h-1 rounded-md mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          {/* Header */}
          <div className="mb-8">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold mb-2">Choose Translation Direction</h2>
            <p className="text-gray-600 text-sm">
              You have selected {selectedGrids.length} color block{selectedGrids.length !== 1 ? 's' : ''} with {totalSelectedWords} word{totalSelectedWords !== 1 ? 's' : ''}. Choose which direction you want to translate.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Swedish to English */}
            <button
              onClick={() => {
                setSelectedLanguageOrder('sv-en')
                setSelectedDirection('sv-to-en')
                setShowLanguageSelection(false)
              }}
              className="group p-6 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="text-5xl mb-3">🇸🇪</div>
              <h3 className="text-xl font-bold mb-2">Swedish → English</h3>
              <p className="text-gray-600 text-sm mb-3">Translate Swedish words to English</p>
              <div className="text-2xl text-blue-600 group-hover:scale-110 transition-transform duration-300">→</div>
            </button>
            
            {/* English to Swedish */}
            <button
              onClick={() => {
                setSelectedLanguageOrder('en-sv')
                setSelectedDirection('en-to-sv')
                setShowLanguageSelection(false)
              }}
              className="group p-6 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="text-5xl mb-3">🇬🇧</div>
              <h3 className="text-xl font-bold mb-2">English → Swedish</h3>
              <p className="text-gray-600 text-sm mb-3">Translate English words to Swedish</p>
              <div className="text-2xl text-green-600 group-hover:scale-110 transition-transform duration-300">→</div>
            </button>
          </div>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz setup screen (if no language order selected)
  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold mb-4">Quiz Setup</h2>
          <p className="text-gray-600 mb-6">Choose translation direction:</p>
          
          <div className="space-y-3">
            <button
              onClick={() => setSelectedDirection('both')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedDirection === 'both' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Both Directions</div>
              <div className="text-sm text-gray-600">English ↔ Swedish</div>
            </button>
            
            <button
              onClick={() => setSelectedDirection('en-to-sv')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedDirection === 'en-to-sv' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">English → Swedish</div>
              <div className="text-sm text-gray-600">Translate to Swedish</div>
            </button>
            
            <button
              onClick={() => setSelectedDirection('sv-to-en')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedDirection === 'sv-to-en' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Swedish → English</div>
              <div className="text-sm text-gray-600">Translate to English</div>
            </button>
          </div>
          
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {/* Items will be generated automatically */}}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quiz</h2>
            <p className="text-sm text-gray-500 mt-1">
              {items.length} ord • {answerLanguageLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Submit Button - Always visible in header */}
            {!submitted && (
              <button
                onClick={() => setShowSubmitConfirmation(true)}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 shadow-md font-semibold text-sm transition-all hover:scale-105"
              >
                🎯 Submit Quiz
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Quiz Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {!submitted ? (
            <div className="h-full grid lg:grid-cols-[140px_1fr] gap-6">
              <aside className="flex flex-col items-center gap-3 py-4 overflow-y-auto">
                {blocks.map((_, idx) => {
                  const colorScheme = blockColorSchemes[idx] || COLOR_GRIDS[idx % COLOR_GRIDS.length]
                  const isActive = idx === currentBlock
                  return (
                    <button
                      key={idx}
                      onClick={() => goToBlock(idx)}
                      className={`w-12 h-12 rounded-2xl transition-transform ${
                        isActive ? 'ring-4 ring-gray-900 scale-110' : 'ring-2 ring-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: colorScheme.hex }}
                      aria-label={`Block ${idx + 1}`}
                    />
                  )
                })}
              </aside>

              <section className="flex flex-col min-h-0 bg-white border border-gray-200 rounded-3xl shadow-sm">
                <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <span className="text-sm text-gray-500">
                    Block {currentBlock + 1} of {blocks.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousBlock}
                      disabled={currentBlock === 0}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        currentBlock === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100 transition-colors'
                      }`}
                    >
                      ←
                    </button>
                    <button
                      onClick={goToNextBlock}
                      disabled={currentBlock === blocks.length - 1}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        currentBlock === blocks.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100 transition-colors'
                      }`}
                    >
                      →
                    </button>
                  </div>
                </header>

                {blocks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    No words found for the selected blocks.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {currentBlockData.map((item, wordIdx) => {
                        const globalIdx = getGlobalIndex(currentBlock, wordIdx)
                        return (
                          <article
                            key={globalIdx}
                            className="flex flex-col gap-4 p-4 rounded-2xl border border-gray-200 shadow-sm"
                          >
                            <h4 className="text-lg font-semibold text-gray-900 leading-tight">{item.prompt}</h4>
                            <input
                              type="text"
                              value={answers[globalIdx] || ''}
                              onChange={(e) => handleChange(globalIdx, e.target.value)}
                              placeholder={
                                item.direction === 'sv-to-en'
                                  ? 'Write in English...'
                                  : item.direction === 'en-to-sv'
                                    ? 'Write in Swedish...'
                                    : 'Write your answer...'
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition"
                              autoComplete="off"
                              disabled={submitted}
                            />
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="text-center flex items-center justify-center h-full">
              {aiLoading ? (
                <div className="space-y-4">
                  <div className="text-4xl mb-4">🤖</div>
                  <h3 className="text-xl font-bold text-gray-800">Analyzing quiz...</h3>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 rounded-full h-3 transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
                        </div>

      </div>
      
      {/* Submit Confirmation Modal */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Are you sure?</h2>
            <p className="text-gray-600 mb-6">
              You're about to submit your quiz. Make sure you've answered all questions you want to answer.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="text-sm text-yellow-800">
                <strong>Progress:</strong> {answers.filter(a => a.trim()).length} / {items.length} questions answered
              </div>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowSubmitConfirmation(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirmation(false)
                  handleSubmit()
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
              >
                Yes, Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <QuizFeedbackModal
          evaluations={evaluations}
          aiExplanations={aiExplanations}
          totalScore={aiTotal ?? score}
          maxScore={items.length * 2}
          totalWords={items.length}
          onClose={() => {
            setShowFeedbackModal(false)
            onClose() // Close quiz modal and return to dashboard
          }}
          onWordClick={(word) => {
            console.log('Word clicked:', word)
          }}
        />
      )}
    </div>
  )
}