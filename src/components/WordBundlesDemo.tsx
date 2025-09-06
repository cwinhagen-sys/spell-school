'use client'

import { useState } from 'react'
import { BookOpen, Play } from 'lucide-react'

interface WordBundle {
  id: string
  category: string
  title: string
  description: string
  words: Array<{ en: string; sv: string; image_url?: string }>
  color: string
}

interface WordBundlesDemoProps {
  onStartGame: (bundle: WordBundle, gameType: string) => void
}

export default function WordBundlesDemo({ onStartGame }: WordBundlesDemoProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedBundle, setSelectedBundle] = useState<WordBundle | null>(null)
  const [showGameSelection, setShowGameSelection] = useState(false)

  // Demo bundles without images
  const demoBundles: WordBundle[] = [
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

  const handleBundleClick = (bundle: WordBundle) => {
    setSelectedBundle(bundle)
    setShowGameSelection(true)
  }

  const handleGameSelect = (gameType: string) => {
    if (selectedBundle) {
      onStartGame(selectedBundle, gameType)
    }
  }

  const handleCloseGameSelection = () => {
    setShowGameSelection(false)
    setSelectedBundle(null)
  }

  const groupedBundles = demoBundles.reduce((acc, bundle) => {
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

  const gameTypes = [
    { id: 'flashcards', name: 'Flashcards', icon: '🃏', description: 'Learn with visual cards' },
    { id: 'match', name: 'Word Match', icon: '🔗', description: 'Match English and Swedish' },
    { id: 'typing', name: 'Typing Challenge', icon: '⌨️', description: 'Type the translations' },
    { id: 'translate', name: 'Translation', icon: '🔄', description: 'Translate sentences' }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Word Bundles</h2>
        <p className="text-gray-300 mb-4">Practice with predefined vocabulary sets</p>
        <div className="mt-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg inline-block">
          <span className="text-yellow-200 text-sm">📚 Bundle games give 50% points</span>
        </div>
      </div>

              <div className="space-y-3">
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
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${categoryColors[category] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{category}</h3>
                    <p className="text-gray-400">{categoryBundles.length} bundles available</p>
                  </div>
                </div>
                {expandedCategories.has(category) ? (
                  <span className="text-gray-400">▼</span>
                ) : (
                  <span className="text-gray-400">▶</span>
                )}
              </div>
            </button>

            {expandedCategories.has(category) && (
              <div className="px-6 pb-6 pt-3">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryBundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      onClick={() => handleBundleClick(bundle)}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors mb-1">
                            {bundle.title}
                          </h4>
                          <p className="text-sm text-gray-400 mb-2">{bundle.description}</p>
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full ml-2" 
                          style={{ backgroundColor: bundle.color }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">
                          {bundle.words.length} words
                        </span>
                        <Play className="w-4 h-4 text-gray-400 group-hover:text-blue-300 transition-colors" />
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
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Choose Game Type</h3>
                <button
                  onClick={handleCloseGameSelection}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-400 mt-2">Select how you want to practice with "{selectedBundle.title}"</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameTypes.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameSelect(game.id)}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{game.icon}</span>
                      <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {game.name}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-400">{game.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}