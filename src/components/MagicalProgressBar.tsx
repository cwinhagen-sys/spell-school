'use client'

import { useEffect, useState } from 'react'

interface MagicalProgressBarProps {
  progress: number // 0-100
  statusText?: string
}

export default function MagicalProgressBar({ progress, statusText = 'Charging spell...' }: MagicalProgressBarProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; delay: number }>>([])

  // Generate sparkles that float upward
  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles: Array<{ id: number; x: number; delay: number }> = []
      // Create sparkles along the progress bar width
      for (let i = 0; i < 8; i++) {
        newSparkles.push({
          id: Math.random(),
          x: Math.random() * 100, // Random position along bar (0-100%)
          delay: Math.random() * 2 // Random delay (0-2s)
        })
      }
      setSparkles(newSparkles)
    }

    generateSparkles()
    const interval = setInterval(generateSparkles, 2000) // Regenerate sparkles every 2s

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full">
      {/* Status Text */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-gray-800 mb-1">{statusText}</div>
        <div className="text-2xl font-bold text-gray-700">{Math.round(progress)}%</div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-16 mb-8">
        {/* 3D Potion Tube Background */}
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.3) 50%, rgba(192, 132, 252, 0.2) 100%)',
            border: '3px solid rgba(139, 92, 246, 0.4)',
            boxShadow: `
              inset 0 2px 4px rgba(0, 0, 0, 0.1),
              inset 0 -2px 4px rgba(255, 255, 255, 0.3),
              0 4px 8px rgba(139, 92, 246, 0.2)
            `,
            transform: 'perspective(500px) rotateX(5deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Glass reflection effect */}
          <div 
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
              borderRadius: '1rem'
            }}
          />

          {/* Liquid/Energy Fill */}
          <div
            className="absolute bottom-0 left-0 rounded-2xl transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              height: '100%',
              background: progress < 50
                ? 'linear-gradient(to top, rgba(59, 130, 246, 0.9) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(139, 92, 246, 0.7) 100%)'
                : progress < 80
                ? 'linear-gradient(to top, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.8) 50%, rgba(168, 85, 247, 0.7) 100%)'
                : 'linear-gradient(to top, rgba(139, 92, 246, 0.9) 0%, rgba(168, 85, 247, 0.8) 50%, rgba(192, 132, 252, 0.7) 100%)',
              boxShadow: `
                inset 0 -2px 8px rgba(139, 92, 246, 0.4),
                0 0 20px rgba(139, 92, 246, 0.3)
              `,
              borderRadius: '1rem',
              transition: 'width 0.3s ease-out, background 0.3s ease-out'
            }}
          >
            {/* Liquid surface shimmer */}
            <div
              className="absolute top-0 left-0 w-full h-2 rounded-t-2xl magical-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)'
              }}
            />
          </div>

          {/* Sparkles/Particles */}
          {sparkles.map((sparkle) => (
            <div
              key={sparkle.id}
              className="absolute bottom-0"
              style={{
                left: `${sparkle.x}%`,
                width: '4px',
                height: '4px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(192, 132, 252, 0.6) 100%)',
                borderRadius: '50%',
                boxShadow: '0 0 6px rgba(192, 132, 252, 0.8)',
                animation: `floatUp ${2 + sparkle.delay}s ease-out infinite`,
                animationDelay: `${sparkle.delay}s`,
                opacity: sparkle.x <= progress ? 1 : 0 // Only show sparkles where liquid has reached
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

