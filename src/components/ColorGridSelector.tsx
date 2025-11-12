'use client'

import { useState } from 'react'

// Enhanced color schemes - stronger and more differentiated colors
export const COLOR_GRIDS = [
  { 
    id: 'green', 
    name: 'Green', 
    bg: 'bg-green-100', 
    border: 'border-green-400', 
    text: 'text-green-900', 
    accent: 'text-green-700', 
    button: 'bg-green-500', 
    buttonHover: 'hover:bg-green-600',
    badge: 'bg-green-300',
    hex: '#22C55E',
    emoji: '🟢'
  },
  { 
    id: 'emerald', 
    name: 'Emerald', 
    bg: 'bg-emerald-100', 
    border: 'border-emerald-400', 
    text: 'text-emerald-900', 
    accent: 'text-emerald-700', 
    button: 'bg-emerald-500', 
    buttonHover: 'hover:bg-emerald-600',
    badge: 'bg-emerald-300',
    hex: '#10B981',
    emoji: '💚'
  },
  { 
    id: 'teal', 
    name: 'Teal', 
    bg: 'bg-teal-100', 
    border: 'border-teal-400', 
    text: 'text-teal-900', 
    accent: 'text-teal-700', 
    button: 'bg-teal-500', 
    buttonHover: 'hover:bg-teal-600',
    badge: 'bg-teal-300',
    hex: '#14B8A6',
    emoji: '🔷'
  },
  { 
    id: 'cyan', 
    name: 'Cyan', 
    bg: 'bg-cyan-100', 
    border: 'border-cyan-400', 
    text: 'text-cyan-900', 
    accent: 'text-cyan-700', 
    button: 'bg-cyan-500', 
    buttonHover: 'hover:bg-cyan-600',
    badge: 'bg-cyan-300',
    hex: '#06B6D4',
    emoji: '🔵'
  },
  { 
    id: 'blue', 
    name: 'Blue', 
    bg: 'bg-blue-100', 
    border: 'border-blue-500', 
    text: 'text-blue-900', 
    accent: 'text-blue-700', 
    button: 'bg-blue-600', 
    buttonHover: 'hover:bg-blue-700',
    badge: 'bg-blue-400',
    hex: '#3B82F6',
    emoji: '🔵'
  },
  { 
    id: 'indigo', 
    name: 'Indigo', 
    bg: 'bg-indigo-100', 
    border: 'border-indigo-500', 
    text: 'text-indigo-900', 
    accent: 'text-indigo-700', 
    button: 'bg-indigo-600', 
    buttonHover: 'hover:bg-indigo-700',
    badge: 'bg-indigo-400',
    hex: '#6366F1',
    emoji: '💙'
  },
  { 
    id: 'purple', 
    name: 'Purple', 
    bg: 'bg-purple-100', 
    border: 'border-purple-500', 
    text: 'text-purple-900', 
    accent: 'text-purple-700', 
    button: 'bg-purple-600', 
    buttonHover: 'hover:bg-purple-700',
    badge: 'bg-purple-400',
    hex: '#9333EA',
    emoji: '💜'
  },
  { 
    id: 'orange', 
    name: 'Orange', 
    bg: 'bg-orange-100', 
    border: 'border-orange-500', 
    text: 'text-orange-900', 
    accent: 'text-orange-700', 
    button: 'bg-orange-500', 
    buttonHover: 'hover:bg-orange-600',
    badge: 'bg-orange-400',
    hex: '#F97316',
    emoji: '🟠'
  },
  { 
    id: 'amber', 
    name: 'Amber', 
    bg: 'bg-amber-100', 
    border: 'border-amber-500', 
    text: 'text-amber-900', 
    accent: 'text-amber-700', 
    button: 'bg-amber-500', 
    buttonHover: 'hover:bg-amber-600',
    badge: 'bg-amber-400',
    hex: '#F59E0B',
    emoji: '🟡'
  },
  { 
    id: 'yellow', 
    name: 'Yellow', 
    bg: 'bg-yellow-100', 
    border: 'border-yellow-500', 
    text: 'text-yellow-900', 
    accent: 'text-yellow-700', 
    button: 'bg-yellow-500', 
    buttonHover: 'hover:bg-yellow-600',
    badge: 'bg-yellow-400',
    hex: '#EAB308',
    emoji: '⭐'
  }
]

export type GridConfig = {
  words: string[] | Array<{ en: string; sv: string }>
  color: string
  index: number
}

interface ColorGridSelectorProps {
  words: string[]
  translations: { [key: string]: string }
  onSelect: (selectedGrids: Array<{ words: string[]; translations: { [key: string]: string }; colorScheme: typeof COLOR_GRIDS[0] }>) => void
  onClose?: () => void
  minGrids?: number
  maxGrids?: number
  wordsPerGrid?: number
  title?: string
  description?: string
  gridConfig?: GridConfig[] // Optional grid configuration from teacher
}

