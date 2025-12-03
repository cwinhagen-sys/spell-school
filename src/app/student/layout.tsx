'use client'

import StudentHeader from '@/components/StudentHeader'
import LogoutHandler from '@/components/LogoutHandler'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a1a] relative overflow-hidden">
      {/* Animated magical background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f2a] via-[#0a0a1a] to-[#050510]" />
        
        {/* Magical aurora effect */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px]" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Subtle star particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.2 + Math.random() * 0.3,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      <StudentHeader />
      <LogoutHandler />
      <SaveStatusIndicator />
      <main className="relative z-10 pb-8">
        {children}
      </main>
    </div>
  )
}
