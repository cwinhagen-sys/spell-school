'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Heart, Sparkles, Wand2 } from 'lucide-react'
import { startGameSession, endGameSession, updateStudentProgress, type TrackingContext } from '@/lib/tracking'
import UniversalGameCompleteModal from '@/components/UniversalGameCompleteModal'
import { calculateSpellCastingScore } from '@/lib/gameScoring'

interface Word {
  id: string
  text: string
  translation: string
  isTarget?: boolean
  createdAt: number
}

interface Monster {
  id: string
  x: number   // center-x
  y: number   // center-y
  health: number
  maxHealth: number
  speed: number
  tier: number
  mood?: 'idle' | 'alert'
  lastFireTime?: number
  isFiring?: boolean
  isHit?: boolean
}

interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

type ThemeId = 'castle' | 'jungle' | 'desert' | 'arctic' | 'arcane'

interface SpellCastingChallengeProps {
  words: string[]
  translations: { [key: string]: string }
  onClose: () => void
  onScoreUpdate: (score: number, newTotal?: number, gameType?: string) => void
  themeColor?: string
  variant?: 'quizlet' | 'modern'
  trackingContext?: TrackingContext
}

export default function SpellCastingChallenge({
  words,
  translations,
  onClose,
  onScoreUpdate,
  themeColor = '#3B82F6',
  variant = 'quizlet',
  trackingContext,
}: SpellCastingChallengeProps) {
  // -------------------- State --------------------
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(10)
  const [gameActive, setGameActive] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [chips, setChips] = useState<Word[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [spellPower, setSpellPower] = useState(0)
  const [currentTarget, setCurrentTarget] = useState('')
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [spellCharges, setSpellCharges] = useState(0)
  const [maxSpellCharges] = useState(5)
  const [wandMode, setWandMode] = useState(false)
  const [wandTimeLeft, setWandTimeLeft] = useState(0)
  const [wandStartTime, setWandStartTime] = useState(0)
  const [clickedWordId, setClickedWordId] = useState<string | null>(null)
  const [dyingMonsters, setDyingMonsters] = useState<Set<string>>(new Set())
  const [soundOn, setSoundOn] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [theme, setTheme] = useState<ThemeId>('castle')
  const THEMES: ThemeId[] = ['castle', 'jungle', 'desert', 'arctic', 'arcane']
  const [gameFinished, setGameFinished] = useState(false)
  const [awardedPoints, setAwardedPoints] = useState(0)

  // -------------------- Refs & const --------------------
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const loopRef = useRef<number | undefined>(undefined)
  const lastPosUpdateRef = useRef<number>(0)
  const recentlyEscapedRef = useRef<Set<string>>(new Set())
  const isQuizlet = variant === 'quizlet'
  const tc = themeColor

  // Easing / tempo
  const EASE = [0.16, 1, 0.3, 1] as const
  const DUR_IN = 0.2

  // ↓ Global multiplikator för alla monsterhastigheter (lägre = långsammare)
  // Global speed multiplier for monsters (higher = faster). Kept separate for quick tuning.
  const MONSTER_SPEED_SCALE = 1.0

  // Utils
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const getMonsterSize = (tier: number) => Math.min(120, Math.max(40, 40 + (tier - 1) * 5)) // 40..120

  // XP mapping based on final score
  const xpForFinalScore = (finalScore: number) => {
    if (finalScore <= 100) return 25
    if (finalScore <= 500) return 50
    if (finalScore <= 1000) return 75
    return 100
  }

  // -------------------- Sounds --------------------
  const playTone = (freqFrom: number, freqTo: number, dur: number, type: OscillatorType = 'sine', gain = 0.25) => {
    if (!soundOn) return
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext
      const audioContext = new Ctx()
      const osc = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      osc.type = type
      osc.connect(gainNode)
      gainNode.connect(audioContext.destination)
      osc.frequency.setValueAtTime(freqFrom, audioContext.currentTime)
      osc.frequency.exponentialRampToValueAtTime(freqTo, audioContext.currentTime + dur)
      gainNode.gain.setValueAtTime(gain, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur)
      osc.start()
      osc.stop(audioContext.currentTime + dur)
    } catch {}
  }
  const playCorrectSound = useCallback(() => playTone(800, 1200, 0.18), [soundOn])
  const playWrongSound   = useCallback(() => playTone(200, 100, 0.28, 'sawtooth', 0.2), [soundOn])
  // Short splash SFX: white-noise burst through lowpass with quick decay
  const playDeathSound = useCallback(() => {
    if (!soundOn) return
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new Ctx()
      const bufferSize = 0.15 * ctx.sampleRate
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) // short decay
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1200
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      noise.start()
      noise.stop(ctx.currentTime + 0.16)
    } catch {}
  }, [soundOn])

  // Wand-mode tense music
  const wandAudioRef = useRef<{ ctx: any; osc: any; gain: any } | null>(null)
  const startWandMusic = useCallback(() => {
    if (!soundOn || wandAudioRef.current) return
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(140, ctx.currentTime)
      // slight vibrato
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 6
      lfoGain.gain.value = 20
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()
      gain.gain.value = 0.06
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      wandAudioRef.current = { ctx, osc, gain }
    } catch {}
  }, [soundOn])
  const stopWandMusic = useCallback(() => {
    try {
      if (wandAudioRef.current) {
        const { ctx, osc, gain } = wandAudioRef.current
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
        osc.stop(ctx.currentTime + 0.25)
        wandAudioRef.current = null
      }
    } catch {}
  }, [])

  // -------------------- Words --------------------
  const pickTarget = useCallback(() => {
    const w = words[Math.floor(Math.random() * words.length)]
    setCurrentTarget(w)
  }, [words])

  const generateWordSet = useCallback((targetWord: string): Word[] => {
    if (!targetWord) return []
    const wrongWords = words.filter(w => w !== targetWord)
    const all = [targetWord]
    for (let i = 0; i < 3; i++) {
      all.push(wrongWords.length ? wrongWords[Math.floor(Math.random() * wrongWords.length)] : targetWord)
    }
    const shuffled = all.sort(() => Math.random() - 0.5)
    return shuffled.map((text, i) => ({
      id: `${text}-${Date.now()}-${i}`,
      text,
      translation: translations[text] || text,
      isTarget: text === targetWord,
      createdAt: Date.now(),
    }))
  }, [words, translations])

  // -------------------- Particles --------------------
  const sparkle = useCallback((x: number, y: number, color: string) => {
    const pts: Particle[] = []
    for (let i = 0; i < 6; i++) {
      pts.push({
        id: Math.random().toString(36).slice(2, 9),
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 0.8,
        color,
        size: 2,
      })
    }
    setParticles(p => [...p, ...pts])
  }, [])

  // Splash burst with bigger droplets
  const splash = useCallback((x: number, y: number, color: string) => {
    const pts: Particle[] = []
    const count = 18
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const speed = 4 + Math.random() * 7
      pts.push({
        id: Math.random().toString(36).slice(2, 9),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.2,
        color,
        size: 3 + Math.floor(Math.random() * 3),
      })
    }
    setParticles(p => [...p, ...pts])
  }, [])

  const pickRandomTheme = useCallback((): ThemeId => {
    return THEMES[Math.floor(Math.random() * THEMES.length)]
  }, [])

  // -------------------- Monsters --------------------
  const getAvailableTiers = useCallback((s: number): number[] => {
    if (s < 100) return [1, 2]
    if (s < 300) return [1, 2, 3, 4]
    if (s < 600) return [1, 2, 3, 4, 5, 6]
    if (s < 1000) return [1, 2, 3, 4, 5, 6, 7, 8]
    const extra = Math.min(20, Math.floor((s - 1000) / 150)) // add up to 20 extra tiers past 1000
    const maxTier = 10 + extra // up to 30
    return Array.from({ length: maxTier }, (_, i) => i + 1)
  }, [])

  // Spawn med center-koordinater och marginaler baserat på sprite-storlek
  const makeMonster = useCallback((): Monster => {
    const W = gameAreaRef.current?.clientWidth || 960
    const H = gameAreaRef.current?.clientHeight || 640
    const tiers = getAvailableTiers(score)
    const tier = tiers[Math.floor(Math.random() * tiers.length)]
    const size = getMonsterSize(tier)
    const margin = Math.ceil(size / 2) + 8

    // Center-x inom säkra kanter
    const x = clamp(Math.random() * (W - 2 * margin) + margin, margin, W - margin)
    // Starta precis ovanför top (center-y)
    const y = -margin

    // Långsammare baseline + global multiplikator + lite variation
    // New model: All monsters are 1-hit in wand mode; higher tiers are faster instead of tankier.
    // Base speed grows with tier. Tuned for ~30 FPS physics update.
    const baseSpeed = 1.6 + tier * 0.22 // tier 1 ≈ 1.82, tier 10 ≈ 3.8 per tick
    const speed = baseSpeed * MONSTER_SPEED_SCALE * (0.9 + Math.random() * 0.2)

    return {
      id: Math.random().toString(36).slice(2, 9),
      x,
      y,
      health: 1,
      maxHealth: 1,
      speed,
      tier,
      mood: 'idle',
      lastFireTime: 0,
      isFiring: false,
      isHit: false,
    }
  }, [score, getAvailableTiers])

  // -------------------- Wand mode --------------------
  const castSpell = useCallback(() => {
    if (spellCharges < maxSpellCharges) return
    setWandMode(true)
    setWandTimeLeft(5)
    setWandStartTime(Date.now())
    setSpellCharges(0)
    setSpellPower(0)
    startWandMusic()
  }, [spellCharges, maxSpellCharges])

  const onMonsterClick = useCallback((monster: Monster) => {
    if (!wandMode) return
    setMonsters(prev => {
      const target = prev.find(m => m.id === monster.id)
      if (!target || target.health <= 0) return prev
      if (dyingMonsters.has(monster.id)) return prev

      const updated = prev.map(m => m.id === monster.id ? { ...m, health: m.health - 1, isHit: true } : m)

      // remove hit flag shortly after
      setTimeout(() => {
        setMonsters(p => p.map(mm => mm.id === monster.id ? { ...mm, isHit: false } : mm))
      }, 180)

      const justKilled = true // 1-hit kill model in wand mode
      if (justKilled) {
        playDeathSound()
        setDyingMonsters(prevSet => new Set([...prevSet, monster.id]))
        setTimeout(() => {
          setMonsters(p => p.filter(mm => mm.id !== monster.id))
          setDyingMonsters(prevSet => { const s = new Set(prevSet); s.delete(monster.id); return s })
        }, 600)
        setScore(s => s + target.tier * 10)
      }

      // Water-like splash
      splash(target.x, target.y, '#38BDF8')
      return updated
    })
  }, [wandMode, dyingMonsters, splash, playDeathSound])

  // -------------------- Word click --------------------
  const onChipClick = useCallback((w: Word, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!gameActive) return
    const isOk = w.text === currentTarget
    setClickedWordId(w.id)

    const area = gameAreaRef.current?.getBoundingClientRect()
    const btn = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    const cx = area ? (btn.left + btn.width / 2) - area.left : 0
    const cy = area ? (btn.top + btn.height / 2) - area.top : 0

    if (isOk) {
      playCorrectSound()
      sparkle(cx, cy, '#22C55E')
      setScore(s => s + 10)
      setSpellCharges(c => Math.min(c + 1, maxSpellCharges))
      setSpellPower(p => Math.min(p + 20, 100))
      setTimeout(() => {
        const nt = words[Math.floor(Math.random() * words.length)]
        setCurrentTarget(nt)
        setChips(generateWordSet(nt))
        setClickedWordId(null)
      }, 180)
    } else {
      playWrongSound()
      sparkle(cx, cy, '#EF4444')
      setSpellCharges(0)
      setSpellPower(0)
      setTimeout(() => {
        const nt = words[Math.floor(Math.random() * words.length)]
        setCurrentTarget(nt)
        setChips(generateWordSet(nt))
        setClickedWordId(null)
      }, 260)
    }
  }, [gameActive, currentTarget, sparkle, maxSpellCharges, words, generateWordSet, playCorrectSound, playWrongSound])

  // -------------------- Start/Loop --------------------
  const start = useCallback(() => {
    setScore(0)
    setLives(10)
    setGameActive(true)
    setGameOver(false)
    setChips([])
    setParticles([])
    setSpellPower(0)
    setSpellCharges(0)
    setMonsters([])
    setWandMode(false)
    setWandTimeLeft(0)
    setWandStartTime(0)
    setTheme(pickRandomTheme())
    const t = words[Math.floor(Math.random() * words.length)]
    setCurrentTarget(t)
    setChips(generateWordSet(t))
  }, [words, generateWordSet, pickRandomTheme])

  const loop = useCallback(() => {
    if (!gameActive) return

    // Wand timer
    if (wandMode && wandTimeLeft > 0) {
      const elapsed = (Date.now() - wandStartTime) / 1000
      const remaining = Math.max(0, 5 - elapsed) // 5 sekunder total
      
      if (remaining <= 0) {
        setWandMode(false)
        setWandTimeLeft(0)
        stopWandMusic()
      } else {
        setWandTimeLeft(remaining)
      }
    }

    // Monster movement (center-coords) + escape-beräkning (throttled to ~30fps)
    const nowGlobal = Date.now()
    const shouldUpdatePos = nowGlobal - lastPosUpdateRef.current >= 33
    if (shouldUpdatePos) {
      setMonsters(prev => {
        const H = gameAreaRef.current?.clientHeight || 640
        const now = nowGlobal

        // Förflyttning + mood + fire
        const moved = prev.map(m => {
          const size = getMonsterSize(m.tier)
          const nextY = m.y + m.speed // nedåt, inga Math.round → mjukare
          const distToBottom = H - (nextY + size / 2)
          const mood: Monster['mood'] = distToBottom < 100 ? 'alert' : 'idle'
          
          // enkel “fire” för tier 8+ (keep lightweight)
          let isFiring = m.isFiring || false
          if (m.tier >= 8) {
            const since = m.lastFireTime ? now - m.lastFireTime : Infinity
            if (since > 3000) { isFiring = true }
            else if (since > 1000) { isFiring = false }
            if (!m.lastFireTime && nextY > 100) isFiring = true
          }
          
          return { ...m, y: nextY, mood, isFiring, lastFireTime: (isFiring && !m.lastFireTime) ? now : m.lastFireTime }
        })
        
      // ESCAPE: när underkanten passerat spelplanens nederkant
      const escapedNow = moved.filter(m => (m.y + getMonsterSize(m.tier) / 2) > H)
      // Alla monster drar 1 liv var, oavsett tier
      // Skydda mot dubbelräkning inom samma tick (dev StrictMode, dubbla setState):
      const escapedIds = new Set(escapedNow.map(m => m.id))
      let newDamage = 0
      escapedIds.forEach(id => { if (!recentlyEscapedRef.current.has(id)) newDamage++ })
      recentlyEscapedRef.current = escapedIds
      const damage = newDamage
        if (damage > 0) {
          setLives(l => Math.max(0, l - damage))
          setSpellPower(p => Math.max(0, p - 20))
        }
        
        // Ta bort de som passerat
        const keep = moved.filter(m => (m.y + getMonsterSize(m.tier) / 2) <= H)
        return keep
      })
      lastPosUpdateRef.current = nowGlobal
    }

    // Partiklar
    setParticles(prev => prev
      .map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vx: pt.vx * 0.96, vy: pt.vy * 0.96, life: pt.life - 0.06 }))
      .filter(pt => pt.life > 0)
    )

    // Spawn monsters with scaling after 1000 score
    const spawnChance = score < 1000 ? 0.015 : Math.min(0.05, 0.015 + (score - 1000) / 5000)
    const maxMonsters = score < 1000 ? 4 : Math.min(8, 4 + Math.floor((score - 1000) / 500))
    if (Math.random() < spawnChance && monsters.length < maxMonsters && gameActive) {
      setMonsters(prev => [...prev, makeMonster()])
    }
  }, [gameActive, monsters.length, makeMonster, wandMode, wandTimeLeft, wandStartTime, score])

  useEffect(() => {
    if (gameActive) {
      loopRef.current = requestAnimationFrame(function raf() {
        loop()
        loopRef.current = requestAnimationFrame(raf)
      })
    }
    return () => { if (loopRef.current) cancelAnimationFrame(loopRef.current) }
  }, [gameActive, loop])

  // Auto-activate wand mode when charges are full and there are monsters
  useEffect(() => {
    if (!gameActive) return
    if (!wandMode && spellCharges >= maxSpellCharges && monsters.length > 0) {
      // defer to ensure state is settled
      setTimeout(() => castSpell(), 0)
    }
  }, [spellCharges, monsters.length, wandMode, gameActive, castSpell, maxSpellCharges])

  useEffect(() => {
    if (lives <= 0 && gameActive) {
      setGameActive(false)
      setGameOver(true)
      stopWandMusic()
      
      // Calculate final score and XP
      const finalScore = score
      const award = xpForFinalScore(finalScore)
      setAwardedPoints(award)
      setGameFinished(true)
      
      // CRITICAL: Call onScoreUpdate immediately when game ends (not when user clicks button)
      // This ensures XP is saved and indicator shows
      console.log('🎮 SpellCasting game ended - updating score immediately:', {
        finalScore,
        awardedPoints: award
      })
      
      // Send score to parent for immediate processing
      console.log('📊 SpellCasting calling onScoreUpdate:', {
        finalScore,
        award,
        gameType: 'spellslinger',
        expectedBehavior: 'Should trigger XP save and indicator'
      })
      onScoreUpdate(finalScore, award, 'spellslinger')
      
      // End game session with proper metrics
      const duration = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0
      const accuracyPct = 100 // Completed the game
      
      console.log('📊 SpellCasting calling endGameSession with:', {
        sessionId,
        gameType: 'spellslinger',
        metrics: {
          score: finalScore,
          durationSec: duration,
          accuracyPct: accuracyPct,
          details: { monstersDefeated: Math.floor(finalScore / 10), finalScore, award }
        }
      })
      
      void endGameSession(sessionId, 'spellslinger', {
        score: finalScore,
        durationSec: duration,
        accuracyPct: accuracyPct,
        details: { monstersDefeated: Math.floor(finalScore / 10), finalScore, awardedPoints: award }
      })
    }
  }, [lives, gameActive, score, stopWandMusic, onScoreUpdate, sessionId])

  // Start session when starting a game
  useEffect(() => {
    if (gameActive && !sessionId) {
      startedAtRef.current = Date.now()
      console.log('🎮 Spell Casting: Game started (session will be created server-side)')
      setSessionId(null)
    }
  }, [gameActive, sessionId, trackingContext])

  // Stop all audio when sound is toggled off
  useEffect(() => {
    if (!soundOn) stopWandMusic()
  }, [soundOn, stopWandMusic])

  // -------------------- UI helpers --------------------
  const LivesBar = () => (
    <div className="flex items-center gap-1 text-rose-500">
      {Array.from({ length: 10 }).map((_, i) => (
        <Heart key={i} className={`w-3 h-3 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-gray-300'}`} />
      ))}
      <span className={isQuizlet ? 'text-sm font-medium text-slate-700' : 'text-sm font-medium text-white/90'}>{lives}/10</span>
    </div>
  )

  const ChargeOrbs = () => (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxSpellCharges }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < spellCharges ? 'bg-blue-500' : 'bg-gray-300'}`} />
      ))}
    </div>
  )

  // -------------------- Monster SVG (size-driven) --------------------
  const MonsterSprite = ({ tier, alert, isDying, isFiring, isHit, size, wand }: { tier: number; alert: boolean; isDying: boolean; isFiring: boolean; isHit: boolean; size: number; wand: boolean }) => {
    const palettes = [
      { base: '#22C55E', shade: '#16A34A', highlight: '#4ADE80', eye: '#FEF3C7', horn: '#F3F4F6' }, // 1
      { base: '#3B82F6', shade: '#2563EB', highlight: '#60A5FA', eye: '#FEF3C7', horn: '#F3F4F6' }, // 2
      { base: '#F59E0B', shade: '#D97706', highlight: '#FBBF24', eye: '#FEF3C7', horn: '#F3F4F6' }, // 3
      { base: '#8B5CF6', shade: '#7C3AED', highlight: '#A78BFA', eye: '#FEF3C7', horn: '#F3F4F6' }, // 4
      { base: '#EF4444', shade: '#DC2626', highlight: '#F87171', eye: '#FEF3C7', horn: '#F3F4F6' }, // 5
      { base: '#06B6D4', shade: '#0891B2', highlight: '#22D3EE', eye: '#FEF3C7', horn: '#F3F4F6' }, // 6
      { base: '#EC4899', shade: '#DB2777', highlight: '#F472B6', eye: '#FEF3C7', horn: '#F3F4F6' }, // 7
      { base: '#84CC16', shade: '#65A30D', highlight: '#A3E635', eye: '#FEF3C7', horn: '#F3F4F6' }, // 8
      { base: '#6366F1', shade: '#4F46E5', highlight: '#818CF8', eye: '#FEF3C7', horn: '#F3F4F6' }, // 9
      { base: '#DC2626', shade: '#991B1B', highlight: '#FF6B6B', eye: '#FFD700', horn: '#FFD700' }, // 10
    ]
    const basePalette = palettes[(tier - 1) % palettes.length]
    // Strong visual switch in wand mode (Pac‑Man frightened style)
    const wandPalette = { base: '#2563EB', shade: '#1E40AF', highlight: '#60A5FA', eye: '#FFFFFF', horn: '#FFFFFF' }
    const p = wand ? wandPalette : basePalette
    const stroke = wand ? '#FFFFFF' : (isQuizlet ? '#1F2937' : 'rgba(255,255,255,0.6)')
    const pupil = wand ? '#111827' : (alert ? '#EF4444' : '#222')
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        aria-hidden
        animate={
          isDying ? { scale: [1, 1.2, 0], opacity: [1, 0.5, 0] } :
          isHit ? { x: [-2, 2, -2, 2, 0], y: [-1, 1, -1, 1, 0] } :
          wand ? { filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'], scale: [1, 1.04, 1] } :
          {}
        }
        transition={
          isDying ? { duration: 0.6, ease: 'easeInOut' } :
          isHit ? { duration: 0.2, ease: 'easeInOut' } :
          wand ? { duration: 2.0, ease: 'linear', repeat: Infinity } :
          {}
        }
      >
        <defs>
          <linearGradient id={`g-tier-${tier}-base`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.highlight} />
            <stop offset="100%" stopColor={p.base} />
          </linearGradient>
        </defs>

        {/* horns / ears */}
        {tier !== 2 && <path d="M8 14 L14 6 L16 16" fill={p.horn} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />}
        <path d="M40 16 L42 6 L48 14" fill={p.horn} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />

        {/* head/body */}
        <path d="M10 18 C10 10 20 6 28 6 C36 6 46 10 46 18 C50 22 50 28 48 34 C46 40 40 46 32 48 C24 50 14 46 10 38 C6 30 6 22 10 18 Z"
          fill={`url(#g-tier-${tier}-base)`} stroke={stroke} strokeWidth="1.2" />

        {/* eyes */}
        <g>
          <ellipse cx="22" cy="24" rx="4" ry="5" fill={p.eye} stroke={stroke} strokeWidth="0.8" />
          <ellipse cx="34" cy="24" rx="4" ry="5" fill={p.eye} stroke={stroke} strokeWidth="0.8" />
          
          {isHit ? (
            // Kryss över ögonen när träffad
            <>
              <path d="M19 21 L25 27 M25 21 L19 27" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              <path d="M31 21 L37 27 M37 21 L31 27" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            // Normala ögon
            <>
              <circle cx="23" cy="25" r="1.6" fill={pupil} />
              <circle cx="35" cy="25" r="1.6" fill={pupil} />
              <circle cx="22.5" cy="24.2" r="0.6" fill="#fff" />
              <circle cx="34.5" cy="24.2" r="0.6" fill="#fff" />
            </>
          )}
        </g>

        {/* nose + mouth */}
        <circle cx="28" cy="30" r="1.2" fill={wand ? '#0F172A' : '#222'} />
        <path d={wand ? "M20 34 L36 34" : "M20 34 Q28 36 36 34"} stroke={wand ? '#0F172A' : '#222'} strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Fire breath för tier 8+ */}
        {false && tier >= 8 && isFiring && !wand && (
          <motion.g animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2 }}>
            <ellipse cx="20" cy="32" rx="8" ry="4" fill="#FF4500" opacity="0.8" />
            <ellipse cx="16" cy="30" rx="6" ry="3" fill="#FF6500" opacity="0.9" />
            <ellipse cx="12" cy="28" rx="4" ry="2" fill="#FF8500" opacity="1" />
          </motion.g>
        )}
      </motion.svg>
    )
  }
  const MemoMonsterSprite = memo(MonsterSprite)

  // -------------------- Render --------------------
  const Background: React.FC<{ theme: ThemeId }> = ({ theme }) => {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-black/10" />
        {theme === 'castle' && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 opacity-90" style={{ background: 'repeating-linear-gradient(0deg, #f4f5f7 0px, #f4f5f7 22px, #eef0f3 22px, #eef0f3 44px)' }} />
            <div className="absolute inset-0 opacity-60" style={{ background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 46px, #e6e9ee 46px, #e6e9ee 48px)' }} />
            <motion.div className="absolute left-6 top-6 h-32 w-10 rounded-b-md" style={{ background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)' }} animate={{ y: [0, 2, 0] }} transition={{ duration: 2.6, repeat: Infinity }} />
            <motion.div className="absolute right-6 top-10 h-24 w-8 rounded-b-md" style={{ background: 'linear-gradient(180deg, #ef4444, #b91c1c)' }} animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
            <motion.div className="absolute left-8 bottom-10 w-16 h-16 rounded-full bg-orange-300/30 blur-xl" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1.8, repeat: Infinity }} />
            <motion.div className="absolute right-8 bottom-14 w-16 h-16 rounded-full bg-yellow-300/30 blur-xl" animate={{ opacity: [0.2, 0.55, 0.2] }} transition={{ duration: 2.1, repeat: Infinity }} />
          </div>
        )}
        {theme === 'jungle' && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-green-100 to-emerald-100" />
            <motion.div className="absolute left-8 top-0 w-1 h-40 bg-emerald-700/50 rounded-full" animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity }} />
            <motion.div className="absolute left-9 top-0 w-1 h-52 bg-emerald-600/40 rounded-full" animate={{ rotate: [2, -2, 2] }} transition={{ duration: 3.6, repeat: Infinity }} />
            <motion.div className="absolute -left-6 bottom-6 w-40 h-40 rounded-full bg-emerald-400/30 blur-xl" animate={{ x: [-2, 2, -2] }} transition={{ duration: 4, repeat: Infinity }} />
            <motion.div className="absolute right-0 top-12 w-48 h-48 rounded-full bg-lime-400/30 blur-xl" animate={{ x: [2, -2, 2] }} transition={{ duration: 4.4, repeat: Infinity }} />
          </div>
        )}
        {theme === 'desert' && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-amber-50 to-orange-50" />
            <div className="absolute inset-x-0 bottom-12 h-24" style={{ background: 'radial-gradient(100% 50% at 50% 100%, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%)' }} />
            <motion.div className="absolute inset-x-10 top-10 h-3 bg-amber-100/40 blur-md rounded" animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 2.8, repeat: Infinity }} />
          </div>
        )}
        {theme === 'arctic' && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-blue-50 to-cyan-50" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 60% at 20% 20%, rgba(59,130,246,0.10) 0%, transparent 60%)' }} />
            <motion.div className="absolute left-10 top-10 w-24 h-24 rounded-full bg-white/30 blur-xl" animate={{ y: [0, 6, 0] }} transition={{ duration: 3, repeat: Infinity }} />
            <motion.div className="absolute right-8 bottom-10 w-28 h-28 rounded-full bg-white/30 blur-xl" animate={{ y: [0, -6, 0] }} transition={{ duration: 3.4, repeat: Infinity }} />
          </div>
        )}
        {theme === 'arcane' && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-50 via-fuchsia-50 to-indigo-50" />
            <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fuchsia-400/40" style={{ width: 260, height: 260 }} animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-500/40" style={{ width: 340, height: 340 }} animate={{ rotate: -360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-violet-400/20 blur-2xl" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2.2, repeat: Infinity }} />
          </div>
        )}
        {/* removed white wash to increase pattern contrast */}
      </div>
    )
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BG */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {isQuizlet ? <div className="absolute inset-0 bg-slate-50" /> : <div className="absolute -inset-40 opacity-60" style={{
          background: `radial-gradient(60% 60% at 20% 20%, ${tc}33 0%, transparent 60%), radial-gradient(50% 50% at 80% 30%, #22c55e22 0%, transparent 60%)`
        }} />}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: DUR_IN, ease: EASE } }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={isQuizlet
          ? 'relative w-full max-w-5xl h-[720px] mx-4 rounded-2xl p-4 sm:p-6 bg-white ring-1 ring-slate-200 shadow-xl overflow-hidden'
          : 'relative w-full max-w-6xl h-[760px] mx-4 rounded-3xl p-4 sm:p-6 bg-black/40 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_120px_-20px_rgba(0,0,0,0.6)] overflow-hidden'}
      >
        {/* Close */}
        <button
          onClick={() => { setGameActive(false); onClose() }}
          className="absolute top-4 right-4 z-50 rounded-full p-3 bg-red-500 text-white hover:bg-red-600 shadow-lg transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* HUD */}
        <div className="absolute top-4 left-4 right-16 z-20">
          <div className={isQuizlet ? 'flex items-center justify-between gap-4 px-4 py-2 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm'
                                    : 'flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-white/5 ring-1 ring-white/10'}>
            <div className="flex items-center gap-6">
              <div className={isQuizlet ? 'flex items-center gap-2 text-slate-900' : 'flex items-center gap-2 text-white'}>
                <Star className={isQuizlet ? 'w-5 h-5 text-amber-500' : 'w-5 h-5 text-yellow-300'} />
                <span className="font-semibold tabular-nums">{score.toLocaleString()}</span>
              </div>
              <div className={isQuizlet ? 'flex items-center gap-2 text-slate-900' : 'flex items-center gap-2 text-white'}>
                <Wand2 className="w-5 h-5" />
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxSpellCharges }).map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < spellCharges ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  ))}
                </div>
              </div>
              <div className={isQuizlet ? 'flex items-center gap-2 text-slate-900' : 'flex items-center gap-2 text-white'}>
                <Heart className={isQuizlet ? 'w-5 h-5 text-rose-500' : 'w-5 h-5 text-rose-400'} />
                <div className="flex items-center gap-1 text-rose-500">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Heart key={i} className={`w-3 h-3 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-gray-300'}`} />
                  ))}
                  <span className={isQuizlet ? 'text-sm font-medium text-slate-700' : 'text-sm font-medium text-white/90'}>{lives}/10</span>
                </div>
            {/* Sound toggle */}
            <button onClick={() => setSoundOn(s => !s)} className={isQuizlet ? 'text-xs px-2 py-1 rounded bg-slate-100 ring-1 ring-slate-200' : 'text-xs px-2 py-1 rounded bg-white/10 ring-1 ring-white/20 text-white'}>
              {soundOn ? 'Sound: On' : 'Sound: Off'}
            </button>
              </div>
            </div>

            {isQuizlet ? (
              <div className="w-40 h-2 bg-slate-200 rounded">
                <div className="h-2 rounded" style={{ width: `${spellPower}%`, backgroundColor: tc }} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Game Area */}
        <div
          ref={gameAreaRef}
          className={isQuizlet
            ? 'absolute top-24 bottom-24 left-4 right-4 rounded-xl bg-white ring-1 ring-slate-200'
            : 'absolute top-28 bottom-28 left-4 right-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.02] ring-1 ring-white/10'}
        >
          {/* Warning Zone - yellow area showing monsters getting close to losing life */}
          <div
            className="absolute left-0 right-0 z-0 pointer-events-none"
            style={{ bottom: '0px', height: '120px' }}
          >
            <motion.div
              className="absolute inset-x-0 h-full bg-gradient-to-t from-yellow-500/30 via-orange-500/20 to-transparent"
            />
          </div>

          {/* Danger Zone - visible line showing where monsters cause life loss */}
          <div
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ bottom: '0px' }}
          >
            {/* Animated danger zone line with glow effect - made much more visible */}
            <motion.div
              className="absolute inset-x-0 h-3 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"
              style={{
                filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.9))',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)'
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)',
                  '0 0 30px rgba(239, 68, 68, 1), 0 0 50px rgba(239, 68, 68, 0.8), 0 4px 8px rgba(0, 0, 0, 0.3)',
                  '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)'
                ]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            
            {/* Danger zone warning text */}
            {gameActive && monsters.length > 0 && (
              <motion.div
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-red-600/95 backdrop-blur-sm border-2 border-red-400"
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.7))',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.6)'
                }}
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="text-sm font-bold text-white">⚠️ DANGER ZONE</span>
              </motion.div>
            )}
          </div>
          {/* Word Grid */}
          <div className="absolute inset-0 grid place-items-center p-6 pointer-events-none">
            <div className="flex flex-wrap justify-center items-center gap-4">
              <AnimatePresence mode="popLayout">
                {chips.map((w) => {
                  const isClicked = clickedWordId === w.id
                  const isCorrect = w.text === currentTarget
                  const len = w.text.length
                  const minWidth = len < 8 ? '140px' : len < 12 ? '170px' : len < 16 ? '200px' : '240px'

                  return (
                    <motion.button
                      key={w.id}
                      onClick={(e) => onChipClick(w, e)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: isClicked ? 1.05 : 1, transition: { duration: 0.15, ease: EASE } }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12, ease: 'easeIn' } }}
                      style={{ minWidth }}
                      className={[
                        'px-4 py-4 rounded-xl text-center transition-all duration-200 will-change-transform pointer-events-auto',
                        'border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5',
                        'font-semibold text-base leading-tight h-16',
                        isClicked
                          ? (isCorrect ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600')
                          : (isQuizlet ? 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                       : 'bg-white/90 text-gray-900 border-white/40 hover:border-white/60 hover:bg-white')
                      ].join(' ')}
                    >
                      <div className="px-2">{w.text}</div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Unleash button removed: wand mode auto-activates when charges are full */}

          {/* Target word */}
          {gameActive && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center">
              <div className={isQuizlet ? 'text-slate-600 text-sm mb-2' : 'text-white/90 text-sm mb-2'}>Find the English word for</div>
              <div className={isQuizlet ? 'text-xl font-bold text-slate-900 bg-white px-6 py-3 rounded-lg ring-1 ring-slate-200 shadow-sm'
                                         : 'text-2xl font-extrabold text-yellow-300 bg-black/40 px-6 py-3 rounded-xl ring-1 ring-white/10 shadow-lg'}>
                {translations[currentTarget] || currentTarget || '—'}
              </div>
            </div>
          )}

          {/* Monsters */}
          <AnimatePresence>
            {monsters.map(m => {
              const isDying = dyingMonsters.has(m.id)
              const size = getMonsterSize(m.tier)
              const container = size + 24 // padding för HP/skugga

              return (
                <motion.div
                  key={m.id}
                  className={`absolute z-20 ${wandMode ? 'cursor-pointer' : ''}`}
                  style={{
                    left: 0,
                    top: 0,
                    width: `${container}px`,
                    height: `${container}px`,
                    pointerEvents: wandMode ? 'auto' : 'none',
                    touchAction: 'none',
                    willChange: 'transform',
                    x: m.x - container / 2,
                    y: m.y - container / 2,
                  }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onClick={wandMode ? () => onMonsterClick(m) : undefined}
                  onPointerDown={wandMode ? () => onMonsterClick(m) : undefined}
                >
                  {/* skugga */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-black/10 blur-sm" />

                  {/* sprite */}
                  <div className="absolute inset-0 grid place-items-center">
                    <MemoMonsterSprite
                      tier={m.tier}
                      alert={m.mood === 'alert'}
                      isDying={isDying}
                      isFiring={m.tier >= 8 && !!m.isFiring}
                      isHit={!!m.isHit}
                      size={size}
                      wand={wandMode}
                    />
                  </div>

                  {/* HP */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-1 bg-slate-200 rounded">
                    <div className="h-1 bg-blue-500 rounded transition-all" style={{ width: `${(m.health / m.maxHealth) * 100}%` }} />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Particles */}
          <AnimatePresence>
            {particles.map(p => (
              <motion.div
                key={p.id}
                className="absolute rounded-full z-30"
                style={{ left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: p.color }}
                initial={{ opacity: 1, scale: 1, rotate: 0 }}
                animate={{ opacity: p.life, scale: 1 + (1 - p.life) * 0.8, rotate: (1 - p.life) * 90 }}
                exit={{ opacity: 0, scale: 0 }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Panel */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          {!gameActive && !gameOver && (
            <div className="text-center">
              <button
                onClick={start}
                className={isQuizlet
                  ? 'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-blue-500 hover:bg-blue-600 shadow-sm'
                  : 'inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.7)] ring-1 ring-white/10'}
              >
                <Sparkles className="w-5 h-5" /> Start Spell Slinger
              </button>
            </div>
          )}

          {gameActive && (
            <div className="flex flex-col items-center gap-2">
              {/* bottom retain wand status only */}
              {wandMode && (
                <div className={isQuizlet
                  ? 'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-purple-500 shadow-sm'
                  : 'inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-purple-900 bg-purple-300 ring-1 ring-purple-200 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.7)]'}>
                  <Wand2 className="w-4 h-4" /> Wand Mode: {Math.ceil(wandTimeLeft)}s
                </div>
              )}
            </div>
          )}

          {gameFinished && (
            <UniversalGameCompleteModal
              score={awardedPoints}
              pointsAwarded={awardedPoints}
              gameType="spellcasting"
              accuracy={100} // Spell casting is always 100% if completed
              time={`${Math.floor((startedAtRef.current ? (Date.now() - startedAtRef.current) : 0) / 1000 / 60)}:${String(Math.floor((startedAtRef.current ? (Date.now() - startedAtRef.current) : 0) / 1000) % 60).padStart(2, '0')}`}
              details={{
                correctAnswers: Math.floor(score / 10), // Approximate
                totalQuestions: Math.floor(score / 10),
                wordCount: Math.floor(score / 10)
              }}
              onPlayAgain={() => { setGameFinished(false); start() }}
              onBackToDashboard={() => {
                // NOTE: Score already updated when game ended (in useEffect)
                // Just close the modal and return to dashboard
                console.log('📊 SpellCasting: Returning to dashboard (score already saved)')
                
                setGameFinished(false)
                setGameOver(true)
                onClose() // Close the game and return to dashboard
              }}
              themeColor={themeColor}
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}
