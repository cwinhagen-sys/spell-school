'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Star, Play, ChevronRight, ChevronDown } from 'lucide-react'

interface WordBundle {
  id: string
  category: string
  title: string
  description: string
  words: Array<{ en: string; sv: string; image_url?: string }>
  color: string
}

interface WordBundlesProps {
  onStartGame: (bundle: WordBundle, gameType: string) => void
}

export default function WordBundles({ onStartGame }: WordBundlesProps) {
  const [bundles, setBundles] = useState<WordBundle[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedBundle, setSelectedBundle] = useState<WordBundle | null>(null)
  const [showGameSelection, setShowGameSelection] = useState(false)

  useEffect(() => {
    loadBundles()
  }, [])

  const loadBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('word_bundles')
        .select('*')
        .eq('is_predefined', true)
        .order('category, title')

      if (error) {
        console.error('Error loading word bundles:', error)
        // If table doesn't exist, show message
        if (error.message.includes('relation "word_bundles" does not exist')) {
          setBundles([])
          return
        }
        throw error
      }
      setBundles(data || [])
    } catch (error) {
      console.error('Error loading word bundles:', error)
      setBundles([])
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleBundleClick = (bundle: WordBundle) => {
    setSelectedBundle(bundle)
    setShowGameSelection(true)
  }

  const startGame = (gameType: string) => {
    if (selectedBundle) {
      onStartGame(selectedBundle, gameType)
      setShowGameSelection(false)
      setSelectedBundle(null)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (bundles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Word Bundles Not Available</h3>
        <p className="text-gray-300 mb-4">
          The word bundles database table needs to be set up first.
        </p>
        <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-blue-200 text-sm">
            <strong>Setup required:</strong> Run the SQL script in Supabase to create the word_bundles table.
          </p>
          <p className="text-blue-300 text-xs mt-2">
            See WORD_BUNDLES_SETUP.md for instructions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Word Bundles</h2>
        <p className="text-gray-300">Practice with predefined vocabulary sets</p>
        <div className="mt-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg inline-block">
          <span className="text-yellow-200 text-sm">📚 Bundle games give 50% points</span>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedBundles).map(([category, categoryBundles]) => (
          <div key={category} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className={`w-full p-6 text-left transition-colors ${
                expandedCategories.has(category) 
                  ? 'bg-white/10' 
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${categoryColors[category] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{category}</h3>
                    <p className="text-gray-400">{categoryBundles.length} bundles available</p>
                  </div>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-6 h-6 text-gray-400" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </button>

            {expandedCategories.has(category) && (
              <div className="px-6 pb-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryBundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      onClick={() => handleBundleClick(bundle)}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                            {bundle.title}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">{bundle.description}</p>
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full ml-2" 
                          style={{ backgroundColor: bundle.color }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-300">
                          {bundle.words.length} words
                        </div>
                        <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-300">
                          <Play className="w-4 h-4" />
                          <span className="text-sm font-medium">Play</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {bundle.words.slice(0, 4).map((word, index) => (
                          <span
                            key={index}
                            className="text-xs bg-white/10 text-white px-2 py-1 rounded-full"
                          >
                            {word.en}
                          </span>
                        ))}
                        {bundle.words.length > 4 && (
                          <span className="text-xs text-gray-400 px-2 py-1">
                            +{bundle.words.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Game Selection Modal */}
      {showGameSelection && selectedBundle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Choose a game for "{selectedBundle.title}"
            </h3>
            <p className="text-gray-400 mb-6">
              Practice with {selectedBundle.words.length} words
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startGame('flashcards')}
                className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🎴</div>
                  <div className="font-medium">Flashcards</div>
                </div>
              </button>
              
              <button
                onClick={() => startGame('match')}
                className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🧩</div>
                  <div className="font-medium">Match</div>
                </div>
              </button>
              
              <button
                onClick={() => startGame('typing')}
                className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">⌨️</div>
                  <div className="font-medium">Typing</div>
                </div>
              </button>
              
              <button
                onClick={() => startGame('translate')}
                className="p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="font-medium">Translate</div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowGameSelection(false)}
              className="w-full mt-4 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
