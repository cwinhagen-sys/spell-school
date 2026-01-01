'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GridConfigModal, { GridConfig } from '@/components/GridConfigModal'
import { Calendar, Trash2, Users, User, BookOpen, Send, CheckSquare, Square, ChevronDown, Sparkles, Edit2, X } from 'lucide-react'
import WeekCalendar from '@/components/WeekCalendar'
import { motion, AnimatePresence } from 'framer-motion'

type WordSet = { id: string; title: string; color?: string; words?: Array<{ en: string; sv: string }> }
type Class = { id: string; name: string }
type Student = { id: string; email: string; role: string; display?: string; username?: string }
type Assignment = { 
  id: string
  ids?: string[] // Array of IDs for grouped individual assignments
  word_set_title: string
  word_set_color?: string
  class_name?: string
  student_name?: string // For single student (backward compatibility)
  student_names?: string[] // For multiple students in grouped assignment
  due_date?: string | null
  isGrouped?: boolean // Indicates if this is a grouped individual assignment
}

export default function AssignWordSetsPage() {
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classStudentsForSelected, setClassStudentsForSelected] = useState<Student[]>([])
  const [studentToClasses, setStudentToClasses] = useState<Record<string, string[]>>({})
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [targetClass, setTargetClass] = useState<string>('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [dueDate, setDueDate] = useState<string>('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showWordSetDropdown, setShowWordSetDropdown] = useState(false)
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showStudentClassDropdown, setShowStudentClassDropdown] = useState(false)
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [showGridConfig, setShowGridConfig] = useState(false)
  const [wordSetForConfig, setWordSetForConfig] = useState<WordSet | null>(null)
  const [gridConfigs, setGridConfigs] = useState<Record<string, GridConfig[]>>({})
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [editingDueDate, setEditingDueDate] = useState<string>('')
  const [updatingDueDate, setUpdatingDueDate] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { 
          window.location.href = '/'; 
          return 
        }
        
        // Check email verification
        const { isUserEmailVerified } = await import('@/lib/email-verification')
        if (!isUserEmailVerified(user)) {
          window.location.href = '/?message=Please verify your email address before accessing teacher features. Check your inbox for the verification link.'
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
        await loadAssignments()
        
        // Check for wordSet parameter in URL
        const urlParams = new URLSearchParams(window.location.search)
        const wordSetId = urlParams.get('wordSet')
        if (wordSetId) {
          setSelectedWordSet(wordSetId)
          // Clean up URL
          window.history.replaceState({}, '', '/teacher/assign')
        }
        
        setPageLoading(false)
      } catch (error) {
        console.error('Init error:', error)
        setPageLoading(false)
      }
    }
    init()

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showWordSetDropdown && !target.closest('.wordset-dropdown-container')) {
        setShowWordSetDropdown(false)
      }
      if (showClassDropdown && !target.closest('.class-dropdown-container')) {
        setShowClassDropdown(false)
      }
      if (showStudentClassDropdown && !target.closest('.student-class-dropdown-container')) {
        setShowStudentClassDropdown(false)
      }
      if (showStudentDropdown && !target.closest('.student-dropdown-container')) {
        setShowStudentDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showWordSetDropdown, showClassDropdown, showStudentClassDropdown, showStudentDropdown])

  useEffect(() => {
    ;(async () => {
      try {
        if (!targetClass) { setClassStudentsForSelected([]); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setClassStudentsForSelected([]); return }
        
        const { data: classLinks, error: linkErr } = await supabase
          .from('class_students')
          .select('student_id, classes!inner(id, teacher_id)')
          .eq('classes.teacher_id', user.id)
          .eq('class_id', targetClass)
        
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
          if ((!profs || profs.length === 0) && ids.length > 0) {
            list = ids.map((sid: string) => ({
              id: sid,
              email: '',
              role: '',
              display: undefined,
            }))
          }
        }

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
          } catch (_) {}
        }

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
          } catch (_) {}
        }

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
          } catch (_) {}
        }
        setClassStudentsForSelected(list || [])
      } catch (e) {
        setClassStudentsForSelected([])
      }
    })()
  }, [targetClass])

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

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
      showMessage('Could not load word lists', 'error')
    }
  }

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
      showMessage('Could not load classes', 'error')
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
          due_date,
          word_set_id,
          word_sets!inner(title, color),
          classes(name),
          profiles(username)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Separate class assignments and individual student assignments
      const classAssignments: Assignment[] = []
      const individualAssignmentsMap = new Map<string, Array<{
        id: string
        student_name: string
        due_date: string | null
        word_set_title: string
        word_set_color?: string
      }>>()
      
      for (const item of data || []) {
        // word_sets, classes, and profiles are objects (from joins), not arrays
        const wordSet = Array.isArray(item.word_sets) ? item.word_sets[0] : item.word_sets
        const classObj = Array.isArray(item.classes) ? item.classes[0] : item.classes
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        
        if (item.class_id) {
          // Class assignment - keep as is
          classAssignments.push({
            id: item.id,
            word_set_title: wordSet?.title || 'Unknown',
            word_set_color: wordSet?.color,
            class_name: classObj?.name,
            due_date: item.due_date || null
          })
        } else if (item.student_id) {
          // Individual assignment - group by word_set_id and due_date
          const key = `${item.word_set_id}_${item.due_date || 'null'}`
          if (!individualAssignmentsMap.has(key)) {
            individualAssignmentsMap.set(key, [])
          }
          individualAssignmentsMap.get(key)!.push({
            id: item.id,
            student_name: profile?.username || 'Student',
            due_date: item.due_date || null,
            word_set_title: wordSet?.title || 'Unknown',
            word_set_color: wordSet?.color
          })
        }
      }
      
      // Convert grouped individual assignments to Assignment objects
      const groupedIndividualAssignments: Assignment[] = []
      for (const [key, items] of individualAssignmentsMap.entries()) {
        if (items.length === 1) {
          // Single student - keep as single assignment for backward compatibility
          groupedIndividualAssignments.push({
            id: items[0].id,
            word_set_title: items[0].word_set_title,
            word_set_color: items[0].word_set_color,
            student_name: items[0].student_name,
            due_date: items[0].due_date,
            class_name: 'Individual assignment',
            isGrouped: false
          })
        } else {
          // Multiple students - create grouped assignment
          groupedIndividualAssignments.push({
            id: items[0].id, // Use first ID as primary
            ids: items.map(i => i.id), // Store all IDs
            word_set_title: items[0].word_set_title,
            word_set_color: items[0].word_set_color,
            student_names: items.map(i => i.student_name),
            due_date: items[0].due_date,
            class_name: 'Individual assignment',
            isGrouped: true
          })
        }
      }
      
      // Combine and sort by creation date (most recent first)
      const allAssignments = [...classAssignments, ...groupedIndividualAssignments]
      allAssignments.sort((a, b) => {
        // Sort grouped assignments with multiple students first (by first ID), then others
        const aId = a.isGrouped && a.ids ? a.ids[0] : a.id
        const bId = b.isGrouped && b.ids ? b.ids[0] : b.id
        return bId.localeCompare(aId) // Reverse order for most recent first
      })
      
      setAssignments(allAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
      showMessage('Could not load assignments', 'error')
    }
  }

  const handleGridConfigSave = async (wordSetId: string, grids: GridConfig[]) => {
    try {
      const { error } = await supabase
        .from('word_sets')
        .update({ grid_config: grids })
        .eq('id', wordSetId)

      if (error) throw error

      setGridConfigs(prev => ({ ...prev, [wordSetId]: grids }))
      setShowGridConfig(false)
      setWordSetForConfig(null)
      showMessage('Grid configuration saved!', 'success')
    } catch (error) {
      console.error('Error saving grid config:', error)
      showMessage('Could not save grid configuration', 'error')
    }
  }

  const assignToSelectedClasses = async () => {
    if (!selectedWordSet || selectedClasses.length === 0) {
      showMessage('Select word list and at least one class', 'error')
      return
    }

    setLoading(true)

    try {
      let successCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const classId of selectedClasses) {
        try {
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

          const { error } = await supabase
            .from('assigned_word_sets')
            .insert({ 
              word_set_id: selectedWordSet, 
              class_id: classId,
              student_id: null,
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

      if (successCount > 0) {
        let msg = `Assigned to ${successCount} class${successCount !== 1 ? 'es' : ''}!`
        if (skippedCount > 0) {
          msg += ` (${skippedCount} already assigned)`
        }
        showMessage(msg, 'success')
      } else {
        showMessage('No assignments created. All selected classes already have this word list.', 'info')
      }

      setSelectedClasses([])
      setDueDate('')
      setShowClassDropdown(false)
      await loadAssignments()
    } catch (error) {
      console.error('Error in batch assignment:', error)
      showMessage('Could not assign to classes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const assignToSelectedStudents = async () => {
    if (!selectedWordSet || selectedStudents.length === 0) {
      showMessage('Select word list and at least one student', 'error')
      return
    }

    setLoading(true)

    try {
      let successCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const studentId of selectedStudents) {
        try {
          const { data: existing, error: checkError } = await supabase
            .from('assigned_word_sets')
            .select('id')
            .eq('word_set_id', selectedWordSet)
            .eq('student_id', studentId)
            .is('class_id', null)
            .single()

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError
          }

          if (existing) {
            skippedCount++
            continue
          }

          const { error } = await supabase
            .from('assigned_word_sets')
            .insert({ 
              word_set_id: selectedWordSet, 
              student_id: studentId,
              class_id: null,
              due_date: dueDate || null,
              quiz_unlocked: true
            })

          if (error) throw error
          successCount++
        } catch (error) {
          console.error(`Error assigning to student ${studentId}:`, error)
          errors.push(`Student ${studentId}: ${error}`)
        }
      }

      if (successCount > 0) {
        let msg = `Assigned to ${successCount} student${successCount !== 1 ? 's' : ''}!`
        if (skippedCount > 0) {
          msg += ` (${skippedCount} already assigned)`
        }
        showMessage(msg, 'success')
      } else {
        showMessage('No assignments created. All selected students already have this word list.', 'info')
      }

      setSelectedStudents([])
      setTargetClass('')
      setDueDate('')
      await loadAssignments()
    } catch (error) {
      console.error('Error assigning to students:', error)
      showMessage('Could not assign to students', 'error')
    } finally {
      setLoading(false)
    }
  }

  const removeAssignment = async (assignment: Assignment) => {
    try {
      // If it's a grouped assignment, remove all IDs in the group
      const idsToRemove = assignment.isGrouped && assignment.ids ? assignment.ids : [assignment.id]
      
      const { error } = await supabase
        .from('assigned_word_sets')
        .delete()
        .in('id', idsToRemove)

      if (error) throw error
      const count = idsToRemove.length
      showMessage(`Assignment${count > 1 ? 's' : ''} removed`, 'success')
      await loadAssignments()
    } catch (error) {
      console.error('Error removing assignment:', error)
      showMessage('Could not remove assignment', 'error')
    }
  }

  const startEditDueDate = (assignment: Assignment) => {
    setEditingAssignmentId(assignment.id)
    setEditingDueDate(assignment.due_date || '')
  }

  const cancelEditDueDate = () => {
    setEditingAssignmentId(null)
    setEditingDueDate('')
  }

  const updateDueDate = async (assignmentId: string) => {
    setUpdatingDueDate(true)
    try {
      // Find the assignment to check if it's grouped
      const assignment = assignments.find(a => a.id === assignmentId)
      const idsToUpdate = assignment?.isGrouped && assignment.ids ? assignment.ids : [assignmentId]
      
      const { error } = await supabase
        .from('assigned_word_sets')
        .update({ due_date: editingDueDate || null })
        .in('id', idsToUpdate)

      if (error) throw error
      showMessage('Due date updated', 'success')
      setEditingAssignmentId(null)
      setEditingDueDate('')
      await loadAssignments()
    } catch (error) {
      console.error('Error updating due date:', error)
      showMessage('Could not update due date', 'error')
    } finally {
      setUpdatingDueDate(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Assign word lists</h1>
            <p className="text-gray-400">Assign word lists to classes or individual students</p>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
          messageType === 'success' 
            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
            : messageType === 'error'
            ? 'bg-red-500/20 border-red-500/30 text-red-300'
            : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
        }`}>
          {message}
        </div>
      )}

      {/* Word Set Selection - At the top */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Select word list</h2>
        </div>
        <div className="relative wordset-dropdown-container">
          <button
            type="button"
            onClick={() => setShowWordSetDropdown(!showWordSetDropdown)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span 
                className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0" 
                style={{ backgroundColor: (wordSets.find(w=>w.id===selectedWordSet)?.color) || 'rgba(255,255,255,0.05)' }}
              />
              <span className={!selectedWordSet ? 'text-gray-500' : 'text-white truncate'}>
                {selectedWordSet 
                  ? wordSets.find(w => w.id === selectedWordSet)?.title || 'Select word list...'
                  : 'Select word list...'
                }
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${showWordSetDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showWordSetDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute z-50 w-full mt-2 bg-[#161622]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="overflow-y-auto max-h-64">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedWordSet('')
                      setDueDate('')
                      setShowWordSetDropdown(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 flex items-center gap-3 ${
                      !selectedWordSet ? 'text-white bg-white/5' : 'text-gray-400'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0 bg-white/5" />
                    <span>Select word list...</span>
                  </button>
                  {wordSets.map((ws, index) => (
                    <motion.button
                      key={ws.id}
                      type="button"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.15 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedWordSet(ws.id)
                        setDueDate('')
                        setShowWordSetDropdown(false)
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 flex items-center gap-3 ${
                        selectedWordSet === ws.id ? 'text-white bg-white/5' : 'text-gray-300'
                      }`}
                    >
                      <span 
                        className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0" 
                        style={{ backgroundColor: ws.color || 'rgba(255,255,255,0.05)' }}
                      />
                      <span className="truncate">{ws.title}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Calendar - Only show when word list is selected */}
      {selectedWordSet && (
        <div className="mb-6">
          <WeekCalendar
            selectedDate={dueDate || null}
            onDateSelect={(date) => setDueDate(date)}
            onClear={() => setDueDate('')}
          />
        </div>
      )}

      {/* Assignment Form */}
      {selectedWordSet && (
        <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">New assignment</h2>
          </div>

          {/* Assignment Options */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Class Assignment */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Assign to classes</h3>
            </div>
            
            {classes.length > 0 ? (
              <div className="space-y-3">
                <div className="relative class-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setShowClassDropdown(!showClassDropdown)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between backdrop-blur-sm"
                  >
                    <span className={selectedClasses.length === 0 ? 'text-gray-500' : 'text-white'}>
                      {selectedClasses.length === 0 
                        ? "Select classes..." 
                        : `${selectedClasses.length} class${selectedClasses.length !== 1 ? 'es' : ''} selected`
                      }
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showClassDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showClassDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 bg-[#161622]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-hidden"
                      >
                        {classes.length > 1 && (
                          <div className="px-4 py-2.5 border-b border-white/10 flex gap-2 bg-white/5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedClasses(classes.map(c => c.id))
                              }}
                              className="text-xs px-3 py-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all font-medium"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedClasses([])
                              }}
                              className="text-xs px-3 py-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                        <div className="overflow-y-auto max-h-40">
                          {classes.map((c, index) => (
                            <motion.label
                              key={c.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02, duration: 0.15 }}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors group"
                            >
                              <div className="relative flex-shrink-0">
                                {selectedClasses.includes(c.id) ? (
                                  <CheckSquare className="w-5 h-5 text-orange-400 transition-all group-hover:scale-110" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-500 transition-all group-hover:text-gray-400" />
                                )}
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
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </div>
                              <span className="text-white text-sm">{c.name}</span>
                            </motion.label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <button 
                  onClick={async () => {
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
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Assign to classes
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No classes available</p>
            )}
          </div>

          {/* Individual Student Assignment */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">Assign to individual students</h3>
            </div>
            
            <div className="space-y-3">
              {/* Class Dropdown */}
              <div className="relative student-class-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowStudentClassDropdown(!showStudentClassDropdown)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between backdrop-blur-sm"
                >
                  <span className={!targetClass ? 'text-gray-500' : 'text-white'}>
                    {targetClass 
                      ? classes.find(c => c.id === targetClass)?.name || 'Select class first...'
                      : 'Select class first...'
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showStudentClassDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showStudentClassDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute z-50 w-full mt-2 bg-[#161622]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="overflow-y-auto max-h-48">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTargetClass('')
                            setSelectedStudents([])
                            setShowStudentClassDropdown(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 ${
                            !targetClass ? 'text-white bg-white/5' : 'text-gray-400'
                          }`}
                        >
                          Select class first...
                        </button>
                        {classes.map((c, index) => (
                          <motion.button
                            key={c.id}
                            type="button"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02, duration: 0.15 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setTargetClass(c.id)
                              setSelectedStudents([])
                              setShowStudentClassDropdown(false)
                            }}
                            className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 ${
                              targetClass === c.id ? 'text-white bg-white/5' : 'text-gray-300'
                            }`}
                          >
                            {c.name}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Student Checkbox List */}
              <div className="relative student-dropdown-container">
                <button
                  type="button"
                  onClick={() => targetClass && setShowStudentDropdown(!showStudentDropdown)}
                  disabled={!targetClass}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5"
                >
                  <span className={selectedStudents.length === 0 ? 'text-gray-500' : 'text-white'}>
                    {!targetClass 
                      ? 'Select class first'
                      : selectedStudents.length === 0
                      ? 'Select students...'
                      : `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} selected`
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showStudentDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showStudentDropdown && targetClass && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute z-50 w-full mt-2 bg-[#161622]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                      {classStudentsForSelected.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No students
                        </div>
                      ) : (
                        <>
                          {classStudentsForSelected.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedStudents(classStudentsForSelected.map(s => s.id))
                                }}
                                className="text-xs px-3 py-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all font-medium"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedStudents([])
                                }}
                                className="text-xs px-3 py-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                          <div className="overflow-y-auto max-h-48">
                            {classStudentsForSelected.map((s, index) => (
                              <motion.label
                                key={s.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02, duration: 0.15 }}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors group"
                              >
                                <div className="relative flex-shrink-0">
                                  {selectedStudents.includes(s.id) ? (
                                    <CheckSquare className="w-5 h-5 text-orange-400 transition-all group-hover:scale-110" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-500 transition-all group-hover:text-gray-400" />
                                  )}
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(s.id)}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      if (e.target.checked) {
                                        setSelectedStudents([...selectedStudents, s.id])
                                      } else {
                                        setSelectedStudents(selectedStudents.filter(id => id !== s.id))
                                      }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                </div>
                                <span className="text-white text-sm">{s.display || (s as any).username || 'Student'}</span>
                              </motion.label>
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button 
                onClick={async () => {
                  if (!gridConfigs[selectedWordSet]) {
                    const ws = wordSets.find(w => w.id === selectedWordSet)
                    if (ws && ws.words) {
                      setWordSetForConfig(ws)
                      setShowGridConfig(true)
                      return
                    }
                  }
                  await assignToSelectedStudents()
                }}
                disabled={loading || !selectedWordSet || !targetClass || selectedStudents.length === 0}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Assign to students
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Existing Assignments */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Existing assignments</h2>
          </div>
          <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400">
            {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
          </div>
        </div>
        
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg font-medium">No assignments yet</p>
            <p className="text-gray-500 text-sm mt-1">Assign a word list above to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {assignments.map(assignment => (
              <div 
                key={assignment.id} 
                className="group bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all duration-200 p-5"
                style={{
                  borderLeftColor: assignment.word_set_color || 'rgba(255,255,255,0.1)',
                  borderLeftWidth: '4px'
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span 
                        className="inline-block w-4 h-4 rounded-full border-2 border-white/20 shadow-sm flex-shrink-0" 
                        style={{ backgroundColor: assignment.word_set_color || 'rgba(255,255,255,0.1)' }}
                      />
                      <h3 className="font-bold text-white truncate">{assignment.word_set_title}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        {assignment.student_names && assignment.student_names.length > 0 ? (
                          <>
                            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-400 font-medium">Individual students:</span>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {assignment.student_names.map((name, idx) => (
                                  <span key={idx} className="inline-block px-2 py-1 bg-white/5 rounded-lg text-white text-sm border border-white/10">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : assignment.student_name ? (
                          <>
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 font-medium">Individual:</span>
                            <span className="text-white">{assignment.student_name}</span>
                          </>
                        ) : assignment.class_name && assignment.class_name !== 'Individual assignment' ? (
                          <>
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 font-medium">Class:</span>
                            <span className="text-white">{assignment.class_name}</span>
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500">Unknown recipient</span>
                          </>
                        )}
                      </div>
                      {assignment.due_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">Due:</span>
                          <span className={`font-medium ${
                            new Date(assignment.due_date) < new Date()
                              ? 'text-red-400'
                              : 'text-white'
                          }`}>
                            {new Date(assignment.due_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {new Date(assignment.due_date) < new Date() && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-lg">
                              Past due
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => startEditDueDate(assignment)}
                      className="p-2.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
                      title="Edit due date"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeAssignment(assignment)}
                      className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                      title="Remove assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Due Date Modal */}
      <AnimatePresence>
        {editingAssignmentId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={cancelEditDueDate}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161622] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Edit Due Date</h3>
                </div>
                <button
                  onClick={cancelEditDueDate}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-4">
                  {assignments.find(a => a.id === editingAssignmentId)?.word_set_title}
                </p>
                <WeekCalendar
                  selectedDate={editingDueDate || null}
                  onDateSelect={(date) => setEditingDueDate(date)}
                  onClear={() => setEditingDueDate('')}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => updateDueDate(editingAssignmentId)}
                  disabled={updatingDueDate}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {updatingDueDate ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Update Due Date
                    </>
                  )}
                </button>
                <button
                  onClick={cancelEditDueDate}
                  className="px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            if (selectedClasses.length > 0) {
              assignToSelectedClasses()
            } else if (selectedStudents.length > 0) {
              assignToSelectedStudents()
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
