'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Play, Sparkles, Send, Wand2, AlertCircle, MapPin, Gauge, Volume2, ChevronRight } from 'lucide-react'
import { startGameSession, type TrackingContext } from '@/lib/tracking'
import { supabase } from '@/lib/supabase'
import type { StoryBuilderResponse } from '@/app/api/story-builder/route'

interface StoryBuilderGameProps {
  onClose: () => void
  trackingContext?: TrackingContext
  onScoreUpdate?: (points: number, newTotal?: number, gameType?: string) => void
  themeColor?: string
}

interface StorySegment {
  text: string
  playerWord?: string
  gapType?: string
  wasTargetWord?: boolean
}

// Game flow steps
type GameStep = 'rules' | 'scenario' | 'difficulty' | 'voice' | 'playing'

// 50 scenario options for story settings
const STORY_SCENARIOS = [
  { id: 'school', name: 'School', emoji: '🏫', category: 'Education' },
  { id: 'park', name: 'The Park', emoji: '🌳', category: 'Outdoors' },
  { id: 'football', name: 'Football Practice', emoji: '⚽', category: 'Sports' },
  { id: 'beach', name: 'The Beach', emoji: '🏖️', category: 'Outdoors' },
  { id: 'library', name: 'The Library', emoji: '📚', category: 'Education' },
  { id: 'zoo', name: 'The Zoo', emoji: '🦁', category: 'Adventure' },
  { id: 'hospital', name: 'The Hospital', emoji: '🏥', category: 'Community' },
  { id: 'restaurant', name: 'A Restaurant', emoji: '🍽️', category: 'Social' },
  { id: 'supermarket', name: 'The Supermarket', emoji: '🛒', category: 'Daily Life' },
  { id: 'museum', name: 'The Museum', emoji: '🏛️', category: 'Education' },
  { id: 'cinema', name: 'The Cinema', emoji: '🎬', category: 'Entertainment' },
  { id: 'airport', name: 'The Airport', emoji: '✈️', category: 'Travel' },
  { id: 'train_station', name: 'Train Station', emoji: '🚂', category: 'Travel' },
  { id: 'birthday_party', name: 'Birthday Party', emoji: '🎂', category: 'Social' },
  { id: 'camping', name: 'Camping Trip', emoji: '🏕️', category: 'Adventure' },
  { id: 'swimming_pool', name: 'Swimming Pool', emoji: '🏊', category: 'Sports' },
  { id: 'playground', name: 'The Playground', emoji: '🎢', category: 'Outdoors' },
  { id: 'farm', name: 'The Farm', emoji: '🚜', category: 'Nature' },
  { id: 'forest', name: 'The Forest', emoji: '🌲', category: 'Nature' },
  { id: 'mountain', name: 'The Mountain', emoji: '🏔️', category: 'Adventure' },
  { id: 'castle', name: 'A Castle', emoji: '🏰', category: 'Fantasy' },
  { id: 'spaceship', name: 'A Spaceship', emoji: '🚀', category: 'Fantasy' },
  { id: 'underwater', name: 'Underwater World', emoji: '🐠', category: 'Fantasy' },
  { id: 'bakery', name: 'The Bakery', emoji: '🥐', category: 'Daily Life' },
  { id: 'pet_shop', name: 'Pet Shop', emoji: '🐕', category: 'Daily Life' },
  { id: 'circus', name: 'The Circus', emoji: '🎪', category: 'Entertainment' },
  { id: 'amusement_park', name: 'Amusement Park', emoji: '🎡', category: 'Entertainment' },
  { id: 'dentist', name: 'The Dentist', emoji: '🦷', category: 'Community' },
  { id: 'fire_station', name: 'Fire Station', emoji: '🚒', category: 'Community' },
  { id: 'police_station', name: 'Police Station', emoji: '🚔', category: 'Community' },
  { id: 'art_class', name: 'Art Class', emoji: '🎨', category: 'Education' },
  { id: 'music_room', name: 'Music Room', emoji: '🎵', category: 'Education' },
  { id: 'basketball', name: 'Basketball Game', emoji: '🏀', category: 'Sports' },
  { id: 'hockey', name: 'Ice Hockey', emoji: '🏒', category: 'Sports' },
  { id: 'tennis', name: 'Tennis Match', emoji: '🎾', category: 'Sports' },
  { id: 'ski_resort', name: 'Ski Resort', emoji: '⛷️', category: 'Sports' },
  { id: 'treehouse', name: 'The Treehouse', emoji: '🌴', category: 'Adventure' },
  { id: 'pirate_ship', name: 'Pirate Ship', emoji: '🏴‍☠️', category: 'Fantasy' },
  { id: 'haunted_house', name: 'Haunted House', emoji: '👻', category: 'Fantasy' },
  { id: 'candy_store', name: 'Candy Store', emoji: '🍬', category: 'Daily Life' },
  { id: 'toy_store', name: 'Toy Store', emoji: '🧸', category: 'Daily Life' },
  { id: 'garden', name: 'The Garden', emoji: '🌻', category: 'Nature' },
  { id: 'kitchen', name: 'The Kitchen', emoji: '👨‍🍳', category: 'Daily Life' },
  { id: 'bedroom', name: 'The Bedroom', emoji: '🛏️', category: 'Daily Life' },
  { id: 'bus_ride', name: 'Bus Ride', emoji: '🚌', category: 'Travel' },
  { id: 'boat_trip', name: 'Boat Trip', emoji: '⛵', category: 'Travel' },
  { id: 'magic_school', name: 'Magic School', emoji: '🧙', category: 'Fantasy' },
  { id: 'dinosaur_land', name: 'Dinosaur Land', emoji: '🦕', category: 'Fantasy' },
  { id: 'winter_wonderland', name: 'Winter Wonderland', emoji: '❄️', category: 'Seasons' },
  { id: 'summer_camp', name: 'Summer Camp', emoji: '☀️', category: 'Seasons' },
]

