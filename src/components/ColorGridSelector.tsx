'use client'

import { useState } from 'react'
import { X, Sparkles, Play } from 'lucide-react'

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
  title = 'Välj färgblock',
  description = 'Välj vilka färgblock du vill träna med',
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="relative rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{title}</h2>
                  <p className="text-gray-400 text-sm">{description}</p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Grid Selection */}
          <div className="flex-1 overflow-visible px-2 py-8 flex items-center justify-center">
            <div className="flex gap-5 w-full justify-center overflow-x-auto pt-3 pb-4 px-4" style={{ scrollbarWidth: 'thin' }}>
              {colorGrids.map((grid, idx) => {
                const isSelected = selectedGridIndices.has(idx)
                const isAtCapacity = maxGrids ? selectedGridIndices.size >= maxGrids : false
                const isDisabled = !isSelected && isAtCapacity && maxGrids !== 1
                const colorHex = grid.colorScheme?.hex || COLOR_GRIDS[idx % COLOR_GRIDS.length].hex
                
                return (
                  <div key={idx} className="relative flex-shrink-0 pt-2">
                    <button
                      onClick={() => handleToggleGrid(idx)}
                      disabled={isDisabled}
                      className={`
                        relative w-12 h-12 rounded-xl transition-all transform group
                        ${isSelected 
                          ? 'scale-110 ring-2 ring-white/70' 
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }
                        ${isDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
                      `}
                      style={{
                        backgroundColor: colorHex,
                        boxShadow: isSelected 
                          ? `0 0 20px ${colorHex}60, 0 6px 25px -6px ${colorHex}80`
                          : `0 4px 10px ${colorHex}30`
                      }}
                    >
                      {/* Grid number - centered inside the block */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-base font-bold drop-shadow-lg">
                          {idx + 1}
                        </span>
                      </div>
                      
                      {/* Hover glow */}
                      <div 
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ boxShadow: `inset 0 0 12px ${colorHex}50` }}
                      />
                    </button>
                    
                    {/* Selection indicator - checkmark (outside button for better visibility) */}
                    {isSelected && (
                      <div className="absolute -top-0.5 right-0 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/5 z-10">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between flex-shrink-0 pt-4 mt-4 border-t border-white/10">
            <div className="text-sm text-gray-400">
              <span className="text-white font-semibold">{selectedCount}</span> block{selectedCount !== 1 ? 's' : ''} selected{maxGrids && <span className="text-gray-500"> / max {maxGrids}</span>}
            </div>
            <div className="flex gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-5 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleStart}
                disabled={!canStart}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2
                  ${canStart 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40' 
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Play className="w-5 h-5" />
                <span>Start game</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
