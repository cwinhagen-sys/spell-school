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
        {/* Header Card - Refined */}
        <div className="bg-[#161622] rounded-2xl border border-white/[0.10] p-6 md:p-8 mb-6 shadow-xl">
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
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Select Color Blocks</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Choose which blocks to practice with
                </p>
              </div>
            </div>
            
            {/* Selection summary - Compact */}
            <div className="flex items-center gap-3">
              <div className="bg-white/5 border border-white/[0.10] rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Blocks</div>
                <div className="text-lg font-bold text-white">{selectedBlocks.length}/{colorBlocks.length}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <div className="text-[10px] text-amber-400/80 uppercase tracking-wide mb-0.5">Words</div>
                <div className="text-lg font-bold text-amber-400">{totalWords}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Blocks Grid - Refined */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {colorBlocks.map((block, index) => {
            const isSelected = selectedBlocks.includes(block.id)
            const colorScheme = COLOR_GRIDS[index % COLOR_GRIDS.length]
            
            return (
              <button
                key={block.id}
                onClick={() => onToggleBlock(block.id)}
                className={`group relative p-5 rounded-xl text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#161622] border-2 shadow-lg'
                    : 'bg-[#161622] border border-white/[0.08] hover:border-white/[0.15] hover:shadow-md'
                }`}
                style={{
                  borderColor: isSelected ? colorScheme.hex : undefined,
                  boxShadow: isSelected ? `0 4px 12px ${colorScheme.hex}20` : undefined
                }}
              >
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Color indicator - refined */}
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center border"
                      style={{ 
                        backgroundColor: isSelected ? `${colorScheme.hex}15` : '#1a1a2e',
                        borderColor: isSelected ? colorScheme.hex : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <span 
                        className="font-bold text-base"
                        style={{ color: colorScheme.hex }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className={`font-semibold text-base transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                        {block.color}
                      </h3>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">
                        {block.words.length} {block.words.length === 1 ? 'word' : 'words'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Checkbox - refined */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isSelected 
                      ? 'bg-white/10' 
                      : 'bg-white/5 group-hover:bg-white/8'
                  }`}>
                    {isSelected ? (
                      <CheckCircle2 className="w-4.5 h-4.5" style={{ color: colorScheme.hex }} />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-gray-600 group-hover:text-gray-400" />
                    )}
                  </div>
                </div>
                
                {/* Words preview - refined */}
                <div className="mt-3 pt-3 border-t border-white/[0.08]">
                  <div className="flex flex-wrap gap-1.5">
                    {block.words.slice(0, 5).map((word, wordIdx) => (
                      <span
                        key={wordIdx}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
                          isSelected 
                            ? 'bg-white/12 text-white' 
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/8'
                        }`}
                      >
                        {word.en}
                      </span>
                    ))}
                    {block.words.length > 5 && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-md ${
                        isSelected ? 'text-white/50' : 'text-gray-500'
                      }`}>
                        +{block.words.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Submit Button - Compact and Professional */}
        <div className="flex items-center justify-center">
          <button
            onClick={onSubmit}
            disabled={selectedBlocks.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold text-sm disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30"
          >
            {selectedBlocks.length > 0 ? (
              <>
                <Sparkles className="w-4 h-4" />
                Start Session ({totalWords} words)
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                Select blocks to continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
