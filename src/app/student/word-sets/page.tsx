'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LogoutHandler from '@/components/LogoutHandler'
import { X, BookOpen, ArrowLeft } from 'lucide-react'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface WordSet {
  id: string
  title: string
  words: Word[] | string[]
  created_at: string
  color?: string
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
  const [selectedWordSet, setSelectedWordSet] = useState<WordSet | null>(null)
  const [showWordSetModal, setShowWordSetModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/'
          return
        }

        // ⚡ INSTANT: Load cached assignments first
        const assignmentsCacheKey = `assignments_${user.id}`
        const cachedAssignments = localStorage.getItem(assignmentsCacheKey)
        if (cachedAssignments) {
          try {
            const parsed = JSON.parse(cachedAssignments)
            setAssigned(parsed)
            setLoading(false)
            console.log('⚡ INSTANT: Loaded assignments from cache:', parsed.length)
          } catch (e) {
            console.warn('Failed to parse assignment cache')
          }
        }

        // 🔄 BACKGROUND: Fetch fresh data in background
        setError(null)

        // Parallelize profile check and class fetch
        const [profileResult, classLinksResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single(),
          supabase
            .from('class_students')
            .select('class_id')
            .eq('student_id', user.id)
        ])

        const { data: profile } = profileResult
        const { data: classLinks, error: clsErr } = classLinksResult

        if (!profile || profile.role !== 'student') {
          window.location.href = profile?.role === 'teacher' ? '/teacher' : '/select-role'
          return
        }

        if (clsErr) throw clsErr

        const classIds = (classLinks || []).map((r: any) => r.class_id)

        // Parallelize direct and class assignments
        const assignmentQueries = [
          supabase
            .from('assigned_word_sets')
            .select('id, created_at, class_id, student_id, word_sets ( id, title, words, created_at, color )')
            .eq('student_id', user.id)
        ]

        if (classIds.length > 0) {
          assignmentQueries.push(
            supabase
              .from('assigned_word_sets')
              .select('id, created_at, class_id, student_id, word_sets ( id, title, words, created_at, color )')
              .in('class_id', classIds)
          )
        }

        const assignmentResults = await Promise.all(assignmentQueries)
        const { data: direct, error: dirErr } = assignmentResults[0]
        
        if (dirErr) throw dirErr

        let classAssigned: AssignedRecord[] = []
        if (assignmentResults.length > 1) {
          const { data: byClass, error: clsAssignErr } = assignmentResults[1]
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
        
        // 💾 Save to cache for next time
        localStorage.setItem(assignmentsCacheKey, JSON.stringify(unique))
        console.log('💾 Cached assignments:', unique.length)
        
        setLoading(false)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load word sets')
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

  const normalizeWords = (words: any): Word[] => {
    if (!Array.isArray(words)) return []
    return words.map((item: any) => {
      if (typeof item === 'string') {
        return { en: item, sv: '' }
      } else if (item && typeof item === 'object') {
        return {
          en: item.en || item.word || '',
          sv: item.sv || item.translation || '',
          image_url: item.image_url
        }
      }
      return { en: '', sv: '' }
    }).filter((word: Word) => word.en)
  }

  const handleWordSetClick = (wordSet: WordSet) => {
    setSelectedWordSet(wordSet)
    setShowWordSetModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <LogoutHandler />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Old Word Sets</h1>
          </div>
          <a 
            href="/student" 
            className="px-4 py-2 rounded-md border border-violet-600 text-violet-700 hover:bg-gradient-to-r hover:from-violet-600 hover:to-fuchsia-600 hover:text-white transition-all flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </a>
        </div>

        {loading && (
          <div className="rounded-2xl p-6 border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-6 border border-red-200 bg-red-50 text-red-700">{error}</div>
        )}

        {!loading && !error && (
          assigned.length === 0 ? (
            <div className="rounded-2xl p-8 border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm text-center text-gray-600">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg">No word sets assigned yet. Check back later!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {assigned.map((rec) => (
                <div 
                  key={rec.id} 
                  className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm p-6 hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer group"
                  onClick={() => rec.word_sets && handleWordSetClick(rec.word_sets)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {rec.word_sets?.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: rec.word_sets.color }}
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                      {rec.word_sets?.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Assigned {new Date(rec.created_at).toLocaleDateString('en-US')}</p>
                  <div className="flex flex-wrap gap-2">
                    {renderWordPreview(rec.word_sets?.words).map((w, idx) => (
                      <span key={idx} className="bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-full border border-violet-200">
                        {w}
                      </span>
                    ))}
                    {Array.isArray(rec.word_sets?.words) && rec.word_sets!.words.length > 5 && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border border-gray-200">
                        +{rec.word_sets!.words.length - 5} more
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-xs text-violet-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to view all words →
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Word Set Detail Modal */}
        {showWordSetModal && selectedWordSet && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] shadow-2xl relative bg-white text-gray-800 border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {selectedWordSet.color && (
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: selectedWordSet.color }}
                    />
                  )}
                  <h2 className="text-2xl font-bold text-gray-900">{selectedWordSet.title}</h2>
                </div>
                <button
                  onClick={() => setShowWordSetModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh] pr-2">
                <div className="grid gap-4">
                  {normalizeWords(selectedWordSet.words).map((word, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg">{word.en}</div>
                        {word.sv && (
                          <div className="text-gray-600 mt-1">{word.sv}</div>
                        )}
                      </div>
                      {word.image_url && (
                        <div className="ml-4">
                          <img 
                            src={word.image_url} 
                            alt={word.en}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowWordSetModal(false)}
                  className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


