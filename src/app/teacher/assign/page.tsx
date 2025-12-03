'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GridConfigModal, { GridConfig } from '@/components/GridConfigModal'
import { Calendar, Trash2, Users, User, BookOpen, Send, CheckSquare, Square, ChevronDown, Sparkles } from 'lucide-react'

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
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showGridConfig, setShowGridConfig] = useState(false)
  const [wordSetForConfig, setWordSetForConfig] = useState<WordSet | null>(null)
  const [gridConfigs, setGridConfigs] = useState<Record<string, GridConfig[]>>({})

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
        await loadAssignments()
        setPageLoading(false)
      } catch (error) {
        console.error('Init error:', error)
        setPageLoading(false)
      }
    }
    init()

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showClassDropdown && !target.closest('.class-dropdown-container')) {
        setShowClassDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClassDropdown])

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
      showMessage('Kunde inte ladda ordlistor', 'error')
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
      showMessage('Kunde inte ladda klasser', 'error')
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
        word_set_title: item.word_sets?.title || 'Okänd',
        word_set_color: item.word_sets?.color,
        class_name: item.class_id ? item.classes?.name : 'Individuell tilldelning',
        student_name: item.student_id ? item.profiles?.username : undefined
      }))
      
      setAssignments(formattedAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
      showMessage('Kunde inte ladda tilldelningar', 'error')
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
      showMessage('Rutnätskonfiguration sparad!', 'success')
    } catch (error) {
      console.error('Error saving grid config:', error)
      showMessage('Kunde inte spara rutnätskonfiguration', 'error')
    }
  }

  const assignToSelectedClasses = async () => {
    if (!selectedWordSet || selectedClasses.length === 0) {
      showMessage('Välj ordlista och minst en klass', 'error')
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
        let msg = `Tilldelad till ${successCount} klass${successCount !== 1 ? 'er' : ''}!`
        if (skippedCount > 0) {
          msg += ` (${skippedCount} redan tilldelade)`
        }
        showMessage(msg, 'success')
      } else {
        showMessage('Inga tilldelningar skapade. Alla valda klasser har redan denna ordlista.', 'info')
      }

      setSelectedClasses([])
      setDueDate('')
      setShowClassDropdown(false)
      await loadAssignments()
    } catch (error) {
      console.error('Error in batch assignment:', error)
      showMessage('Kunde inte tilldela till klasser', 'error')
    } finally {
      setLoading(false)
    }
  }

  const assignToStudent = async () => {
    if (!selectedWordSet || !targetStudent) {
      showMessage('Välj ordlista och elev', 'error')
      return
    }

    setLoading(true)

    try {
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
        showMessage('Denna ordlista är redan tilldelad till eleven!', 'info')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('assigned_word_sets')
        .insert({ 
          word_set_id: selectedWordSet, 
          student_id: targetStudent,
          class_id: null,
          due_date: dueDate || null,
          quiz_unlocked: true
        })

      if (error) throw error
      showMessage('Tilldelad till elev!', 'success')
      setTargetStudent('')
      setTargetClass('')
      setDueDate('')
      await loadAssignments()
    } catch (error) {
      console.error('Error assigning to student:', error)
      showMessage('Kunde inte tilldela till elev', 'error')
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
      showMessage('Tilldelning borttagen', 'success')
      await loadAssignments()
    } catch (error) {
      console.error('Error removing assignment:', error)
      showMessage('Kunde inte ta bort tilldelning', 'error')
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar tilldelningar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tilldela ordlistor</h1>
            <p className="text-gray-400">Tilldela ordlistor till klasser eller enskilda elever</p>
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
          messageType === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
            : messageType === 'error'
            ? 'bg-red-500/20 border-red-500/30 text-red-300'
            : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
        }`}>
          {message}
        </div>
      )}

      {/* Assignment Form */}
      <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Ny tilldelning</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Word Set Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Välj ordlista</label>
            <div className="flex items-center gap-3">
              <span 
                className="w-8 h-8 rounded-lg border-2 border-white/10 flex-shrink-0" 
                style={{ backgroundColor: (wordSets.find(w=>w.id===selectedWordSet)?.color) || 'rgba(255,255,255,0.05)' }}
              />
              <select 
                value={selectedWordSet} 
                onChange={e => setSelectedWordSet(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a2e]">Välj ordlista...</option>
                {wordSets.map(ws => (
                  <option key={ws.id} value={ws.id} className="bg-[#1a1a2e]">{ws.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Förfallodatum (valfritt)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={dueDate}
                onChange={(e)=>setDueDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-amber-500/50 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Assignment Options */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Class Assignment */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Tilldela till klasser</h3>
            </div>
            
            {classes.length > 0 ? (
              <div className="space-y-3">
                <div className="relative class-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setShowClassDropdown(!showClassDropdown)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-white hover:bg-white/10 transition-all flex items-center justify-between"
                  >
                    <span className={selectedClasses.length === 0 ? 'text-gray-500' : ''}>
                      {selectedClasses.length === 0 
                        ? "Välj klasser..." 
                        : `${selectedClasses.length} klass${selectedClasses.length !== 1 ? 'er' : ''} vald${selectedClasses.length !== 1 ? 'a' : ''}`
                      }
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showClassDropdown && (
                    <div className="absolute z-50 w-full mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {classes.length > 1 && (
                        <div className="px-4 py-2 border-b border-white/10 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedClasses(classes.map(c => c.id))
                            }}
                            className="text-xs px-3 py-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          >
                            Välj alla
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedClasses([])
                            }}
                            className="text-xs px-3 py-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            Rensa
                          </button>
                        </div>
                      )}
                      {classes.map(c => (
                        <label 
                          key={c.id} 
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className="relative">
                            {selectedClasses.includes(c.id) ? (
                              <CheckSquare className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-500" />
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
                          <span className="text-white">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
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
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Tilldela till klasser
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">Inga klasser tillgängliga</p>
            )}
          </div>

          {/* Individual Student Assignment */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Tilldela till enskild elev</h3>
            </div>
            
            <div className="space-y-3">
              <select 
                value={targetClass} 
                onChange={e => setTargetClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-emerald-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a2e]">Välj klass först...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name}</option>
                ))}
              </select>
              
              <select 
                value={targetStudent} 
                onChange={e => setTargetStudent(e.target.value)}
                disabled={!targetClass}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                {!targetClass ? (
                  <option value="" className="bg-[#1a1a2e]">Välj klass först</option>
                ) : (
                  <>
                    <option value="" className="bg-[#1a1a2e]">Välj elev...</option>
                    {classStudentsForSelected.length === 0 ? (
                      <option value="" disabled className="bg-[#1a1a2e]">Inga elever</option>
                    ) : (
                      classStudentsForSelected.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#1a1a2e]">{s.display || (s as any).username || 'Elev'}</option>
                      ))
                    )}
                  </>
                )}
              </select>
              
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
                  await assignToStudent()
                }}
                disabled={loading || !selectedWordSet || !targetClass || !targetStudent}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Tilldela till elev
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Assignments */}
      <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Befintliga tilldelningar</h2>
          </div>
          <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-400">
            {assignments.length} {assignments.length === 1 ? 'tilldelning' : 'tilldelningar'}
          </div>
        </div>
        
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg font-medium">Inga tilldelningar ännu</p>
            <p className="text-gray-500 text-sm mt-1">Tilldela en ordlista ovan för att komma igång</p>
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
                    <div className="flex items-center gap-2 text-sm">
                      {assignment.student_name ? (
                        <>
                          <User className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Individuell:</span>
                          <span className="text-gray-300">{assignment.student_name}</span>
                        </>
                      ) : assignment.class_name && assignment.class_name !== 'Individuell tilldelning' ? (
                        <>
                          <Users className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-400 font-medium">Klass:</span>
                          <span className="text-gray-300">{assignment.class_name}</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">Okänd mottagare</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => removeAssignment(assignment.id)}
                    className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex-shrink-0"
                    title="Ta bort tilldelning"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            if (selectedClasses.length > 0) {
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
