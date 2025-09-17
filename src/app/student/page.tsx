'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useActivityTracking } from '@/hooks/useActivityTracking'
import { BookOpen, Target, Star, Users, ChevronDown } from 'lucide-react'
import { levelForXp } from '@/lib/leveling'
import { titleForLevel } from '@/lib/wizardTitles'
import FlashcardGame from '@/components/games/FlashcardGame'
import MemoryGame from '@/components/games/WordMatchingGame'
import TypingChallenge from '@/components/games/TypingChallenge'
import TranslateGame from '@/components/games/TranslateGame'
import LineMatchingGame from '@/components/games/LineMatchingGame'
import LevelUpModal from '@/components/LevelUpModal'
import StoryGapGame from '@/components/games/StoryGapGame'
import QuizGame from '@/components/games/QuizGame'
import MultipleChoiceGame from '@/components/games/MultipleChoiceGame'
import RouletteGame from '@/components/games/RouletteGame'
import { type TrackingContext } from '@/lib/tracking'
import GameCard from '@/components/GameCard'
import LogoutHandler from '@/components/LogoutHandler'

interface Word {
  en: string
  sv: string
  image_url?: string
}

interface Homework {
  id: string
  title: string
  description: string
  vocabulary_words: string[] // Keep for backward compatibility
  words?: Word[] // New field for word objects with images
  due_date: string | null
  teacher_id: string
  created_at: string
  translations?: { [key: string]: string }
  color?: string
}

interface StudentProgress {
  total_points: number
  games_played: number
  last_played_at: string
  word_set_id: string
  homework_id: string
}

