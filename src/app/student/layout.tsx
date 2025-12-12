'use client'

import StudentHeader from '@/components/StudentHeader'
import LogoutHandler from '@/components/LogoutHandler'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080f] relative overflow-hidden">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#08080f]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-[120px]" />
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
