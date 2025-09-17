'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ColorSelect, { type ColorOption } from '@/components/ColorSelect'
import ImageSelector from '@/components/ImageSelector'

type Word = { en: string; sv: string; image_url?: string }
type WordSet = { id: string; title: string; words: Word[]; created_at: string; color?: string }

export default function TeacherWordSetsPage() {
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState<Word[]>([{ en: '', sv: '' }])
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editRows, setEditRows] = useState<Word[]>([])
  const [color, setColor] = useState<string>('')
  const [editColor, setEditColor] = useState<string>('')
  const colorOptions: ColorOption[] = [
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#fbbf24', label: 'Amber' },
    { value: '#10b981', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#14b8a6', label: 'Teal' },
  ]

  // Bulk paste helpers: parse lines into { en, sv }
  const parsePairsFromText = (text: string): Word[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const out: Word[] = []
    for (const line of lines) {
      // Prefer tab, then explicit dash with spaces, then comma/semicolon/colon
      let parts: string[] | null = null
      if (line.includes('\t')) parts = line.split('\t')
      else if (/\s-\s/.test(line)) parts = line.split(/\s-\s/)
      else if (line.includes(',')) parts = line.split(',')
      else if (line.includes(';')) parts = line.split(';')
      else if (line.includes(':')) parts = line.split(':')
      if (parts) {
        const en = (parts[0] ?? '').trim()
        const sv = (parts[1] ?? '').trim()
        if (en || sv) out.push({ en, sv })
      } else {
        // Single token line; default to English-only, Swedish left blank
        out.push({ en: line, sv: '' })
      }
    }
    return out
  }

  const handleCreatePasteEn = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    if (/\r|\n|\t|,|;|:\s|\s-\s/.test(text)) {
      e.preventDefault()
      const parsed = parsePairsFromText(text)
      if (parsed.length > 0) setRows(parsed)
    }
  }

  const handleCreatePasteSv = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    if (/\r|\n|\t|,|;|:\s|\s-\s/.test(text)) {
      e.preventDefault()
      const parsed = parsePairsFromText(text)
      if (parsed.length > 0) setRows(parsed)
    }
  }

  const handleEditPasteEn = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    if (/\r|\n|\t|,|;|:\s|\s-\s/.test(text)) {
      e.preventDefault()
      const parsed = parsePairsFromText(text)
      if (parsed.length > 0) setEditRows(parsed)
    }
  }

  const handleEditPasteSv = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    if (/\r|\n|\t|,|;|:\s|\s-\s/.test(text)) {
      e.preventDefault()
      const parsed = parsePairsFromText(text)
      if (parsed.length > 0) setEditRows(parsed)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'teacher') { window.location.href = '/student'; return }
      load()
    }
    init()
  }, [])

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('word_sets')
        .select('id,title,words,created_at,color')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setWordSets((data as any[])?.map(ws => ({ id: ws.id, title: ws.title, words: ws.words, created_at: ws.created_at, color: ws.color })) ?? [])
    } catch (e: any) {
      setMessage(`Failed to load word sets${e?.message ? `: ${e.message}` : ''}`)
      console.error('load word_sets error', e)
    }
  }

  const addRow = () => setRows([...rows, { en: '', sv: '' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!title.trim() || rows.length === 0) return
    const clean = rows.filter(r => r.en.trim() && r.sv.trim())
    if (clean.length === 0) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const payload = { title: title.trim(), words: clean as any, teacher_id: user.id, color: color || null }
      const { error } = await supabase.from('word_sets').insert(payload)
      if (error) throw error
      setTitle('')
      setRows([{ en: '', sv: '' }])
      setColor('')
      load()
    } catch (e: any) {
      setMessage(`Failed to save${e?.message ? `: ${e.message}` : ''}`)
    }
  }

  const remove = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase
        .from('word_sets')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id)
      if (error) throw error
      load()
    } catch {
      setMessage('Failed to delete')
    }
  }

  const update = async (id: string, newTitle: string, newColor?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase
        .from('word_sets')
        .update({ title: newTitle, color: newColor ?? null })
        .eq('id', id)
        .eq('teacher_id', user.id)
      if (error) throw error
      load()
    } catch {
      setMessage('Failed to update')
    }
  }

  const beginEdit = (ws: WordSet) => {
    setEditingId(ws.id)
    setEditTitle(ws.title)
    setEditRows(ws.words.map(w => ({ en: w.en, sv: w.sv })))
    setEditColor(ws.color || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditRows([])
  }

  const addEditRow = () => setEditRows([...editRows, { en: '', sv: '' }])
  const removeEditRowAt = (i: number) => setEditRows(editRows.filter((_, idx) => idx !== i))

  const saveEdit = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const clean = editRows.filter(r => r.en.trim() && r.sv.trim())
      if (!editTitle.trim() || clean.length === 0) { setMessage('Please provide title and at least one word'); return }
      const { error } = await supabase
        .from('word_sets')
        .update({ title: editTitle.trim(), words: clean as any, color: editColor || null })
        .eq('id', id)
        .eq('teacher_id', user.id)
      if (error) throw error
      cancelEdit()
      await load()
      setMessage('Updated word set')
    } catch (e: any) {
      setMessage(`Failed to update${e?.message ? `: ${e.message}` : ''}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Word Sets</h1>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Create new</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 shadow-sm"/>
            <ColorSelect value={color} onChange={setColor} options={colorOptions} />
          </div>
          <div className="space-y-4 mb-4">
            {rows.map((r, i) => (
              <div key={i} data-word-index={i} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={r.en} onPaste={handleCreatePasteEn} onChange={e=>{
                    const copy=[...rows]; copy[i]={...copy[i], en:e.target.value}; setRows(copy)
                  }} placeholder="English" className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 shadow-sm"/>
                  <div className="flex gap-2">
                    <input value={r.sv} onPaste={handleCreatePasteSv} onChange={e=>{
                      const copy=[...rows]; copy[i]={...copy[i], sv:e.target.value}; setRows(copy)
                    }} placeholder="Swedish" className="px-3 py-2 rounded w-full bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 shadow-sm"/>
                    <button onClick={()=>removeRow(i)} className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">-</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Image:</span>
                  <ImageSelector
                    value={r.image_url}
                    onChange={(imageUrl) => {
                      const copy = [...rows]
                      copy[i] = { ...copy[i], image_url: imageUrl }
                      setRows(copy)
                    }}
                    onClear={() => {
                      const copy = [...rows]
                      copy[i] = { ...copy[i], image_url: undefined }
                      setRows(copy)
                    }}
                    word={r.en || 'word'}
                    wordIndex={i}
                  />
                </div>
              </div>
            ))}
            <button onClick={addRow} className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">+ Add word</button>
          </div>
          <button onClick={save} className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md">Save</button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Your Word Sets</h2>
          <div className="space-y-3">
            {wordSets.map(ws => (
              <div key={ws.id} className="p-4 border border-gray-200 bg-white rounded-lg shadow-sm">
                {editingId === ws.id ? (
                  <div className="space-y-3">
                    <input
                      value={editTitle}
                      onChange={(e)=>setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 shadow-sm"
                      placeholder="Title"
                    />
                    <ColorSelect value={editColor} onChange={setEditColor} options={colorOptions} />
                    <div className="space-y-4">
                      {editRows.map((r, i) => (
                        <div key={i} data-word-index={i} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <input
                              value={r.en}
                              onPaste={handleEditPasteEn}
                              onChange={(e)=>{ const copy=[...editRows]; copy[i] = { ...copy[i], en: e.target.value }; setEditRows(copy) }}
                              placeholder="English"
                              className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 shadow-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                value={r.sv}
                                onPaste={handleEditPasteSv}
                                onChange={(e)=>{ const copy=[...editRows]; copy[i] = { ...copy[i], sv: e.target.value }; setEditRows(copy) }}
                                placeholder="Swedish"
                                className="px-3 py-2 rounded w-full bg-white border border-gray-300 text-gray-800 placeholder:text-gray-500 shadow-sm"
                              />
                              <button onClick={()=>removeEditRowAt(i)} className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">-</button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Image:</span>
                            <ImageSelector
                              value={r.image_url}
                              onChange={(imageUrl) => {
                                const copy = [...editRows]
                                copy[i] = { ...copy[i], image_url: imageUrl }
                                setEditRows(copy)
                              }}
                              onClear={() => {
                                const copy = [...editRows]
                                copy[i] = { ...copy[i], image_url: undefined }
                                setEditRows(copy)
                              }}
                              word={r.en || 'word'}
                              wordIndex={i}
                            />
                          </div>
                        </div>
                      ))}
                      <button onClick={addEditRow} className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">+ Add word</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>saveEdit(ws.id)} className="px-4 py-2 rounded bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow-md">Save</button>
                      <button onClick={cancelEdit} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <input defaultValue={ws.title} onBlur={(e)=>{
                        const v=e.target.value.trim(); if(v && v!==ws.title){update(ws.id, v, ws.color)}
                      }} className="w-full bg-transparent text-gray-800 font-medium outline-none border-b border-gray-300 focus:border-indigo-500" />
                      <div className="text-gray-600 text-sm flex items-center gap-2">
                        <span>{ws.words.length} words</span>
                        {ws.color && <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }}></span></span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={()=>beginEdit(ws)} className="text-indigo-600 hover:text-indigo-700">Edit</button>
                      <button onClick={()=>remove(ws.id)} className="text-red-500 hover:text-red-600">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {wordSets.length===0 && <div className="text-gray-500">No word sets yet.</div>}
          </div>
        </div>

        {message && <div className="mt-6 p-3 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{message}</div>}
      </div>
    </div>
  )
}


