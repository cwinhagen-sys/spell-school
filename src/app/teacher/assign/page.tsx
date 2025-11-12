'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GridConfigModal, { GridConfig } from '@/components/GridConfigModal'

type WordSet = { id: string; title: string; color?: string; words?: Array<{ en: string; sv: string }> }
type Class = { id: string; name: string }
type Student = { id: string; email: string; role: string; display?: string }
type Assignment = { id: string; word_set_title: string; word_set_color?: string; class_name?: string; student_name?: string }

export default function AssignWordSetsPage() {
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classStudentsForSelected, setClassStudentsForSelected] = useState<Student[]>([])
  const [studentToClasses, setStudentToClasses] = useState<Record<string, string[]>>({})
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [targetClass, setTargetClass] = useState<string>('')
  const [targetStudent, setTargetStudent] = useState<string>('')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [dueDate, setDueDate] = useState<string>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showGridConfig, setShowGridConfig] = useState(false)
  const [wordSetForConfig, setWordSetForConfig] = useState<WordSet | null>(null)
  const [gridConfigs, setGridConfigs] = useState<Record<string, GridConfig[]>>({}) // word_set_id -> grids

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { 
          window.location.href = '/'; 
          return 
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profileError) throw profileError
        
        if (!profile || profile.role !== 'teacher') { 
          window.location.href = '/student'; 
          return 
        }

        await loadWordSets()
        await loadClasses()
        // Defer student loading until a class is selected to avoid RLS noise
        await loadAssignments()
      } catch (error) {
        console.error('Init error:', error)
      }
    }
    init()

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showClassDropdown && !target.closest('.class-dropdown-container')) {
        setShowClassDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClassDropdown])

  // (Removed debug exposure)

  // Load students for the selected class when targetClass changes
  useEffect(() => {
    ;(async () => {
      try {
        if (!targetClass) { setClassStudentsForSelected([]); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setClassStudentsForSelected([]); return }
        // Primary attempt: mirror Classes page pattern (IDs -> profiles)
        // Step 1: RLS-safe primary: enforce teacher ownership via inner join
        const { data: classLinks, error: linkErr } = await supabase
          .from('class_students')
          .select('student_id, classes!inner(id, teacher_id)')
          .eq('classes.teacher_id', user.id)
          .eq('class_id', targetClass)
        // If this RLS-friendly join fails, continue to fallbacks
        if (linkErr) {
          console.warn('Assign DEBUG → inner join failed, will try fallbacks:', linkErr)
        }
        const ids = (classLinks || []).map((r: any) => r.student_id).filter(Boolean)
        let list: Student[] = []
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id,email,role,username')
            .in('id', ids)
          list = (profs || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            role: p.role,
            display: p.username || 'Student',
            username: p.username
          }))
          // If profiles are unreadable due to RLS or missing, still show raw IDs
          if ((!profs || profs.length === 0) && ids.length > 0) {
            list = ids.map((sid: string) => ({
              id: sid,
              email: '',
              role: '',
              display: undefined,
            }))
          }
        }

        // Fallback A: simple lookup without explicit join (in case RLS allows it)
        if (!list || list.length === 0) {
          try {
            const { data: idsOnly } = await supabase
              .from('class_students')
              .select('student_id')
              .eq('class_id', targetClass)
            const altIds = Array.from(new Set((idsOnly || []).map((r: any) => r.student_id).filter(Boolean)))
            if (altIds.length > 0) {
              const { data: profs2 } = await supabase
                .from('profiles')
                .select('id,email,role,username')
                .in('id', altIds)
              const mapped = (profs2 || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                role: p.role,
                display: p.username || 'Student',
                username: p.username
              }))
              list = mapped.length > 0 ? mapped : altIds.map((sid: string) => ({ id: sid, email: '', role: '', display: undefined }))
            }
          } catch (_) {
            // ignore and continue to next fallback
          }
        }

        // Fallback B: fetch IDs then profiles via IN (last resort if allowed by RLS)
        if (!list || list.length === 0) {
          try {
            const { data: ids } = await supabase
              .from('class_students')
              .select('student_id')
              .eq('class_id', targetClass)
            const studentIds: string[] = Array.from(new Set((ids || []).map((r: any) => r.student_id).filter(Boolean)))
            if (studentIds.length > 0) {
              const { data: profs } = await supabase
                .from('profiles')
                .select('id,email,role,username')
                .in('id', studentIds)
              list = (profs || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                role: p.role,
                display: p.username || 'Student',
                username: p.username
              }))
            }
          } catch (_) {
            // ignore
          }
        }

        // Fallback C: enrich existing ID-only entries via RLS-friendly join with profiles
        const needsEnrichment = (list || []).some(s => !s.email && !s.display)
        if (list && list.length > 0 && needsEnrichment) {
          try {
            const { data: joined } = await supabase
              .from('class_students')
              .select('student_id, profiles!inner(id,email,role,username), classes!inner(id,teacher_id)')
              .eq('classes.teacher_id', user.id)
              .eq('class_id', targetClass)
            const byId: Record<string, any> = {}
            for (const row of (joined as any[] || [])) {
              const prof = row.profiles || {}
              const disp = prof.username || 'Student'
              byId[row.student_id] = { email: prof.email as string | undefined, display: disp, username: prof.username }
            }
            list = list.map(s => {
              const info = byId[s.id]
              if (!info) return s
              return {
                ...s,
                email: s.email || info.email || '',
                display: s.display || info.display,
                username: (s as any).username || info.username
              }
            })
          } catch (_) {
            // ignore
          }
        }
        setClassStudentsForSelected(list || [])
      } catch (e) {
        setClassStudentsForSelected([])
      }
    })()
  }, [targetClass])

  const loadWordSets = async () => {
    try {
      const { data, error } = await supabase
        .from('word_sets')
        .select('id, title, color, words')
        .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const sets = (data || []).map(ws => ({
        id: ws.id,
        title: ws.title,
        color: ws.color,
        words: ws.words || []
      }))
      
      setWordSets(sets)
      
      // Load existing grid configurations if they exist
      const configs: Record<string, GridConfig[]> = {}
      for (const ws of sets) {
        const { data: configData } = await supabase
          .from('word_sets')
          .select('grid_config')
          .eq('id', ws.id)
          .single()
        
        if (configData?.grid_config) {
          configs[ws.id] = configData.grid_config
        }
      }
      setGridConfigs(configs)
    } catch (error) {
      console.error('Error loading word sets:', error)
      setMessage('Failed to load word sets')
    }
  }

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id)
        .is('deleted_at', null) // Only get non-deleted classes
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
      setMessage('Failed to load classes')
    }
  }

  const loadStudents = async () => {
    try {
      const { data: classStudents, error: csError } = await supabase
        .from('class_students')
        .select(`
          student_id,
          class_id,
          classes!inner(teacher_id),
          profiles!inner(id, email, role, display_alias)
        `)
        .eq('classes.teacher_id', (await supabase.auth.getUser()).data.user?.id)
      
      if (csError) throw csError
      
      // Extract unique students
      const uniqueStudents = new Map<string, Student>()
      const map: Record<string, string[]> = {}
      ;(classStudents || []).forEach((cs: any) => {
        const prof = cs.profiles
        const cid = String(cs.class_id || '')
        const sid = String(cs.student_id || prof?.id || '')
        if (!sid) return
        if (!map[sid]) map[sid] = []
        if (cid && !map[sid].includes(cid)) map[sid].push(cid)
        if (prof && !uniqueStudents.has(sid)) {
          const alias = (prof.display_alias || (prof.email ? String(prof.email).split('@')[0] : '')) as string
          uniqueStudents.set(sid, {
            id: sid,
            email: prof.email,
            role: prof.role,
            display: alias
          })
        }
      })
      setStudentToClasses(map)
      setStudents(Array.from(uniqueStudents.values()))
    } catch (error) {
      // Don't surface this globally; per-class loader will populate the dropdown
      console.error('Error loading students (initial list):', error)
    }
  }

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assigned_word_sets')
        .select(`
          id,
          class_id,
          student_id,
          word_sets!inner(title, color),
          classes(name),
          profiles(username)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const formattedAssignments: Assignment[] = (data || []).map((item: any) => ({
        id: item.id,
        word_set_title: item.word_sets?.title || 'Unknown',
        word_set_color: item.word_sets?.color,
        class_name: item.class_id ? item.classes?.name : 'Individual Assignment',
        student_name: item.student_id ? item.profiles?.username : undefined
      }))
      
      setAssignments(formattedAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
      setMessage('Failed to load assignments')
    }
  }

  const handleGridConfigSave = async (wordSetId: string, grids: GridConfig[]) => {
    try {
      // Save grid configuration to word_sets table
      const { error } = await supabase
        .from('word_sets')
        .update({ grid_config: grids })
        .eq('id', wordSetId)

      if (error) throw error

      // Update local state
      setGridConfigs(prev => ({ ...prev, [wordSetId]: grids }))
      setShowGridConfig(false)
      setWordSetForConfig(null)
      setMessage('Grid configuration saved!')
    } catch (error) {
      console.error('Error saving grid config:', error)
      setMessage('Failed to save grid configuration')
    }
  }


  const assignToClass = async () => {
    if (!selectedWordSet || !targetClass) {
      setMessage('Please select both word set and class')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Check if assignment already exists
      const { data: existing, error: checkError } = await supabase
        .from('assigned_word_sets')
        .select('id')
        .eq('word_set_id', selectedWordSet)
        .eq('class_id', targetClass)
        .is('student_id', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existing) {
        setMessage('This word set is already assigned to this class!')
        setLoading(false)
        return
      }

      // Create a single class assignment (not individual student assignments)
      const { error } = await supabase
        .from('assigned_word_sets')
        .insert({ 
          word_set_id: selectedWordSet, 
          class_id: targetClass,
          student_id: null, // Must be null due to constraint
          due_date: dueDate || null,
          quiz_unlocked: true
        })

      if (error) throw error
      setMessage('Successfully assigned to class!')
      setSelectedWordSet('')
      setTargetClass('')
      setDueDate('')
      await loadAssignments()
    } catch (error) {
      console.error('Error assigning to class:', error)
      setMessage('Failed to assign to class')
    } finally {
      setLoading(false)
    }
  }

  const assignToSelectedClasses = async () => {
    if (!selectedWordSet || selectedClasses.length === 0) {
      setMessage('Please select word set and at least one class')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      let successCount = 0
      let skippedCount = 0
      const errors: string[] = []

      // Process each selected class
      for (const classId of selectedClasses) {
        try {
          // Check if assignment already exists
          const { data: existing, error: checkError } = await supabase
            .from('assigned_word_sets')
            .select('id')
            .eq('word_set_id', selectedWordSet)
            .eq('class_id', classId)
            .is('student_id', null)
            .single()

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError
          }

          if (existing) {
            skippedCount++
            continue
          }

          // Create assignment for this class
          const { error } = await supabase
            .from('assigned_word_sets')
            .insert({ 
              word_set_id: selectedWordSet, 
              class_id: classId,
              student_id: null, // Must be null due to constraint
              due_date: dueDate || null,
              quiz_unlocked: true
            })

          if (error) throw error
          successCount++
        } catch (error) {
          console.error(`Error assigning to class ${classId}:`, error)
          errors.push(`Class ${classId}: ${error}`)
        }
      }

      // Set appropriate message
      if (successCount > 0) {
        let message = `Successfully assigned to ${successCount} class${successCount !== 1 ? 'es' : ''}!`
        if (skippedCount > 0) {
          message += ` (${skippedCount} already assigned)`
        }
        setMessage(message)
      } else {
        setMessage('No assignments created. All selected classes already have this word set.')
      }

      if (errors.length > 0) {
        setMessage(`Partial success: ${successCount} assigned, ${errors.length} errors`)
      }

      // Clear only class selections and due date, keep word set selected
      setSelectedClasses([])
      setDueDate('')
      setShowClassDropdown(false)
      await loadAssignments()
    } catch (error) {
      console.error('Error in batch assignment:', error)
      setMessage('Failed to assign to classes')
    } finally {
      setLoading(false)
    }
  }

  const assignToStudent = async () => {
    if (!selectedWordSet || !targetStudent) {
      setMessage('Please select both word set and student')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Check if assignment already exists
      const { data: existing, error: checkError } = await supabase
        .from('assigned_word_sets')
        .select('id')
        .eq('word_set_id', selectedWordSet)
        .eq('student_id', targetStudent)
        .is('class_id', null)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existing) {
        setMessage('This word set is already assigned to this student!')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('assigned_word_sets')
        .insert({ 
          word_set_id: selectedWordSet, 
          student_id: targetStudent,
          class_id: null, // Must be null due to constraint
          due_date: dueDate || null,
          quiz_unlocked: true
        })

      if (error) throw error
      setMessage('Successfully assigned to student!')
      setTargetStudent('')
      setTargetClass('')
      setDueDate('')
      await loadAssignments()
    } catch (error) {
      console.error('Error assigning to student:', error)
      setMessage('Failed to assign to student')
    } finally {
      setLoading(false)
    }
  }

  const removeAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('assigned_word_sets')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMessage('Assignment removed successfully')
      await loadAssignments()
    } catch (error) {
      console.error('Error removing assignment:', error)
      setMessage('Failed to remove assignment')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Assign Word Sets</h1>

        {/* Assignment Form */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4 items-start">
            {/* Word Set Selection */}
            <div className="space-y-2">
              <div className="font-medium text-gray-600">Word Set</div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: (wordSets.find(w=>w.id===selectedWordSet)?.color) || 'transparent' }}></span>
                <select 
                  value={selectedWordSet} 
                  onChange={e => setSelectedWordSet(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded bg-white text-gray-800 border border-gray-300 shadow-sm"
                >
                  <option value="">Select word set</option>
                  {wordSets.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <div className="font-medium text-gray-600">Due date (optional)</div>
              <input
                type="date"
                value={dueDate}
                onChange={(e)=>setDueDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded bg-white text-gray-800 border border-gray-300 shadow-sm"
              />
            </div>

            {/* Class Assignment */}
            <div className="space-y-2 relative">
              <div className="font-medium text-gray-600">Assign to Classes</div>
              {classes.length > 0 ? (
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative class-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowClassDropdown(!showClassDropdown)}
                      className="w-full h-10 px-3 text-sm rounded bg-white text-gray-800 border border-gray-300 shadow-sm text-left cursor-pointer hover:bg-gray-50"
                    >
                      {selectedClasses.length === 0 
                        ? "Select classes..." 
                        : `${selectedClasses.length} class${selectedClasses.length !== 1 ? 'es' : ''} selected`
                      }
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* Simple dropdown with checkboxes */}
                    {showClassDropdown && (
                      <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-32 overflow-y-auto">
                        {classes.length > 1 && (
                          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedClasses(classes.map(c => c.id))
                              }}
                              className="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedClasses([])
                              }}
                              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                        {classes.map(c => (
                          <label key={c.id} className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedClasses.includes(c.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                if (e.target.checked) {
                                  setSelectedClasses([...selectedClasses, c.id])
                                } else {
                                  setSelectedClasses(selectedClasses.filter(id => id !== c.id))
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                <button 
                  onClick={async () => {
                    // Check if grid config exists
                    if (!gridConfigs[selectedWordSet]) {
                      const ws = wordSets.find(w => w.id === selectedWordSet)
                      if (ws && ws.words) {
                        setWordSetForConfig(ws)
                        setShowGridConfig(true)
                        return
                      }
                    }
                    await assignToSelectedClasses()
                  }}
                  disabled={loading || !selectedWordSet || selectedClasses.length === 0}
                  className="h-10 px-3 text-sm rounded bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-gray-400 text-white shadow-md whitespace-nowrap"
                >
                  Assign
                </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No classes available</div>
              )}
            </div>

            {/* Student Assignment */}
            <div className="space-y-2">
              <div className="font-medium text-gray-600">Assign to Individual Student</div>
              <div className="flex gap-2">
                <select 
                  value={targetClass} 
                  onChange={e => setTargetClass(e.target.value)}
                  className="flex-1 h-10 px-3 text-sm rounded bg-white text-gray-800 border border-gray-300 shadow-sm"
                  style={{ maxHeight: '80px', overflowY: 'auto' }}
                >
                  <option value="">Select class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select 
                  value={targetStudent} 
                  onChange={e => setTargetStudent(e.target.value)}
                  disabled={!targetClass}
                  className="flex-1 h-10 px-3 text-sm rounded bg-white text-gray-800 border border-gray-300 disabled:bg-gray-200 disabled:text-gray-500 shadow-sm"
                  style={{ maxHeight: '80px', overflowY: 'auto' }}
                >
                  {!targetClass ? (
                    <option value="">Select class first</option>
                  ) : (
                    <>
                      <option value="">Select student</option>
                      {classStudentsForSelected.length === 0 ? (
                        <option value="" disabled>No students</option>
                      ) : (
                        classStudentsForSelected.map(s => (
                          <option key={s.id} value={s.id}>{s.display || (s as any).username || 'Student'}</option>
                        ))
                      )}
                    </>
                  )}
                </select>
                <button 
                  onClick={async () => {
                    // Check if grid config exists
                    if (!gridConfigs[selectedWordSet]) {
                      const ws = wordSets.find(w => w.id === selectedWordSet)
                      if (ws && ws.words) {
                        setWordSetForConfig(ws)
                        setShowGridConfig(true)
                        return
                      }
                    }
                    await assignToStudent()
                  }}
                  disabled={loading || !selectedWordSet || !targetClass || !targetStudent}
                  className="h-10 px-3 text-sm rounded bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:bg-gray-400 text-white shadow-md"
                >
                  Assign
                </button>
              </div>
              {/* Debug info removed */}
            </div>
          </div>
        </div>

        {/* Extra space after Assign Word Sets for dropdown */}
        <div className="mb-12"></div>

        {/* Message Display */}
        {message && (
          <div className="mb-6 p-3 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            {message}
          </div>
        )}

        {/* Extra space for dropdown visibility - increased significantly */}
        <div className="mb-24"></div>

        {/* Existing Assignments */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing Assignments</h2>
          
          {assignments.length === 0 ? (
            <div className="text-gray-500">No assignments yet.</div>
          ) : (
            <div className="space-y-2">
              {assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between p-3 rounded bg-white border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <span 
                      className="inline-block w-3 h-3 rounded-full" 
                      style={{ backgroundColor: assignment.word_set_color || '#e5e7eb' }}
                      title="Word set color"
                    ></span>
                    <span className="font-medium">{assignment.word_set_title}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    {assignment.student_name ? (
                      <span className="text-green-600 font-medium">Individual: {assignment.student_name}</span>
                    ) : assignment.class_name && assignment.class_name !== 'Individual Assignment' ? (
                      <span className="text-blue-600 font-medium">Class: {assignment.class_name}</span>
                    ) : (
                      <span className="text-gray-500">Unknown target</span>
                    )}
                  </div>
                  <button 
                    onClick={() => removeAssignment(assignment.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid Configuration Modal */}
      {showGridConfig && wordSetForConfig && wordSetForConfig.words && (
        <GridConfigModal
          wordSet={{
            id: wordSetForConfig.id,
            title: wordSetForConfig.title,
            words: wordSetForConfig.words
          }}
          existingGrids={gridConfigs[wordSetForConfig.id]}
          onSave={(grids) => {
            handleGridConfigSave(wordSetForConfig.id, grids)
            // After saving config, proceed with assignment
            if (targetClass) {
              assignToClass()
            } else if (selectedClasses.length > 0) {
              assignToSelectedClasses()
            } else if (targetStudent) {
              assignToStudent()
            }
          }}
          onClose={() => {
            setShowGridConfig(false)
            setWordSetForConfig(null)
          }}
        />
      )}

    </div>
  )
}
