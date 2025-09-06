'use client'

import React, { useEffect, useMemo, useState } from 'react'

type Props = {
  level: number
  title?: string
  image?: string
  description?: string
  onClose: () => void
}

export default function LevelUpModal({ level, title, image, description, onClose }: Props) {
  const isMilestone = level % 10 === 0
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const sparkles = useMemo(() => (
    isMilestone
      ? Array.from({ length: 80 }).map((_, i) => ({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          delay: Math.random() * 0.8,
          size: Math.random() * 10 + 4,
        }))
      : []
  ), [isMilestone])

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Animated gradient */}
      <div className="absolute inset-0 animate-[pulse_2.5s_ease-in-out_infinite] bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.25),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.2),transparent_40%)]" />

      {/* Content */}
      <div className="relative h-full w-full flex items-center justify-center p-6">
        <div className={`relative w-full max-w-2xl rounded-3xl border ${isMilestone ? 'border-amber-400/60' : 'border-white/10'} bg-white/10 backdrop-blur-xl p-8 text-white shadow-2xl overflow-hidden`}>
          {/* Sparkles (milestone only) */}
          {sparkles.length > 0 && (
            <div className="pointer-events-none absolute inset-0">
              {sparkles.map(s => (
                <span
                  key={s.id}
                  className="absolute rounded-full bg-white/70 animate-[float_1.8s_linear_infinite]"
                  style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
                />
              ))}
            </div>
          )}

          {isMilestone ? (
            <div className="relative">
              <div className="text-center mb-6">
                <div className={`inline-block text-xs tracking-wider uppercase text-amber-300`}>
                  New Title Unlocked
                </div>
                <h2 className={`mt-2 text-5xl font-extrabold drop-shadow text-amber-200`}>Level {level}</h2>
              </div>

              {title && (
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className={`w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-amber-400 shadow-lg`}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-3xl">🪄</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-200">New Title</div>
                    <div className="text-xl font-semibold">{title}</div>
                    {description && (
                      <div className="text-xs text-gray-300 mt-1 max-w-32">{description}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-2 w-40 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r from-amber-400 to-yellow-300 w-full animate-[grow_1s_ease-out_forwards]`} />
                </div>
                <div className="text-sm text-gray-200">+1 Level</div>
              </div>

              <div className="text-center">
                <button onClick={onClose} className={`px-6 py-3 rounded-xl font-semibold transition-colors bg-amber-500 hover:bg-amber-400 text-black`}>Continue</button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="text-center mb-6">
                <h2 className="mt-2 text-5xl font-extrabold text-white">Level-up!</h2>
              </div>
              <div className="text-center">
                <button onClick={onClose} className="px-6 py-3 rounded-xl font-semibold transition-colors bg-white/20 hover:bg-white/30 text-white">Continue</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0); opacity: 0.9; }
          70% { opacity: 0.9; }
          100% { transform: translateY(-24px); opacity: 0; }
        }
        @keyframes grow {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}


