'use client'

import Link from 'next/link'
import { fullTable } from '@/lib/leveling'

export default function XpPage() {
  const table = fullTable()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">XP per level (1–100)</h1>
          <Link href="/student" className="text-blue-600 hover:underline">Back to dashboard</Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow">
          <div className="grid grid-cols-3 gap-0 bg-gray-100 text-sm font-semibold text-gray-700">
            <div className="px-4 py-3">Level</div>
            <div className="px-4 py-3">XP to next level</div>
            <div className="px-4 py-3">Cumulative XP (start of level)</div>
          </div>
          <div>
            {table.map(row => (
              <div key={row.level} className="grid grid-cols-3 gap-0 border-t border-gray-100 text-sm">
                <div className="px-4 py-2">{row.level}</div>
                <div className="px-4 py-2">{row.delta.toLocaleString()}</div>
                <div className="px-4 py-2">{row.cumulative.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}





















