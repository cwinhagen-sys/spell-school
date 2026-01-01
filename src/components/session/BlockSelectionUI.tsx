'use client'

import { CheckCircle2, Circle, Palette, Sparkles, Layers, ArrowLeft } from 'lucide-react'
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
  onExit?: () => void
}

/**
 * Block Selection UI Component
 * 
 * This component displays color blocks for selection in session mode.
 * All business logic (state management, API calls) is handled by the parent component.
 */
export default function BlockSelectionUI({
  colorBlocks,
  selectedBlocks,
  onToggleBlock,
  onSubmit,
  onExit
}: BlockSelectionUIProps) {
  const totalWords = colorBlocks
    .filter(b => selectedBlocks.includes(b.id))
    .reduce((sum, b) => sum + b.words.length, 0)

  return (
    <div className="min-h-screen bg-[#08080f] py-8 px-4 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Card */}
        <div className="bg-[#161622] rounded-2xl border border-white/[0.08] p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {onExit && (
                <button
                  onClick={onExit}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-14 h-14 bg-[#1a1a2e] border border-white/[0.08] rounded-xl flex items-center justify-center">
                <Layers className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Select color blocks</h1>
                <p className="text-gray-500 text-sm md:text-base">
                  Choose which blocks you want to practice with in this session
                </p>
              </div>
            </div>
            
            {/* Selection summary */}
            <div className="flex items-center gap-4">
              <div className="bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Selected blocks</div>
                <div className="text-xl font-bold text-white">{selectedBlocks.length} / {colorBlocks.length}</div>
              </div>
              <div className="bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total words</div>
                <div className="text-xl font-bold text-amber-400">{totalWords}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Blocks Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {colorBlocks.map((block, index) => {
            const isSelected = selectedBlocks.includes(block.id)
            const colorScheme = COLOR_GRIDS[index % COLOR_GRIDS.length]
            
            return (
              <button
                key={block.id}
                onClick={() => onToggleBlock(block.id)}
                className={`group relative p-6 rounded-2xl text-left transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#161622] border-2'
                    : 'bg-[#161622] border-2 border-white/[0.06] hover:border-white/[0.12]'
                }`}
                style={{
                  borderColor: isSelected ? colorScheme.hex : undefined
                }}
              >
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Color indicator - dark bg with colored number */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.08]"
                      style={{ backgroundColor: '#1a1a2e' }}
                    >
                      <span 
                        className="font-bold text-lg"
                        style={{ color: colorScheme.hex }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                        {block.color}
                      </h3>
                      <p className="text-sm font-medium text-gray-500">
                        {block.words.length} words
                      </p>
                    </div>
                  </div>
                  
                  {/* Checkbox */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isSelected 
                      ? 'bg-white/10' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: colorScheme.hex }} />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600 group-hover:text-gray-500" />
                    )}
                  </div>
                </div>
                
                {/* Words preview */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap gap-1.5">
                    {block.words.slice(0, 6).map((word, wordIdx) => (
                      <span
                        key={wordIdx}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-white/15 text-white' 
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/10'
                        }`}
                      >
                        {word.en}
                      </span>
                    ))}
                    {block.words.length > 6 && (
                      <span className={`text-xs px-2.5 py-1 rounded-lg ${
                        isSelected ? 'text-white/50' : 'text-gray-500'
                      }`}>
                        +{block.words.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          disabled={selectedBlocks.length === 0}
          className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold text-lg disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          {selectedBlocks.length > 0 ? (
            <>
              <Sparkles className="w-5 h-5" />
              Start Session with {totalWords} words
            </>
          ) : (
            'Select at least one block to continue'
          )}
        </button>
      </div>
    </div>
  )
}
