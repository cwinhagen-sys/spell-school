'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface WordSet {
  id: string
  title: string
  words: any
  created_at: string
}

interface AssignedRecord {
  id: string
  created_at: string
  class_id: string | null
  student_id: string | null
  word_sets: WordSet | null
}

export default function StudentWordSetsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigned, setAssigned] = useState<AssignedRecord[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }

        // Ensure student role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'student') {
          window.location.href = profile?.role === 'teacher' ? '/teacher' : '/select-role'
          return
        }

        // Fetch classes the student belongs to
        const { data: classLinks, error: clsErr } = await supabase
          .from('class_students')
          .select('class_id')
          .eq('student_id', user.id)

        if (clsErr) throw clsErr

        const classIds = (classLinks || []).map((r: any) => r.class_id)

        // Direct assignments
        const { data: direct, error: dirErr } = await supabase
          .from('assigned_word_sets')
          .select('id, created_at, class_id, student_id, word_sets ( id, title, words, created_at )')
          .eq('student_id', user.id)

        if (dirErr) throw dirErr

        // Class assignments
        let classAssigned: AssignedRecord[] = []
        if (classIds.length > 0) {
          const { data: byClass, error: clsAssignErr } = await supabase
            .from('assigned_word_sets')
            .select('id, created_at, class_id, student_id, word_sets ( id, title, words, created_at )')
            .in('class_id', classIds)
          if (clsAssignErr) throw clsAssignErr
          classAssigned = byClass as unknown as AssignedRecord[]
        }

        // Merge unique by word set id
           const combined = [...(direct as unknown as AssignedRecord[] || []), ...classAssigned]
        const seen = new Set<string>()
        const unique = combined.filter((rec) => {
          const setId = rec.word_sets?.id
          if (!setId) return false
          if (seen.has(setId)) return false
          seen.add(setId)
          return true
        })

        setAssigned(unique)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load word sets')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const renderWordPreview = (words: any): string[] => {
    if (!Array.isArray(words)) return []
    const preview: string[] = []
    for (const item of words) {
      if (typeof item === 'string') {
        preview.push(item)
      } else if (item && typeof item === 'object') {
        if (typeof item.en === 'string') preview.push(item.en)
        else if (typeof item.word === 'string') preview.push(item.word)
      }
      if (preview.length >= 5) break
    }
    return preview
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Your Word Sets</h1>
          <a 
            href="/student" 
            className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/15 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </a>
        </div>

        {loading && (
          <div className="rounded-2xl p-6 border border-white/10 bg-white/5">Loading...</div>
        )}

        {error && (
          <div className="rounded-2xl p-6 border border-red-400/30 bg-red-500/20 text-red-200">{error}</div>
        )}

        {!loading && !error && (
          assigned.length === 0 ? (
            <div className="rounded-2xl p-8 border border-white/10 bg-white/5 text-center text-gray-300">
              No word sets assigned yet. Check back later!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {assigned.map((rec) => (
                <div key={rec.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-indigo-500/50 transition-colors">
                  <h3 className="text-lg font-semibold text-white mb-2">{rec.word_sets?.title}</h3>
                  <p className="text-sm text-gray-300 mb-3">Assigned {new Date(rec.created_at).toLocaleDateString('en-US')}</p>
                  <div className="flex flex-wrap gap-2">
                    {renderWordPreview(rec.word_sets?.words).map((w, idx) => (
                      <span key={idx} className="bg-indigo-500/20 text-indigo-200 text-xs px-2 py-1 rounded-full">{w}</span>
                    ))}
                    {Array.isArray(rec.word_sets?.words) && rec.word_sets!.words.length > 5 && (
                      <span className="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded-full">+{rec.word_sets!.words.length - 5} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}


