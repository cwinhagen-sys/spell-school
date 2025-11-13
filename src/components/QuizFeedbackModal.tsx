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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[1000]">
      <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header with celebration message */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Great! You learned {learnedCount} new words this week!
          </h2>
          <p className="text-lg text-gray-600">
            Keep up the amazing work! Every word you learn brings you closer to fluency.
          </p>
        </div>

        {/* Category buttons */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
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
                  case 'emerald': return 'bg-emerald-600 text-white shadow-lg'
                  case 'yellow': return 'bg-yellow-500 text-white shadow-lg'
                  case 'amber': return 'bg-amber-500 text-white shadow-lg'
                  case 'blue': return 'bg-blue-600 text-white shadow-lg'
                  case 'gray': return 'bg-gray-600 text-white shadow-lg'
                  default: return 'bg-blue-600 text-white shadow-lg'
                }
              } else {
                switch (color) {
                  case 'emerald': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  case 'yellow': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  case 'amber': return 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  case 'blue': return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  case 'gray': return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              }
            }

            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as Category)}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${getButtonColors()}`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>

        {/* Current category description */}
        <div className="mb-6 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {getCategoryTitle(activeCategory, currentData.length)}
          </h3>
          <p className="text-gray-600">
            {getCategoryDescription(activeCategory)}
          </p>
        </div>

        {/* Words grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {currentData.map((item, index) => {
            // Determine color scheme based on category and points
            const getColorScheme = () => {
              if (item.category === 'perfect') {
                return {
                  card: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
                  border: 'border-emerald-300',
                  accent: 'text-emerald-700',
                  points: 'text-emerald-600'
                }
              } else if (item.category === 'almost_there') {
                return {
                  card: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
                  border: 'border-yellow-300',
                  accent: 'text-yellow-700',
                  points: 'text-yellow-600'
                }
              } else if (item.category === 'good_try') {
                return {
                  card: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
                  border: 'border-amber-300',
                  accent: 'text-amber-700',
                  points: 'text-amber-600'
                }
              } else {
                return {
                  card: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
                  border: 'border-gray-300',
                  accent: 'text-gray-700',
                  points: 'text-gray-600'
                }
              }
            }

            const colors = getColorScheme()

            return (
              <div
                key={index}
                className={`p-4 ${colors.card} rounded-xl border-2 ${colors.border} hover:shadow-md transition-all cursor-pointer`}
                onClick={() => onWordClick?.(item.prompt)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Word:</div>
                    <div className="text-lg font-semibold text-gray-800 mb-2">{item.prompt}</div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="text-sm text-gray-600">Your answer:</div>
                        <div className="font-medium text-gray-800">{item.given || '—'}</div>
                      </div>
                      {item.category !== 'perfect' && (
                        <div>
                          <div className="text-sm text-gray-600">Correct answer:</div>
                          <div className="font-medium text-gray-800">{item.expected}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.points > 0 && (
                    <div className="ml-4 text-right">
                      <div className={`text-2xl font-bold ${colors.points}`}>{item.points}</div>
                      <div className="text-sm text-gray-600">points</div>
                    </div>
                  )}
                </div>
                
                {/* Feedback text removed - only show categorization */}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 text-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  )
}
