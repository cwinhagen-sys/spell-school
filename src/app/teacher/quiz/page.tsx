'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TeacherQuizAssignPage() {
  const [wordSets, setWordSets] = useState<Array<{ id: string; title: string }>>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedWordSet, setSelectedWordSet] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Array<{ id: string; email: string }>>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'teacher') { window.location.href = '/student'; return }
      const { data: ws } = await supabase.from('word_sets').select('id, title').order('title', { ascending: true })
      setWordSets((ws as any[])?.map(r => ({ id: r.id, title: r.title })) || [])
      const { data: cls } = await supabase.from('classes').select('id, name').order('name', { ascending: true })
      setClasses((cls as any[])?.map(r => ({ id: r.id, name: r.name })) || [])
    })()
  }, [])

  // Load students when class changes
  useEffect(() => {
    ;(async () => {
      setStudents([])
      setSelectedStudentIds([])
      if (!selectedClass) return
      try {
        const { data: classLinks, error } = await supabase
          .from('class_students')
          .select('student_id')
          .eq('class_id', selectedClass)
        if (error) throw error
        const ids = (classLinks || []).map((r: any) => r.student_id)
        if (ids.length === 0) return
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', ids)
        if (profErr) throw profErr
        setStudents((profiles as any[])?.map(p => ({ id: p.id, email: p.email })) || [])
      } catch (e: any) {
        setMessage(`Error loading students: ${e?.message || 'Unknown error'}`)
      }
    })()
  }, [selectedClass])

  const unlockForClass = async () => {
    setMessage('')
    if (!selectedWordSet || !selectedClass) { setMessage('Select word set and class'); return }
    try {
      const { data: existing } = await supabase
        .from('assigned_word_sets')
        .select('id')
        .match({ class_id: selectedClass, word_set_id: selectedWordSet })
        .maybeSingle()
      if (existing?.id) {
        const { error: upErr } = await supabase
          .from('assigned_word_sets')
          .update({ quiz_unlocked: true })
          .eq('id', existing.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase
          .from('assigned_word_sets')
          .insert({ class_id: selectedClass, word_set_id: selectedWordSet, quiz_unlocked: true })
        if (insErr) throw insErr
      }
      setMessage('✅ Quiz unlocked for class')
    } catch (e: any) {
      setMessage(`Error: ${e?.message || 'Failed to unlock for class'}. The column quiz_unlocked may be missing in assigned_word_sets.`)
    }
  }

  const unlockForStudent = async () => {
    setMessage('')
    if (!selectedWordSet || selectedStudentIds.length === 0) { setMessage('Select word set and at least one student'); return }
    try {
      for (const studentId of selectedStudentIds) {
        const { data: existing } = await supabase
          .from('assigned_word_sets')
          .select('id')
          .match({ student_id: studentId, word_set_id: selectedWordSet })
          .maybeSingle()
        if (existing?.id) {
          const { error: upErr } = await supabase.from('assigned_word_sets').update({ quiz_unlocked: true }).eq('id', existing.id)
          if (upErr) throw upErr
        } else {
          const { error: insErr } = await supabase.from('assigned_word_sets').insert({ student_id: studentId, word_set_id: selectedWordSet, quiz_unlocked: true })
          if (insErr) throw insErr
        }
      }
      setMessage('✅ Quiz unlocked for selected students')
    } catch (e: any) {
      setMessage(`Error: ${e?.message || 'Failed to unlock for selected students'}. The column quiz_unlocked may be missing in assigned_word_sets.`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Assign/Unlock Quiz</h1>
          <a href="/teacher/quiz-results" className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md">View Results</a>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Word Set</label>
              <select value={selectedWordSet} onChange={e=>setSelectedWordSet(e.target.value)} className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 shadow-sm">
                <option value="">Select word set</option>
                {wordSets.map(ws=> (
                  <option key={ws.id} value={ws.id} className="text-gray-800">{ws.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Class</label>
              <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 shadow-sm">
                <option value="">Select class</option>
                {classes.map(c=> (
                  <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Students</label>
              <div className="max-h-44 overflow-auto rounded border border-gray-200 bg-white p-2 shadow-sm">
                {students.length === 0 ? (
                  <div className="text-sm text-gray-500">No students loaded</div>
                ) : (
                  students.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 py-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={(e)=>{
                          setSelectedStudentIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))
                        }}
                      />
                      <span>{s.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={unlockForClass} className="px-4 py-2 rounded bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 text-white shadow-md" disabled={!selectedWordSet || !selectedClass}>Unlock for Class</button>
            <button onClick={unlockForStudent} className="px-4 py-2 rounded bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 text-white shadow-md" disabled={!selectedWordSet || selectedStudentIds.length===0}>Unlock for Selected Students</button>
          </div>
          {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}
          <p className="mt-4 text-xs text-gray-500">Unlock sätter flaggan quiz_unlocked på tilldelningen. Om kolumnen saknas i assigned_word_sets behöver den läggas till i databasen.</p>
        </div>
      </div>
    </div>
  )
}


