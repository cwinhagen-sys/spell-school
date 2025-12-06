'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline'

interface Evaluation {
  prompt: string
  expected: string
  given: string
  verdict: 'correct' | 'partial' | 'wrong' | 'empty'
  points?: number
  reason?: string
  explanation_sv?: string
  category?: 'perfect' | 'almost_there' | 'good_try' | 'remaining'
}

interface QuizFeedbackModalProps {
  evaluations: Evaluation[]
  aiExplanations: Record<string, string>
  totalScore: number
  maxScore: number
  onClose: () => void
  onWordClick?: (word: string) => void
  totalWords?: number // Total number of words in the quiz
}

type Category = 'perfect' | 'almost_there' | 'good_try' | 'remaining' | 'all'

interface CategorizedEvaluation extends Omit<Evaluation, 'category'> {
  category: Category
  points: number
  explanation: string
}

export default function QuizFeedbackModal({ 
  evaluations, 
  aiExplanations, 
  totalScore, 
  maxScore, 
  onClose,
  onWordClick,
  totalWords = 0
}: QuizFeedbackModalProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all')

  const getFallbackExplanation = (evaluation: Evaluation): string => {
    // All feedback text has been removed - always return empty string
    return ''
  }

  // Use API's categorization or fallback to local logic
  const categorizedEvaluations: CategorizedEvaluation[] = evaluations.map(evaluation => {
    const key = `${evaluation.prompt}||${evaluation.given}||${evaluation.expected}`
    const explanation = aiExplanations[key] || getFallbackExplanation(evaluation)
    
    // Use API's category if available, otherwise fallback to local logic
    let category: Category | undefined = undefined
    let points: number = evaluation.points || 0
    
    if (evaluation.category) {
      // Only use API category if it's not 'remaining' for answered questions
      // If user gave an answer but API says 'remaining', that's wrong
      const hasAnswer = evaluation.given && evaluation.given.trim() !== '' && evaluation.verdict !== 'empty'
      if (evaluation.category === 'remaining' && hasAnswer) {
        // API incorrectly marked answered question as remaining - use fallback logic instead
        console.warn(`⚠️ API incorrectly marked answered question as 'remaining': "${evaluation.prompt}" with answer "${evaluation.given}"`)
      } else {
        category = evaluation.category as Category
        console.log(`🎯 Using API category for "${evaluation.prompt}": ${category} (${points} points)`)
      }
    }
    
    // If category wasn't set from API (or was incorrectly 'remaining'), use fallback
    if (category === undefined) {
      // Fallback local categorization based on verdict and points
      // First check if empty/unanswered - these should always be 'remaining'
      if (evaluation.verdict === 'empty' || !evaluation.given || evaluation.given.trim() === '') {
        category = 'remaining'
      } else if (evaluation.verdict === 'correct' && points === 2) {
        category = 'perfect'
      } else if (evaluation.verdict === 'partial' || (evaluation.verdict === 'correct' && points === 1)) {
        category = 'almost_there'
      } else if (evaluation.verdict === 'wrong' && evaluation.given && evaluation.given.trim() !== '') {
        category = 'good_try'
      } else {
        // If verdict is not empty but unclear, don't mark as remaining - mark as good_try instead
        category = 'good_try'
      }
      console.log(`🔄 Fallback category for "${evaluation.prompt}": ${category} (verdict: ${evaluation.verdict}, points: ${points}, given: "${evaluation.given}")`)
    }
    
    return {
      ...evaluation,
      category,
      points,
      explanation
    }
  })
  
  console.log('📊 Categorized evaluations:', categorizedEvaluations)

  // Group by category
  const perfectAnswers = categorizedEvaluations.filter(e => e.category === 'perfect')
  const almostThereAnswers = categorizedEvaluations.filter(e => e.category === 'almost_there')
  const goodTryAnswers = categorizedEvaluations.filter(e => e.category === 'good_try')
  const remainingAnswers = categorizedEvaluations.filter(e => e.category === 'remaining')
  
  // Calculate learned words (1 or 2 points)
  const learnedWords = categorizedEvaluations.filter(e => e.points >= 1)
  const learnedCount = learnedWords.length
  
  // Calculate remaining words (not answered)
  const answeredCount = evaluations.length
  const remainingCount = Math.max(0, totalWords - answeredCount)
  
  // Get current category data
  const getCurrentCategoryData = () => {
    switch (activeCategory) {
      case 'perfect':
        return perfectAnswers
      case 'almost_there':
        return almostThereAnswers
      case 'good_try':
        return goodTryAnswers
      case 'remaining':
        return remainingAnswers
      case 'all':
      default:
        return categorizedEvaluations
    }
  }

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'perfect':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
      case 'almost_there':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
      case 'good_try':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
      case 'remaining':
        return <EyeIcon className="w-5 h-5 text-gray-500" />
      case 'all':
        return <CheckCircleIcon className="w-5 h-5 text-blue-600" />
    }
  }

  const getCategoryTitle = (category: Category, count: number) => {
    switch (category) {
      case 'perfect':
        return `Perfect (${count})`
      case 'almost_there':
        return `Almost there (${count})`
      case 'good_try':
        return `Good try (${count})`
      case 'remaining':
        return `Remaining words (${count})`
      case 'all':
        return `All words (${count})`
    }
  }

  const getCategoryDescription = (category: Category) => {
    switch (category) {
      case 'perfect':
        return 'You got it completely right!'
      case 'almost_there':
        return 'Almost perfect! Click to see the correct spelling.'
      case 'good_try':
        return 'Good attempt! Click to see the correct answer.'
      case 'remaining':
        return 'Words you didn\'t answer yet.'
      case 'all':
        return 'All words from this quiz.'
    }
  }

  const currentData = getCurrentCategoryData()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] overflow-y-auto">
      <div className="relative bg-[#12122a] rounded-3xl p-6 max-w-5xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden shadow-2xl border border-white/10 my-auto">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/30 via-cyan-500/20 to-fuchsia-500/30 rounded-3xl blur-xl" />
        
        {/* Header with celebration message - More compact */}
        <div className="relative text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            Great! You learned {learnedCount} new words!
          </h2>
          <p className="text-sm text-gray-400">
            Score: {totalScore}/{maxScore} points
          </p>
        </div>

        {/* Category buttons - More compact */}
        <div className="relative flex flex-wrap gap-2 mb-6 justify-center">
          {[
            { key: 'all', count: categorizedEvaluations.length, label: 'All words', color: 'blue' },
            { key: 'perfect', count: perfectAnswers.length, label: 'Perfect', color: 'emerald' },
            { key: 'almost_there', count: almostThereAnswers.length, label: 'Almost there', color: 'yellow' },
            { key: 'good_try', count: goodTryAnswers.length, label: 'Good try', color: 'amber' },
            { key: 'remaining', count: remainingAnswers.length, label: 'Remaining', color: 'gray' }
          ].map(({ key, count, label, color }) => {
            const getButtonColors = () => {
              if (activeCategory === key) {
                switch (color) {
                  case 'emerald': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400'
                  case 'yellow': return 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30 border border-yellow-400'
                  case 'amber': return 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400'
                  case 'blue': return 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400'
                  case 'gray': return 'bg-gray-500 text-white shadow-lg shadow-gray-500/30 border border-gray-400'
                  default: return 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400'
                }
              } else {
                switch (color) {
                  case 'emerald': return 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                  case 'yellow': return 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
                  case 'amber': return 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                  case 'blue': return 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                  case 'gray': return 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30'
                  default: return 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30'
                }
              }
            }

            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as Category)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${getButtonColors()}`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>

        {/* Current category description - More compact */}
        <div className="relative mb-4 text-center">
          <h3 className="text-lg font-semibold text-white mb-1">
            {getCategoryTitle(activeCategory, currentData.length)}
          </h3>
          <p className="text-sm text-gray-400">
            {getCategoryDescription(activeCategory)}
          </p>
        </div>

        {/* Words grid - More compact, no horizontal scroll, scrollbar only when needed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6 max-h-[50vh] overflow-y-auto overflow-x-hidden">
          {currentData.map((item, index) => {
            // Determine color scheme based on category and points
            const getColorScheme = () => {
              if (item.category === 'perfect') {
                return {
                  card: 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30',
                  border: 'border-emerald-500/50',
                  accent: 'text-emerald-400',
                  points: 'text-emerald-400'
                }
              } else if (item.category === 'almost_there') {
                return {
                  card: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30',
                  border: 'border-yellow-500/50',
                  accent: 'text-yellow-400',
                  points: 'text-yellow-400'
                }
              } else if (item.category === 'good_try') {
                return {
                  card: 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30',
                  border: 'border-amber-500/50',
                  accent: 'text-amber-400',
                  points: 'text-amber-400'
                }
              } else {
                return {
                  card: 'bg-white/5 border-white/10 hover:bg-white/10',
                  border: 'border-white/10',
                  accent: 'text-gray-400',
                  points: 'text-gray-400'
                }
              }
            }

            const colors = getColorScheme()

            return (
              <div
                key={index}
                className={`p-3 ${colors.card} rounded-lg border ${colors.border} hover:shadow-md transition-all cursor-pointer`}
                onClick={() => onWordClick?.(item.prompt)}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-xs text-gray-400 mb-0.5">Word:</div>
                    <div className="text-sm font-semibold text-white mb-1.5 truncate break-words">{item.prompt}</div>
                    <div className="space-y-1">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-400">Your answer:</div>
                        <div className="text-xs font-medium text-white truncate break-words">{item.given || '—'}</div>
                      </div>
                      {item.category !== 'perfect' && (
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400">Correct:</div>
                          <div className="text-xs font-medium text-white truncate break-words">{item.expected}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.points > 0 && (
                    <div className="text-right shrink-0 flex-shrink-0">
                      <div className={`text-lg font-bold ${colors.points}`}>{item.points}</div>
                      <div className="text-xs text-gray-400">pts</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer - More compact */}
        <div className="relative pt-4 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-violet-400 hover:to-cyan-400 transition-all shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 text-sm"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  )
}
