'use client'

import { useState, useEffect } from 'react'
import { COLOR_GRIDS } from './ColorGridSelector'

export type GridConfig = {
  words: Array<{ en: string; sv: string }> | string[] // Support both word objects and strings for backward compatibility
  color: string
  index: number
}

interface GridConfigModalProps {
  wordSet: { id: string; title: string; words: Array<{ en: string; sv: string }> }
  onSave: (grids: GridConfig[]) => void
  onClose: () => void
  existingGrids?: GridConfig[] // Optional existing grid configuration
}

// Calculate word difficulty (same as QuizGame)
function calculateWordDifficulty(word: string, translation: string): number {
  let score = 0
  
  // Length factor (longer words are harder)
  score += word.length * 0.5
  score += translation.length * 0.5
  
  // Character complexity
  const complexChars = /[åäöéèüïñç]/gi
  score += (word.match(complexChars) || []).length * 2
  score += (translation.match(complexChars) || []).length * 2
  
  // Special characters and punctuation
  const specialChars = /[^a-zåäöéèüïñç\s]/gi
  score += (word.match(specialChars) || []).length * 1.5
  score += (translation.match(specialChars) || []).length * 1.5
  
  // Word frequency (common words are easier)
  const commonWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'en', 'ett', 'och', 'att', 'som', 'för', 'på', 'i', 'till', 'från', 'med', 'av'
  ])
  if (commonWords.has(word.toLowerCase()) || commonWords.has(translation.toLowerCase())) {
    score -= 10
  }
  
  // Phrase complexity (more words = harder)
  const wordCount = word.split(' ').length
  const translationCount = translation.split(' ').length
  score += (wordCount - 1) * 3
  score += (translationCount - 1) * 3
  
  return Math.max(0, score)
}

