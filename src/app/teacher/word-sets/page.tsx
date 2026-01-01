'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ImageSelector, { type ImageData } from '@/components/ImageSelector'
import { FileText, Edit2, Trash2, Plus, X, Save, Sparkles, ArrowLeft, AlertTriangle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { canCreateWordSet, getUserSubscriptionTier, TIER_LIMITS } from '@/lib/subscription'
import PaymentWallModal from '@/components/PaymentWallModal'

type Word = { 
  en: string
  sv: string
  image_url?: string
  photographer_name?: string
  photographer_url?: string
  unsplash_url?: string
}
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
  
  // Payment wall states
  const [showPaymentWall, setShowPaymentWall] = useState(false)
  const [paymentWallLimit, setPaymentWallLimit] = useState<number | null>(null)
  const [paymentWallTier, setPaymentWallTier] = useState<'premium' | 'pro'>('premium')

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
      
      // Check email verification
      const { isUserEmailVerified } = await import('@/lib/email-verification')
      if (!isUserEmailVerified(user)) {
        window.location.href = '/?message=Please verify your email address before accessing teacher features. Check your inbox for the verification link.'
        return
      }
      
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
      setMessage({ type: 'error', text: `Could not load word lists${e?.message ? `: ${e.message}` : ''}` })
    }
  }

  const addRow = () => setRows([...rows, { en: '', sv: '' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!title.trim() || rows.length === 0) return
    const clean = rows.filter(r => r.en.trim() && r.sv.trim())
    if (clean.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one word with both English and translation' })
      return
    }
    
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const canCreate = await canCreateWordSet(user.id, wordSets.length)
      if (!canCreate.allowed) {
        const tier = await getUserSubscriptionTier(user.id)
        const limits = TIER_LIMITS[tier]
        setPaymentWallLimit(limits.maxWordSets)
        setPaymentWallTier(tier === 'free' ? 'premium' : 'pro')
        setShowPaymentWall(true)
        setSaving(false)
        return
      }
      
      const payload = { title: title.trim(), words: clean as any, teacher_id: user.id }
      const { error } = await supabase.from('word_sets').insert(payload)
      if (error) throw error
      setTitle('')
      setRows([{ en: '', sv: '' }])
      setMessage({ type: 'success', text: 'Word list created!' })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: `Could not save${e?.message ? `: ${e.message}` : ''}` })
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
      setMessage({ type: 'success', text: 'Word list deleted' })
      setDeleteConfirm(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Could not delete' })
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
        setMessage({ type: 'error', text: 'Enter title and at least one word' })
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
      setMessage({ type: 'success', text: 'Word list updated!' })
    } catch (e: any) {
      setMessage({ type: 'error', text: `Could not update${e?.message ? `: ${e.message}` : ''}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading word lists...</p>
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
            Back to word lists
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <Edit2 className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur opacity-30" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Word List</h1>
              <p className="text-gray-400">Update "{editingWordSet?.title}"</p>
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
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
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
          className="bg-[#161622] border border-white/[0.12] rounded-2xl p-6"
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input 
              value={editTitle} 
              onChange={e => setEditTitle(e.target.value)} 
              placeholder="e.g. Animals, Colors, Food..." 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
            />
          </div>
          
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Words ({editRows.length})</label>
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
                    placeholder="English" 
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
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
                      placeholder="Translation" 
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
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
                  <span className="text-xs font-medium text-gray-500">Image:</span>
                  <ImageSelector
                    value={r.image_url}
                    onChange={(imageData: ImageData) => {
                      const copy = [...editRows]
                      copy[i] = { 
                        ...copy[i], 
                        image_url: imageData.image_url,
                        photographer_name: imageData.photographer_name,
                        photographer_url: imageData.photographer_url,
                        unsplash_url: imageData.unsplash_url
                      }
                      setEditRows(copy)
                    }}
                    onClear={() => {
                      const copy = [...editRows]
                      copy[i] = { 
                        ...copy[i], 
                        image_url: undefined,
                        photographer_name: undefined,
                        photographer_url: undefined,
                        unsplash_url: undefined
                      }
                      setEditRows(copy)
                    }}
                    word={r.en || 'word'}
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
              Add word
            </button>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => saveEdit(editingId)}
              disabled={saving || !editTitle.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-cyan-400 hover:to-blue-400 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              onClick={cancelEdit}
              className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-colors font-medium"
            >
              Cancel
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
                  <h3 className="text-lg font-bold text-white">Delete Word List?</h3>
                  <p className="text-gray-400 text-sm">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete the word list "{wordSets.find(ws => ws.id === deleteConfirm)?.title}"? 
                All words and assignments linked to this list will be removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => remove(deleteConfirm)}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Yes, delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-colors font-medium"
                >
                  Cancel
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
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur opacity-30" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Word Lists</h1>
            <p className="text-gray-400">Create and manage your word lists</p>
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
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
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
        className="bg-[#161622] border border-white/[0.12] rounded-2xl p-6 mb-8"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" />
          Create New Word List
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="e.g. Animals, Colors, Food..." 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
          />
        </div>
        
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Words ({rows.length})</label>
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
                  placeholder="English" 
                  className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
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
                    placeholder="Translation" 
                    className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
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
                <span className="text-xs font-medium text-gray-500">Image:</span>
                <ImageSelector
                  value={r.image_url}
                  onChange={(imageData: ImageData) => {
                    const copy = [...rows]
                    copy[i] = { 
                      ...copy[i], 
                      image_url: imageData.image_url,
                      photographer_name: imageData.photographer_name,
                      photographer_url: imageData.photographer_url,
                      unsplash_url: imageData.unsplash_url
                    }
                    setRows(copy)
                  }}
                  onClear={() => {
                    const copy = [...rows]
                    copy[i] = { 
                      ...copy[i], 
                      image_url: undefined,
                      photographer_name: undefined,
                      photographer_url: undefined,
                      unsplash_url: undefined
                    }
                    setRows(copy)
                  }}
                  word={r.en || 'word'}
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
            Add word
          </button>
        </div>
        
        <button 
          onClick={save}
          disabled={saving || !title.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Create Word List'}
        </button>
      </motion.div>

      {/* Word Sets List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#161622] border border-white/[0.12] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Your word lists</h2>
          <span className="text-sm text-gray-500">{wordSets.length} {wordSets.length === 1 ? 'list' : 'lists'}</span>
        </div>
        
        {wordSets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg">No word lists yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first word list above</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wordSets.map((ws, index) => (
              <motion.div 
                key={ws.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-[#161622] border border-white/[0.12] rounded-xl overflow-hidden hover:border-amber-500/30 transition-all p-5"
              >
                {/* Assign button in top right corner */}
                <button
                  onClick={() => window.location.href = `/teacher/assign?wordSet=${ws.id}`}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/30 rounded-lg flex items-center justify-center transition-all group/btn"
                  title="Assign this word list"
                >
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-orange-400 transition-colors" />
                </button>
                
                <div className="flex items-start justify-between gap-3 mb-3 pr-10">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">{ws.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {ws.words.length} words
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button 
                    onClick={() => beginEdit(ws)} 
                    className="flex-1 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(ws.id)} 
                    className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    title="Delete word list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Payment Wall Modal */}
      <PaymentWallModal
        isOpen={showPaymentWall}
        onClose={() => setShowPaymentWall(false)}
        feature="word lists"
        currentLimit={paymentWallLimit}
        upgradeTier={paymentWallTier}
        upgradeMessage={`You've reached the maximum number of word lists for your current plan. Upgrade to ${paymentWallTier === 'premium' ? 'Premium' : 'Pro'} to create more word lists.`}
      />
    </>
  )
}
