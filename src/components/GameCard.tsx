"use client"

import { ReactNode } from "react"

type ColorVariant = "blue" | "green" | "orange" | "purple" | "red" | "yellow" | "pink" | "teal" | "amber" | "indigo" | "emerald" | "rose" | "gold" | "diamond" | "cyan" | "violet" | "fuchsia"

// Game-specific center designs
function GameCenterDesign({ title, icon }: { title: string; icon: ReactNode }) {
  const normalizedTitle = title.toLowerCase().trim()

  // Flashcards
  if (normalizedTitle.includes('flashcard')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-white/5 rounded-xl border border-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3" />
        <div className="absolute inset-2 bg-white/10 rounded-lg border border-white/20 group-hover:bg-white/15 transition-all duration-300 group-hover:scale-105 group-hover:-rotate-2" />
        <div className="absolute inset-4 bg-gradient-to-br from-pink-500/20 to-rose-600/30 rounded border border-pink-500/30 flex items-center justify-center group-hover:from-pink-500/30 group-hover:to-rose-600/40 group-hover:border-pink-500/40 transition-all duration-300">
          <div className="text-pink-400/80 text-xs font-bold group-hover:text-pink-300 transition-colors">ABC</div>
        </div>
      </div>
    )
  }

  // Memory Game
  if (normalizedTitle.includes('memory')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 flex gap-1">
          <div className="flex-1 bg-gradient-to-br from-violet-500/15 to-purple-600/20 rounded-lg border border-violet-500/25 group-hover:border-violet-500/35 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:from-violet-500/25 group-hover:to-purple-600/30" />
          <div className="flex-1 bg-gradient-to-br from-cyan-500/15 to-teal-600/20 rounded-lg border border-cyan-500/25 group-hover:border-cyan-500/35 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:from-cyan-500/25 group-hover:to-teal-600/30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-fuchsia-400/60 rounded-full group-hover:scale-150 group-hover:bg-fuchsia-400/80 transition-all duration-300" />
        </div>
      </div>
    )
  }

  // Multiple Choice
  if (normalizedTitle.includes('multiple') || normalizedTitle.includes('choice')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center">
          <div className="w-12 h-3 bg-white/5 rounded border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:scale-110" />
          <div className="w-12 h-3 bg-gradient-to-r from-emerald-500/20 to-teal-600/25 rounded border border-emerald-500/30 group-hover:from-emerald-500/30 group-hover:to-teal-600/35 group-hover:border-emerald-500/40 transition-all duration-300 group-hover:scale-110" />
          <div className="w-12 h-3 bg-white/5 rounded border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:scale-110" />
        </div>
        <div className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-amber-500/30 to-yellow-600/40 rounded-full border border-amber-500/40 group-hover:scale-125 group-hover:from-amber-500/40 group-hover:to-yellow-600/50 transition-all duration-300 flex items-center justify-center">
          <div className="w-2 h-2 bg-amber-400/80 rounded-full group-hover:bg-amber-300 transition-colors" />
        </div>
      </div>
    )
  }

  // Word Scramble
  if (normalizedTitle.includes('scramble')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 flex flex-wrap gap-1 items-center justify-center">
          <div className="w-4 h-4 bg-white/10 rounded border border-white/20 text-[8px] text-white/60 font-bold flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 group-hover:bg-white/15 transition-all duration-300">A</div>
          <div className="w-4 h-4 bg-gradient-to-br from-indigo-500/25 to-blue-600/30 rounded border border-indigo-500/35 text-[8px] text-indigo-300/90 font-bold flex items-center justify-center group-hover:scale-125 group-hover:-rotate-12 group-hover:from-indigo-500/35 group-hover:to-blue-600/40 transition-all duration-300">B</div>
          <div className="w-4 h-4 bg-white/10 rounded border border-white/20 text-[8px] text-white/60 font-bold flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 group-hover:bg-white/15 transition-all duration-300">C</div>
          <div className="w-4 h-4 bg-gradient-to-br from-rose-500/25 to-pink-600/30 rounded border border-rose-500/35 text-[8px] text-rose-300/90 font-bold flex items-center justify-center group-hover:scale-125 group-hover:-rotate-12 group-hover:from-rose-500/35 group-hover:to-pink-600/40 transition-all duration-300">D</div>
        </div>
      </div>
    )
  }

  // Typing Challenge
  if (normalizedTitle.includes('typing')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-white/5 rounded-xl border border-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:bg-white/10" />
        <div className="absolute inset-2 flex flex-col gap-1">
          <div className="h-2 bg-white/10 rounded group-hover:bg-white/15 transition-all duration-300 group-hover:scale-x-110" />
          <div className="h-2 bg-gradient-to-r from-cyan-500/25 to-blue-600/30 rounded group-hover:from-cyan-500/35 group-hover:to-blue-600/40 transition-all duration-300 group-hover:scale-x-110" />
          <div className="h-2 bg-white/10 rounded group-hover:bg-white/15 transition-all duration-300 group-hover:scale-x-110" />
        </div>
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-cyan-400/50 rounded-full group-hover:scale-150 group-hover:bg-cyan-400/70 transition-all duration-300" />
      </div>
    )
  }

  // Translate
  if (normalizedTitle.includes('translate')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <div className="w-6 h-8 bg-white/10 rounded border border-white/20 group-hover:bg-white/15 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-1" />
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500/40 to-violet-600/50 group-hover:scale-y-125 group-hover:from-purple-500/60 group-hover:to-violet-600/70 transition-all duration-300" />
          <div className="w-6 h-8 bg-gradient-to-br from-purple-500/20 to-violet-600/25 rounded border border-purple-500/30 group-hover:from-purple-500/30 group-hover:to-violet-600/35 group-hover:border-purple-500/40 transition-all duration-300 group-hover:scale-110 group-hover:translate-x-1" />
        </div>
      </div>
    )
  }

  // Sentence Gap / Story Gap
  if (normalizedTitle.includes('gap') || normalizedTitle.includes('sentence')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 flex flex-col gap-1 items-center justify-center">
          <div className="w-12 h-2 bg-white/10 rounded group-hover:bg-white/15 transition-all duration-300 group-hover:scale-x-110" />
          <div className="w-8 h-2 bg-gradient-to-r from-fuchsia-500/20 via-pink-600/25 to-fuchsia-500/20 rounded border border-dashed border-fuchsia-500/35 group-hover:from-fuchsia-500/30 group-hover:via-pink-600/35 group-hover:to-fuchsia-500/30 group-hover:border-fuchsia-500/45 transition-all duration-300 group-hover:scale-x-125" />
          <div className="w-12 h-2 bg-white/10 rounded group-hover:bg-white/15 transition-all duration-300 group-hover:scale-x-110" />
        </div>
      </div>
    )
  }

  // Word Roulette
  if (normalizedTitle.includes('roulette')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-45" />
        <div className="absolute inset-2 rounded-full border border-amber-500/30 group-hover:border-amber-500/40 transition-all duration-300 bg-gradient-to-br from-amber-500/10 to-yellow-600/15 group-hover:from-amber-500/15 group-hover:to-yellow-600/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400/60 rounded-full group-hover:scale-150 group-hover:bg-amber-400/80 transition-all duration-300" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-3 bg-amber-400/50 group-hover:bg-amber-400/70 transition-all duration-300" />
      </div>
    )
  }

  // Quiz
  if (normalizedTitle.includes('quiz')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-white/5 rounded-xl border border-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:bg-white/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="text-3xl text-indigo-400/60 group-hover:text-indigo-400/80 group-hover:scale-125 transition-all duration-300">?</div>
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-md group-hover:bg-indigo-500/30 group-hover:blur-lg transition-all duration-300" />
          </div>
        </div>
      </div>
    )
  }

  // Scenario Adventure
  if (normalizedTitle.includes('scenario') || normalizedTitle.includes('adventure')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-white/5 rounded-xl border border-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:bg-white/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 rounded group-hover:border-emerald-500/40 group-hover:scale-125 transition-all duration-300 bg-gradient-to-br from-emerald-500/10 to-teal-600/15 group-hover:from-emerald-500/15 group-hover:to-teal-600/20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-emerald-400/60 group-hover:bg-emerald-400/80 transition-colors" />
          </div>
        </div>
      </div>
    )
  }

  // Matching Pairs / Connect
  if (normalizedTitle.includes('matching') || normalizedTitle.includes('pairs') || normalizedTitle.includes('connect')) {
    return (
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          <div className="w-6 h-6 bg-white/10 rounded border border-white/20 group-hover:bg-white/15 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-1" />
          <div className="w-4 h-0.5 bg-gradient-to-r from-teal-500/40 to-cyan-600/50 group-hover:scale-x-150 group-hover:from-teal-500/60 group-hover:to-cyan-600/70 transition-all duration-300" />
          <div className="w-6 h-6 bg-gradient-to-br from-teal-500/20 to-cyan-600/25 rounded border border-teal-500/30 group-hover:from-teal-500/30 group-hover:to-cyan-600/35 group-hover:border-teal-500/40 transition-all duration-300 group-hover:scale-110 group-hover:translate-x-1" />
        </div>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="relative w-20 h-20 mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-600/15 rounded-xl border border-rose-500/20 group-hover:border-rose-500/30 group-hover:from-rose-500/15 group-hover:to-pink-600/20 transition-all duration-300 group-hover:scale-110 flex items-center justify-center">
        <div className="text-rose-400/60 text-2xl group-hover:text-rose-400/80 group-hover:scale-125 transition-all duration-300">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function GameCard({
  title,
  icon,
  color = "blue",
  onClick,
  locked = false,
  lockedReason,
  imageSrc,
}: {
  title: string
  icon: ReactNode
  color?: ColorVariant
  onClick: () => void
  locked?: boolean
  lockedReason?: string
  imageSrc?: string
}) {
  // Unified neutral color scheme for all games
  const neutralCardBg = "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
  const neutralTextColor = "text-white group-hover:text-white"

  return (
    <button
      onClick={locked ? () => {} : onClick}
      disabled={locked}
      className={`relative group w-full rounded-2xl p-6 border backdrop-blur-sm ${neutralCardBg} transition-all duration-300 ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-white/10 hover:scale-[1.03]'}`}
    >
      <div className="text-center">
        {imageSrc ? (
          <div className={`w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-3 border border-white/20 shadow-lg ${locked ? '' : 'group-hover:scale-105'} transition-transform`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="mb-3">
            <GameCenterDesign title={title} icon={icon} />
          </div>
        )}
        <h3 className={`text-lg font-semibold ${locked ? 'text-gray-500' : neutralTextColor} transition-colors duration-300`}>{title}</h3>
      </div>
      
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-white/5 blur-xl rounded-2xl" />
      </div>

      {locked && (
        <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <span className="text-gray-400 text-sm font-medium mb-1">{lockedReason ?? '🔒 Låst'}</span>
        </div>
      )}
    </button>
  )
}
