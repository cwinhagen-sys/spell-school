'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Target, Clock3, Gamepad2, Filter, ChevronDown, BarChart3, RefreshCw } from 'lucide-react'

type StudentRow = {
  id: string
  email: string
  display: string
  points: number
  avgAccuracy: number | null
  sessions: number
  lastActive: string | null
}

type TimeFilter = 'today' | 'last_week' | 'last_month' | 'all'

export default function TeacherProgressPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClass, setSelectedClass] = useState<string>('') // Empty = All classes (default)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [rows, setRows] = useState<StudentRow[]>([])
  const [sortKey, setSortKey] = useState<'points' | 'accuracy' | 'sessions' | 'lastActive' | 'student'>('points')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [refreshTrigger, setRefreshTrigger] = useState(0) // For auto-refresh
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    ;(async () => {
      console.log('Progress DEBUG → useEffect triggered:', { selectedClass, timeFilter })
      try {
        setLoading(true)
        console.log('Progress DEBUG → Starting auth check...')
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Progress DEBUG → User:', user?.id)
        if (!user) { window.location.href = '/'; return }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        console.log('Progress DEBUG → Profile:', profile?.role)
        if (!profile || profile.role !== 'teacher') { window.location.href = '/student'; return }

        console.log('Progress DEBUG → Loading classes...')
        const { data: cls } = await supabase
          .from('classes')
          .select('id,name')
          .eq('teacher_id', user.id)
          .order('name', { ascending: true })
        console.log('Progress DEBUG → Classes loaded:', cls?.length || 0)
        setClasses((cls as any[] || []).map(c => ({ id: c.id, name: c.name })))
      } catch (e: any) {
        setError(e?.message || 'Failed to load classes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Auto-refresh data every 15 seconds to update "Playing" status more frequently
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Progress DEBUG → Auto-refreshing data...')
      setRefreshTrigger(prev => prev + 1)
    }, 15000) // 15 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    ;(async () => {
      console.log('Progress DEBUG → Second useEffect triggered:', { selectedClass, timeFilter })
      // Always run the query - empty selectedClass means "All classes"
      try {
        setLoading(true)
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get students for class (or all classes if none selected)
        let studentIds: string[] = []
        
        if (selectedClass) {
          // Get students from specific class
          const { data: links, error: linksError } = await supabase
            .from('class_students')
            .select('student_id, classes!inner(id, teacher_id)')
            .eq('classes.teacher_id', user.id)
            .eq('class_id', selectedClass)
          
          console.log('Progress DEBUG → class', selectedClass, 'links result:', { links, linksError })
          
          if (links && links.length > 0) {
            studentIds = Array.from(new Set((links as any[]).map(l => l.student_id).filter(Boolean)))
          }
          
          // Fallback: if inner join fails, try simpler approach
          if (studentIds.length === 0) {
            console.log('Progress DEBUG → inner join failed, trying fallback...')
            const { data: fallbackLinks } = await supabase
              .from('class_students')
              .select('student_id')
              .eq('class_id', selectedClass)
            if (fallbackLinks) {
              studentIds = Array.from(new Set((fallbackLinks as any[]).map(l => l.student_id).filter(Boolean)))
              console.log('Progress DEBUG → fallback got', studentIds.length, 'students')
            }
          }
        } else {
          // Get all students from all classes for this teacher
          const { data: teacherClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('teacher_id', user.id)
          
          console.log('Progress DEBUG → Teacher classes:', teacherClasses?.length || 0)
          
          if (teacherClasses && teacherClasses.length > 0) {
            const classIds = teacherClasses.map(c => c.id)
            const { data: allClassStudents } = await supabase
              .from('class_students')
              .select('student_id')
              .in('class_id', classIds)
            
            studentIds = (allClassStudents as any[] || []).map(cs => cs.student_id)
            console.log('Progress DEBUG → Students from all teacher classes:', studentIds.length)
          }
        }
        
        console.log('Progress DEBUG → Final student IDs:', studentIds.length, studentIds)
        
        if (studentIds.length === 0) { 
          console.log('Progress DEBUG → no students found')
          setRows([]); 
          setLoading(false); 
          return 
        }
        
        console.log('Progress DEBUG → found students:', studentIds)

        // Build time window
        const now = new Date()
        const since = (() => {
          if (timeFilter === 'today') {
            const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString()
          }
          if (timeFilter === 'last_week') {
            const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString()
          }
          if (timeFilter === 'last_month') {
            const d = new Date(now); d.setMonth(d.getMonth() - 1); return d.toISOString()
          }
          return null
        })()

        // Fetch sessions for those students (for aggregates)
        let q = supabase
          .from('game_sessions')
          .select('student_id, score, accuracy_pct, finished_at')
          .in('student_id', studentIds)
          .not('finished_at', 'is', null)
        if (since) q = q.gte('finished_at', since)
        const { data: sessions, error: sessionsError } = await q
        
        console.log('Progress DEBUG → sessions query result:', { 
          sessionsCount: sessions?.length || 0, 
          sessionsError,
          timeFilter,
          since: since ? new Date(since).toISOString() : 'none',
          studentIdsCount: studentIds.length
        })

        const byStudent: Record<string, { points: number; count: number; accSum: number; lastActive: string | null }> = {}
        for (const id of studentIds) byStudent[id] = { points: 0, count: 0, accSum: 0, lastActive: null }
        for (const s of (sessions as any[] || [])) {
          const sid = s.student_id as string
          const slot = byStudent[sid] || (byStudent[sid] = { points: 0, count: 0, accSum: 0, lastActive: null })
          slot.points += (s.score ?? 0)
          slot.count += 1
          if (typeof s.accuracy_pct === 'number') slot.accSum += s.accuracy_pct
          const ts = s.finished_at as string | null
          if (ts) {
            if (!slot.lastActive || new Date(ts).getTime() > new Date(slot.lastActive).getTime()) slot.lastActive = ts
          }
        }

        // Fetch display names and last_active
        const { data: profs, error: profsError } = await supabase
          .from('profiles')
          .select('id,email,display_alias,last_active')
          .in('id', studentIds)
        
        if (profsError) {
          console.log('Error fetching profiles (may be missing last_active column):', profsError)
          // Try without last_active if column doesn't exist
          if (profsError.code === '42703') {
            const { data: profsFallback } = await supabase
              .from('profiles')
              .select('id,email,display_alias')
              .in('id', studentIds)
            
            if (profsFallback) {
              // Add null last_active for all profiles
              const profsWithNullActive = profsFallback.map(p => ({ ...p, last_active: null }))
              setRows(prevRows => prevRows.map(row => {
                const profile = profsWithNullActive.find(p => p.id === row.id)
                return {
                  ...row,
                  lastActive: profile?.last_active || null
                }
              }))
            }
          }
        }
        
        console.log('Progress DEBUG → profiles result:', { 
          profilesCount: profs?.length || 0, 
          profsError,
          studentIds 
        })

        const idToDisplay: Record<string, { email: string; display: string; lastActive: string | null }> = {}
        for (const p of (profs as any[] || [])) {
          const email: string = p.email
          const disp = (p.display_alias || (email ? String(email).split('@')[0] : p.id)) as string
          idToDisplay[p.id] = { email, display: disp, lastActive: p.last_active }
        }

        const out: StudentRow[] = studentIds.map(id => {
          const agg = byStudent[id] || { points: 0, count: 0, accSum: 0, lastActive: null }
          const info = idToDisplay[id] || { email: id, display: id, lastActive: null }
          const avgAccuracy = agg.count > 0 ? Math.round(agg.accSum / agg.count) : null
          
          // Use the most recent activity: either from games or from profile login
          let bestLastActive = agg.lastActive
          if (info.lastActive) {
            if (!bestLastActive || new Date(info.lastActive).getTime() > new Date(bestLastActive).getTime()) {
              bestLastActive = info.lastActive
            }
          }
          
          return {
            id,
            email: info.email,
            display: info.display,
            points: agg.points,
            avgAccuracy,
            sessions: agg.count,
            lastActive: bestLastActive,
          }
        })

        console.log('Progress DEBUG → final output:', { 
          rowsCount: out.length,
          sampleRow: out[0],
          byStudent,
          idToDisplay
        })

        setRows(out)
        setLastUpdated(new Date())
      } catch (e: any) {
        setError(e?.message || 'Failed to load progress')
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedClass, timeFilter, refreshTrigger])

  const sorted = useMemo(() => {
    const list = [...rows]
    const dir = sortDir === 'desc' ? -1 : 1
    list.sort((a, b) => {
      if (sortKey === 'points') return (a.points === b.points ? 0 : a.points < b.points ? dir : -dir)
      if (sortKey === 'accuracy') {
        const aa = a.avgAccuracy ?? -1, bb = b.avgAccuracy ?? -1
        return (aa === bb ? 0 : aa < bb ? dir : -dir)
      }
      if (sortKey === 'sessions') return (a.sessions === b.sessions ? 0 : a.sessions < b.sessions ? dir : -dir)
      if (sortKey === 'lastActive') {
        const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0
        const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0
        return (ta === tb ? 0 : ta < tb ? dir : -dir)
      }
      // student
      return a.display.toLowerCase().localeCompare(b.display.toLowerCase()) * (sortDir === 'desc' ? -1 : 1)
    })
    return list
  }, [rows, sortKey, sortDir])

  const sortToggle = (key: typeof sortKey) => {
    setSortKey(k => key)
    setSortDir(d => (sortKey === key ? (d === 'desc' ? 'asc' : 'desc') : 'desc'))
  }

  // Helper functions for color coding - Clean design
  const getAccuracyColor = (accuracy: number): string => {
    return 'text-gray-800' // All accuracy in same clean color
  }

  const getSessionBadgeColor = (sessions: number): string => {
    return 'bg-gray-100 text-gray-800 border border-gray-200' // Clean consistent styling
  }

  const formatLastActive = (timestamp: string): { text: string; isPlaying: boolean; exactTime: string } => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    // Check if student is currently playing (active within last 2 minutes)
    // Only show "Playing" for truly active students
    const isPlaying = diffMinutes <= 2
    
    // Format exact time
    const exactTime = date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    let text: string
    if (isPlaying) {
      text = 'Playing'
    } else if (diffMinutes < 60) {
      text = `${diffMinutes} min ago`
    } else if (diffHours < 24) {
      text = `${diffHours}h ago`
    } else if (diffDays === 1) {
      text = 'Yesterday'
    } else if (diffDays < 7) {
      text = `${diffDays} days ago`
    } else if (diffDays < 30) {
      text = `${Math.floor(diffDays / 7)} weeks ago`
    } else {
      text = date.toLocaleDateString('sv-SE')
    }
    
    return { text, isPlaying, exactTime }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Student Progress
          </h1>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded text-sm transition-colors shadow-md"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-4 text-sm">
            {(() => {
              const activeStudents = rows.filter(s => s.lastActive && formatLastActive(s.lastActive).isPlaying).length
              const totalStudents = rows.length
              return (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-medium">{activeStudents}</span>
                    <span className="text-gray-600">playing now</span>
                  </div>
                  <div className="text-gray-400">•</div>
                  <div className="text-gray-600">
                    {totalStudents} total students
                  </div>
                  {lastUpdated && (
                    <>
                      <div className="text-gray-400">•</div>
                      <div className="text-gray-500 text-xs">
                        Updated {lastUpdated.toLocaleTimeString('sv-SE')}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 shadow-sm">
              <option value="" className="text-gray-800">All classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Time</label>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select value={timeFilter} onChange={e => setTimeFilter(e.target.value as TimeFilter)} className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 shadow-sm">
                <option value="today" className="text-gray-800">Today</option>
                <option value="last_week" className="text-gray-800">Last week</option>
                <option value="last_month" className="text-gray-800">Last month</option>
                <option value="all" className="text-gray-800">All time</option>
              </select>
            </div>
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
                      <span className="font-medium">Student</span>
                      {sortKey==='student' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('points')}>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium">Points</span>
                      {sortKey==='points' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('accuracy')}>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Avg. Accuracy</span>
                      {sortKey==='accuracy' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('sessions')}>
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Sessions</span>
                      {sortKey==='sessions' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:bg-gray-200 transition-colors" onClick={() => sortToggle('lastActive')}>
                    <div className="flex items-center gap-2">
                      <Clock3 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Last Active</span>
                      {sortKey==='lastActive' && (
                        <span className="text-gray-600">{sortDir==='desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Hover for exact time</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Gamepad2 className="w-8 h-8 opacity-50" />
                        <span>No data available</span>
                      </div>
                    </td>
                  </tr>
                ) : sorted.map((s, index) => (
                  <tr key={s.id} className="bg-white hover:bg-gray-50 border-b border-gray-200">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-medium text-white">
                          {s.display.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-700">{s.display}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base text-gray-700">{s.points}</span>
                        <Trophy className="w-4 h-4 text-yellow-600" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.avgAccuracy !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-base ${getAccuracyColor(s.avgAccuracy)}`}>
                            {s.avgAccuracy}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base text-gray-700">{s.sessions}</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionBadgeColor(s.sessions)}`}>
                          {s.sessions === 1 ? 'session' : 'sessions'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.lastActive ? (
                        <div className="flex flex-col gap-1 group">
                          <div className="flex items-center gap-2">
                            <Clock3 className={`w-4 h-4 ${formatLastActive(s.lastActive).isPlaying ? 'text-green-600' : 'text-gray-500'}`} />
                            <span className={`text-sm font-medium ${formatLastActive(s.lastActive).isPlaying ? 'text-green-600' : 'text-gray-700'}`}>
                              {formatLastActive(s.lastActive).text}
                            </span>
                            {formatLastActive(s.lastActive).isPlaying && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 ml-6 group-hover:text-gray-600 transition-colors">
                            {formatLastActive(s.lastActive).exactTime}
                          </div>
                          {/* Hover tooltip */}
                          <div className="absolute z-10 invisible group-hover:visible bg-gray-100 text-gray-800 text-xs rounded py-1 px-2 shadow-lg border border-gray-300 mt-1 ml-6">
                            Last activity: {formatLastActive(s.lastActive).exactTime}
                            {formatLastActive(s.lastActive).isPlaying && ' (Currently playing)'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
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


