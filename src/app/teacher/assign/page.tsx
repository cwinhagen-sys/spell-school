'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type WordSet = { id: string; title: string; color?: string }
type Class = { id: string; name: string }
type Student = { id: string; email: string; role: string; display?: string }
type Assignment = { id: string; word_set_title: string; class_name?: string; student_email?: string }

export default function AssignWordSetsPage() {
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classStudentsForSelected, setClassStudentsForSelected] = useState<Student[]>([])
  const [studentToClasses, setStudentToClasses] = useState<Record<string, string[]>>({})
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [targetClass, setTargetClass] = useState<string>('')
  const [targetStudent, setTargetStudent] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])

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
  }, [])

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
            .select('id,email,role,display_alias')
            .in('id', ids)
          list = (profs || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            role: p.role,
            display: ((p.display_alias || (p.email ? String(p.email).split('@')[0] : undefined)) as string | undefined)
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
                .select('id,email,role,display_alias')
                .in('id', altIds)
              const mapped = (profs2 || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                role: p.role,
                display: ((p.display_alias || (p.email ? String(p.email).split('@')[0] : undefined)) as string | undefined)
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
                .select('id,email,role,display_alias')
                .in('id', studentIds)
              list = (profs || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                role: p.role,
                display: (p.display_alias || (p.email ? String(p.email).split('@')[0] : undefined)) as string | undefined
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
              .select('student_id, profiles!inner(id,email,role,display_alias), classes!inner(id,teacher_id)')
              .eq('classes.teacher_id', user.id)
              .eq('class_id', targetClass)
            const byId: Record<string, any> = {}
            for (const row of (joined as any[] || [])) {
              const prof = row.profiles || {}
              const disp = (prof.display_alias || (prof.email ? String(prof.email).split('@')[0] : undefined)) as string | undefined
              byId[row.student_id] = { email: prof.email as string | undefined, display: disp }
            }
            list = list.map(s => {
              const info = byId[s.id]
              if (!info) return s
              return {
                ...s,
                email: s.email || info.email || '',
                display: s.display || info.display,
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
        .select('id, title, color')
        .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setWordSets(data || [])
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
          word_sets!inner(title),
          classes(name),
          profiles(email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const formattedAssignments: Assignment[] = (data || []).map((item: any) => ({
        id: item.id,
        word_set_title: item.word_sets?.title || 'Unknown',
        class_name: item.classes?.name,
        student_email: item.profiles?.email
      }))
      
      setAssignments(formattedAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
      setMessage('Failed to load assignments')
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
      const { error } = await supabase
        .from('assigned_word_sets')
        .insert({ 
          word_set_id: selectedWordSet, 
          class_id: targetClass,
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

  const assignToStudent = async () => {
    if (!selectedWordSet || !targetStudent) {
      setMessage('Please select both word set and student')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('assigned_word_sets')
        .insert({ 
          word_set_id: selectedWordSet, 
          student_id: targetStudent,
          due_date: dueDate || null,
          quiz_unlocked: true
        })

      if (error) throw error
      setMessage('Successfully assigned to student!')
      setSelectedWordSet('')
      setTargetStudent('')
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Assign Word Sets</h1>

        {/* Assignment Form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4 items-start">
            {/* Word Set Selection */}
            <div className="space-y-2">
              <div className="font-medium text-gray-300">Word Set</div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: (wordSets.find(w=>w.id===selectedWordSet)?.color) || 'transparent' }}></span>
                <select 
                  value={selectedWordSet} 
                  onChange={e => setSelectedWordSet(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded bg-white text-black border border-white/10"
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
              <div className="font-medium text-gray-300">Due date (optional)</div>
              <input
                type="date"
                value={dueDate}
                onChange={(e)=>setDueDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded bg-white text-black border border-white/10"
              />
            </div>

            {/* Class Assignment */}
            <div className="space-y-2">
              <div className="font-medium text-gray-300">Assign to Class</div>
              <div className="flex gap-2">
                <select 
                  value={targetClass} 
                  onChange={e => setTargetClass(e.target.value)}
                  className="flex-1 h-10 px-3 text-sm rounded bg-white text-black border border-white/10"
                >
                  <option value="">Select class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  onClick={assignToClass}
                  disabled={loading || !selectedWordSet || !targetClass}
                  className="h-10 px-3 text-sm rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-500 text-white"
                >
                  Assign
                </button>
              </div>
            </div>

            {/* Student Assignment */}
            <div className="space-y-2">
              <div className="font-medium text-gray-300">Assign to Student</div>
              <div className="flex gap-2">
                <select 
                  value={targetStudent} 
                  onChange={e => setTargetStudent(e.target.value)}
                  disabled={!targetClass}
                  className="flex-1 h-10 px-3 text-sm rounded bg-white text-black border border-white/10 disabled:bg-gray-300 disabled:text-gray-700"
                >
                  {!targetClass ? (
                    <option value="">Select class first</option>
                  ) : (
                    <>
                      <option value="">Select student</option>
                      {classStudentsForSelected.length === 0 ? (
                        <option value="" disabled>(No students found in this class)</option>
                      ) : (
                        classStudentsForSelected.map(s => (
                          <option key={s.id} value={s.id}>{s.display || (s.email ? s.email.split('@')[0] : s.id)}</option>
                        ))
                      )}
                    </>
                  )}
                </select>
                <button 
                  onClick={assignToStudent}
                  disabled={loading || !selectedWordSet || !targetStudent}
                  className="h-10 px-3 text-sm rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-500 text-white"
                >
                  Assign to student
                </button>
              </div>
              {/* Debug info removed */}
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-6 p-3 rounded bg-white/10 text-white border border-white/10">
            {message}
          </div>
        )}

        {/* Existing Assignments */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Existing Assignments</h2>
          
          {assignments.length === 0 ? (
            <div className="text-gray-300">No assignments yet.</div>
          ) : (
            <div className="space-y-2">
              {assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                  <div className="text-sm text-gray-200 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-white/30" title="Word set color"></span>
                    <span className="font-medium">{assignment.word_set_title}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    {assignment.class_name ? (
                      <span>Class: {assignment.class_name}</span>
                    ) : assignment.student_email ? (
                      <span>Student: {assignment.student_email}</span>
                    ) : (
                      <span>Unknown target</span>
                    )}
                  </div>
                  <button 
                    onClick={() => removeAssignment(assignment.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
