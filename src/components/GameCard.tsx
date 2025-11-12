"use client"

import { ReactNode } from "react"

type ColorVariant = "blue" | "green" | "orange" | "purple" | "red" | "yellow" | "pink" | "teal" | "amber" | "indigo" | "emerald" | "rose" | "gold" | "diamond"

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
  const cardBg: Record<ColorVariant, string> = {
    blue: "bg-blue-500/15 border-blue-500/30 hover:border-blue-500/50",
    green: "bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/50",
    orange: "bg-orange-500/15 border-orange-500/30 hover:border-orange-500/50",
    purple: "bg-purple-500/15 border-purple-500/30 hover:border-purple-500/50",
    red: "bg-red-500/15 border-red-500/30 hover:border-red-500/50",
    yellow: "bg-yellow-500/15 border-yellow-500/30 hover:border-yellow-500/50",
    pink: "bg-pink-500/15 border-pink-500/30 hover:border-pink-500/50",
    teal: "bg-teal-500/15 border-teal-500/30 hover:border-teal-500/50",
    amber: "bg-amber-500/15 border-amber-500/30 hover:border-amber-500/50",
    indigo: "bg-indigo-500/15 border-indigo-500/30 hover:border-indigo-500/50",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/50",
    rose: "bg-rose-500/15 border-rose-500/30 hover:border-rose-500/50",
    gold: "bg-yellow-400/15 border-yellow-400/30 hover:border-yellow-400/50",
    diamond: "bg-cyan-500/15 border-cyan-500/30 hover:border-cyan-500/50",
  }

  const iconBg: Record<ColorVariant, string> = {
    blue: "from-blue-400 to-indigo-500",
    green: "from-green-400 to-emerald-500",
    orange: "from-orange-400 to-amber-500",
    purple: "from-purple-400 to-pink-500",
    red: "from-red-400 to-rose-500",
    yellow: "from-yellow-400 to-orange-500",
    pink: "from-pink-400 to-rose-500",
    teal: "from-teal-400 to-cyan-500",
    amber: "from-amber-400 to-orange-500",
    indigo: "from-indigo-400 to-purple-500",
    emerald: "from-emerald-400 to-green-500",
    rose: "from-rose-400 to-pink-500",
    gold: "from-yellow-300 to-amber-400",
    diamond: "from-cyan-400 to-blue-500",
  }

  return (
    <button
      onClick={locked ? () => {} : onClick}
      disabled={locked}
      className={`relative group w-full rounded-2xl p-6 border ${cardBg[color]} transition-all duration-200 ${locked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:scale-[1.03]'}`}
    >
      <div className="text-center">
        {imageSrc ? (
          <div className={`w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-3 border border-white/60 shadow-sm ${locked ? '' : 'group-hover:scale-105'} transition-transform`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={`w-16 h-16 bg-gradient-to-br ${iconBg[color]} rounded-2xl flex items-center justify-center mx-auto mb-3 ${locked ? '' : 'group-hover:scale-110'} transition-transform text-white text-2xl`}
          >
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      {locked && (
        <div className="absolute inset-0 rounded-2xl bg-gray-200/80 flex flex-col items-center justify-center p-4">
          <span className="text-gray-800 text-sm font-medium mb-1">{lockedReason ?? '🔒 Locked'}</span>
        </div>
      )}
    </button>
  )
}


