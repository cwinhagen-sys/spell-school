'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronLeft, Search, X, CheckCircle2, BookOpen, CheckSquare, Brain, Scissors, FileText, Globe, Mic, Target, Plus, Gamepad2, ArrowLeft, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SESSION_GAMES, sortGamesByRecommendedOrder, type GameMetadata, getGameMetadata } from '@/lib/session-games'
import { hasSessionModeAccess, getUserSubscriptionTier, TIER_LIMITS } from '@/lib/subscription'
import PaymentWallModal from '@/components/PaymentWallModal'

interface WordSet {
  id: string
  title: string
}

interface Class {
  id: string
  name: string
}

interface Game extends GameMetadata {
  color: string
}

// Generate game data
const generateGames = (): Game[] => {
  const gameColors = [
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-500',
    'from-orange-500 to-rose-500',
    'from-blue-500 to-indigo-500',
    'from-amber-400 to-yellow-500',
    'from-rose-500 to-pink-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500'
  ]

  return SESSION_GAMES.map((game, index) => ({
    ...game,
    color: gameColors[index % gameColors.length]
  }))
}

// TagPill Component
function TagPill({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
      }`}
    >
      {children}
    </button>
  )
}

// SearchInput Component
function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...' 
}: { 
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all text-sm"
        aria-label="Search games"
      />
    </div>
  )
}

// SessionTimeline Component
function SessionTimeline({ 
  selectedGames, 
  gameRounds,
  games,
  onRemoveGame
}: { 
  selectedGames: string[]
  gameRounds: { [key: string]: number }
  games: Game[]
  onRemoveGame: (gameId: string) => void
}) {
  const getGameIcon = (gameId: string) => {
    const icons: Record<string, React.ElementType> = {
      flashcards: BookOpen,
      multiple_choice: CheckSquare,
      memory: Brain,
      word_scramble: Scissors,
      sentence_gap: FileText,
      translate: Globe,
      flashcards_test: Mic,
      word_roulette: Target
    }
    return icons[gameId] || BookOpen
  }

  const sortedGames = sortGamesByRecommendedOrder(selectedGames)
  const maxSlots = 8

  return (
    <div className="relative">
      <div className="relative bg-[#161622] rounded-2xl p-6 border border-white/[0.12]">
        <div className="flex items-center gap-3">
          {Array.from({ length: maxSlots }).map((_, index) => {
            const gameId = sortedGames[index]
            const game = gameId ? games.find(g => g.id === gameId) : null
            const isActive = !!game
            const Icon = game ? getGameIcon(game.id) : null
            const rounds = game ? (gameRounds[game.id] || 1) : 0

            return (
              <div key={index} className="flex-1 relative">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isActive 
                      ? 'rgba(139, 92, 246, 0.3)' 
                      : 'rgba(255, 255, 255, 0.05)'
                  }}
                  transition={{ duration: 0.4 }}
                  onClick={() => {
                    if (isActive && gameId) {
                      onRemoveGame(gameId)
                    }
                  }}
                  className={`relative h-20 rounded-xl flex items-center justify-center transition-all border ${
                    isActive 
                      ? 'bg-gradient-to-b from-amber-500/30 to-orange-600/30 border-amber-500/30 cursor-pointer hover:scale-105' 
                      : 'bg-white/5 border-white/5 cursor-default'
                  }`}
                >
                  {Icon && game && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 300, 
                        damping: 20,
                        delay: index * 0.1 
                      }}
                      className="text-amber-400"
                    >
                      <Icon className="w-8 h-8" />
                    </motion.div>
                  )}

                  {isActive && index < sortedGames.length && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 400, 
                        damping: 15,
                        delay: index * 0.1 + 0.2 
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </motion.div>
                  )}

                  {isActive && rounds > 1 && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg">
                      {rounds}x
                    </div>
                  )}
                </motion.div>

                {index < maxSlots - 1 && (
                  <div className="absolute top-1/2 -right-1.5 w-3 h-0.5 bg-white/10 z-10" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// GameCard Component
function GameCard({ 
  game, 
  onSelect, 
  isSelected 
}: { 
  game: Game
  onSelect: () => void
  isSelected: boolean
}) {
  const getGameIcon = (gameId: string) => {
    const icons: Record<string, React.ElementType> = {
      flashcards: BookOpen,
      multiple_choice: CheckSquare,
      memory: Brain,
      word_scramble: Scissors,
      sentence_gap: FileText,
      translate: Globe,
      flashcards_test: Mic,
      word_roulette: Target
    }
    return icons[gameId] || BookOpen
  }

  const Icon = getGameIcon(game.id)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative bg-[#161622] rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 bg-amber-500/10'
          : 'border-white/[0.12] hover:border-amber-500/30'
      }`}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white text-center mb-2">
        {game.name}
      </h3>

      {/* Tagline */}
      <p className="text-sm text-gray-400 text-center mb-4 line-clamp-2">
        {game.description}
      </p>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
      )}
    </motion.div>
  )
}