// Voice options for text-to-speech (Vertex AI / Google Cloud TTS)
// Only natural, well-tested voices that read naturally
const VOICE_OPTIONS = [
  // Neural2 voices - Most natural and reliable, deep voices for storytelling
  { id: 'en-US-Neural2-D', name: 'Michael', gender: 'Male', accent: 'American', emoji: '🎭', isDeepVoice: true, isStoryteller: true, pitch: -3.0 },
  { id: 'en-GB-Neural2-D', name: 'Gandalf', gender: 'Male', accent: 'British', emoji: '🧙', isDeepVoice: true, isStoryteller: true, pitch: -3.5 },
  
  // Wavenet voices - Premium natural voices
  { id: 'en-US-Wavenet-D', name: 'Marcus', gender: 'Male', accent: 'American', emoji: '🎪', isDeepVoice: true, isStoryteller: true, pitch: -3.5 },
  { id: 'en-GB-Wavenet-D', name: 'Arthur', gender: 'Male', accent: 'British', emoji: '🎩', isDeepVoice: true, isStoryteller: true, pitch: -4.0 },
]

// Difficulty configurations
type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_CONFIG: Record<Difficulty, { blanks: number; label: string; description: string; emoji: string }> = {
  easy: { blanks: 5, label: 'Easy', description: 'Short story, simple words', emoji: '🌱' },
  medium: { blanks: 7, label: 'Medium', description: 'Medium length, everyday words', emoji: '🌿' },
  hard: { blanks: 10, label: 'Challenge', description: 'Full story experience', emoji: '🌳' }
}

// Magical loading messages
const LOADING_MESSAGES = [
  "✨ Weaving the story...",
  "🪄 The tale continues...",
  "📖 Turning the page...",
  "🌟 Magic is happening...",
  "🔮 Crafting your adventure...",
  "✍️ The story unfolds...",
]

