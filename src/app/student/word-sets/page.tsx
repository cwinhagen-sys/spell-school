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
  due_date: string | null
  class_id: string | null
  student_id: string | null
  word_sets: WordSet | null
}

export default function StudentWordSetsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigned, setAssigned] = useState<AssignedRecord[]>([])
  const [activeWordSets, setActiveWordSets] = useState<AssignedRecord[]>([])
  const [oldWordSets, setOldWordSets] = useState<AssignedRecord[]>([])
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
            // Separate cached data into active and old
            const today = new Date()
            today.setHours(23, 59, 59, 999)
            const active = parsed.filter((rec: AssignedRecord) => !rec.due_date || new Date(rec.due_date) >= today)
            const old = parsed
              .filter((rec: AssignedRecord) => rec.due_date && new Date(rec.due_date) < today)
              .sort((a: AssignedRecord, b: AssignedRecord) => {
                const dateA = a.due_date ? new Date(a.due_date).getTime() : 0
                const dateB = b.due_date ? new Date(b.due_date).getTime() : 0
                return dateB - dateA
              })
            setActiveWordSets(active)
            setOldWordSets(old)
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
            .select('id, created_at, due_date, class_id, student_id, word_sets ( id, title, words, created_at, color )')
            .eq('student_id', user.id)
        ]

        if (classIds.length > 0) {
          assignmentQueries.push(
            supabase
              .from('assigned_word_sets')
              .select('id, created_at, due_date, class_id, student_id, word_sets ( id, title, words, created_at, color )')
              .in('class_id', classIds)
              .is('student_id', null)
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

        // Merge unique by word set id (keep the one with earliest due_date if duplicates)
        const combined = [...(direct as unknown as AssignedRecord[] || []), ...classAssigned]
        const byWordSetId = new Map<string, AssignedRecord>()
        for (const rec of combined) {
          const setId = rec.word_sets?.id
          if (!setId) continue
          const existing = byWordSetId.get(setId)
          if (!existing) {
            byWordSetId.set(setId, rec)
          } else {
            // Keep the one with earlier due_date (or the one without due_date if other has one)
            const existingDate = existing.due_date ? new Date(existing.due_date).getTime() : Infinity
            const newDate = rec.due_date ? new Date(rec.due_date).getTime() : Infinity
            if (newDate < existingDate) {
              byWordSetId.set(setId, rec)
            }
          }
        }
        const unique = Array.from(byWordSetId.values())

        // Separate into active and old based on due_date
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        const active = unique.filter(rec => !rec.due_date || new Date(rec.due_date) >= today)
        const old = unique
          .filter(rec => rec.due_date && new Date(rec.due_date) < today)
          .sort((a, b) => {
            // Sort by due_date descending (newest first)
            const dateA = a.due_date ? new Date(a.due_date).getTime() : 0
            const dateB = b.due_date ? new Date(b.due_date).getTime() : 0
            return dateB - dateA
          })

        setAssigned(unique)
        setActiveWordSets(active)
        setOldWordSets(old)
        
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
    <>
      <LogoutHandler />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Word Sets</h1>
              <p className="text-gray-400">Your assigned word sets</p>
            </div>
          </div>
          <a 
            href="/student" 
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </a>
        </div>

        {loading && (
          <div className="rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-400">Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-6 border border-red-500/30 bg-red-500/20 text-red-400">{error}</div>
        )}

        {!loading && !error && (
          assigned.length === 0 ? (
            <div className="rounded-2xl p-12 border border-white/10 bg-white/5 backdrop-blur-sm text-center">
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-lg text-gray-400">No word sets assigned yet.</p>
              <p className="text-sm text-gray-500 mt-2">Come back later!</p>
            </div>
          ) : (
            <>
              {/* Active Word Sets */}
              {activeWordSets.length > 0 && (
                <div className="mb-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        Active Word Sets
                      </h2>
                      <span className="text-sm text-gray-500">
                        {activeWordSets.length} set{activeWordSets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeWordSets.map((rec) => (
                        <div 
                          key={rec.id} 
                          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all cursor-pointer group"
                          onClick={() => rec.word_sets && handleWordSetClick(rec.word_sets)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {rec.word_sets?.color && (
                              <div 
                                className="w-4 h-4 rounded-full shadow-lg" 
                                style={{ backgroundColor: rec.word_sets.color }}
                              />
                            )}
                            <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                              {rec.word_sets?.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            {rec.due_date ? (
                              <>Due: {new Date(rec.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                            ) : (
                              <>Assigned {new Date(rec.created_at).toLocaleDateString('en-US')}</>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {renderWordPreview(rec.word_sets?.words).map((w, idx) => (
                              <span key={idx} className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full border border-amber-500/30">
                                {w}
                              </span>
                            ))}
                            {Array.isArray(rec.word_sets?.words) && rec.word_sets!.words.length > 5 && (
                              <span className="bg-white/5 text-gray-400 text-xs px-2 py-1 rounded-full border border-white/10">
                                +{rec.word_sets!.words.length - 5} more
                              </span>
                            )}
                          </div>
                          <div className="mt-4 text-xs text-amber-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to see all words →
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Word Sets */}
              {oldWordSets.length > 0 && (
                <div className="mb-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-gray-400" />
                        Previous Word Sets
                      </h2>
                      <span className="text-sm text-gray-500">
                        {oldWordSets.length} set{oldWordSets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {oldWordSets.map((rec) => (
                        <div 
                          key={rec.id} 
                          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all cursor-pointer group opacity-70"
                          onClick={() => rec.word_sets && handleWordSetClick(rec.word_sets)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {rec.word_sets?.color && (
                              <div 
                                className="w-4 h-4 rounded-full shadow-lg" 
                                style={{ backgroundColor: rec.word_sets.color }}
                              />
                            )}
                            <h3 className="text-lg font-semibold text-gray-400 group-hover:text-amber-400 transition-colors">
                              {rec.word_sets?.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            {rec.due_date ? (
                              <>Was due: {new Date(rec.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                            ) : (
                              <>Assigned {new Date(rec.created_at).toLocaleDateString('en-US')}</>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {renderWordPreview(rec.word_sets?.words).map((w, idx) => (
                              <span key={idx} className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full border border-amber-500/30">
                                {w}
                              </span>
                            ))}
                            {Array.isArray(rec.word_sets?.words) && rec.word_sets!.words.length > 5 && (
                              <span className="bg-white/5 text-gray-400 text-xs px-2 py-1 rounded-full border border-white/10">
                                +{rec.word_sets!.words.length - 5} more
                              </span>
                            )}
                          </div>
                          <div className="mt-4 text-xs text-amber-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to see all words →
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* Word Set Detail Modal */}
        {showWordSetModal && selectedWordSet && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="relative w-full max-w-3xl max-h-[85vh]">
              <div className="relative rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {selectedWordSet.color && (
                      <div 
                        className="w-4 h-4 rounded-full shadow-lg" 
                        style={{ backgroundColor: selectedWordSet.color }}
                      />
                    )}
                    <h2 className="text-2xl font-bold text-white">{selectedWordSet.title}</h2>
                  </div>
                  <button
                    onClick={() => setShowWordSetModal(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div 
                  className="overflow-y-auto max-h-[55vh] pr-2 custom-scrollbar"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="grid gap-3">
                    {normalizeWords(selectedWordSet.words).map((word, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex-1">
                          <div className="font-semibold text-white text-lg">{word.en}</div>
                          {word.sv && (
                            <div className="text-gray-400 mt-1">{word.sv}</div>
                          )}
                        </div>
                        {word.image_url && (
                          <div className="ml-4">
                            <img 
                              src={word.image_url} 
                              alt={word.en}
                              className="w-16 h-16 object-cover rounded-lg border border-white/10"
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
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all font-semibold shadow-lg shadow-amber-500/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}


