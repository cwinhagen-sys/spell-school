'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronLeft, Search, X, CheckCircle2, BookOpen, CheckSquare, Brain, Scissors, FileText, Globe, Mic, Target, Plus, Gamepad2, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SESSION_GAMES, sortGamesByRecommendedOrder, type GameMetadata, getGameMetadata } from '@/lib/session-games'

interface WordSet {
  id: string
  title: string
}

interface Game extends GameMetadata {
  color: string
}

// Generate game data
const generateGames = (): Game[] => {
  const gameColors = [
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
    'from-teal-500 to-cyan-500',
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-green-500',
    'from-indigo-500 to-violet-500',
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
  placeholder = 'Sök...' 
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
      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
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
                      className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
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
      className={`relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 bg-amber-500/10'
          : 'border-white/10 hover:border-white/20 hover:bg-white/10'
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
            className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-[#12122a] border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Speldetaljer</h2>
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
                  Antal rundor (1-10)
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
                    {selectedRounds === 1 ? 'runda' : 'rundor'}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={onAddToSession}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Lägg till i session
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Main Component
export default function SessionGameSelection() {
  const router = useRouter()
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [sessionName, setSessionName] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [gameRounds, setGameRounds] = useState<{ [key: string]: number }>({})
  const [quizEnabled, setQuizEnabled] = useState(false)
  const [quizGradingType, setQuizGradingType] = useState<'ai' | 'manual'>('ai')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'popular' | 'new' | 'owned'>('all')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const games = generateGames()

  useEffect(() => {
    loadWordSets()
  }, [])

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
      setError('Kunde inte ladda ordlistor')
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
      setError('Välj en ordlista')
      setLoading(false)
      return
    }

    if (!sessionName.trim()) {
      setError('Ange ett namn för sessionen')
      setLoading(false)
      return
    }

    if (!dueDate) {
      setError('Välj ett slutdatum')
      setLoading(false)
      return
    }

    if (selectedGames.length === 0) {
      setError('Välj minst ett spel')
      setLoading(false)
      return
    }

    const due = new Date(dueDate)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)

    if (due < now || due > maxDate) {
      const todayStart = new Date(now)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)
      
      if (due >= todayStart && due <= todayEnd) {
        // Allow today
      } else if (due > maxDate) {
        setError('Slutdatum måste vara inom 2 veckor')
        setLoading(false)
        return
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Du är inte inloggad')
        setLoading(false)
        return
      }

      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_session_code')

      if (codeError) throw codeError

      const sessionCode = codeData
      const sortedGames = sortGamesByRecommendedOrder(selectedGames)
      const roundsObj: { [key: string]: number } = {}
      sortedGames.forEach(gameId => {
        roundsObj[gameId] = gameRounds[gameId] || 1
      })

      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          teacher_id: user.id,
          word_set_id: selectedWordSet,
          session_name: sessionName.trim(),
          session_code: sessionCode,
          due_date: due.toISOString(),
          enabled_games: sortedGames,
          game_rounds: roundsObj,
          quiz_enabled: quizEnabled,
          quiz_grading_type: quizEnabled ? quizGradingType : 'ai',
          is_active: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/teacher/sessions/${data.id}`)
    } catch (error: any) {
      console.error('Error creating session:', error)
      setError(error.message || 'Kunde inte skapa session')
    } finally {
      setLoading(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 7)
    return pastDate.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)
    return maxDate.toISOString().split('T')[0]
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        href="/teacher/sessions"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tillbaka till sessioner
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
            <h1 className="text-2xl font-bold text-white">Skapa session</h1>
            <p className="text-gray-400">Välj spel och konfigurera din session</p>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Sök spel..."
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <TagPill active={filter === 'all'} onClick={() => setFilter('all')}>
              Alla
            </TagPill>
            <TagPill active={filter === 'popular'} onClick={() => setFilter('popular')}>
              Populära
            </TagPill>
            <TagPill active={filter === 'new'} onClick={() => setFilter('new')}>
              Nya
            </TagPill>
            <TagPill active={filter === 'owned'} onClick={() => setFilter('owned')}>
              Valda
            </TagPill>
          </div>
        </div>
      </div>

      {/* Session Form */}
      <div className="bg-[#12122a]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-6">Sessionsdetaljer</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sessionsnamn *
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="T.ex. 'Engelska glosor vecka 42'"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ordlista *
              </label>
              {wordSets.length === 0 ? (
                <div className="text-sm text-amber-400">
                  <Link href="/teacher/word-sets" className="underline hover:text-amber-300">Skapa en ordlista först</Link>
                </div>
              ) : (
                <select
                  value={selectedWordSet}
                  onChange={(e) => setSelectedWordSet(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" className="bg-[#1a1a2e]">Välj ordlista...</option>
                  {wordSets.map((ws) => (
                    <option key={ws.id} value={ws.id} className="bg-[#1a1a2e]">
                      {ws.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slutdatum * (max 2 veckor)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                required
              />
            </div>
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
              <span className="text-gray-300">Aktivera quiz på slutdatum</span>
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
                  <span className="text-gray-300">AI-rättning</span>
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
                  <span className="text-gray-300">Manuell rättning</span>
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
              href="/teacher/sessions"
              className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={loading || wordSets.length === 0 || selectedGames.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Skapar...' : `Skapa session (${selectedGames.length} spel)`}
            </button>
          </div>
        </form>
      </div>

      {/* Session Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Session-tidslinje</h2>
        <SessionTimeline 
          selectedGames={selectedGames}
          gameRounds={gameRounds}
          games={games}
          onRemoveGame={handleRemoveGame}
        />
        {selectedGames.length === 0 && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            Välj spel nedan för att bygga din session-tidslinje
          </p>
        )}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <div className="text-center py-12">
          <Gamepad2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Inga spel hittades med din sökning.</p>
        </div>
      )}

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
    </div>
  )
}