export default function GridConfigModal({ wordSet, onSave, onClose, existingGrids }: GridConfigModalProps) {
  const [placementMode, setPlacementMode] = useState<'automatic' | 'manual' | null>(null)
  const [grids, setGrids] = useState<GridConfig[]>([])
  const [selectedGridIndex, setSelectedGridIndex] = useState<number | null>(null)
  const [availableWords, setAvailableWords] = useState<Array<{ en: string; sv: string }>>([])
  const [availableWordsMap, setAvailableWordsMap] = useState<Map<string, { en: string; sv: string }>>(new Map())
  const [selectedWords, setSelectedWords] = useState<Array<{ en: string; sv: string }>>([])
  const [selectedColor, setSelectedColor] = useState<string>('')
  const wordsPerGrid = 6

  // Initialize available words from word set
  useEffect(() => {
    if (wordSet?.words) {
      const wordObjects = wordSet.words.map(w => 
        typeof w === 'string' ? { en: '', sv: w } : { en: (w as any).en || '', sv: (w as any).sv || '' }
      ).filter(w => w.sv || w.en)
      const wordsMap = new Map<string, { en: string; sv: string }>()
      wordObjects.forEach(w => {
        wordsMap.set(w.sv, w)
      })
      setAvailableWords(wordObjects)
      setAvailableWordsMap(wordsMap)
    }
  }, [wordSet])

  // Load existing grids if provided
  useEffect(() => {
    if (existingGrids && existingGrids.length > 0) {
      setGrids(existingGrids)
      setPlacementMode('manual') // Show existing configuration
    }
  }, [existingGrids])

  // Automatic placement: sort by difficulty and distribute into grids
  const handleAutomaticPlacement = () => {
    if (!wordSet?.words) return

    const wordsWithDifficulty = wordSet.words.map((w: any) => {
      const sv = typeof w === 'string' ? w : w.sv || ''
      const en = typeof w === 'string' ? '' : w.en || ''
      const difficulty = calculateWordDifficulty(sv, en)
      return { word: typeof w === 'string' ? { en: '', sv: w } : { en: w.en || '', sv: w.sv || '' }, translation: en, difficulty, originalWord: w }
    })

    // Sort by difficulty (easier first)
    wordsWithDifficulty.sort((a, b) => a.difficulty - b.difficulty)

    // Distribute into grids (6 words per grid)
    const newGrids: GridConfig[] = []
    const totalGrids = Math.ceil(wordsWithDifficulty.length / wordsPerGrid)

    for (let i = 0; i < totalGrids; i++) {
      const startIdx = i * wordsPerGrid
      const endIdx = Math.min(startIdx + wordsPerGrid, wordsWithDifficulty.length)
      const gridWords = wordsWithDifficulty.slice(startIdx, endIdx).map(w => w.word)
      
      // Assign color from COLOR_GRIDS
      const colorScheme = COLOR_GRIDS[i % COLOR_GRIDS.length]

      newGrids.push({
        words: gridWords,
        color: colorScheme.hex,
        index: i
      })
    }

    setGrids(newGrids)
    setPlacementMode('automatic')
  }

  // Manual placement: teacher selects words, color, and symbol for each grid
  const handleManualPlacement = () => {
    // Calculate number of grids needed
    const totalWords = wordSet?.words?.length || 0
    const totalGrids = Math.ceil(totalWords / wordsPerGrid)
    
    // Initialize empty grids
    const newGrids: GridConfig[] = []
    for (let i = 0; i < totalGrids; i++) {
      newGrids.push({
        words: [],
        color: COLOR_GRIDS[i % COLOR_GRIDS.length].hex,
        index: i
      })
    }
    
    setGrids(newGrids)
    setPlacementMode('manual')
  }

  // Handle grid selection for manual editing
  const handleGridClick = (gridIndex: number) => {
    setSelectedGridIndex(gridIndex)
    const grid = grids[gridIndex]
    // Handle both string arrays (backward compatibility) and word object arrays
    const words = grid.words.map(w => 
      typeof w === 'string' ? (availableWordsMap.get(w) || { en: '', sv: w }) : w
    ).filter(Boolean) as Array<{ en: string; sv: string }>
    setSelectedWords(words)
    setSelectedColor(grid.color)
  }

  // Toggle word selection
  const toggleWord = (word: { en: string; sv: string }) => {
    const isSelected = selectedWords.some(w => w.sv === word.sv && w.en === word.en)
    if (isSelected) {
      setSelectedWords(selectedWords.filter(w => !(w.sv === word.sv && w.en === word.en)))
    } else {
      if (selectedWords.length < wordsPerGrid) {
        setSelectedWords([...selectedWords, word])
      }
    }
  }

  // Save grid configuration
  const handleSaveGrid = () => {
    if (selectedGridIndex === null) return
    if (selectedWords.length === 0) {
      alert('Please select at least one word for this grid')
      return
    }
    if (!selectedColor) {
      alert('Please select a color')
      return
    }

    const updatedGrids = [...grids]
    updatedGrids[selectedGridIndex] = {
      words: selectedWords,
      color: selectedColor,
      index: selectedGridIndex
    }
    setGrids(updatedGrids)
    setSelectedGridIndex(null)
    setSelectedWords([])
    setSelectedColor('')
  }

  // Final save
  const handleFinalSave = () => {
    // Validate all grids are filled
    const emptyGrids = grids.filter(g => g.words.length === 0)
    if (emptyGrids.length > 0) {
      alert(`Please fill all grids. ${emptyGrids.length} grid(s) are empty.`)
      return
    }

    onSave(grids)
  }

  // Mode selection screen
  if (placementMode === null) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="rounded-2xl p-8 max-w-2xl w-full text-center shadow-2xl relative bg-[#161622] border border-white/[0.12]">
          {/* Top Progress Bar */}
          <div className="h-1 rounded-md mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="mb-8">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold mb-2 text-white">Configure Grid Layout</h2>
            <p className="text-gray-400 text-sm mb-6">Choose how to organize words into color grids</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleAutomaticPlacement}
              className="group p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="text-5xl mb-3">⚡</div>
              <h3 className="text-xl font-bold mb-2 text-white">Automatic</h3>
              <p className="text-gray-400 text-sm">
                System automatically sorts words by difficulty (easier first) and assigns them to grids
              </p>
            </button>

            <button
              onClick={handleManualPlacement}
              className="group p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="text-5xl mb-3">✏️</div>
              <h3 className="text-xl font-bold mb-2 text-white">Manual</h3>
              <p className="text-gray-400 text-sm">
                Manually select which words go in each grid, choose colors and symbols
              </p>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Manual editing screen
  if (placementMode === 'manual' && selectedGridIndex !== null) {
    const usedWords: Array<{ en: string; sv: string }> = []
    grids.forEach(g => {
      g.words.forEach(w => {
        if (typeof w === 'string') {
          usedWords.push({ en: '', sv: w })
        } else {
          usedWords.push(w)
        }
      })
    })
    const usedWordsSet = new Set(usedWords.map(w => `${w.en}:${w.sv}`))
    const unusedWords = availableWords.filter(w => {
      const key = `${w.en}:${w.sv}`
      const isUsed = usedWordsSet.has(key)
      const isSelected = selectedWords.some(sw => sw.en === w.en && sw.sv === w.sv)
      return !isUsed || isSelected
    })

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="rounded-2xl p-8 max-w-4xl w-full shadow-2xl relative bg-[#161622] border border-white/[0.12] my-8">
          {/* Top Progress Bar */}
          <div className="h-1 rounded-md mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2 text-white">Configure Grid {selectedGridIndex + 1}</h2>
            <p className="text-gray-400 text-sm">Select words and color for this grid</p>
          </div>

          {/* Word Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-white">Select Words ({selectedWords.length}/{wordsPerGrid})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-4 border border-white/10 rounded-lg bg-white/5">
              {unusedWords.map((word, idx) => {
                const isSelected = selectedWords.some(w => w.sv === word.sv && w.en === word.en)
                return (
                  <button
                    key={`${word.en}-${word.sv}-${idx}`}
                    onClick={() => toggleWord(word)}
                    className={`p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <div className="font-semibold">{word.sv}</div>
                    {word.en && <div className="text-xs text-gray-500">{word.en}</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-white">Select Color</h3>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {COLOR_GRIDS.map((scheme, idx) => (
                <button
                  key={scheme.id}
                  onClick={() => setSelectedColor(scheme.hex)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedColor === scheme.hex
                      ? 'border-white scale-110 ring-2 ring-white/50'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: scheme.hex }}
                  title={scheme.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
            onClick={() => {
              setSelectedGridIndex(null)
              setSelectedWords([])
              setSelectedColor('')
            }}
              className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGrid}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Save Grid
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Grid overview screen (automatic or manual preview)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="rounded-2xl p-8 max-w-6xl w-full shadow-2xl relative bg-[#161622] border border-white/[0.12] my-8">
        {/* Top Progress Bar */}
        <div className="h-1 rounded-md mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-white">
            {placementMode === 'automatic' ? 'Automatic Grid Layout' : 'Manual Grid Layout'}
          </h2>
          <p className="text-gray-400 text-sm">
            {placementMode === 'automatic' 
              ? 'Words have been sorted by difficulty and assigned to grids'
              : 'Click on a grid to edit it'}
          </p>
        </div>

        {/* Grids Display */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {grids.map((grid, idx) => (
            <div
              key={idx}
              onClick={() => placementMode === 'manual' && handleGridClick(idx)}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                placementMode === 'manual'
                  ? 'hover:scale-105 hover:shadow-lg cursor-pointer'
                  : ''
              } ${
                grid.words.length === 0
                  ? 'border-dashed border-white/20 bg-white/5'
                  : 'border-white/30'
              }`}
              style={{ backgroundColor: grid.words.length > 0 ? `${grid.color}20` : undefined }}
            >
              <div className="text-center mb-2">
                <div className="text-xs font-semibold text-gray-300">Grid {idx + 1}</div>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {grid.words.length} / {wordsPerGrid} words
              </div>
              {grid.words.length > 0 && (
                <div className="text-xs text-gray-300 space-y-1">
                  {grid.words.slice(0, 3).map((word, i) => {
                    const w = typeof word === 'string' ? { en: '', sv: word } : word
                    return (
                      <div key={i} className="truncate">
                        {w.sv}{w.en && ` (${w.en})`}
                      </div>
                    )
                  })}
                  {grid.words.length > 3 && (
                    <div className="text-gray-500">+{grid.words.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setPlacementMode(null)
              setGrids([])
              setSelectedGridIndex(null)
            }}
            className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleFinalSave}
            disabled={grids.some(g => g.words.length === 0)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}

