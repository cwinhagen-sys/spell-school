'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ImageSelector from '@/components/ImageSelector'
import { FileText, Edit2, Trash2, Plus, X, Save, Sparkles, ArrowLeft, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { canCreateWordSet } from '@/lib/subscription'

type Word = { en: string; sv: string; image_url?: string }
type WordSet = { id: string; title: string; words: Word[]; created_at: string }

export default function TeacherWordSetsPage() {
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState<Word[]>([{ en: '', sv: '' }])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editRows, setEditRows] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const parsePairsFromText = (text: string): Word[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const out: Word[] = []
    for (const line of lines) {
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
        out.push({ en: line, sv: '' })
      }
    }
    return out
  }

  const handleCreatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    if (/\r|\n|\t|,|;|:\s|\s-\s/.test(text)) {
      e.preventDefault()
      const parsed = parsePairsFromText(text)
      if (parsed.length > 0) setRows(parsed)
    }
  }

  const handleEditPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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
      await load()
      setLoading(false)
    }
    init()
  }, [])

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('word_sets')
        .select('id,title,words,created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setWordSets((data as any[])?.map(ws => ({ id: ws.id, title: ws.title, words: ws.words, created_at: ws.created_at })) ?? [])
    } catch (e: any) {
      setMessage({ type: 'error', text: `Kunde inte ladda ordlistor${e?.message ? `: ${e.message}` : ''}` })
    }
  }

  const addRow = () => setRows([...rows, { en: '', sv: '' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!title.trim() || rows.length === 0) return
    const clean = rows.filter(r => r.en.trim() && r.sv.trim())
    if (clean.length === 0) {
      setMessage({ type: 'error', text: 'Lägg till minst ett ord med både engelska och svenska' })
      return
    }
    
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const canCreate = await canCreateWordSet(user.id, wordSets.length)
      if (!canCreate.allowed) {
        setMessage({ type: 'error', text: canCreate.reason || 'Du har nått max antal ordlistor för din plan.' })
        setSaving(false)
        return
      }
      
      const payload = { title: title.trim(), words: clean as any, teacher_id: user.id }
      const { error } = await supabase.from('word_sets').insert(payload)
      if (error) throw error
      setTitle('')
      setRows([{ en: '', sv: '' }])
      setMessage({ type: 'success', text: 'Ordlista skapad!' })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: `Kunde inte spara${e?.message ? `: ${e.message}` : ''}` })
    } finally {
      setSaving(false)
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
      setMessage({ type: 'success', text: 'Ordlista raderad' })
      setDeleteConfirm(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Kunde inte radera' })
    }
  }

  const beginEdit = (ws: WordSet) => {
    setEditingId(ws.id)
    setEditTitle(ws.title)
    setEditRows(ws.words.map(w => ({ en: w.en, sv: w.sv, image_url: w.image_url })))
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
      if (!editTitle.trim() || clean.length === 0) {
        setMessage({ type: 'error', text: 'Ange titel och minst ett ord' })
        return
      }
      setSaving(true)
      const { error } = await supabase
        .from('word_sets')
        .update({ title: editTitle.trim(), words: clean as any })
        .eq('id', id)
        .eq('teacher_id', user.id)
      if (error) throw error
      cancelEdit()
      await load()
      setMessage({ type: 'success', text: 'Ordlista uppdaterad!' })
    } catch (e: any) {
      setMessage({ type: 'error', text: `Kunde inte uppdatera${e?.message ? `: ${e.message}` : ''}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Laddar ordlistor...</p>
        </div>
      </div>
    )
  }

  // Full-screen edit mode
  if (editingId) {
    const editingWordSet = wordSets.find(ws => ws.id === editingId)
    return (
      <>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={cancelEdit}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till ordlistor
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center">
                <Edit2 className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Redigera ordlista</h1>
              <p className="text-gray-400">Uppdatera "{editingWordSet?.title}"</p>
            </div>
          </div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {message.type === 'success' ? <Sparkles className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span className="flex-1">{message.text}</span>
              <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12122a] border border-white/5 rounded-2xl p-6"
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Titel</label>
            <input 
              value={editTitle} 
              onChange={e => setEditTitle(e.target.value)} 
              placeholder="T.ex. Djur, Färger, Mat..." 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
            />
          </div>
          
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Ord ({editRows.length})</label>
            {editRows.map((r, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
              >
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input 
                    value={r.en} 
                    onPaste={handleEditPaste} 
                    onChange={e => {
                      const copy = [...editRows]
                      copy[i] = { ...copy[i], en: e.target.value }
                      setEditRows(copy)
                    }} 
                    placeholder="Engelska" 
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                  />
                  <div className="flex gap-2">
                    <input 
                      value={r.sv} 
                      onPaste={handleEditPaste} 
                      onChange={e => {
                        const copy = [...editRows]
                        copy[i] = { ...copy[i], sv: e.target.value }
                        setEditRows(copy)
                      }} 
                      placeholder="Svenska" 
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                    />
                    {editRows.length > 1 && (
                      <button 
                        onClick={() => removeEditRowAt(i)} 
                        className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                  <span className="text-xs font-medium text-gray-500">Bild:</span>
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
                    word={r.en || 'ord'}
                    wordIndex={i}
                  />
                </div>
              </motion.div>
            ))}
            <button 
              onClick={addEditRow} 
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 border-2 border-dashed border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Lägg till ord
            </button>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => saveEdit(editingId)}
              disabled={saving || !editTitle.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>
            <button 
              onClick={cancelEdit}
              className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-colors font-medium"
            >
              Avbryt
            </button>
          </div>
        </motion.div>
      </>
    )
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12122a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Radera ordlista?</h3>
                  <p className="text-gray-400 text-sm">Denna åtgärd kan inte ångras</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Är du säker på att du vill radera ordlistan "{wordSets.find(ws => ws.id === deleteConfirm)?.title}"? 
                Alla ord och tilldelningar kopplade till denna lista kommer att tas bort.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => remove(deleteConfirm)}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Ja, radera
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-colors font-medium"
                >
                  Avbryt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur opacity-30" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gloslistor</h1>
            <p className="text-gray-400">Skapa och hantera dina ordlistor</p>
          </div>
        </div>
      </motion.div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? <Sparkles className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create New Word Set */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#12122a] border border-white/5 rounded-2xl p-6 mb-8"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" />
          Skapa ny ordlista
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Titel</label>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="T.ex. Djur, Färger, Mat..." 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
        
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Ord ({rows.length})</label>
          {rows.map((r, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input 
                  value={r.en} 
                  onPaste={handleCreatePaste} 
                  onChange={e => {
                    const copy = [...rows]
                    copy[i] = { ...copy[i], en: e.target.value }
                    setRows(copy)
                  }} 
                  placeholder="Engelska" 
                  className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                />
                <div className="flex gap-2">
                  <input 
                    value={r.sv} 
                    onPaste={handleCreatePaste} 
                    onChange={e => {
                      const copy = [...rows]
                      copy[i] = { ...copy[i], sv: e.target.value }
                      setRows(copy)
                    }} 
                    placeholder="Svenska" 
                    className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                  />
                  {rows.length > 1 && (
                    <button 
                      onClick={() => removeRow(i)} 
                      className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                <span className="text-xs font-medium text-gray-500">Bild:</span>
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
                  word={r.en || 'ord'}
                  wordIndex={i}
                />
              </div>
            </motion.div>
          ))}
          <button 
            onClick={addRow} 
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 border-2 border-dashed border-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Lägg till ord
          </button>
        </div>
        
        <button 
          onClick={save}
          disabled={saving || !title.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Sparar...' : 'Skapa ordlista'}
        </button>
      </motion.div>

      {/* Word Sets List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#12122a] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Dina ordlistor</h2>
          <span className="text-sm text-gray-500">{wordSets.length} {wordSets.length === 1 ? 'lista' : 'listor'}</span>
        </div>
        
        {wordSets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg">Inga ordlistor ännu</p>
            <p className="text-gray-500 text-sm mt-1">Skapa din första ordlista ovan</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wordSets.map((ws, index) => (
              <motion.div 
                key={ws.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white/5 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">{ws.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {ws.words.length} ord
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button 
                    onClick={() => beginEdit(ws)} 
                    className="flex-1 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Redigera
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(ws.id)} 
                    className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    title="Radera ordlista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}
