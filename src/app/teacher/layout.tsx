'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      {/* Persistent top nav for all teacher views */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex flex-wrap gap-2">
            {/* Progress and Quiz Results integrated into Manage Students */}
            <Link
              href="/teacher/classes"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/classes') ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Manage Classes
            </Link>
            <Link
              href="/teacher/students"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/students') ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Progress Report
            </Link>
            <Link
              href="/teacher/word-sets"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/word-sets') ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Word Sets
            </Link>
            <Link
              href="/teacher/assign"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/assign') ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Assign Word Sets
            </Link>
            <Link
              href="/teacher/add-students"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/teacher/add-students') ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              Add Students
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


