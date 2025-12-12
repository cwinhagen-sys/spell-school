'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { BookOpen, User, Calendar, Star, ChevronDown, ChevronUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface StorySubmission {
  id: string
  student_id: string
  student_name: string
  student_class: string
  created_at: string
  score: number
  story: string
  studentEnding: string
  targetWords: string[]
  feedback: Array<{
    type: 'strength' | 'improvement'
    segment: string
    comment: string
    suggestion?: string
  }>
}

export default function StoryReviewsPage() {
  const [submissions, setSubmissions] = useState<StorySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  
  useEffect(() => {
    loadSubmissions()
  }, [])
  
  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Get teacher's classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
      
      if (!classes?.length) {
        setSubmissions([])
        setLoading(false)
        return
      }
      
      // Get students in those classes
      const classIds = classes.map(c => c.id)
      const { data: classStudents } = await supabase
        .from('class_students')
        .select('student_id, class_id, classes(name)')
        .in('class_id', classIds)
      
      if (!classStudents?.length) {
        setSubmissions([])
        setLoading(false)
        return
      }
      
      const studentIds = classStudents.map(cs => cs.student_id)
      const studentClassMap = new Map(
        classStudents.map(cs => [cs.student_id, (cs.classes as any)?.name || 'Unknown'])
      )
      
      // Get profiles for names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', studentIds)
      
      const profileMap = new Map(
        profiles?.map(p => [p.id, p.username || p.email?.split('@')[0] || 'Student']) || []
      )
      
      // Get game sessions with review data
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id, student_id, created_at, notes')
        .in('student_id', studentIds)
        .eq('game_type', 'distorted_tale')
        .not('notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)
      
      // Parse sessions with review data
      const parsedSubmissions: StorySubmission[] = []
      
      for (const session of sessions || []) {
        if (!session.notes) continue
        
        try {
          const notes = typeof session.notes === 'string' 
            ? JSON.parse(session.notes) 
            : session.notes
          
          if (notes.reviewRequested) {
            parsedSubmissions.push({
              id: session.id,
              student_id: session.student_id,
              student_name: profileMap.get(session.student_id) || 'Student',
              student_class: studentClassMap.get(session.student_id) || 'Unknown',
              created_at: session.created_at,
              score: notes.score || 0,
              story: notes.story || '',
              studentEnding: notes.studentEnding || '',
              targetWords: notes.targetWords || [],
              feedback: notes.feedback || []
            })
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      setSubmissions(parsedSubmissions)
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }
  
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20'
    if (score >= 60) return 'bg-amber-500/20'
    return 'bg-red-500/20'
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading student stories...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Story Reviews
          </h1>
          <p className="text-gray-400 mt-1">
            View student story endings submitted for review
          </p>
        </div>
        
        <button
          onClick={loadSubmissions}
          className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#12122a] border border-white/5 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Submissions</p>
          <p className="text-2xl font-bold text-white mt-1">{submissions.length}</p>
        </div>
        <div className="bg-[#12122a] border border-white/5 rounded-xl p-4">
          <p className="text-sm text-gray-400">Average Score</p>
          <p className="text-2xl font-bold text-white mt-1">
            {submissions.length > 0 
              ? Math.round(submissions.reduce((a, b) => a + b.score, 0) / submissions.length)
              : 0}%
          </p>
        </div>
        <div className="bg-[#12122a] border border-white/5 rounded-xl p-4">
          <p className="text-sm text-gray-400">This Week</p>
          <p className="text-2xl font-bold text-white mt-1">
            {submissions.filter(s => {
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return new Date(s.created_at) > weekAgo
            }).length}
          </p>
        </div>
      </div>
      
      {/* Submissions list */}
      {submissions.length === 0 ? (
        <div className="text-center py-16 bg-[#12122a] border border-white/5 rounded-2xl">
          <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No submissions yet</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            When students complete "Finish the Story" and click "Send to Teacher", their submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#12122a] border border-white/5 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">{submission.student_name}</p>
                    <p className="text-sm text-gray-500">{submission.student_class}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-lg ${getScoreBg(submission.score)}`}>
                    <span className={`font-bold ${getScoreColor(submission.score)}`}>
                      {submission.score}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 hidden sm:block">
                    {new Date(submission.created_at).toLocaleDateString('en-US')}
                  </div>
                  {expandedId === submission.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              
              {/* Expanded content */}
              {expandedId === submission.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-white/5"
                >
                  <div className="p-5 space-y-5">
                    {/* Target words */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Target Words</h4>
                      <div className="flex flex-wrap gap-2">
                        {submission.targetWords.map((word, i) => {
                          const used = submission.studentEnding.toLowerCase().includes(word.toLowerCase())
                          return (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded-md text-xs font-medium ${
                                used 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {word}
                              {used && <CheckCircle className="w-3 h-3 ml-1 inline" />}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Original story */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Original Story</h4>
                      <div className="p-3 rounded-lg bg-white/5 text-white/80 text-sm leading-relaxed">
                        {submission.story}
                      </div>
                    </div>
                    
                    {/* Student's ending */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Student's Ending</h4>
                      <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-white/90 text-sm leading-relaxed">
                        {submission.studentEnding}
                      </div>
                    </div>
                    
                    {/* AI Feedback */}
                    {submission.feedback.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">AI Feedback</h4>
                        <div className="space-y-2">
                          {submission.feedback.map((fb, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg ${
                                fb.type === 'strength'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                                  : 'bg-amber-500/10 border border-amber-500/20'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {fb.type === 'strength' ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <p className={`text-sm font-medium ${
                                    fb.type === 'strength' ? 'text-emerald-400' : 'text-amber-400'
                                  }`}>
                                    "{fb.segment}"
                                  </p>
                                  <p className="text-white/70 text-sm mt-1">{fb.comment}</p>
                                  {fb.suggestion && (
                                    <p className="text-cyan-400 text-sm mt-1 italic">
                                      Suggestion: "{fb.suggestion}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}


