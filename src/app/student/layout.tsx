'use client'

import StudentHeader from '@/components/StudentHeader'
import LogoutHandler from '@/components/LogoutHandler'
import SaveStatusIndicator from '@/components/SaveStatusIndicator'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <StudentHeader />
      <LogoutHandler />
      <SaveStatusIndicator />
      <main className="pb-8">
        {children}
      </main>
    </div>
  )
}


