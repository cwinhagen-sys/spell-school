'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Persistent top nav for all teacher views */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex flex-wrap gap-2">
            {/* Quiz Results removed per request; results are under Progress */}
            <Link
              href="/teacher/classes"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/classes') ? 'bg-white/15 text-white' : 'bg-white/10 text-white/90 hover:bg-white/15'}`}
            >
              Manage Classes
            </Link>
            <Link
              href="/teacher/word-sets"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/word-sets') ? 'bg-white/15 text-white' : 'bg-white/10 text-white/90 hover:bg-white/15'}`}
            >
              Word Sets
            </Link>
            <Link
              href="/teacher/assign"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/assign') ? 'bg-white/15 text-white' : 'bg-white/10 text-white/90 hover:bg-white/15'}`}
            >
              Assign Word Sets
            </Link>
            <Link
              href="/teacher/progress"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/progress') ? 'bg-white/15 text-white' : 'bg-white/10 text-white/90 hover:bg-white/15'}`}
            >
              Progress
            </Link>
            <Link
              href="/teacher/quiz-results"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/quiz-results') ? 'bg-white/15 text-white' : 'bg-white/10 text-white/90 hover:bg-white/15'}`}
            >
              Quiz Results
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6">
          {children}
        </div>
      </div>
    </div>
  )
}


