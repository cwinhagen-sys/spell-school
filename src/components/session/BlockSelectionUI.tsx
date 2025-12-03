'use client'

import { CheckCircle2, Circle, Palette, Sparkles, Layers } from 'lucide-react'
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
 */
export default function BlockSelectionUI({
  colorBlocks,
  selectedBlocks,
  onToggleBlock,
  onSubmit
}: BlockSelectionUIProps) {
  const totalWords = colorBlocks
    .filter(b => selectedBlocks.includes(b.id))
    .reduce((sum, b) => sum + b.words.length, 0)

  return (
    <div className="min-h-screen bg-[#0a0a1a] py-8 px-4 relative overflow-hidden">
      {/* Aurora background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-1/2 -left-1/2 w-[150%] h-[150%] bg-gradient-to-br from-violet-900/30 via-cyan-900/20 to-fuchsia-900/30 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -top-1/2 -right-1/2 w-[150%] h-[150%] bg-gradient-to-tl from-emerald-900/30 via-teal-900/20 to-blue-900/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ 
        backgroundImage: 'linear-gradient(to right, #ffffff1a 1px, transparent 1px), linear-gradient(to bottom, #ffffff1a 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Card */}
        <div className="bg-[#12122a]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl blur-lg opacity-50" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Layers className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Välj färgblock</h1>
                <p className="text-gray-400 text-sm md:text-base">
                  Välj vilka block du vill öva med i denna session
                </p>
              </div>
            </div>
            
            {/* Selection summary */}
            <div className="flex items-center gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valda block</div>
                <div className="text-xl font-bold text-white">{selectedBlocks.length} / {colorBlocks.length}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Totalt ord</div>
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
                className={`group relative p-6 rounded-2xl text-left transition-all duration-300 transform hover:scale-[1.02] ${
                  isSelected
                    ? 'bg-gradient-to-br from-white/10 to-white/5 border-2 shadow-xl'
                    : 'bg-[#12122a]/60 backdrop-blur-sm border-2 border-white/5 hover:border-white/20 hover:bg-[#12122a]/80'
                }`}
                style={{
                  borderColor: isSelected ? colorScheme.hex : undefined,
                  boxShadow: isSelected ? `0 20px 40px -12px ${colorScheme.hex}40, 0 4px 12px ${colorScheme.hex}20` : undefined
                }}
              >
                {/* Selection indicator glow */}
                {isSelected && (
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${colorScheme.hex}30, transparent)` }}
                  />
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Color indicator */}
                    <div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'shadow-lg' : 'opacity-80 group-hover:opacity-100'
                      }`}
                      style={{ 
                        backgroundColor: colorScheme.hex,
                        boxShadow: isSelected ? `0 8px 20px ${colorScheme.hex}50` : undefined
                      }}
                    >
                      <span className="text-white font-bold text-lg">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                        {block.color}
                      </h3>
                      <p className={`text-sm font-medium transition-colors ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        {block.words.length} ord
                      </p>
                    </div>
                  </div>
                  
                  {/* Checkbox */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isSelected 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-500 group-hover:text-gray-400" />
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
                        +{block.words.length - 6} till
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Submit Button */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-2xl blur opacity-30" />
          <button
            onClick={onSubmit}
            disabled={selectedBlocks.length === 0}
            className="relative w-full px-8 py-5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white rounded-xl font-bold text-lg disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-2xl shadow-violet-500/30 disabled:shadow-none transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
          >
            {selectedBlocks.length > 0 ? (
              <>
                <Sparkles className="w-5 h-5" />
                Starta Session med {totalWords} ord
              </>
            ) : (
              'Välj minst ett block för att fortsätta'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
