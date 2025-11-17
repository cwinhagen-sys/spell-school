'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { BookOpen, Users, FileText, Calendar, UserPlus } from 'lucide-react'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  // Don't show nav on dashboard
  if (pathname === '/teacher') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/teacher"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            >
              <BookOpen className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/teacher/classes"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/classes') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Klasser
            </Link>
            <Link
              href="/teacher/word-sets"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/word-sets') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Ordlistor
            </Link>
            <Link
              href="/teacher/assign"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/assign') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Tilldela
            </Link>
            <Link
              href="/teacher/students"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/students') 
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Framsteg
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