export default function ColorGridSelector({ 
  words, 
  translations, 
  onSelect, 
  onClose, 
  minGrids = 1, 
  maxGrids = 10,
  wordsPerGrid = 6,
  title = 'Select Color Grids',
  description = 'Choose which color grids you want to practice with',
  gridConfig
}: ColorGridSelectorProps) {
  const [selectedGridIndices, setSelectedGridIndices] = useState<Set<number>>(new Set([0])) // Default to first grid

  // Use grid configuration if provided, otherwise use default splitting
  const colorGrids = gridConfig && gridConfig.length > 0
    ? gridConfig.map((config, idx) => {
        const colorScheme = COLOR_GRIDS.find(c => c.hex === config.color) || COLOR_GRIDS[idx % COLOR_GRIDS.length]
        const gridTranslations: { [key: string]: string } = {}
        
        config.words.forEach((word: any) => {
          if (typeof word === 'object' && word.en && word.sv) {
            gridTranslations[word.en.toLowerCase()] = word.sv
            gridTranslations[word.sv.toLowerCase()] = word.en
          } else if (typeof word === 'string') {
            const tr = translations[word.toLowerCase()] || ''
            if (tr) {
              gridTranslations[word.toLowerCase()] = tr
              gridTranslations[tr.toLowerCase()] = word
            }
          }
        })
        
        return {
          colorScheme,
          words: config.words.map((w: any) => typeof w === 'string' ? w : (w.sv || w.en || '')),
          translations: gridTranslations,
          wordCount: config.words.length
        }
      })
    : COLOR_GRIDS.map((colorScheme, idx) => {
        const startIdx = idx * wordsPerGrid
        const endIdx = Math.min(startIdx + wordsPerGrid, words.length)
        const gridWords = words.slice(startIdx, endIdx)
        const gridTranslations: { [key: string]: string } = {}
        
        gridWords.forEach(word => {
          if (translations[word?.toLowerCase()]) {
            gridTranslations[word.toLowerCase()] = translations[word.toLowerCase()]
          }
        })
        
        return {
          colorScheme,
          words: gridWords,
          translations: gridTranslations,
          wordCount: gridWords.length
        }
      }).filter(grid => grid.wordCount > 0) // Only include grids with words

  const handleToggleGrid = (idx: number) => {
    setSelectedGridIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        // Always allow deselection - user can deselect all if they want
        next.delete(idx)
        return next
      }

      if (maxGrids === 1) {
        // Replace the existing selection when only one grid is allowed
        return new Set([idx])
      }

      // Only check maxGrids, not minGrids (minGrids is just for starting)
      if (!maxGrids || next.size < maxGrids) {
        next.add(idx)
      }
      return next
    })
  }

  const handleStart = () => {
    const selectedGrids = Array.from(selectedGridIndices)
      .sort((a, b) => a - b)
      .map(idx => colorGrids[idx])
      .filter(Boolean)
    
    if (selectedGrids.length >= minGrids && selectedGrids.length <= maxGrids) {
      onSelect(selectedGrids.map(grid => ({
        words: grid.words,
        translations: grid.translations,
        colorScheme: grid.colorScheme
      })))
    }
  }

  const selectedCount = selectedGridIndices.size
  const canStart = selectedCount >= minGrids && (!maxGrids || selectedCount <= maxGrids)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative bg-white text-gray-800 border border-gray-200">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
              <p className="text-gray-600 text-sm">{description}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Grid Selection - Same design as word set modal, all on one row */}
        <div className="flex-1 overflow-hidden px-6 py-6 flex items-center justify-center">
          <div className="flex gap-3 w-full justify-center overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {colorGrids.map((grid, idx) => {
              const isSelected = selectedGridIndices.has(idx)
              const isAtCapacity = maxGrids ? selectedGridIndices.size >= maxGrids : false
              const isDisabled = !isSelected && isAtCapacity && maxGrids !== 1
              const colorHex = grid.colorScheme?.hex || COLOR_GRIDS[idx % COLOR_GRIDS.length].hex
              
              return (
                <button
                  key={idx}
                  onClick={() => handleToggleGrid(idx)}
                  disabled={isDisabled}
                  className={`
                    relative w-16 h-16 rounded-xl transition-all transform flex-shrink-0
                    ${isSelected 
                      ? 'shadow-lg scale-110' 
                      : 'opacity-60 hover:opacity-90 hover:scale-105'
                    }
                    ${isDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
                  `}
                  style={{
                    backgroundColor: colorHex,
                    border: isSelected 
                      ? `4px solid white`
                      : '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: isSelected 
                      ? `0 10px 25px -5px ${colorHex}40, 0 0 0 4px white, 0 0 0 8px ${colorHex}30, inset 0 2px 4px rgba(0,0,0,0.1)`
                      : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Grid number */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-white/90 text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                    {idx + 1}
                  </div>
                  
                  {/* Selection indicator - checkmark */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between flex-shrink-0 pt-4 mt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedCount} block{selectedCount !== 1 ? 's' : ''} selected{maxGrids && ` / ${maxGrids} max`}
          </div>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 shadow-lg
                ${canStart 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <span>Start Game</span>
              {canStart && <span>→</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

