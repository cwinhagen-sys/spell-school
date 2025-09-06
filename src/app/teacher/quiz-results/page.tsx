'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Users, BookOpen, Filter, Calendar, Star, Target, Clock } from 'lucide-react'

type QuizResult = {
  id: string
  student_id: string
  student_display: string
  student_email: string
  word_set_id: string | null
  word_set_title: string | null
  last_quiz_score: number
  last_quiz_at: string
  class_id: string | null
  class_name: string | null
  total_questions: number
}

type Class = {
  id: string
  name: string
}

type WordSet = {
  id: string
  title: string
}

export default function QuizResultsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [results, setResults] = useState<QuizResult[]>([])
  const [sortKey, setSortKey] = useState<'student' | 'score' | 'date' | 'wordSet'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/'; return }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'teacher') { window.location.href = '/student'; return }

        // Load classes
        const { data: cls } = await supabase
          .from('classes')
          .select('id,name')
          .eq('teacher_id', user.id)
          .order('name', { ascending: true })
        setClasses((cls as any[] || []).map(c => ({ id: c.id, name: c.name })))

        // Load word sets
        const { data: ws } = await supabase
          .from('word_sets')
          .select('id,title')
          .eq('teacher_id', user.id)
          .order('title', { ascending: true })
        setWordSets((ws as any[] || []).map(w => ({ id: w.id, title: w.title })))

      } catch (e: any) {
        setError(e?.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      console.log('Quiz Results DEBUG → useEffect triggered:', { selectedClass, selectedWordSet })
      // Always run the query - empty values mean "show all"
      try {
        setLoading(true)
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

                // First get all students for this teacher (either from specific class or all classes)
        let studentIds: string[] = []
        if (selectedClass) {
          // Get students from specific class
          const { data: classStudents } = await supabase
            .from('class_students')
            .select('student_id')
            .eq('class_id', selectedClass)
          studentIds = (classStudents as any[] || []).map(cs => cs.student_id)
        } else {
          // Two-step approach: first get teacher's classes, then get students from those classes
          const { data: teacherClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('teacher_id', user.id)
          
          console.log('Quiz Results DEBUG → Teacher classes:', teacherClasses?.length || 0)
          
          if (teacherClasses && teacherClasses.length > 0) {
            const classIds = teacherClasses.map(c => c.id)
            const { data: allClassStudents } = await supabase
              .from('class_students')
              .select('student_id')
              .in('class_id', classIds)
            
            studentIds = (allClassStudents as any[] || []).map(cs => cs.student_id)
            console.log('Quiz Results DEBUG → Students from teacher classes:', studentIds.length)
          } else {
            console.log('Quiz Results DEBUG → No classes found for teacher')
            studentIds = []
          }
        }

        console.log('Quiz Results DEBUG → Student IDs found:', studentIds.length)

        // Build query for quiz results
        let query = supabase
          .from('student_progress')
          .select('id, student_id, word_set_id, last_quiz_score, last_quiz_at, last_quiz_total')
          .not('last_quiz_score', 'is', null)
          .not('last_quiz_at', 'is', null)
          .not('word_set_id', 'is', null) // Only show results with word_set_id (no global quiz results)

        // Always filter by student IDs to ensure RLS safety
        if (studentIds.length > 0) {
          query = query.in('student_id', studentIds)
        } else {
          // If no students found, return empty results
          setResults([])
          return
        }

        if (selectedWordSet) {
          query = query.eq('word_set_id', selectedWordSet)
        }

        const { data: quizData, error: queryError } = await query

        console.log('Quiz Results DEBUG → Query result:', { 
          quizDataCount: quizData?.length || 0, 
          queryError,
          selectedClass,
          selectedWordSet
        })

        if (queryError) throw queryError

        if (!quizData || quizData.length === 0) {
          console.log('Quiz Results DEBUG → No quiz data found')
          setResults([])
          return
        }

        // Get all unique student IDs and word set IDs
        const allStudentIds = [...new Set((quizData as any[]).map(row => row.student_id))]
        const allWordSetIds = [...new Set((quizData as any[]).map(row => row.word_set_id).filter(Boolean))]

        // Fetch profiles separately
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, display_alias')
          .in('id', allStudentIds)

        // Fetch word sets separately
        const { data: wordSets } = await supabase
          .from('word_sets')
          .select('id, title')
          .in('id', allWordSetIds)

        // Create lookup maps
        const profileMap: Record<string, { email: string; display_alias: string | null }> = {}
        for (const profile of (profiles as any[] || [])) {
          profileMap[profile.id] = { email: profile.email, display_alias: profile.display_alias }
        }

        const wordSetMap: Record<string, string> = {}
        for (const ws of (wordSets as any[] || [])) {
          wordSetMap[ws.id] = ws.title
        }

        // Get class memberships for all students
        const { data: classMemberships } = await supabase
          .from('class_students')
          .select(`
            student_id,
            class_id,
            classes!inner(id, name, teacher_id)
          `)
          .eq('classes.teacher_id', user.id)
          .in('student_id', allStudentIds)

        const studentToClass: Record<string, { class_id: string; class_name: string }> = {}
        for (const cm of (classMemberships as any[] || [])) {
          studentToClass[cm.student_id] = {
            class_id: cm.class_id,
            class_name: cm.classes?.name || 'Unknown Class'
          }
        }

        // Process results
        const processedResults: QuizResult[] = (quizData as any[]).map(row => {
          const profile = profileMap[row.student_id] || { email: '', display_alias: null }
          const classInfo = studentToClass[row.student_id] || { class_id: null, class_name: 'No Class' }
          const wordSetTitle = row.word_set_id ? wordSetMap[row.word_set_id] || 'Unknown Word Set' : 'Global Quiz'
          
          return {
            id: row.id,
            student_id: row.student_id,
            student_display: profile.display_alias || (profile.email ? String(profile.email).split('@')[0] : row.student_id),
            student_email: profile.email || '',
            word_set_id: row.word_set_id,
            word_set_title: wordSetTitle,
            last_quiz_score: row.last_quiz_score,
            last_quiz_at: row.last_quiz_at,
            class_id: classInfo.class_id,
            class_name: classInfo.class_name,
            total_questions: row.last_quiz_total || 0
          }
        })

        setResults(processedResults)
      } catch (e: any) {
        setError(e?.message || 'Failed to load quiz results')
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedClass, selectedWordSet])

  const sorted = useMemo(() => {
    const list = [...results]
    const dir = sortDir === 'desc' ? -1 : 1
    list.sort((a, b) => {
      if (sortKey === 'student') {
        return a.student_display.toLowerCase().localeCompare(b.student_display.toLowerCase()) * (sortDir === 'desc' ? -1 : 1)
      }
      if (sortKey === 'score') {
        return (a.last_quiz_score === b.last_quiz_score ? 0 : a.last_quiz_score < b.last_quiz_score ? dir : -dir)
      }
      if (sortKey === 'date') {
        const ta = new Date(a.last_quiz_at).getTime()
        const tb = new Date(b.last_quiz_at).getTime()
        return (ta === tb ? 0 : ta < tb ? dir : -dir)
      }
      if (sortKey === 'wordSet') {
        return (a.word_set_title || '').toLowerCase().localeCompare((b.word_set_title || '').toLowerCase()) * (sortDir === 'desc' ? -1 : 1)
      }
      return 0
    })
    return list
  }, [results, sortKey, sortDir])

  const sortToggle = (key: typeof sortKey) => {
    setSortKey(k => key)
    setSortDir(d => (sortKey === key ? (d === 'desc' ? 'asc' : 'desc') : 'desc'))
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-emerald-200'
    if (score >= 75) return 'text-lime-200'
    if (score >= 60) return 'text-yellow-200'
    if (score >= 40) return 'text-orange-200'
    return 'text-red-200'
  }

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Quiz Results
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Class</label>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)} 
              className="px-3 py-2 rounded bg-white/5 border border-white/10 text-white"
            >
              <option value="" className="text-black">All classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-black">{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Word Set</label>
            <select 
              value={selectedWordSet} 
              onChange={e => setSelectedWordSet(e.target.value)} 
              className="px-3 py-2 rounded bg-white/5 border border-white/10 text-white"
            >
              <option value="" className="text-black">All word sets</option>
              {wordSets.map(w => (
                <option key={w.id} value={w.id} className="text-black">{w.title}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">Loading…</div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200">{error}</div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-auto shadow-xl">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-800/50 text-left text-sm text-gray-100 border-b border-gray-700">
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-700/30 transition-colors" onClick={() => sortToggle('student')}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Student</span>
                      {sortKey==='student' && (
                        <span className="text-gray-300">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-700/30 transition-colors" onClick={() => sortToggle('score')}>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Quiz Score</span>
                      {sortKey==='score' && (
                        <span className="text-gray-300">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Percentage</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-700/30 transition-colors" onClick={() => sortToggle('wordSet')}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Word Set</span>
                      {sortKey==='wordSet' && (
                        <span className="text-gray-300">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-700/30 transition-colors" onClick={() => sortToggle('date')}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Date</span>
                      {sortKey==='date' && (
                        <span className="text-gray-300">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 opacity-50" />
                        <span>No quiz results found</span>
                      </div>
                    </td>
                  </tr>
                ) : sorted.map((result, index) => (
                  <tr key={result.id} className={`border-t border-gray-700 text-sm transition-colors hover:bg-gray-800/30 ${index % 2 === 0 ? 'bg-gray-800/10' : 'bg-gray-800/20'}`}>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-200">
                          {result.student_display.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{result.student_display}</div>
                          {result.class_name !== 'No Class' && (
                            <div className="text-xs text-gray-400">{result.class_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base text-gray-200">
                          {result.last_quiz_score}/{result.total_questions || '?'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {result.total_questions && result.total_questions > 0 ? (
                          <>
                            <span className={`font-medium text-base ${getScoreColor(Math.round((result.last_quiz_score / result.total_questions) * 100))}`}>
                              {Math.round((result.last_quiz_score / result.total_questions) * 100)}%
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-base text-gray-500">
                            N/A
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{result.word_set_title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(result.last_quiz_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}