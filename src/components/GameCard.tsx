"use client"

import { ReactNode } from "react"

type ColorVariant = "blue" | "green" | "orange" | "purple" | "red" | "yellow" | "pink" | "teal" | "amber" | "indigo" | "emerald" | "rose" | "gold" | "diamond" | "cyan" | "violet" | "fuchsia"

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
    blue: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/20",
    green: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20",
    orange: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/20",
    purple: "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/20",
    red: "bg-red-500/10 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/20",
    yellow: "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/20",
    pink: "bg-pink-500/10 border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/20",
    teal: "bg-teal-500/10 border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/20",
    amber: "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/20",
    indigo: "bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20",
    rose: "bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/20",
    gold: "bg-yellow-400/10 border-yellow-400/20 hover:border-yellow-400/40 hover:bg-yellow-400/20",
    diamond: "bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/20",
    cyan: "bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/20",
    violet: "bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/20",
    fuchsia: "bg-fuchsia-500/10 border-fuchsia-500/20 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/20",
  }

  const iconBg: Record<ColorVariant, string> = {
    blue: "from-blue-400 to-indigo-500 shadow-blue-500/30",
    green: "from-green-400 to-emerald-500 shadow-emerald-500/30",
    orange: "from-orange-400 to-amber-500 shadow-orange-500/30",
    purple: "from-purple-400 to-pink-500 shadow-purple-500/30",
    red: "from-red-400 to-rose-500 shadow-red-500/30",
    yellow: "from-yellow-400 to-orange-500 shadow-yellow-500/30",
    pink: "from-pink-400 to-rose-500 shadow-pink-500/30",
    teal: "from-teal-400 to-cyan-500 shadow-teal-500/30",
    amber: "from-amber-400 to-orange-500 shadow-amber-500/30",
    indigo: "from-indigo-400 to-purple-500 shadow-indigo-500/30",
    emerald: "from-emerald-400 to-green-500 shadow-emerald-500/30",
    rose: "from-rose-400 to-pink-500 shadow-rose-500/30",
    gold: "from-yellow-300 to-amber-400 shadow-amber-500/30",
    diamond: "from-cyan-400 to-blue-500 shadow-cyan-500/30",
    cyan: "from-cyan-400 to-blue-500 shadow-cyan-500/30",
    violet: "from-violet-400 to-purple-500 shadow-violet-500/30",
    fuchsia: "from-fuchsia-400 to-pink-500 shadow-fuchsia-500/30",
  }

  const textColor: Record<ColorVariant, string> = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    orange: "text-orange-400",
    purple: "text-purple-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    pink: "text-pink-400",
    teal: "text-teal-400",
    amber: "text-amber-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    gold: "text-amber-400",
    diamond: "text-cyan-400",
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    fuchsia: "text-fuchsia-400",
  }

  return (
    <button
      onClick={locked ? () => {} : onClick}
      disabled={locked}
      className={`relative group w-full rounded-2xl p-6 border backdrop-blur-sm ${cardBg[color]} transition-all duration-300 ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-[1.03]'}`}
    >
      <div className="text-center">
        {imageSrc ? (
          <div className={`w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-3 border border-white/20 shadow-lg ${locked ? '' : 'group-hover:scale-105'} transition-transform`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={`w-16 h-16 bg-gradient-to-br ${iconBg[color]} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${locked ? '' : 'group-hover:scale-110'} transition-transform text-white text-2xl`}
          >
            {icon}
          </div>
        )}
        <h3 className={`text-lg font-semibold ${locked ? 'text-gray-500' : 'text-white group-hover:' + textColor[color]}`}>{title}</h3>
      </div>
      {locked && (
        <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <span className="text-gray-400 text-sm font-medium mb-1">{lockedReason ?? '🔒 Låst'}</span>
        </div>
      )}
    </button>
  )
}
