'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'

interface WordSelectorProps {
  words: string[]
  onWordsSelected: (selectedWords: string[]) => void
  onClose: () => void
  themeColor?: string
}

export default function WordSelector({ words, onWordsSelected, onClose, themeColor }: WordSelectorProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [shuffledWords, setShuffledWords] = useState<string[]>([])

  // Shuffle words on mount
  useEffect(() => {
    const shuffle = (arr: string[]) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    setShuffledWords(shuffle(words))
  }, [words])

  const toggleWord = (word: string) => {
    setSelectedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word)
      } else if (prev.length < 8) {
        return [...prev, word]
      }
      return prev
    })
  }

  const handleStart = () => {
    if (selectedWords.length >= 1) {
      onWordsSelected(selectedWords)
    }
  }

  const canStart = selectedWords.length >= 1 && selectedWords.length <= 8
  const isManyWords = selectedWords.length >= 6

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl relative bg-white text-gray-800 border border-gray-200">
        {themeColor && <div className="h-1 rounded-md mb-4" style={{ backgroundColor: themeColor }}></div>}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Välj ord</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-2xl">×</button>
        </div>

        {/* Warning for many words */}
        {isManyWords && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Du har valt många ord ({selectedWords.length}/8). Detta kan ta längre tid att generera.
            </p>
          </div>
        )}

        {/* Word Grid */}
        <div className="mb-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {shuffledWords.map((word, index) => {
              const isSelected = selectedWords.includes(word)
              const isDisabled = !isSelected && selectedWords.length >= 8
              
              return (
                <button
                  key={`word-${word}-${index}`}
                  onClick={() => toggleWord(word)}
                  disabled={isDisabled}
                  className={`
                    px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                    ${isSelected 
                      ? 'bg-blue-600 text-white border-2 border-blue-600' 
                      : isDisabled
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                    }
                  `}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                  {word}
                </button>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Avbryt
          </button>
          
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`
              px-8 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${canStart 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Check className="w-4 h-4" />
            Starta ({selectedWords.length} ord)
          </button>
        </div>
      </div>
    </div>
  )
}