// DetailsDrawer Component
function DetailsDrawer({ 
  game, 
  open, 
  onClose, 
  onAddToSession,
  selectedRounds,
  onRoundsChange
}: { 
  game: Game | null
  open: boolean
  onClose: () => void
  onAddToSession: () => void
  selectedRounds: number
  onRoundsChange: (rounds: number) => void
}) {
  const getGameIcon = (gameId: string) => {
    const icons: Record<string, React.ElementType> = {
      flashcards: BookOpen,
      multiple_choice: CheckSquare,
      memory: Brain,
      word_scramble: Scissors,
      sentence_gap: FileText,
      translate: Globe,
      flashcards_test: Mic,
      word_roulette: Target
    }
    return icons[gameId || ''] || BookOpen
  }

  if (!game) return null

  const Icon = getGameIcon(game.id)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-[#161622] border-l border-white/[0.12] shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Game details</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cover */}
              <div className={`w-full h-48 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-6 shadow-lg`}>
                <Icon className="w-20 h-20 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-semibold text-white mb-2">{game.name}</h3>

              {/* Description */}
              <p className="text-gray-400 mb-6">{game.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {game.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/5 text-gray-300 rounded-full text-sm border border-white/10"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              {/* Rounds selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of rounds (1-10)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedRounds}
                    onChange={(e) => onRoundsChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none"
                  />
                  <span className="text-sm text-gray-400">
                    {selectedRounds === 1 ? 'round' : 'rounds'}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={onAddToSession}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add to session
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Main Component
export default function EditSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [sessionName, setSessionName] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [gameRounds, setGameRounds] = useState<{ [key: string]: number }>({})
  const [quizEnabled, setQuizEnabled] = useState(false)
  const [quizGradingType, setQuizGradingType] = useState<'ai' | 'manual'>('ai')
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [error, setError] = useState('')
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [showPaymentWall, setShowPaymentWall] = useState(false)
  const [paymentWallTier, setPaymentWallTier] = useState<'premium' | 'pro'>('premium')
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'popular' | 'new' | 'owned'>('all')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const games = generateGames()

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }

        // Check session mode access
        setCheckingAccess(true)
        const hasAccess = await hasSessionModeAccess(user.id)
        if (!hasAccess) {
          const tier = await getUserSubscriptionTier(user.id)
          setPaymentWallTier(tier === 'free' ? 'premium' : 'pro')
          setShowPaymentWall(true)
          setCheckingAccess(false)
          return
        }
        setCheckingAccess(false)

        // Load data if access is granted
        await Promise.all([
          loadWordSets(),
          loadClasses(),
          loadSession()
        ])
      } catch (err: any) {
        console.error('Error checking access:', err)
        setCheckingAccess(false)
      }
    }

    if (sessionId) {
      checkAccessAndLoad()
    }
  }, [sessionId, router])

  const loadSession = async () => {
    try {
      setLoadingSession(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_name,
          due_date,
          enabled_games,
          game_rounds,
          quiz_enabled,
          quiz_grading_type,
          word_set_id
        `)
        .eq('id', sessionId)
        .eq('teacher_id', user.id)
        .single()

      if (sessionError) throw sessionError
      if (!sessionData) {
        setError('Session not found')
        return
      }

      // Load linked classes
      const { data: linkedClasses } = await supabase
        .from('session_classes')
        .select('class_id')
        .eq('session_id', sessionId)

      // Set form values
      setSessionName(sessionData.session_name || '')
      setDueDate(sessionData.due_date ? new Date(sessionData.due_date).toISOString().split('T')[0] : '')
      setSelectedWordSet(sessionData.word_set_id || '')
      setSelectedGames(sessionData.enabled_games || [])
      setGameRounds(sessionData.game_rounds || {})
      setQuizEnabled(sessionData.quiz_enabled || false)
      setQuizGradingType(sessionData.quiz_grading_type || 'ai')
      setSelectedClasses(linkedClasses?.map(lc => lc.class_id) || [])
    } catch (error: any) {
      console.error('Error loading session:', error)
      setError('Could not load session')
    } finally {
      setLoadingSession(false)
    }
  }

  const loadWordSets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('word_sets')
        .select('id, title')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWordSets(data || [])
    } catch (error) {
      console.error('Error loading word sets:', error)
      setError('Could not load word lists')
    }
  }

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }

  const addGameToSession = (gameId: string, rounds: number) => {
    setSelectedGames(prev => {
      if (!prev.includes(gameId)) {
        return [...prev, gameId]
      }
      return prev
    })
    setGameRounds(prev => ({ ...prev, [gameId]: rounds }))
  }

  const handleGameSelect = (game: Game) => {
    if (selectedGames.includes(game.id)) {
      setSelectedGames(prev => prev.filter(id => id !== game.id))
      const newRounds = { ...gameRounds }
      delete newRounds[game.id]
      setGameRounds(newRounds)
      return
    }
    setSelectedGame(game)
    setDrawerOpen(true)
  }

  const handleRemoveGame = (gameId: string) => {
    setSelectedGames(prev => prev.filter(id => id !== gameId))
    const newRounds = { ...gameRounds }
    delete newRounds[gameId]
    setGameRounds(newRounds)
  }

  const handleAddToSession = () => {
    if (selectedGame) {
      const rounds = gameRounds[selectedGame.id] || 1
      addGameToSession(selectedGame.id, rounds)
      setDrawerOpen(false)
    }
  }

  if (checkingAccess || loadingSession) {
    return (
      <div className="min-h-screen bg-[#0a0a12] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filter === 'popular') {
      return matchesSearch && game.recommendedOrder <= 3
    }
    if (filter === 'new') {
      return matchesSearch && game.recommendedOrder <= 3
    }
    if (filter === 'owned') {
      return matchesSearch && selectedGames.includes(game.id)
    }
    return matchesSearch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedWordSet) {
      setError('Select a word list')
      setLoading(false)
      return
    }

    if (!sessionName.trim()) {
      setError('Enter a name for the session')
      setLoading(false)
      return
    }

    if (!dueDate) {
      setError('Select an end date')
      setLoading(false)
      return
    }

    if (selectedGames.length === 0) {
      setError('Select at least one game')
      setLoading(false)
      return
    }

    const due = new Date(dueDate)
    due.setHours(23, 59, 59, 999)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You are not logged in')
        setLoading(false)
        return
      }

      const sortedGames = sortGamesByRecommendedOrder(selectedGames)
      const roundsObj: { [key: string]: number } = {}
      sortedGames.forEach(gameId => {
        roundsObj[gameId] = gameRounds[gameId] || 1
      })

      // Update session
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          word_set_id: selectedWordSet,
          session_name: sessionName.trim(),
          due_date: due.toISOString(),
          enabled_games: sortedGames,
          game_rounds: roundsObj,
          quiz_enabled: quizEnabled,
          quiz_grading_type: quizEnabled ? quizGradingType : 'ai',
        })
        .eq('id', sessionId)
        .eq('teacher_id', user.id)

      if (updateError) throw updateError

      // Update session-class links
      // First, get current links
      const { data: currentLinks } = await supabase
        .from('session_classes')
        .select('class_id')
        .eq('session_id', sessionId)

      const currentClassIds = currentLinks?.map(l => l.class_id) || []
      const classesToAdd = selectedClasses.filter(id => !currentClassIds.includes(id))
      const classesToRemove = currentClassIds.filter(id => !selectedClasses.includes(id))

      // Remove unselected classes
      if (classesToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('session_classes')
          .delete()
          .eq('session_id', sessionId)
          .in('class_id', classesToRemove)

        if (removeError) console.error('Error removing class links:', removeError)
      }

      // Add new classes
      if (classesToAdd.length > 0) {
        const sessionClassLinks = classesToAdd.map(classId => ({
          session_id: sessionId,
          class_id: classId
        }))

        const { error: addError } = await supabase
          .from('session_classes')
          .insert(sessionClassLinks)

        if (addError) console.error('Error adding class links:', addError)
      }

      router.push(`/teacher/sessions/${sessionId}`)
    } catch (error: any) {
      console.error('Error updating session:', error)
      setError(error.message || 'Could not update session')
    } finally {
      setLoading(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString().split('T')[0]
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        href={`/teacher/sessions/${sessionId}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to session
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur opacity-30" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit session</h1>
            <p className="text-gray-400">Update games, due date, and settings</p>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search games..."
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <TagPill active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </TagPill>
            <TagPill active={filter === 'popular'} onClick={() => setFilter('popular')}>
              Popular
            </TagPill>
            <TagPill active={filter === 'new'} onClick={() => setFilter('new')}>
              New
            </TagPill>
            <TagPill active={filter === 'owned'} onClick={() => setFilter('owned')}>
              Selected
            </TagPill>
          </div>
        </div>
      </div>

      {/* Session Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Session timeline</h2>
        <SessionTimeline 
          selectedGames={selectedGames}
          gameRounds={gameRounds}
          games={games}
          onRemoveGame={handleRemoveGame}
        />
        {selectedGames.length === 0 && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            Select games below to build your session timeline
          </p>
        )}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {filteredGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onSelect={() => handleGameSelect(game)}
            isSelected={selectedGames.includes(game.id)}
          />
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="text-center py-12 mb-8">
          <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No games found with your search.</p>
        </div>
      )}

      {/* Session Details Form */}
      <div className="bg-[#161622] rounded-2xl border border-white/[0.12] p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Session details</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session name *
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. 'Vocabulary week 42'"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Word list *
              </label>
              {wordSets.length === 0 ? (
                <div className="text-sm text-amber-400">
                  <Link href="/teacher/word-sets" className="underline hover:text-amber-300">Create a word list first</Link>
                </div>
              ) : (
                <select
                  value={selectedWordSet}
                  onChange={(e) => setSelectedWordSet(e.target.value)}
                  className="w-full px-4 py-3 bg-[#161622] border border-white/[0.12] rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" className="bg-[#161622]">Select word list...</option>
                  {wordSets.map((ws) => (
                    <option key={ws.id} value={ws.id} className="bg-[#161622]">
                      {ws.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-3 bg-[#161622] border border-white/[0.12] rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all [color-scheme:dark]"
                required
              />
            </div>
          </div>

          {/* Class selection */}
          <div className="pt-6 border-t border-white/10">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Share with classes (optional)
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Select which classes should have access to this session. Students in selected classes will see this session in their dashboard.
            </p>
            {classes.length === 0 ? (
              <div className="text-sm text-gray-400">
                No classes available. <Link href="/teacher/classes" className="text-amber-400 underline hover:text-amber-300">Create a class first</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <label
                    key={cls.id}
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClasses(prev => [...prev, cls.id])
                        } else {
                          setSelectedClasses(prev => prev.filter(id => id !== cls.id))
                        }
                      }}
                      className="w-5 h-5 text-amber-500 bg-white/5 border-white/20 rounded focus:ring-amber-500/50"
                    />
                    <span className="text-gray-300">{cls.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Quiz options */}
          <div className="pt-6 border-t border-white/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={quizEnabled}
                onChange={(e) => {
                  setQuizEnabled(e.target.checked)
                  if (!e.target.checked) {
                    setQuizGradingType('ai')
                  }
                }}
                className="w-5 h-5 text-amber-500 bg-white/5 border-white/20 rounded focus:ring-amber-500/50"
              />
              <span className="text-gray-300">Enable quiz on end date</span>
            </label>
            {quizEnabled && (
              <div className="mt-4 ml-8 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="quizGradingType"
                    value="ai"
                    checked={quizGradingType === 'ai'}
                    onChange={(e) => setQuizGradingType(e.target.value as 'ai' | 'manual')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-gray-300">Automatic grading</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="quizGradingType"
                    value="manual"
                    checked={quizGradingType === 'manual'}
                    onChange={(e) => setQuizGradingType(e.target.value as 'ai' | 'manual')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-gray-300">Manual grading</span>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Link
              href={`/teacher/sessions/${sessionId}`}
              className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || wordSets.length === 0 || selectedGames.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : `Save changes (${selectedGames.length} games)`}
            </button>
          </div>
        </form>
      </div>

      {/* Details Drawer */}
      <DetailsDrawer
        game={selectedGame}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddToSession={handleAddToSession}
        selectedRounds={selectedGame ? (gameRounds[selectedGame.id] || 1) : 1}
        onRoundsChange={(rounds) => {
          if (selectedGame) {
            setGameRounds(prev => ({ ...prev, [selectedGame.id]: rounds }))
          }
        }}
      />

      {/* Payment Wall Modal */}
      <PaymentWallModal
        isOpen={showPaymentWall}
        onClose={() => router.push('/teacher')}
        feature="session mode"
        currentLimit={null}
        upgradeTier={paymentWallTier}
        upgradeMessage={`Session mode is only available for ${paymentWallTier === 'premium' ? 'Premium' : 'Pro'} subscribers. Upgrade to create and manage sessions.`}
      />
    </div>
  )
}


