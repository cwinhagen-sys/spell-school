'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Plus, LogOut, Home, Calendar, FileText, Users, Library, Link2 } from 'lucide-react'
import { Homework } from '@/types'

export default function TeacherDashboard() {
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    vocabulary_words: '',
    due_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', description: '', due_date: '', vocabulary: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/'
        return
      }

      // Ensure only teachers can access
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'teacher') {
        window.location.href = '/student'
        return
      }
      fetchHomeworks()
      // Optional: aggregate teacher points from students (future). For now remains 0.
    }
    init()
  }, [])

  const fetchHomeworks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('homeworks')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHomeworks(data || [])
    } catch (error) {
      console.error('Error fetching homeworks:', error)
    }
  }

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user logged in')

      const vocabularyArray = newHomework.vocabulary_words
        .split(',')
        .map(word => word.trim())
        .filter(word => word.length > 0)

      const { error } = await supabase
        .from('homeworks')
        .insert({
          title: newHomework.title,
          description: newHomework.description,
          vocabulary_words: vocabularyArray,
          due_date: newHomework.due_date,
          teacher_id: user.id
        })

      if (error) throw error

      setMessage('✅ Assignment created successfully!')
      setNewHomework({ title: '', description: '', vocabulary_words: '', due_date: '' })
      fetchHomeworks()
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'An error occurred'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHomework = async (id: string) => {
    try {
      const { error } = await supabase.from('homeworks').delete().eq('id', id)
      if (error) throw error
      setHomeworks(hws => hws.filter(h => h.id !== id))
      setMessage('✅ Assignment deleted')
    } catch (e) {
      setMessage('Error: Failed to delete assignment')
    }
  }

  const handleUpdateHomework = async (id: string) => {
    try {
      const vocabularyArray = editDraft.vocabulary
        .split(',')
        .map(w => w.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('homeworks')
        .update({ title: editDraft.title, description: editDraft.description, due_date: editDraft.due_date, vocabulary_words: vocabularyArray })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      await fetchHomeworks()
      setMessage('✅ Assignment updated')
    } catch (e) {
      setMessage('Error: Failed to update assignment')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Quiz unlock handlers now moved to /teacher/quiz

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Teacher Dashboard</h1>

      {/* Quick navigation */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Quiz removed for rebuild */}

        <a
          href="/teacher/classes"
          className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 hover:border-indigo-500/50 hover:shadow-xl transition-all"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Manage Classes</h3>
          </div>
          <p className="text-sm text-gray-600">Create, edit, and delete classes. Add or remove students by email.</p>
        </a>

        <a
          href="/teacher/word-sets"
          className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 hover:border-emerald-500/50 hover:shadow-xl transition-all"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center mr-3">
              <Library className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Word Sets</h3>
          </div>
          <p className="text-sm text-gray-600">Create vocabulary packages with words and translations.</p>
        </a>

        <a
          href="/teacher/assign"
          className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 hover:border-purple-500/50 hover:shadow-xl transition-all"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mr-3">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Assign Word Sets</h3>
          </div>
          <p className="text-sm text-gray-600">Assign word sets to whole classes or specific students.</p>
        </a>

        {/* Progress card removed per request */}
      </div>
      {/* Remove all other sections for a clean button-only dashboard */}
    </div>
  )
}