// Validate input is a real word or phrase (not random letters)
function isValidWord(input: string): boolean {
  const text = input.trim().toLowerCase()
  
  // Allow empty or too short
  if (text.length < 2) return false
  
  // Allow spaces for phrases like "santa claus", "ice cream"
  // Must be letters, spaces, apostrophes, hyphens only
  const isValidChars = /^[a-z\s'-]+$/i.test(text)
  if (!isValidChars) return false
  
  // Check each word in the input
  const words = text.split(/\s+/)
  
  for (const word of words) {
    if (word.length < 1) continue
    
    // Each word must have at least one vowel
    const hasVowel = /[aeiouy]/i.test(word)
    if (!hasVowel) return false
    
    // Check for repeated patterns like "fasfasf", "abcabc", "lalala"
    // If a 2-3 char pattern repeats 2+ times, it's likely nonsense
    const cleanWord = word.replace(/['-]/g, '')
    if (cleanWord.length >= 4) {
      // Check for 2-char repeating pattern (e.g., "fafa", "lala")
      const twoCharPattern = /^(.{2})\1+.?$/i.test(cleanWord)
      if (twoCharPattern) return false
      
      // Check for 3-char repeating pattern (e.g., "fasfa", "abcab")
      const threeCharPattern = /^(.{3})\1+.?$/i.test(cleanWord)
      if (threeCharPattern) return false
    }
    
    // Must have at least 2 unique letters (excluding very short words)
    if (cleanWord.length > 2) {
      const uniqueChars = new Set(cleanWord).size
      if (uniqueChars < 2) return false
    }
    
    // No 4+ consonants in a row
    const hasWeirdCluster = /[bcdfghjklmnpqrstvwxz]{4,}/i.test(word)
    if (hasWeirdCluster) return false
    
    // Check consonant-to-vowel ratio (real words have reasonable balance)
    const consonants = (cleanWord.match(/[bcdfghjklmnpqrstvwxz]/gi) || []).length
    const vowels = (cleanWord.match(/[aeiouy]/gi) || []).length
    if (cleanWord.length >= 4 && vowels > 0 && consonants / vowels > 4) return false
  }
  
  return true
}

// Magical Loading Component
function MagicalStoryLoader({ progress }: { progress: number }) {
  const [messageIndex, setMessageIndex] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-500/50 to-orange-500/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Wand2 className="w-8 h-8 text-white animate-bounce" />
        </div>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-amber-400 rounded-full"
            style={{ left: '50%', top: '50%' }}
            animate={{
              x: [0, Math.cos(i * 60 * Math.PI / 180) * 50],
              y: [0, Math.sin(i * 60 * Math.PI / 180) * 50],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      
      <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          initial={{ width: '10%' }}
          animate={{ width: `${Math.max(10, progress)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-gray-300 text-sm font-medium"
        >
          {LOADING_MESSAGES[messageIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

// Word-by-word reveal with synced TTS using Vertex AI
function TypewriterWithTTS({ 
  text, 
  onComplete,
  voiceId,
  autoPlay,
  speed = 350
}: { 
  text: string
  onComplete?: () => void
  voiceId?: string
  autoPlay: boolean
  speed?: number 
}) {
  const [visibleWords, setVisibleWords] = useState(0)
  
  // Remove underscores and replace with spaces for display
  // Also remove them from TTS text so they're not read aloud
  const cleanText = text.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  const words = cleanText.split(' ').filter(w => w.trim())
  const hasStartedRef = useRef(false)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    setVisibleWords(0)
    hasStartedRef.current = false
    
    // Stop any previous audio
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    
    // Don't start word reveal until audio is ready to play
    let wordRevealInterval: NodeJS.Timeout | null = null
    
    // Use Web Speech API (free, built into browser) if autoPlay is enabled
    // Vertex AI TTS removed for cost reasons
    if (autoPlay && text.trim() && !hasStartedRef.current) {
      hasStartedRef.current = true
      
      // Use Web Speech API instead of Vertex AI TTS
      if ('speechSynthesis' in window) {
        // Show words at fixed speed while speaking
        wordRevealInterval = setInterval(() => {
          setVisibleWords(prev => {
            if (prev >= words.length) {
              if (wordRevealInterval) {
                clearInterval(wordRevealInterval)
              }
              onComplete?.()
              return prev
            }
            return prev + 1
          })
        }, speed)
        
        // Use Web Speech API to speak the text
        const utterance = new SpeechSynthesisUtterance(cleanText)
        utterance.lang = 'en-US' // Default to English, can be made configurable
        utterance.rate = 0.9 // Slightly slower for clarity
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        utterance.onend = () => {
          if (wordRevealInterval) {
            clearInterval(wordRevealInterval)
          }
          setVisibleWords(words.length)
          onComplete?.()
        }
        
        utterance.onerror = () => {
          if (wordRevealInterval) {
            clearInterval(wordRevealInterval)
          }
          setVisibleWords(words.length)
          onComplete?.()
        }
        
        speechSynthesis.speak(utterance)
        return
      }
      
      // Fallback if Web Speech API not available - just show words
      wordRevealInterval = setInterval(() => {
        setVisibleWords(prev => {
          if (prev >= words.length) {
            if (wordRevealInterval) {
              clearInterval(wordRevealInterval)
            }
            onComplete?.()
            return prev
          }
          return prev + 1
        })
      }, speed)
      return
    }
    
    // Legacy Vertex AI TTS code (kept for reference, but not used)
    if (false && autoPlay && text.trim() && voiceId && !hasStartedRef.current) {
      hasStartedRef.current = true
      
      // Determine speaking rate and pitch based on voice type
      // Storyteller voices should be slower and deeper for dramatic effect
      const selectedVoiceOption = VOICE_OPTIONS.find(v => v.id === voiceId)
      const isStoryteller = selectedVoiceOption?.isStoryteller ?? false
      const speakingRate = isStoryteller ? 0.75 : 0.9 // Slower for storyteller voices
      const pitch = selectedVoiceOption?.pitch ?? 0 // Use configured pitch (negative = deeper/darker)
      
      // Call Vertex AI TTS API (DISABLED - too expensive)
      // Use cleanText (without underscores) so TTS doesn't read them
      fetch('/api/tts/vertex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceId,
          speakingRate,
          pitch
        })
      })
      .then(async (response) => {
        if (!response.ok) {
          console.warn('TTS API failed, continuing without audio')
          // Fallback: show words at fixed speed if audio fails
          wordRevealInterval = setInterval(() => {
            setVisibleWords(prev => {
              if (prev >= words.length) {
                if (wordRevealInterval) {
                  clearInterval(wordRevealInterval)
                }
                onComplete?.()
                return prev
              }
              return prev + 1
            })
          }, speed)
          return null
        }
        const data = await response.json()
        if (!data.audioContent) {
          console.warn('TTS API returned no audio, continuing without audio')
          // Fallback: show words at fixed speed
          wordRevealInterval = setInterval(() => {
            setVisibleWords(prev => {
              if (prev >= words.length) {
                if (wordRevealInterval) {
                  clearInterval(wordRevealInterval)
                }
                onComplete?.()
                return prev
              }
              return prev + 1
            })
          }, speed)
          return null
        }
        
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`)
        audioElementRef.current = audio
        
        // Don't show any words until audio starts playing
        setVisibleWords(0)
        
        // Try to sync word reveal with audio if we have timings
        if (data.wordTimings && data.wordTimings.length > 0) {
          
          // Wait for audio to be ready before playing for better sync
          let checkInterval: NodeJS.Timeout | null = null
          
          const cleanup = () => {
            if (checkInterval) {
              clearTimeout(checkInterval)
              checkInterval = null
            }
          }
          
          // Wait for audio to load, then start playing and sync words
          audio.oncanplaythrough = () => {
            // Start playing audio
            audio.play().catch(err => {
              console.error('Audio play failed:', err)
            })
          }
          
          // Track last visible word index
          let lastWordIndex = -1
          
          // Use recursive setTimeout for smooth, frame-synced updates
          const updateWords = () => {
            // Use audio.currentTime for precise sync (accounts for buffering, pausing, etc.)
            const elapsed = audio.currentTime
            
            // Find all words that should be visible now
            let maxVisibleIndex = -1
            
            for (let i = 0; i < data.wordTimings.length; i++) {
              const timing = data.wordTimings[i]
              
              // Show word if we've reached its start time
              // Add a small buffer (50ms) to show words slightly early for better UX
              if (elapsed >= (timing.start - 0.05)) {
                maxVisibleIndex = i
              }
            }
            
            // Update visible words if we've progressed
            if (maxVisibleIndex > lastWordIndex) {
              lastWordIndex = maxVisibleIndex
              setVisibleWords(maxVisibleIndex + 1)
            }
            
            // Continue updating while audio is playing
            if (!audio.paused && !audio.ended) {
              checkInterval = setTimeout(updateWords, 16) as any // ~60fps
            } else if (audio.ended) {
              // Ensure all words are visible when audio ends
              setVisibleWords(words.length)
              onComplete?.()
            }
          }
          
          // Only start showing words when audio actually starts playing
          audio.onplay = () => {
            // If resuming, sync to current position first
            if (audio.currentTime > 0) {
              const elapsed = audio.currentTime
              for (let i = 0; i < data.wordTimings.length; i++) {
                if (elapsed >= (data.wordTimings[i].start - 0.05)) {
                  lastWordIndex = i
                }
              }
              setVisibleWords(lastWordIndex + 1)
            }
            // Start/continue updating words
            updateWords()
          }
          
          audio.onended = () => {
            cleanup()
            setVisibleWords(words.length)
            onComplete?.()
          }
          
          audio.onerror = () => {
            cleanup()
            // If audio fails, continue with text reveal
            setVisibleWords(words.length)
            onComplete?.()
          }
          
          // Handle pause to stop updates
          audio.onpause = cleanup
          
          audio.load()
        } else {
          // No timings - use fixed speed but wait for audio to start
          audio.oncanplaythrough = () => {
            audio.play().catch(err => {
              console.error('Audio play failed:', err)
            })
          }
          
          // Only start showing words when audio actually starts playing
          audio.onplay = () => {
            // Start showing words at fixed speed when audio starts
            wordRevealInterval = setInterval(() => {
              setVisibleWords(prev => {
                if (prev >= words.length) {
                  if (wordRevealInterval) {
                    clearInterval(wordRevealInterval)
                  }
                  return prev
                }
                return prev + 1
              })
            }, speed)
          }
          
          audio.onended = () => {
            if (wordRevealInterval) {
              clearInterval(wordRevealInterval)
            }
            // Ensure all words are visible when audio ends
            setVisibleWords(words.length)
            onComplete?.()
          }
          
          audio.load()
        }
      })
      .catch((error) => {
        console.error('TTS error:', error)
        // Fallback: show words at fixed speed if TTS fails
        wordRevealInterval = setInterval(() => {
          setVisibleWords(prev => {
            if (prev >= words.length) {
              if (wordRevealInterval) {
                clearInterval(wordRevealInterval)
              }
              onComplete?.()
              return prev
            }
            return prev + 1
          })
        }, speed)
      })
    }
    
    // If autoPlay is disabled, just reveal words at fixed speed
    if (!autoPlay) {
      wordRevealInterval = setInterval(() => {
        setVisibleWords(prev => {
          if (prev >= words.length) {
            if (wordRevealInterval) {
              clearInterval(wordRevealInterval)
            }
            onComplete?.()
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    
    return () => {
      if (wordRevealInterval) {
        clearInterval(wordRevealInterval)
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current = null
      }
    }
  }, [text, words.length, speed, voiceId, autoPlay, onComplete])
  
  return (
    <span className="text-cyan-400">
      {words.map((word, idx) => (
        <motion.span
          key={`${text}-${idx}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ 
            opacity: idx < visibleWords ? 1 : 0,
            y: idx < visibleWords ? 0 : 5
          }}
          transition={{ duration: 0.15 }}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

// Animated Score Meter
function ScoreMeter({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  
  useEffect(() => {
    const duration = 2000
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setAnimatedScore(Math.floor(eased * score))
      if (progress < 1) requestAnimationFrame(animate)
      else if (score >= 70) setShowCelebration(true)
    }
    requestAnimationFrame(animate)
  }, [score])
  
  const getColor = () => {
    if (score >= 80) return { primary: '#22C55E', secondary: '#10B981', glow: 'rgba(34, 197, 94, 0.5)' }
    if (score >= 60) return { primary: '#F59E0B', secondary: '#D97706', glow: 'rgba(245, 158, 11, 0.5)' }
    return { primary: '#EF4444', secondary: '#DC2626', glow: 'rgba(239, 68, 68, 0.5)' }
  }
  
  const colors = getColor()
  const circumference = 2 * Math.PI * 100
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference
  
  return (
    <div className="relative w-56 h-56 mx-auto">
      <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }} />
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="112" cy="112" r="100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>
        <motion.circle
          cx="112" cy="112" r="100" fill="none" stroke="url(#scoreGrad)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold" style={{ color: colors.primary }}>{animatedScore}<span className="text-3xl">%</span></div>
        <div className="text-gray-400 text-sm mt-1">
          {score >= 90 ? 'Excellent!' : score >= 70 ? 'Great job!' : score >= 50 ? 'Good effort!' : 'Keep practicing!'}
        </div>
      </div>
      <AnimatePresence>
        {showCelebration && [...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ background: i % 2 === 0 ? colors.primary : colors.secondary, left: '50%', top: '50%' }}
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{ scale: [0, 1, 0], x: [0, Math.cos(i * 30 * Math.PI / 180) * 80], y: [0, Math.sin(i * 30 * Math.PI / 180) * 80] }}
            transition={{ duration: 1, delay: i * 0.05 }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function StoryBuilderGame({
  onClose,
  trackingContext,
  onScoreUpdate,
  themeColor
}: StoryBuilderGameProps) {
  // New game flow states
  const [gameStep, setGameStep] = useState<GameStep>('rules')
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-Journey-F')
  const [scenarioFilter, setScenarioFilter] = useState<string>('All')
  
  // Game states
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'results'>('setup')
  
  // Story states
  const [storySegments, setStorySegments] = useState<StorySegment[]>([])
  const [currentSegment, setCurrentSegment] = useState<StoryBuilderResponse | null>(null)
  const [playerInput, setPlayerInput] = useState('')
  const [isWaitingForInput, setIsWaitingForInput] = useState(false)
  const [segmentNumber, setSegmentNumber] = useState(0)
  const [isTextRevealing, setIsTextRevealing] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [apiCallsUsed, setApiCallsUsed] = useState(0)
  const [showingEnding, setShowingEnding] = useState(false)
  const [validationErrors, setValidationErrors] = useState(0) // Track failed attempts
  
  // Max API calls per game
  const MAX_API_CALLS = 10
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Refs
  const storyContainerRef = useRef<HTMLDivElement>(null)
  
  // TTS states
  const [autoPlay, setAutoPlay] = useState(true)
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const filledBlanks = storySegments.filter(s => s.playerWord).length
  const totalBlanks = difficulty ? DIFFICULTY_CONFIG[difficulty].blanks : 0
  
  // Auto-scroll to bottom of story
  const scrollToBottom = useCallback(() => {
    if (storyContainerRef.current) {
      storyContainerRef.current.scrollTop = storyContainerRef.current.scrollHeight
    }
  }, [])
  
  // Stop TTS (only on close) - no-op for Vertex AI (handled by audio element)
  const stopTTS = useCallback(() => {
    // Vertex AI uses HTMLAudioElement, which will be cleaned up automatically
  }, [])
  
  // Handle text reveal complete
  const handleTextRevealComplete = useCallback(() => {
    setIsTextRevealing(false)
    
    // Check if this was the ending - if so, add to segments and go to results
    if (showingEnding && currentSegment?.isEnding) {
      setStorySegments(prev => [...prev, { text: currentSegment.text }])
      setShowingEnding(false)
      // Longer delay to let user read the ending and TTS to finish
      setTimeout(() => {
        setGamePhase('results')
      }, 2500)
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
      scrollToBottom()
    }
  }, [currentSegment, showingEnding, scrollToBottom])
  
  // Start game
  const handleStartGame = async () => {
    if (!difficulty || !selectedScenario) {
      setError('Please select difficulty and scenario')
      return
    }
    
    setLoading(true)
    setError(null)
    setLoadingProgress(20)
    setApiCallsUsed(0)
    setValidationErrors(0)
    setStorySegments([])
    setCurrentSegment(null)
    
    let progressInterval: NodeJS.Timeout | null = null
    
    try {
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => Math.min(prev + Math.random() * 15, 90))
      }, 400)
      
      if (trackingContext) {
        const session = await startGameSession('story_builder', trackingContext)
        if (session) setSessionId(session.id)
      }
      
      // Get scenario name from selected scenario ID
      const scenarioName = STORY_SCENARIOS.find(s => s.id === selectedScenario)?.name
      
      const response = await fetch('/api/story-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'start',
          targetWords: [], // No target words - freeform story
          difficulty,
          theme: scenarioName
        })
      })
      
      setApiCallsUsed(1)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to start story')
      }
      
      const data: StoryBuilderResponse = await response.json()
      
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      
      setLoadingProgress(100)
      
      setTimeout(() => {
        setCurrentSegment(data)
        setSegmentNumber(1)
        setGamePhase('playing')
        setIsWaitingForInput(data.hasGap)
        setIsTextRevealing(true)
        setLoading(false)
      }, 500)
      
    } catch (err: any) {
      console.error('Story Builder start error:', err)
      setError(err.message || 'Failed to start game')
      setLoading(false)
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }
  
  // Submit word
  const handleSubmitWord = async () => {
    if (!playerInput.trim() || !currentSegment || isSubmitting) return
    
    const word = playerInput.trim()
    
    // Basic validation (not random letters)
    if (!isValidWord(word)) {
      setInputError('Please enter a real word!')
      setTimeout(() => setInputError(null), 2000)
      return
    }
    
    // Check if we've used all API calls
    const remainingCalls = MAX_API_CALLS - apiCallsUsed
    if (remainingCalls <= 0) {
      setInputError('No more attempts left! Story ending...')
      setTimeout(() => {
        setGamePhase('results')
      }, 1500)
      return
    }
    
    setInputError(null)
    setIsSubmitting(true)
    
    const newFilledBlanks = filledBlanks + 1
    
    // Force end if this is the last API call OR last blank
    const isLastApiCall = remainingCalls <= 1
    const isLastBlank = newFilledBlanks >= totalBlanks
    const shouldForceEnd = isLastBlank || isLastApiCall
    
    try {
      // Build story context from existing segments
      const storyContext = storySegments
        .map(s => s.text + (s.playerWord ? ` ${s.playerWord}` : ''))
        .join(' ') + ' ' + currentSegment.text
      
      // Get scenario name from selected scenario ID
      const scenarioName = STORY_SCENARIOS.find(s => s.id === selectedScenario)?.name
      
      const response = await fetch('/api/story-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'continue',
          storyContext,
          playerWord: word,
          gapType: currentSegment.gapType || 'noun',
          targetWords: [],
          usedTargetWords: [],
          segmentNumber: segmentNumber + 1,
          forceEnd: shouldForceEnd,
          difficulty,
          theme: scenarioName
        })
      })
      
      // Track API call
      setApiCallsUsed(prev => prev + 1)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to continue story')
      }
      
      const data: StoryBuilderResponse = await response.json()
      
      // Check for grammar validation error
      if (data.validationError) {
        setValidationErrors(prev => prev + 1)
        setInputError(`${data.validationError} (${MAX_API_CALLS - apiCallsUsed - 1} tries left)`)
        setIsSubmitting(false)
        setTimeout(() => setInputError(null), 3000)
        return
      }
      
      // Word was accepted - add segment
      const newSegment: StorySegment = {
        text: currentSegment.text,
        playerWord: word,
        gapType: currentSegment.gapType
      }
      setStorySegments(prev => [...prev, newSegment])
      
      setPlayerInput('')
      setIsWaitingForInput(false)
      
      // Handle ending -> show it with typewriter + TTS before results
      if (shouldForceEnd || data.isEnding) {
        if (data.text) {
          setShowingEnding(true)
          setCurrentSegment({ ...data, hasGap: false, isEnding: true })
          setIsTextRevealing(true)
          setIsSubmitting(false)
        } else {
          setIsSubmitting(false)
          setGamePhase('results')
        }
        return
      }
      
      // Continue story
      setTimeout(() => {
        setCurrentSegment(data)
        setSegmentNumber(prev => prev + 1)
        setIsWaitingForInput(data.hasGap)
        setIsTextRevealing(true)
        setIsSubmitting(false)
        // Auto-scroll to bottom
        setTimeout(scrollToBottom, 100)
      }, 500)
      
    } catch (err: any) {
      setInputError(err.message || 'Something went wrong. Try again!')
      setIsSubmitting(false)
      setTimeout(() => setInputError(null), 4000)
    }
  }
  
  // Calculate score based on:
  // 1. Story completion (how many blanks filled vs total)
  // 2. Word variety (unique words used)
  // 3. No validation errors (words that fit grammatically)
  const calculateScore = () => {
    const playerWords = storySegments.filter(s => s.playerWord).map(s => s.playerWord!.toLowerCase())
    const blanksFilledCount = playerWords.length
    
    if (blanksFilledCount === 0) return 0
    
    // 1. Completion score (40%): How many blanks filled vs expected
    const completionRatio = Math.min(blanksFilledCount / totalBlanks, 1)
    const completionScore = completionRatio * 40
    
    // 2. Variety score (40%): Unique words / total words
    const uniqueWords = new Set(playerWords).size
    const varietyRatio = uniqueWords / blanksFilledCount
    const varietyScore = varietyRatio * 40
    
    // 3. Accuracy score (20%): No validation errors
    const errorPenalty = Math.min(validationErrors * 5, 20) // Max 20% penalty
    const accuracyScore = 20 - errorPenalty
    
    return Math.min(100, Math.round(completionScore + varietyScore + accuracyScore))
  }
  
  // Get feedback details
  const getFeedbackDetails = () => {
    const playerWords = storySegments.filter(s => s.playerWord).map(s => s.playerWord!.toLowerCase())
    const uniqueWords = new Set(playerWords)
    
    return {
      blanksCompleted: playerWords.length,
      totalBlanks,
      uniqueWordsUsed: uniqueWords.size,
      validationErrors,
      wordList: Array.from(uniqueWords)
    }
  }
  
  // Build story text with PURPLE highlighting for player words
  // Remove underscores from text so they're not displayed
  const getStoryText = (showHighlight: boolean = true) => {
    return storySegments.map((segment, idx) => (
      <span key={idx}>
        {segment.text.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()}
        {segment.playerWord && (
          showHighlight ? (
            <mark className="px-1 mx-0.5 rounded bg-amber-500/40 text-amber-200 font-medium">
              {segment.playerWord}
            </mark>
          ) : (
            ` ${segment.playerWord}`
          )
        )}
        {' '}
      </span>
    ))
  }
  
  // Get all player words for feedback
  const getPlayerWords = () => {
    return storySegments.filter(s => s.playerWord).map(s => s.playerWord!)
  }
  
  // Send to teacher
  const handleSendToTeacher = async () => {
    if (!sessionId) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const fullStory = storySegments.map(s => s.text + (s.playerWord ? ` ${s.playerWord}` : '')).join(' ')
    const playerWords = storySegments.filter(s => s.playerWord).map(s => ({
      word: s.playerWord,
      wasTargetWord: s.wasTargetWord,
      gapType: s.gapType
    }))
    
    await supabase
      .from('game_sessions')
      .update({
        notes: JSON.stringify({
          reviewRequested: true,
          fullStory,
          playerWords,
          score: calculateScore(),
          feedback: getFeedbackDetails(),
          submittedAt: new Date().toISOString()
        })
      })
      .eq('id', sessionId)
  }
  
  // Cleanup - only stop TTS when closing
  useEffect(() => {
    return () => stopTTS()
  }, [stopTTS])
  
  const score = calculateScore()
  const feedback = getFeedbackDetails()
  
  // Get unique categories for filtering
  const scenarioCategories = ['All', ...new Set(STORY_SCENARIOS.map(s => s.category))]
  const filteredScenarios = scenarioFilter === 'All' 
    ? STORY_SCENARIOS 
    : STORY_SCENARIOS.filter(s => s.category === scenarioFilter)
  
  // ============ STEP 1: RULES SCREEN ============
  if (gameStep === 'rules') {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        {/* Aurora background effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-[250px] h-[250px] bg-amber-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative bg-[#12122a] rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/40 animate-pulse">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Story Builder Adventure</h1>
            <p className="text-amber-300">Create your own story by adding words to the tale!</p>
          </div>

          {/* Rules Section */}
          <div className="space-y-4 mb-8">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Your Goal</h3>
                  <p className="text-gray-400 text-sm">The AI will tell a story and pause for you to add words. Be creative - your words shape the adventure!</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">📝</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">How to Play</h3>
                  <p className="text-gray-400 text-sm">When the story pauses, type any word that fits! The AI will continue the story with your word included.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⭐</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Scoring</h3>
                  <p className="text-gray-400 text-sm">Your score is based on story completion, word variety, and how well your words fit grammatically.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🔊</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Listen & Learn</h3>
                  <p className="text-gray-400 text-sm">The story will be read aloud to you! Follow along as each word is highlighted while being spoken.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setGameStep('scenario')}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              Choose Scenario
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 2: SCENARIO SELECTION ============
  if (gameStep === 'scenario') {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        {/* Aurora background effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative bg-[#12122a] rounded-3xl p-6 w-full max-w-4xl shadow-2xl border border-white/10 my-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Your Setting</h2>
            <p className="text-gray-400">Where should your story take place?</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {scenarioCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setScenarioFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  scenarioFilter === cat
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scenario Grid */}
          <div className="flex-1 overflow-y-auto mb-6 pr-2 -mr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredScenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`p-4 rounded-xl border transition-all text-center ${
                    selectedScenario === scenario.id
                      ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-3xl mb-2">{scenario.emoji}</div>
                  <div className="text-white text-sm font-medium">{scenario.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameStep('rules')}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setGameStep('difficulty')}
              disabled={!selectedScenario}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose Difficulty
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 3: DIFFICULTY SELECTION ============
  if (gameStep === 'difficulty') {
    const difficultyOptions = [
      {
        id: 'easy' as const,
        name: 'Easy',
        emoji: '🌱',
        color: 'from-emerald-500 to-green-500',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30',
        description: 'Short story, fewer gaps, simple vocabulary',
        details: '5 blanks • Simple words'
      },
      {
        id: 'medium' as const,
        name: 'Medium',
        emoji: '🌿',
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
        description: 'Moderate length, more gaps, varied vocabulary',
        details: '7 blanks • Everyday words'
      },
      {
        id: 'hard' as const,
        name: 'Challenge',
        emoji: '🌳',
        color: 'from-red-500 to-pink-500',
        bgColor: 'bg-red-500/10 border-red-500/30',
        description: 'Full story experience, many gaps',
        details: '10 blanks • Full story'
      }
    ]

    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        {/* Aurora background effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative bg-[#12122a] rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
              <Gauge className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Difficulty</h2>
            <p className="text-gray-400">How challenging do you want the story to be?</p>
          </div>

          {/* Difficulty Options */}
          <div className="space-y-4 mb-8">
            {difficultyOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDifficulty(opt.id)}
                className={`w-full p-5 rounded-2xl border transition-all text-left ${
                  difficulty === opt.id
                    ? `${opt.bgColor} ring-2 ring-offset-2 ring-offset-[#12122a]`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                } ${difficulty === opt.id ? `ring-${opt.id === 'easy' ? 'emerald' : opt.id === 'medium' ? 'amber' : 'red'}-500/50` : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{opt.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-lg">{opt.name}</div>
                    <div className="text-gray-400 text-sm">{opt.description}</div>
                    <div className="text-gray-500 text-xs mt-1">{opt.details}</div>
                  </div>
                  {difficulty === opt.id && (
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameStep('scenario')}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setGameStep('voice')}
              disabled={!difficulty}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose Voice
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ STEP 4: VOICE SELECTION ============
  if (gameStep === 'voice') {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center p-4 z-50 overflow-y-auto">
        {/* Aurora background effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative bg-[#12122a] rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-white/10 my-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Narrator</h2>
            <p className="text-gray-400">Who should read your story aloud?</p>
          </div>

          {/* Voice Options */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {VOICE_OPTIONS.map(voice => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`p-5 rounded-2xl border transition-all text-left ${
                  selectedVoice === voice.id
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{voice.emoji}</div>
                  <div>
                    <div className="text-white font-semibold">{voice.name}</div>
                    <div className="text-gray-400 text-sm">{voice.accent} • {voice.gender}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Auto-play toggle */}
          <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoPlay} 
                onChange={(e) => setAutoPlay(e.target.checked)} 
                className="w-5 h-5 rounded"
              />
              <span className="text-white font-medium">Auto-play audio</span>
            </label>
            <p className="text-gray-400 text-sm mt-2 ml-8">The story will be read aloud as it appears</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setGameStep('difficulty')}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => {
                setGameStep('playing')
                handleStartGame()
              }}
              disabled={!selectedVoice}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              Generate Story
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ PLAYING STEP ============
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        <div className="absolute -inset-2 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-rose-500/20 rounded-3xl blur-2xl" />
        
        <div className="relative rounded-2xl bg-[#0d0d1a] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Story Builder</h2>
                <p className="text-gray-400 text-xs">
                  {gamePhase === 'playing' && difficulty && `Blank ${filledBlanks + 1}/${totalBlanks}`}
                  {gamePhase === 'results' && 'Story complete!'}
                </p>
              </div>
            </div>
            <button onClick={() => { stopTTS(); onClose(); }} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Story Info Bar - Show when playing or loading */}
            {(gamePhase === 'playing' || loading) && (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                {/* Scenario Badge */}
                {selectedScenario && (
                  <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border bg-amber-500/10 border-amber-500/30">
                    <span className="text-lg">{STORY_SCENARIOS.find(s => s.id === selectedScenario)?.emoji}</span>
                    <span className="text-sm font-medium text-amber-400">
                      {STORY_SCENARIOS.find(s => s.id === selectedScenario)?.name}
                    </span>
                  </div>
                )}
                
                {/* Difficulty Badge */}
                {difficulty && (
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl border ${
                    difficulty === 'easy' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    difficulty === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <span className={`text-sm font-medium ${
                      difficulty === 'easy' ? 'text-emerald-400' :
                      difficulty === 'medium' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
                    </span>
                  </div>
                )}

                {/* Voice Badge */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border bg-amber-500/10 border-amber-500/30">
                  <span className="text-lg">{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.emoji}</span>
                  <span className="text-sm font-medium text-amber-400">
                    {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name}
                  </span>
                </div>
              </div>
            )}
            
            {/* Loading */}
            {loading && (
              <MagicalStoryLoader progress={loadingProgress} />
            )}
            
            {/* Error Display */}
            {error && !loading && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-4">
                {error}
              </div>
            )}
            
            {/* Playing */}
            {gamePhase === 'playing' && !loading && currentSegment && (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(filledBlanks / totalBlanks) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{filledBlanks}/{totalBlanks}</span>
                  <span className="text-xs text-amber-400/70">⚡{MAX_API_CALLS - apiCallsUsed}</span>
                </div>
                
                {/* Story so far */}
                <div 
                  ref={storyContainerRef}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 min-h-[150px] max-h-[250px] overflow-y-auto">
                  <div className="text-white/90 text-sm leading-relaxed">
                    {getStoryText(true)}
                    {isTextRevealing ? (
                      <TypewriterWithTTS 
                        text={currentSegment.text} 
                        onComplete={handleTextRevealComplete}
                        voiceId={selectedVoice}
                        autoPlay={autoPlay}
                        speed={300}
                      />
                    ) : (
                      <span className="text-amber-400">{currentSegment.text.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()}</span>
                    )}
                    {isWaitingForInput && !isTextRevealing && (
                      <span className="inline-block ml-1 px-3 py-1 bg-orange-500/50 text-orange-200 rounded-lg animate-pulse font-medium">
                        ?
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Input - only show after text reveal */}
                {isWaitingForInput && !isTextRevealing && (
                  <div className="space-y-3">
                    {/* Input error */}
                    <AnimatePresence>
                      {inputError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{inputError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Input */}
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleSubmitWord()}
                        placeholder="Type a word..."
                        disabled={isSubmitting}
                        className={`flex-1 px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-500 focus:outline-none transition-colors ${
                          inputError ? 'border-amber-500/50' : 'border-white/10 focus:border-amber-500/50'
                        } ${isSubmitting ? 'opacity-50' : ''}`}
                        autoFocus
                      />
                      <button
                        onClick={handleSubmitWord}
                        disabled={!playerInput.trim() || isSubmitting}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium disabled:opacity-50 min-w-[56px] flex items-center justify-center"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Tips */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400">
                    💡 Type any word that fits the story! Be creative - nouns, verbs, adjectives all work.
                  </p>
                </div>
              </div>
            )}
            
            {/* Results */}
            {gamePhase === 'results' && (
              <div className="space-y-5">
                <ScoreMeter score={score} />
                
                {/* Feedback Section */}
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">📊 Story Stats</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-emerald-400 font-bold text-lg">{feedback.blanksCompleted}</span>
                        <span className="text-gray-400 block text-[10px]">blanks filled</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="text-amber-400 font-bold text-lg">{feedback.uniqueWordsUsed}</span>
                        <span className="text-gray-400 block text-[10px]">unique words</span>
                      </div>
                      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                        <span className="text-orange-400 font-bold text-lg">{storySegments.length}</span>
                        <span className="text-gray-400 block text-[10px]">story parts</span>
                      </div>
                    </div>
                    
                    {/* Words used list */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {feedback.wordList.map((word, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Story Feedback */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">✨ Feedback</h4>
                    <div className="space-y-2 text-xs text-gray-300">
                      {/* Completion feedback */}
                      {feedback.blanksCompleted >= totalBlanks && (
                        <p className="flex items-start gap-2">
                          <span className="text-emerald-400">🎯</span>
                          <span>Great job completing the whole story!</span>
                        </p>
                      )}
                      {feedback.blanksCompleted < totalBlanks && (
                        <p className="flex items-start gap-2">
                          <span className="text-amber-400">📝</span>
                          <span>You filled {feedback.blanksCompleted} of {totalBlanks} blanks. Try to finish the whole story next time!</span>
                        </p>
                      )}
                      
                      {/* Variety feedback */}
                      {feedback.uniqueWordsUsed === feedback.blanksCompleted && feedback.blanksCompleted > 3 && (
                        <p className="flex items-start gap-2">
                          <span className="text-amber-400">🎨</span>
                          <span>Amazing vocabulary variety! Every word was unique.</span>
                        </p>
                      )}
                      {feedback.uniqueWordsUsed < feedback.blanksCompleted && (
                        <p className="flex items-start gap-2">
                          <span className="text-orange-400">💡</span>
                          <span>Try using more different words for variety!</span>
                        </p>
                      )}
                      
                      {/* Error feedback */}
                      {validationErrors === 0 && (
                        <p className="flex items-start gap-2">
                          <span className="text-emerald-400">✅</span>
                          <span>Perfect grammar! All your words fit naturally.</span>
                        </p>
                      )}
                      {validationErrors > 0 && (
                        <p className="flex items-start gap-2">
                          <span className="text-amber-400">📚</span>
                          <span>You had {validationErrors} word{validationErrors > 1 ? 's' : ''} that didn&apos;t fit. Keep practicing grammar!</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Final story with highlights */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-h-[180px] overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Your Story
                    <span className="text-xs text-amber-400 ml-auto">Orange = your words</span>
                  </h4>
                  <div className="text-white/90 text-sm leading-relaxed">
                    {getStoryText(true)}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleSendToTeacher}
                    className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 flex items-center gap-2 hover:bg-white/10"
                  >
                    <Send className="w-4 h-4" />
                    Send to Teacher
                  </button>
                  <button
                    onClick={() => {
                      setGamePhase('setup')
                      setStorySegments([])
                      setCurrentSegment(null)
                      setValidationErrors(0)
                      setSegmentNumber(0)
                      setApiCallsUsed(0)
                      setShowingEnding(false)
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

