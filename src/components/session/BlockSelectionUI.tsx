'use client'

import { CheckCircle2, Circle, Palette } from 'lucide-react'
import { COLOR_GRIDS } from '@/components/ColorGridSelector'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface ColorBlock {
  id: string
  color: string
  words: Word[]
}

interface BlockSelectionUIProps {
  colorBlocks: ColorBlock[]
  selectedBlocks: string[]
  onToggleBlock: (blockId: string) => void
  onSubmit: () => void
}

/**
 * Block Selection UI Component
 * 
 * This component displays color blocks for selection in session mode.
 * All business logic (state management, API calls) is handled by the parent component.
 * 
 * Props:
 * - colorBlocks: Array of available color blocks to choose from
 * - selectedBlocks: Array of currently selected block IDs
 * - onToggleBlock: Callback when a block is toggled (selected/deselected)
 * - onSubmit: Callback when user submits their selection
 */
export default function BlockSelectionUI({
  colorBlocks,
  selectedBlocks,
  onToggleBlock,
  onSubmit
}: BlockSelectionUIProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-2">
            <Palette className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Select Color Blocks</h1>
          </div>
          <p className="text-gray-600 mb-8">
            Choose which color blocks you want to practice with in this session
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {colorBlocks.map((block, index) => {
              const isSelected = selectedBlocks.includes(block.id)
              const colorScheme = COLOR_GRIDS[index % COLOR_GRIDS.length]
              return (
                <button
                  key={block.id}
                  onClick={() => onToggleBlock(block.id)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `${colorScheme.border} ${colorScheme.bg} shadow-md`
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected 
                          ? `bg-gradient-to-br ${colorScheme.bg.replace('100', '400').replace('50', '400')}`
                          : 'bg-gray-100'
                      }`}>
                        <Palette className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <h3 className={`font-bold text-lg ${isSelected ? colorScheme.text : 'text-gray-900'}`}>
                        {block.color} Block
                      </h3>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className={`w-6 h-6 ${colorScheme.accent}`} />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <p className={`text-sm font-medium mb-3 ${isSelected ? colorScheme.accent : 'text-gray-600'}`}>
                    {block.words.length} words
                  </p>
                  {/* Show words in this block */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {block.words.map((word, wordIdx) => (
                        <span
                          key={wordIdx}
                          className={`text-xs px-2 py-1 rounded ${
                            isSelected 
                              ? 'bg-white/80 text-gray-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {word.en}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={onSubmit}
            disabled={selectedBlocks.length === 0}
            className="w-full px-6 py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  )
}

