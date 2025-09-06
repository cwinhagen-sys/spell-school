'use client'

import { useState, useEffect } from 'react'
import { BookOpen, X, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

interface WordBundle {
  id: string
  category: string
  title: string
  description: string
  words: Array<{ en: string; sv: string; image_url?: string }>
  color: string
}

interface BundleSelectorProps {
  onBundleSelect: (bundle: WordBundle | null) => void
  selectedBundle: WordBundle | null
}

export default function BundleSelector({ onBundleSelect, selectedBundle }: BundleSelectorProps) {
  const [showModal, setShowModal] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [bundles, setBundles] = useState<WordBundle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch bundles from API
  useEffect(() => {
    const fetchBundles = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/word-bundles')
        if (!response.ok) {
          throw new Error('Failed to fetch word bundles')
        }
        const data = await response.json()
        setBundles(data.bundles || [])
      } catch (err) {
        console.error('Error fetching bundles:', err)
        setError('Failed to load word bundles')
        // Fallback to demo bundles
        setBundles(getDemoBundles())
      } finally {
        setLoading(false)
      }
    }

    fetchBundles()
  }, [])

  // Demo bundles as fallback
  const getDemoBundles = (): WordBundle[] => [
    {
      id: '1',
      category: 'Places',
      title: 'Classroom',
      description: 'Essential classroom vocabulary',
      color: '#3B82F6',
      words: [
        { en: 'desk', sv: 'skrivbord' },
        { en: 'chair', sv: 'stol' },
        { en: 'blackboard', sv: 'svart tavla' },
        { en: 'pencil', sv: 'penna' },
        { en: 'eraser', sv: 'suddgummi' },
        { en: 'notebook', sv: 'anteckningsbok' },
        { en: 'ruler', sv: 'linjal' },
        { en: 'teacher', sv: 'lärare' },
        { en: 'student', sv: 'elev' },
        { en: 'bag', sv: 'väska' }
      ]
    },
    {
      id: '2',
      category: 'Places',
      title: 'Garden',
      description: 'Garden and nature vocabulary',
      color: '#10B981',
      words: [
        { en: 'flower', sv: 'blomma' },
        { en: 'tree', sv: 'träd' },
        { en: 'grass', sv: 'gräs' },
        { en: 'bush', sv: 'buske' },
        { en: 'watering can', sv: 'vattningskanna' },
        { en: 'shovel', sv: 'spade' },
        { en: 'butterfly', sv: 'fjäril' },
        { en: 'bee', sv: 'bi' },
        { en: 'bird', sv: 'fågel' },
        { en: 'sun', sv: 'sol' }
      ]
    },
    {
      id: '3',
      category: 'Food & Drinks',
      title: 'Fruits',
      description: 'Delicious fruits vocabulary',
      color: '#F59E0B',
      words: [
        { en: 'apple', sv: 'äpple' },
        { en: 'banana', sv: 'banan' },
        { en: 'orange', sv: 'apelsin' },
        { en: 'pear', sv: 'päron' },
        { en: 'grapes', sv: 'druvor' },
        { en: 'watermelon', sv: 'vattenmelon' },
        { en: 'strawberry', sv: 'jordgubbe' },
        { en: 'lemon', sv: 'citron' },
        { en: 'cherry', sv: 'körsbär' },
        { en: 'mango', sv: 'mango' }
      ]
    },
    {
      id: '4',
      category: 'Food & Drinks',
      title: 'Vegetables',
      description: 'Healthy vegetables vocabulary',
      color: '#10B981',
      words: [
        { en: 'carrot', sv: 'morot' },
        { en: 'potato', sv: 'potatis' },
        { en: 'tomato', sv: 'tomat' },
        { en: 'cucumber', sv: 'gurka' },
        { en: 'lettuce', sv: 'sallad' },
        { en: 'onion', sv: 'lök' },
        { en: 'broccoli', sv: 'broccoli' },
        { en: 'corn', sv: 'majs' },
        { en: 'pea', sv: 'ärt' },
        { en: 'pepper', sv: 'peppar' }
      ]
    },
    {
      id: '5',
      category: 'Animals',
      title: 'Pets',
      description: 'Cute pet animals vocabulary',
      color: '#8B5CF6',
      words: [
        { en: 'dog', sv: 'hund' },
        { en: 'cat', sv: 'katt' },
        { en: 'rabbit', sv: 'kanin' },
        { en: 'hamster', sv: 'hamster' },
        { en: 'guinea pig', sv: 'marsvin' },
        { en: 'fish', sv: 'fisk' },
        { en: 'turtle', sv: 'sköldpadda' },
        { en: 'parrot', sv: 'papegoja' },
        { en: 'canary', sv: 'kanariefågel' },
        { en: 'snake', sv: 'orm' }
      ]
    },
    {
      id: '6',
      category: 'Animals',
      title: 'Farm Animals',
      description: 'Farm and countryside animals',
      color: '#10B981',
      words: [
        { en: 'cow', sv: 'ko' },
        { en: 'pig', sv: 'gris' },
        { en: 'sheep', sv: 'får' },
        { en: 'goat', sv: 'get' },
        { en: 'horse', sv: 'häst' },
        { en: 'chicken', sv: 'höna' },
        { en: 'duck', sv: 'anka' },
        { en: 'goose', sv: 'gås' },
        { en: 'donkey', sv: 'åsna' },
        { en: 'turkey', sv: 'kalkon' }
      ]
    }
  ]

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleBundleSelect = (bundle: WordBundle) => {
    onBundleSelect(bundle)
    setShowModal(false)
  }

  const handleClearBundle = () => {
    onBundleSelect(null)
  }

  const groupedBundles = bundles.reduce((acc, bundle) => {
    if (!acc[bundle.category]) {
      acc[bundle.category] = []
    }
    acc[bundle.category].push(bundle)
    return acc
  }, {} as Record<string, WordBundle[]>)

  const categoryColors: Record<string, string> = {
    'Places': 'from-blue-500 to-indigo-600',
    'Food & Drinks': 'from-orange-500 to-red-500',
    'Animals': 'from-green-500 to-emerald-600',
    'People': 'from-purple-500 to-pink-500',
    'Clothes': 'from-pink-500 to-rose-500',
    'Nature': 'from-green-400 to-teal-500',
    'Transport': 'from-gray-500 to-slate-600',
    'Everyday life': 'from-yellow-500 to-orange-500',
    'Verbs': 'from-indigo-500 to-purple-600',
    'Adjectives': 'from-cyan-500 to-blue-500'
  }

  return (
    <>
      {/* Bundle Selection Button */}
      <div className="flex items-center gap-2">
        {selectedBundle ? (
          <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selectedBundle.color }}
            />
            <span className="text-purple-200 text-sm font-medium">
              {selectedBundle.title}
            </span>
            <button
              onClick={handleClearBundle}
              className="text-purple-300 hover:text-purple-200 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm">Select Bundle</span>
          </button>
        )}
      </div>

      {/* Bundle Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Select Word Bundle</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-400 mt-2">Choose a bundle to practice with (50% points)</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="ml-2 text-gray-400">Loading word bundles...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-2">{error}</p>
                  <p className="text-gray-400 text-sm">Using demo bundles as fallback</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedBundles).map(([category, categoryBundles]) => (
                  <div key={category} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`w-full p-4 text-left transition-colors ${
                        expandedCategories.has(category) 
                          ? 'bg-white/10' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${categoryColors[category] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                            <BookOpen className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{category}</h4>
                            <p className="text-sm text-gray-400">{categoryBundles.length} bundles</p>
                          </div>
                        </div>
                        {expandedCategories.has(category) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedCategories.has(category) && (
                      <div className="px-4 pb-4 pt-2">
                        <div className="grid md:grid-cols-2 gap-3">
                          {categoryBundles.map((bundle) => (
                            <button
                              key={bundle.id}
                              onClick={() => handleBundleSelect(bundle)}
                              className="text-left p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h5 className="font-medium text-white group-hover:text-blue-300 transition-colors">
                                    {bundle.title}
                                  </h5>
                                  <p className="text-xs text-gray-400 mt-1">{bundle.description}</p>
                                </div>
                                <div 
                                  className="w-2 h-2 rounded-full ml-2" 
                                  style={{ backgroundColor: bundle.color }}
                                />
                              </div>
                              <div className="text-xs text-gray-300">
                                {bundle.words.length} words
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}