export default function StudentDashboard() {
  // Track user activity for better "Playing" status
  useActivityTracking()
  
  const [user, setUser] = useState<any>(null)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showFlashcardGame, setShowFlashcardGame] = useState(false)
  const [showWordMatchingGame, setShowWordMatchingGame] = useState(false)
  const [showTypingChallenge, setShowTypingChallenge] = useState(false)
  const [showTranslateGame, setShowTranslateGame] = useState(false)
  const [showStoryGap, setShowStoryGap] = useState(false)
  const [showLineMatchingGame, setShowLineMatchingGame] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [showChoice, setShowChoice] = useState(false)
  const [showRoulette, setShowRoulette] = useState(false)
  const [pendingGame, setPendingGame] = useState<'flashcards' | 'match' | 'typing' | 'translate' | 'connect' | 'quiz' | 'choice' | 'storygap' | 'roulette' | null>(null)
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [showHomeworkSelection, setShowHomeworkSelection] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title?: string; image?: string; description?: string } | null>(null)
  const [classInfo, setClassInfo] = useState<{id: string, name: string} | null>(null)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const leveling = levelForXp(points)
  const wizardTitle = titleForLevel(leveling.level)

  // Helper function to get current game data (homework only)
  const getCurrentGameData = () => {
    if (selectedHomework) {
      return {
        words: selectedHomework.vocabulary_words,
        wordObjects: selectedHomework.words,
        translations: selectedHomework.translations || {},
        color: selectedHomework.color,
        title: selectedHomework.title
      }
    }
    return null
  }

  useEffect(() => {
    const lvl = levelForXp(points).level
    setCurrentLevel(lvl)
  }, [points])

  useEffect(() => {
    loadStudentData()
  }, [])

  // Debug: Log when homeworks state changes
  useEffect(() => {
    console.log('homeworks state changed to:', homeworks.length, 'items')
  }, [homeworks])


  const loadStudentData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      }
      
      // Load assigned word sets
      await fetchHomeworks()
      console.log('After fetchHomeworks, homeworks.length:', homeworks.length)
      
      // Load permanent progress data
      const total = await loadStudentProgress()
      // Ensure UI reads the same total immediately
      setPoints(total)
      
      // Load class information
      await loadClassInfo()
      
    } catch (error) {
      console.error('Error loading student data:', error)
      setMessage('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentProgress = async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      console.log('Debug - Loading progress for user:', user.id)

      // PRIORITY 1: Try to load the global progress record (word_set_id = null)
      // This is the main record that contains total points and won't be lost
      const { data: globalProgress, error: globalError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', user.id)
        .is('word_set_id', null)
        .is('homework_id', null)
        .limit(1)
        .maybeSingle()

      if (globalError) {
        console.log('Debug - Error loading global progress:', globalError)
      }

      console.log('Debug - Global progress record:', globalProgress)

      if (globalProgress) {
        // Use the global record for total points
        const totalPoints = globalProgress.total_points || 0
        console.log('Debug - Using global progress record, total points:', totalPoints)
        setPoints(totalPoints)
        return totalPoints
      }

      // PRIORITY 2: Fallback to old method - sum all progress records
      // This is for backward compatibility with existing data
      console.log('Debug - No global record found, falling back to summing all records')
      
      const { data: allProgressData, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', user.id)

      if (error) {
        console.log('Debug - Error loading all progress:', error)
        setPoints(0)
        return 0
      }

      console.log('Debug - All progress data loaded:', allProgressData)

      if (allProgressData && allProgressData.length > 0) {
        // Calculate total points from all progress records
        const totalPoints = allProgressData.reduce((sum, progress) => sum + (progress.total_points || 0), 0)
        console.log('Debug - Total points calculated from all records:', totalPoints)
        console.log('Debug - Number of progress records:', allProgressData.length)
        setPoints(totalPoints)
        return totalPoints
      } else {
        console.log('Debug - No progress records found for student')
        setPoints(0)
        return 0
      }
    } catch (error) {
      console.error('Error loading student progress:', error)
      setPoints(0)
      return 0
    }
  }

  const fetchHomeworks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Fetching word sets for user:', user.id)

      // Find classes for this student
      const { data: classLinks, error: classError } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', user.id)

      if (classError) {
        console.error('Error fetching classes:', classError)
      }

      const classIds = (classLinks || []).map((r: any) => r.class_id)
      console.log('Student class IDs:', classIds)

      // Assigned directly to the student
      const { data: direct, error: directError } = await supabase
        .from('assigned_word_sets')
        .select('id, created_at, due_date, quiz_unlocked, word_sets ( id, title, words, color )')
        .eq('student_id', user.id)

      if (directError) {
        console.error('Error fetching direct assignments:', directError)
      }

      console.log('Direct assignments:', direct)

      // Assigned to any of the student's classes
      let byClass: any[] = []
      if (classIds.length > 0) {
        const { data: cls, error: classAssignError } = await supabase
          .from('assigned_word_sets')
          .select('id, created_at, due_date, quiz_unlocked, word_sets ( id, title, words, color )')
          .in('class_id', classIds)
          .is('student_id', null) // Only get class assignments, not individual ones
        
        if (classAssignError) {
          console.error('Error fetching class assignments:', classAssignError)
        }
        
        byClass = (cls as any[]) || []
        console.log('Class assignments:', byClass)
      }

      const combined = ([...(direct as any[] || []), ...byClass]).filter(r => r.word_sets)
      console.log('Combined assignments:', combined)

      // Per-set quiz unlocking deprecated; rely on global lock instead

      // Unique by word set id for listing, prefer earliest due_date (display only)
      const byWordSetId = new Map<string, any>()
      for (const rec of combined) {
        const wsid = rec.word_sets?.id
        if (!wsid) continue
        const existing = byWordSetId.get(wsid)
        if (!existing) {
          byWordSetId.set(wsid, rec)
        } else {
          const a = rec.due_date ? new Date(rec.due_date).getTime() : Infinity
          const b = existing.due_date ? new Date(existing.due_date).getTime() : Infinity
          if (a < b) byWordSetId.set(wsid, rec)
        }
      }
      const unique = Array.from(byWordSetId.values())

      console.log('Unique word sets:', unique)
      console.log('First unique item:', unique[0])
      console.log('First unique item word_sets:', unique[0]?.word_sets)

      // No per-set flags applied

      const extractEnglishWords = (words: any): string[] => {
        if (!Array.isArray(words)) return []
        const out: string[] = []
        for (const item of words) {
          if (typeof item === 'string') out.push(item)
          else if (item && typeof item === 'object') {
            if (typeof item.en === 'string') out.push(item.en)
            else if (typeof item.word === 'string') out.push(item.word)
          }
        }
        return out
      }

      const extractTranslations = (words: any): { [key: string]: string } => {
        if (!Array.isArray(words)) return {}
        const translations: { [key: string]: string } = {}
        for (const item of words) {
          if (typeof item === 'string') {
            // If it's just a string, we can't determine translation
            continue
          } else if (item && typeof item === 'object') {
            if (item.en && item.sv) {
              translations[item.en.toLowerCase()] = item.sv
            } else if (item.word && item.translation) {
              translations[item.word.toLowerCase()] = item.translation
            }
          }
        }
        return translations
      }

      // Map to Homework shape used by games
      console.log('Starting mapping of', unique.length, 'unique items')
      const mapped: Homework[] = unique.map((rec: any, index: number) => {
        console.log(`Mapping item ${index}:`, rec)
        console.log(`Item ${index} word_sets:`, rec.word_sets)
        console.log(`Item ${index} due_date:`, rec.due_date)
        console.log(`Item ${index} created_at:`, rec.created_at)
        const result = {
          id: rec.word_sets.id,
          title: rec.word_sets.title,
          description: 'Vocabulary set',
          due_date: rec.due_date ? new Date(rec.due_date).toISOString() : null, // Only set due_date if it exists
          vocabulary_words: extractEnglishWords(rec.word_sets.words), // Keep for backward compatibility
          words: rec.word_sets.words || [], // New field with full word objects
          teacher_id: '' as any,
          created_at: rec.created_at || new Date().toISOString(), // Use actual created_at for sorting
          translations: extractTranslations(rec.word_sets.words), // Add translations
          color: rec.word_sets.color || undefined,
        }
        console.log(`Mapped item ${index} result:`, result)
        return result
      })

      // Filter out assignments that are past due date
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      
      console.log('Before filtering, mapped.length:', mapped.length)
      console.log('Today:', today)
      
      const filtered = mapped.filter(homework => {
        console.log('Filtering homework:', homework.title, 'due_date:', homework.due_date)
        if (!homework.due_date) {
          console.log('No due date, keeping:', homework.title)
          return true // Keep assignments without due date
        }
        const dueDate = new Date(homework.due_date)
        const isNotPastDue = dueDate >= today
        console.log('Due date check:', homework.title, 'dueDate:', dueDate, 'isNotPastDue:', isNotPastDue)
        return isNotPastDue // Only keep assignments that are not past due
      })
      
      console.log('After filtering, filtered.length:', filtered.length)

      // Sort by created_at (newest first) for dashboard display
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA // Newest first
      })

      console.log('Mapped homeworks (sorted by newest):', sorted)
      console.log('Setting homeworks to:', sorted.length, 'items')
      setHomeworks(sorted)
      console.log('setHomeworks called with:', sorted.length, 'items')
    } catch (error) {
      console.error('Error fetching assigned word sets:', error)
    }
  }

  const startFlashcardGame = () => {
    if (homeworks.length === 0) {
      setMessage('No vocabulary sets available. Please wait for your teacher to assign vocabulary.')
      return
    }
    if (homeworks.length === 1) {
      setSelectedHomework(homeworks[0])
      setShowFlashcardGame(true)
    } else {
      setPendingGame('flashcards')
      setShowHomeworkSelection(true)
    }
  }

  const startWordMatchingGame = () => {
    if (homeworks.length === 0) {
      setMessage('No vocabulary sets available. Please wait for your teacher to assign vocabulary.')
      return
    }
    if (homeworks.length === 1) {
      setSelectedHomework(homeworks[0])
      setShowWordMatchingGame(true)
    } else {
      setPendingGame('match')
      setShowHomeworkSelection(true)
    }
  }

  const startTypingChallenge = () => {
    if (homeworks.length === 0) {
      alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
      return
    }
    if (homeworks.length === 1) {
      setSelectedHomework(homeworks[0])
      setShowTypingChallenge(true)
    } else {
      setPendingGame('typing')
      setShowHomeworkSelection(true)
    }
  }

  const handleScoreUpdate = async (newScore: number, newTotal?: number) => {
    // Don't update local state immediately - wait for database refresh
    // This ensures we show the same points that are stored in the database
    
    // If game returned the new total, trust it for instant UI; otherwise fetch
    if (typeof newTotal === 'number' && Number.isFinite(newTotal)) {
      setPoints(newTotal)
    }
    const fetched = await loadStudentProgress()
    
    // Check for level up after getting the updated points
    const updatedPoints = typeof newTotal === 'number' ? newTotal : fetched
    if (updatedPoints !== points) {
      setPoints(updatedPoints)
    }
    const before = levelForXp(points).level
    const after = levelForXp(updatedPoints).level
    if (after > before) {
      const t = titleForLevel(after)
      setShowLevelUp({ level: after, title: t.title, image: t.image, description: t.description })
    }
  }

  // Wrapper for tracking context
  const getTrackingContext = () => {
    const baseContext = {
      studentId: null as string | null,
      wordSetId: selectedHomework?.id,
      homeworkId: selectedHomework?.id,
      isWordBundle: false
    }

    return baseContext
  }


  // Homework selection modal state
  const selectHomeworkForGame = async (homework: Homework) => {
    setSelectedHomework(homework)
    setShowHomeworkSelection(false)
    
    // Start the pending game with the selected homework
    if (pendingGame === 'flashcards') {
      setShowFlashcardGame(true)
    } else if (pendingGame === 'match') {
      setShowWordMatchingGame(true)
    } else if (pendingGame === 'typing') {
      setShowTypingChallenge(true)
    } else if (pendingGame === 'translate') {
      setShowTranslateGame(true)
    } else if (pendingGame === 'connect') {
      setShowLineMatchingGame(true)
    } else if (pendingGame === 'quiz') {
      // Temporarily allow multiple attempts for testing
      setShowQuiz(true)
    } else if (pendingGame === 'choice') {
      setShowChoice(true)
    } else if (pendingGame === 'storygap') {
      setShowStoryGap(true)
    } else if (pendingGame === 'roulette') {
      setShowRoulette(true)
    }
  }



  const loadClassInfo = async () => {
    try {
      console.log('Debug - loadClassInfo started')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Debug - No user found in loadClassInfo')
        return
      }
      
      console.log('Debug - User ID for class lookup:', user.id)

      // First, let's see what's in the class_students table for this user
      const { data: allClassStudents, error: allError } = await supabase
        .from('class_students')
        .select('*')
        .eq('student_id', user.id)

      console.log('Debug - All class_students records for user:', allClassStudents)
      console.log('Debug - All class_students error:', allError)

      if (allError) {
        console.log('Debug - Error loading all class_students:', allError)
        setClassInfo(null)
        return
      }

      if (!allClassStudents || allClassStudents.length === 0) {
        console.log('Debug - No class_students records found for user')
        setClassInfo(null)
        return
      }

      // Get the first class record
      const firstClassRecord = allClassStudents[0]
      console.log('Debug - First class record:', firstClassRecord)

      // Try to get the real class name using a simpler approach
      // We'll try to read from the classes table with a different method
      
      if (firstClassRecord.class_id) {
        console.log('Debug - Attempting to get real class name for:', firstClassRecord.class_id)
        
        // Try approach 1: Simple direct query to classes table
        try {
          console.log('Debug - Attempting direct query to classes table...')
          
          // Try to read the actual class name from the classes table
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('name')
            .eq('id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!classError && classData && classData.name) {
            console.log('Debug - SUCCESS! Got real class name from classes table:', classData.name)
            setClassInfo({
              id: firstClassRecord.class_id,
              name: classData.name  // This should be "6A", "6B", "6C" etc.
            })
            return
          } else {
            console.log('Debug - Direct query failed or no data:', classError, classData)
            
            // If direct query fails, let's try to see what the actual error is
            if (classError) {
              console.log('Debug - RLS Error details:', classError.message, classError.code)
            }
          }
        } catch (e) {
          console.log('Debug - Direct query approach failed:', e)
        }
        
        // Try approach 2: Use a join query to get class name from class_students
        try {
          console.log('Debug - Attempting join query approach...')
          
          // Try to get class name through a join query
          // This might work better with RLS policies than direct access
          const { data: joinData, error: joinError } = await supabase
            .from('class_students')
            .select(`
              class_id,
              classes!inner (
                id,
                name
              )
            `)
            .eq('student_id', user.id)
            .eq('class_id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!joinError && joinData && joinData.classes) {
            const classInfo = joinData.classes as any
            console.log('Debug - SUCCESS! Got class name from join query:', classInfo.name)
            setClassInfo({
              id: firstClassRecord.class_id,
              name: classInfo.name  // This should be "6A", "6B", "6C" etc.
            })
            return
          } else {
            console.log('Debug - Join query failed or no data:', joinError, joinData)
            
            // If join query fails, let's try a different approach
            if (joinError) {
              console.log('Debug - Join query error details:', joinError.message, joinError.code)
            }
          }
        } catch (e) {
          console.log('Debug - Join query approach failed:', e)
        }
        
        // Try approach 2b: Use a different join syntax
        try {
          console.log('Debug - Attempting alternative join syntax...')
          
          // Try a different join approach that might work better
          const { data: altJoinData, error: altJoinError } = await supabase
            .from('class_students')
            .select(`
              class_id,
              classes (
                id,
                name
              )
            `)
            .eq('student_id', user.id)
            .eq('class_id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!altJoinError && altJoinData && altJoinData.classes) {
            const classInfo = altJoinData.classes as any
            console.log('Debug - SUCCESS! Got class name from alternative join:', classInfo.name)
            setClassInfo({
              id: firstClassRecord.class_id,
              name: classInfo.name  // This should be "6A", "6B", "6C" etc.
            })
            return
          } else {
            console.log('Debug - Alternative join failed or no data:', altJoinError, altJoinData)
          }
        } catch (e) {
          console.log('Debug - Alternative join approach failed:', e)
        }
        
        // Try approach 3: Try to get class name through a different table or method
        try {
          console.log('Debug - Attempting alternative table approach...')
          
          // Since we can't access the classes table directly due to RLS,
          // let's try to find the class name through other means
          
          // Let's check if we can get any information from the class_students table
          const { data: classStudentInfo, error: classStudentError } = await supabase
            .from('class_students')
            .select('*')
            .eq('student_id', user.id)
            .eq('class_id', firstClassRecord.class_id)
            .maybeSingle()
          
          if (!classStudentError && classStudentInfo) {
            console.log('Debug - Found class_student record:', classStudentInfo)
            
            // Maybe we can find the class name in other accessible data
            // For now, let's create a temporary name that's at least consistent
            const classId = firstClassRecord.class_id
            
            // IMPORTANT: This is just a fallback - we really need the real class name!
            // The real class name should be "6A", "6B", "6C" etc. from the classes table
            let className = 'Class'
            
            // Extract the first number for a simple name
            const numbers = classId.match(/\d+/g)
            if (numbers && numbers.length > 0) {
              className = `Class ${numbers[0]}`
            } else {
              className = `Class ${classId.slice(0, 4)}`
            }
            
            console.log('Debug - Found class_student record, but continuing to RPC approach...')
            // Don't return here - let's continue to try the RPC function approach
            
          } else {
            console.log('Debug - No class_student info found:', classStudentError)
          }
          
        } catch (e) {
          console.log('Debug - Alternative table approach failed:', e)
        }
        
        // SOLUTION: Create a simple RPC function call
        try {
          console.log('Debug - Attempting RPC function solution...')
          
          // This is the REAL solution - we need an RPC function that bypasses RLS
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('get_student_class_name', { 
              student_id: user.id,
              class_id: firstClassRecord.class_id 
            })
          
          if (!rpcError && rpcResult) {
            console.log('Debug - RPC function returned data:', rpcResult)
            
            // RPC function returns an array, so we need to handle that
            let className = null
            if (Array.isArray(rpcResult) && rpcResult.length > 0) {
              className = rpcResult[0].class_name
            } else if (rpcResult && typeof rpcResult === 'object' && rpcResult.class_name) {
              className = rpcResult.class_name
            }
            
            if (className) {
              console.log('Debug - SUCCESS! Got real class name from RPC:', className)
              setClassInfo({
                id: firstClassRecord.class_id,
                name: className  // This should be "6A", "6B", "6C" etc.
              })
              return
            } else {
              console.log('Debug - RPC function returned data but no class_name found:', rpcResult)
            }
          } else {
            console.log('Debug - RPC function failed:', rpcError, rpcResult)
          }
        } catch (e) {
          console.log('Debug - RPC function approach failed:', e)
        }
        
        // REMOVED: Duplicated code that was causing the issue
        
        // FINAL FALLBACK: Show a clear message about what's needed
        console.log('Debug - FINAL FALLBACK: Cannot get real class name due to RLS policies')
        console.log('Debug - SOLUTION: Create RPC function in Supabase to bypass RLS')
        console.log('Debug - Expected result: Student should see "6A", "6B", "6C" etc.')
        
        const classId = firstClassRecord.class_id
        
        // For now, show a placeholder that makes it clear this is not the real name
        const className = 'Class Name Unavailable'
        
        console.log('Debug - Using placeholder class name:', className)
        console.log('Debug - This indicates the RPC function needs to be created')
        
        setClassInfo({
          id: classId,
          name: className
        })
      } else {
        console.log('Debug - No class_id available')
        setClassInfo(null)
      }
    } catch (error) {
      console.error('Error loading class info:', error)
      setClassInfo(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      <LogoutHandler />
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Student Dashboard</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Hero Section - New Layout */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Left: Welcome + Assignments */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6">
              <h2 className="text-2xl font-extrabold mb-2 text-gray-800">
                Welcome back, {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Student'}!
              </h2>
              <p className="text-gray-600 mb-6">Keep casting spells and leveling up your vocabulary.</p>
              
              <div className="mt-6 flex flex-col gap-3">
                <a href="/student/word-sets" className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-colors text-center shadow-md">Your Word Sets</a>
                <a href="/student/join" className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center border border-gray-200">Join a Class</a>
              </div>
            </div>

            {/* Assignments Section - Fixed Height */}
            <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 flex-1 flex flex-col">
              <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                Your Assignments
              </h2>
              
              {homeworks.length === 0 ? (
                <div className="text-center py-8 flex-1 flex flex-col justify-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No assignments yet</p>
                </div>
              ) : (
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="flex-1">
                    {homeworks.slice(0, 2).map((homework) => (
                      <div key={homework.id} className="border border-gray-200 bg-white/60 rounded-lg p-3 mb-2 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homework.color || '#6b7280' }} />
                          <span className="text-sm font-semibold text-gray-800 truncate">{homework.title}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Due: {homework.due_date ? new Date(homework.due_date).toLocaleDateString('en-US') : 'No due date'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* View All Link */}
                  <div className="text-center pt-2">
                    <a href="/student/word-sets" className="text-xs text-gray-500 hover:text-indigo-600 underline">
                      View all assignments ({homeworks.length})
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Wizard + Stats */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 h-full">
              <div className="grid md:grid-cols-2 gap-6 h-full">
                {/* Wizard Image */}
                <div className="flex items-center justify-center">
                  {wizardTitle.title && wizardTitle.image ? (
                    <div className="relative w-full max-w-sm">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-gray-300 shadow-lg">
                        <img 
                          src={wizardTitle.image} 
                          alt={wizardTitle.title} 
                          className="w-full h-auto object-contain" 
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-gray-800/80 to-transparent">
                          <div className="text-xs text-gray-200">Current Title</div>
                          <div className="text-lg font-extrabold text-white">{wizardTitle.title}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-sm h-64 rounded-2xl bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-gray-500 shadow-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Star className="w-6 h-6" />
                        </div>
                        <div>No title yet</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-col justify-center space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 p-4 flex items-center gap-3">
                      <Star className="w-6 h-6 text-yellow-600" />
                      <div>
                        <div className="text-sm text-gray-600">Points</div>
                        <div className="text-xl font-bold text-gray-800">{points}</div>
                      </div>
                    </div>
                    <a href="/student/levels" className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 p-4 flex items-center gap-3 hover:from-blue-200 hover:to-blue-300 transition-colors" title="View level progress">
                      <Target className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="text-sm text-gray-600">Level</div>
                        <div className="text-xl font-bold text-gray-800">{currentLevel}</div>
                      </div>
                    </a>
                  </div>
                  
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-300 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Class</div>
                      <div className="text-lg font-semibold text-gray-800">{classInfo ? classInfo.name : 'No class joined'}</div>
                    </div>
                  </div>
                  
                  {/* XP Progress Bar */}
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-300">Level {leveling.level}</div>
                      <div className="text-sm text-gray-300">
                        {leveling.nextDelta > 0 ? (
                          <>
                            {Math.round(leveling.progressToNext * leveling.nextDelta)} / {leveling.nextDelta} XP
                          </>
                        ) : (
                          'Max Level'
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${leveling.progressToNext * 100}%` }}
                      />
                    </div>
                    {leveling.nextDelta > 0 && (
                      <div className="text-xs text-gray-400 mt-1 text-center">
                        {Math.round((1 - leveling.progressToNext) * leveling.nextDelta)} XP to next level
                      </div>
                    )}
                  </div>
                  
                  {/* Badges Section - Compact */}
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-xs">🏆</span>
                      </div>
                      <div className="text-xs font-semibold text-white">Badges</div>
                    </div>
                    
                    <div className="space-y-1.5">
                      {/* Coming Soon Badge */}
                      <div className="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-white/10">
                        <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded-md flex items-center justify-center">
                          <span className="text-xs">🔒</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-300">Badge System</div>
                          <div className="text-xs text-gray-400">Coming Soon</div>
                        </div>
                      </div>
                      
                      {/* Placeholder for future badges */}
                      <div className="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-50">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-md flex items-center justify-center">
                          <span className="text-xs">⭐</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-300">Achievement Badges</div>
                          <div className="text-xs text-gray-400">Earn by playing games</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-white/10 opacity-50">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-md flex items-center justify-center">
                          <span className="text-xs">🎯</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-300">Streak Badges</div>
                          <div className="text-xs text-gray-400">Daily practice rewards</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Games Section - Tiered Structure */}
        <div className="space-y-8">
          {/* Tier 1: Foundation Games */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white text-lg font-bold">1</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Foundation Games</h2>
                <p className="text-sm text-gray-600">Start here to build your vocabulary foundation</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Flashcards (blue) */}
              <GameCard
                title="Flashcards"
                color="blue"
                icon={<span className="text-3xl">🃏</span>}
                onClick={() => {
                  console.log('Flashcard game clicked, homeworks.length:', homeworks.length)
                  if (homeworks.length === 0) {
                    setMessage('No vocabulary sets available. Please wait for your teacher to assign vocabulary.')
                    return
                  }
                  if (homeworks.length === 1) {
                    setSelectedHomework(homeworks[0])
                    setShowFlashcardGame(true)
                  } else {
                    setPendingGame('flashcards')
                    setShowHomeworkSelection(true)
                  }
                }}
              />

              {/* Multiple Choice (green) */}
              <GameCard
                title="Multiple Choice"
                color="green"
                icon={<span className="text-3xl">✅</span>}
                locked={false}
                onClick={() => {
                  if (homeworks.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1) {
                    setSelectedHomework(homeworks[0])
                    setShowChoice(true)
                    return
                  }
                  if (!selectedHomework) {
                    setPendingGame('choice')
                    setShowHomeworkSelection(true)
                    return
                  }
                  setShowChoice(true)
                }}
              />

              {/* Memory Game (orange) */}
              <GameCard
                title="Memory Game"
                color="orange"
                icon={<span className="text-3xl">🧠</span>}
                onClick={startWordMatchingGame}
              />

              {/* Matching Pairs (purple) */}
              <GameCard
                title="Matching Pairs"
                color="purple"
                icon={<span className="text-3xl">🔗</span>}
                onClick={() => {
                  if (homeworks.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length > 1) {
                    setPendingGame('connect')
                    setShowHomeworkSelection(true)
                    return
                  }
                  const only = homeworks[0]
                  if (!selectedHomework) setSelectedHomework(only)
                  setShowLineMatchingGame(true)
                }}
              />
            </div>
          </div>

          {/* Tier 2: Advanced Games */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white text-lg font-bold">2</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Advanced Games</h2>
                <p className="text-sm text-gray-600">Challenge yourself with more complex exercises</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GameCard
                title="Translate"
                color="yellow"
                icon={<span className="text-3xl">🌐</span>}
                onClick={() => {
                  if (homeworks.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1) {
                    setSelectedHomework(homeworks[0])
                    setShowTranslateGame(true)
                  } else {
                    setPendingGame('translate')
                    setShowHomeworkSelection(true)
                  }
                }}
              />
              {/* Typing Challenge (pink) */}
              <GameCard
                title="Typing Challenge"
                color="pink"
                icon={<span className="text-3xl">⌨️</span>}
                onClick={() => {
                  if (homeworks.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1) {
                    setSelectedHomework(homeworks[0])
                    setShowTypingChallenge(true)
                  } else {
                    setPendingGame('typing')
                    setShowHomeworkSelection(true)
                  }
                }}
              />
              {/* Sentence Gap (teal) */}
              <GameCard
                title="Sentence Gap"
                color="teal"
                icon={<span className="text-3xl">📖</span>}
                onClick={() => {
                  if (homeworks.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length === 1) {
                    setSelectedHomework(homeworks[0])
                    setShowStoryGap(true)
                  } else {
                    setPendingGame('storygap')
                    setShowHomeworkSelection(true)
                  }
                }}
              />

              {/* Roulette Game (red) */}
              <GameCard
                title="Roulette"
                color="red"
                icon={<span className="text-3xl">🎰</span>}
                onClick={() => {
                  if (homeworks.length === 0) {
                    alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                    return
                  }
                  if (homeworks.length > 1) {
                    setPendingGame('roulette')
                    setShowHomeworkSelection(true)
                    return
                  }
                  const only = homeworks[0]
                  if (!selectedHomework) setSelectedHomework(only)
                  setShowRoulette(true)
                }}
              />
            </div>
          </div>

          {/* Quiz Section - Special */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white text-lg font-bold">📝</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Quiz</h2>
                <p className="text-sm text-gray-600">Test your knowledge with comprehensive quizzes</p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <GameCard
                  title="Quiz"
                  color="purple"
                  icon={<span className="text-3xl">📝</span>}
                  locked={false}
                  onClick={async () => {
                    if (homeworks.length === 0) {
                      alert('No word sets assigned yet. Please ask your teacher to assign some word sets.')
                      return
                    }
                    if (homeworks.length > 1) {
                      setPendingGame('quiz')
                      setShowHomeworkSelection(true)
                      return
                    }
                    const only = homeworks[0]
                    if (!selectedHomework) setSelectedHomework(only)
                    setShowQuiz(true)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700">{message}</p>
            <button
              onClick={() => setMessage('')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Game Modals */}
        {showFlashcardGame && getCurrentGameData() && (
          <FlashcardGame
            words={getCurrentGameData()!.words}
            wordObjects={getCurrentGameData()!.wordObjects}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowFlashcardGame(false)}
            onScoreUpdate={handleScoreUpdate}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showWordMatchingGame && getCurrentGameData() && (
          <MemoryGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowWordMatchingGame(false)}
            onScoreUpdate={handleScoreUpdate}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showTypingChallenge && getCurrentGameData() && (
          <TypingChallenge
            words={getCurrentGameData()!.words}
            onClose={() => setShowTypingChallenge(false)}
            onScoreUpdate={handleScoreUpdate}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showTranslateGame && getCurrentGameData() && (
          <TranslateGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowTranslateGame(false)}
            onScoreUpdate={handleScoreUpdate}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showStoryGap && getCurrentGameData() && (
          <StoryGapGame
            words={getCurrentGameData()!.words}
            onClose={() => setShowStoryGap(false)}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            onScoreUpdate={handleScoreUpdate}
          />
        )}

        {showLineMatchingGame && getCurrentGameData() && (
          <LineMatchingGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowLineMatchingGame(false)}
            onScoreUpdate={handleScoreUpdate}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showRoulette && getCurrentGameData() && (
          <RouletteGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowRoulette(false)}
            onScoreUpdate={handleScoreUpdate}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
          />
        )}

        {showQuiz && getCurrentGameData() && (
          <QuizGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowQuiz(false)}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            onSubmitScore={async (quizScore) => {
              // Store quiz result in student_progress (separate column recommended)
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const gameData = getCurrentGameData()!
                await supabase.from('student_progress')
                  .upsert({
                    student_id: user.id,
                    word_set_id: selectedHomework?.id,
                    homework_id: selectedHomework?.id,
                    last_quiz_score: quizScore,
                    last_quiz_at: new Date().toISOString(),
                  }, { onConflict: 'student_id,word_set_id,homework_id' })
              } catch (e) {
                console.log('Quiz score save failed:', e)
              }
            }}
          />
        )}

        {showChoice && getCurrentGameData() && (
          <MultipleChoiceGame
            words={getCurrentGameData()!.words}
            translations={getCurrentGameData()!.translations}
            onClose={() => setShowChoice(false)}
            trackingContext={getTrackingContext()}
            themeColor={getCurrentGameData()!.color}
            onScoreUpdate={async (_pointsGained, newTotal) => {
              await handleScoreUpdate(_pointsGained, newTotal)
            }}
          />
        )}

        {/* Homework Selection Modal */}
        {showHomeworkSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="rounded-2xl p-8 max-w-4xl w-full shadow-2xl relative bg-white text-gray-800 border border-gray-200">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Choose Vocabulary Set</h2>
                <p className="text-gray-600">Select which vocabulary list you want to practice with:</p>
              </div>
              
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Assigned Vocabulary Sets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2">
                  {homeworks.map((homework) => (
                    <button
                      key={homework.id}
                      onClick={() => selectHomeworkForGame(homework)}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors border-l-4 min-h-[96px] bg-white"
                      style={{ borderLeftColor: homework.color || undefined }}
                    >
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-800">
                        {homework.color && <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: homework.color }}></span>}
                        {homework.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{homework.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {homework.vocabulary_words.slice(0, 5).map((word, index) => (
                          <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full border border-gray-200">
                            {word}
                          </span>
                        ))}
                        {homework.vocabulary_words.length > 5 && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border border-gray-200">
                            +{homework.vocabulary_words.length - 5} more
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHomeworkSelection(false)}
                  className="flex-1 bg-gray-100 border border-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      {showLevelUp && (
        <LevelUpModal
          level={showLevelUp.level}
          title={showLevelUp.title}
          image={showLevelUp.image}
          description={showLevelUp.description}
          onClose={() => setShowLevelUp(null)}
        />
      )}
    </div>
  )
}
