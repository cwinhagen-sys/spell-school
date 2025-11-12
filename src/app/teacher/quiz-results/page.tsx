'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Users, BookOpen, Filter, Calendar, Star, Target, Clock, ChevronDown, ChevronUp, Eye } from 'lucide-react'

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

type WordDetail = {
  prompt: string
  expected: string
  given: string
  verdict: 'correct' | 'partial' | 'wrong' | 'empty'
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
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null)
  const [quizDetails, setQuizDetails] = useState<Record<string, WordDetail[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

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
    return 'text-gray-800' // Clean design - all scores in same color
  }

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const fetchQuizDetails = async (result: QuizResult) => {
    const quizKey = result.id
    if (quizDetails[quizKey]) {
      // Already loaded, just toggle
      setExpandedQuiz(expandedQuiz === quizKey ? null : quizKey)
      return
    }

    setLoadingDetails(prev => ({ ...prev, [quizKey]: true }))
    try {
      // Find matching game session with detailed evaluations
      const { data: quizSessions, error } = await supabase
        .from('game_sessions')
        .select('id, word_set_id, homework_id, score, accuracy_pct, finished_at, details')
        .eq('student_id', result.student_id)
        .eq('game_type', 'quiz')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(50) // Get recent sessions to find matching one

      if (error) {
        console.error('Error fetching quiz sessions:', error)
        setLoadingDetails(prev => ({ ...prev, [quizKey]: false }))
        return
      }

      // Find matching session by word_set_id and time
      const matchingSession = quizSessions?.find(s => {
        const timeDiff = Math.abs(new Date(s.finished_at).getTime() - new Date(result.last_quiz_at).getTime())
        const withinTimeWindow = timeDiff < 300000 // Within 5 minutes
        
        if (result.word_set_id && s.word_set_id) {
          return s.word_set_id === result.word_set_id && withinTimeWindow
        }
        
        // Fallback: match by time only
        return withinTimeWindow
      })

      let wordDetails: WordDetail[] = []
      
      if (matchingSession?.details) {
        let details: any = null
        
        // Handle different detail formats (object or JSON string)
        if (typeof matchingSession.details === 'string') {
          try {
            details = JSON.parse(matchingSession.details)
          } catch (e) {
            console.error('Failed to parse details JSON:', e)
          }
        } else if (typeof matchingSession.details === 'object') {
          details = matchingSession.details
        }
        
        if (details && details.evaluations && Array.isArray(details.evaluations)) {
          wordDetails = details.evaluations.map((e: any) => ({
            prompt: e.prompt || '',
            expected: e.expected || '',
            given: e.given || '',
            verdict: !e.given || (typeof e.given === 'string' && e.given.trim() === '') 
              ? 'empty' 
              : (e.verdict || 'wrong')
          }))
        }
      }

      setQuizDetails(prev => ({ ...prev, [quizKey]: wordDetails }))
      setExpandedQuiz(quizKey)
    } catch (error) {
      console.error('Error fetching quiz details:', error)
    } finally {
      setLoadingDetails(prev => ({ ...prev, [quizKey]: false }))
    }
  }

  const getWordDetails = (result: QuizResult): WordDetail[] => {
    return quizDetails[result.id] || []
  }

  const getWordCounts = (wordDetails: WordDetail[]) => {
    return {
      correct: wordDetails.filter(w => w.verdict === 'correct').length,
      partial: wordDetails.filter(w => w.verdict === 'partial').length,
      wrong: wordDetails.filter(w => w.verdict === 'wrong').length,
      empty: wordDetails.filter(w => w.verdict === 'empty').length
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <FileText className="w-6 h-6 text-indigo-600" />
            Quiz Results
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Class</label>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)} 
              className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 shadow-sm"
            >
              <option value="" className="text-gray-800">All classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Word Set</label>
            <select 
              value={selectedWordSet} 
              onChange={e => setSelectedWordSet(e.target.value)} 
              className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 shadow-sm"
            >
              <option value="" className="text-gray-800">All word sets</option>
              {wordSets.map(w => (
                <option key={w.id} value={w.id} className="text-gray-800">{w.title}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 rounded-2xl bg-white/80 border border-gray-200 shadow-lg">Loading…</div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-100 border border-red-300 text-red-700">{error}</div>
        ) : (
          <div className="rounded-2xl bg-white/80 border border-gray-200 overflow-auto shadow-xl">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 text-left text-sm text-gray-800 border-b border-gray-300">
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('student')}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium">Student</span>
                      {sortKey==='student' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('score')}>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium">Quiz Score</span>
                      {sortKey==='score' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Percentage</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('wordSet')}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Word Set</span>
                      {sortKey==='wordSet' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('date')}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Date</span>
                      {sortKey==='date' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium">Details</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 opacity-50" />
                        <span>No quiz results found</span>
                      </div>
                    </td>
                  </tr>
                ) : sorted.map((result, index) => {
                  const isExpanded = expandedQuiz === result.id
                  const wordDetails = getWordDetails(result)
                  const hasDetails = wordDetails.length > 0
                  const counts = hasDetails ? getWordCounts(wordDetails) : null
                  
                  return (
                    <>
                      <tr key={result.id} className="bg-white hover:bg-gray-50 border-b border-gray-200">
                        <td className="px-6 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-medium text-white">
                              {result.student_display.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">{result.student_display}</div>
                              {result.class_name !== 'No Class' && (
                                <div className="text-xs text-gray-500">{result.class_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-base text-gray-800">
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
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{result.word_set_title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{formatDate(result.last_quiz_at)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => fetchQuizDetails(result)}
                            disabled={loadingDetails[result.id]}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingDetails[result.id] ? (
                              <span>Loading...</span>
                            ) : (
                              <>
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    <span>Dölj detaljer</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    <span>Visa detaljer</span>
                                  </>
                                )}
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr key={`${result.id}-details`} className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white rounded-lg border-2 border-indigo-200 p-5">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">Detaljer per ord</h4>
                              
                              {/* Summary Stats */}
                              {counts && (
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-2xl font-bold text-green-700">{counts.correct}</div>
                                    <div className="text-xs text-green-600">Rätt</div>
                                  </div>
                                  <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="text-2xl font-bold text-yellow-700">{counts.partial}</div>
                                    <div className="text-xs text-yellow-600">Nästan rätt</div>
                                  </div>
                                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div className="text-2xl font-bold text-red-700">{counts.wrong}</div>
                                    <div className="text-xs text-red-600">Fel</div>
                                  </div>
                                  <div className="text-center p-3 bg-gray-100 rounded-lg border border-gray-300">
                                    <div className="text-2xl font-bold text-gray-700">{counts.empty}</div>
                                    <div className="text-xs text-gray-600">Tomt</div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Word-by-word List */}
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {wordDetails.map((word, wordIndex) => (
                                  <div
                                    key={wordIndex}
                                    className={`p-3 rounded-lg border-2 ${
                                      word.verdict === 'correct' ? 'bg-green-50 border-green-200' :
                                      word.verdict === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                                      word.verdict === 'wrong' ? 'bg-red-50 border-red-200' :
                                      'bg-gray-50 border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900 mb-1">{word.prompt}</div>
                                        <div className="text-sm text-gray-600 mb-1">
                                          <span className="font-medium">Förväntat: </span>
                                          <span className="text-gray-900">{word.expected}</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">Svar: </span>
                                          <span className={word.given ? 'text-gray-900' : 'text-gray-400 italic'}>
                                            {word.given || '(tomt)'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className={`text-xs font-semibold px-2 py-1 rounded ${
                                        word.verdict === 'correct' ? 'bg-green-100 text-green-700' :
                                        word.verdict === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                        word.verdict === 'wrong' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-200 text-gray-700'
                                      }`}>
                                        {word.verdict === 'correct' ? 'Rätt' :
                                         word.verdict === 'partial' ? 'Nästan' :
                                         word.verdict === 'wrong' ? 'Fel' : 'Tomt'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && !hasDetails && !loadingDetails[result.id] && (
                        <tr key={`${result.id}-no-details`} className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white rounded-lg border-2 border-gray-200 p-5 text-center">
                              <p className="text-gray-600">Ingen detaljerad information tillgänglig för detta quiz.</p>
                              <p className="text-sm text-gray-500 mt-2">Detaljerad information sparas endast för quiz som slutförts efter denna funktion lades till.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}