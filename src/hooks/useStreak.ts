'use client'

import { useState, useEffect } from 'react'

export function useStreak() {
  const [currentStreak, setCurrentStreak] = useState(0)
  const [lastPlayDate, setLastPlayDate] = useState<string | null>(null)

  // Load streak data from localStorage
  const loadStreakData = () => {
    try {
      const storedStreak = localStorage.getItem('currentStreak')
      const storedLastPlay = localStorage.getItem('lastPlayDate')
      
      if (storedStreak) {
        setCurrentStreak(parseInt(storedStreak))
      }
      
      if (storedLastPlay) {
        setLastPlayDate(storedLastPlay)
      }
    } catch (err) {
      console.error('Error loading streak data:', err)
    }
  }

  // Update streak when user plays
  const updateStreak = () => {
    try {
      const today = new Date().toDateString()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toDateString()

      let newStreak = currentStreak

      if (!lastPlayDate) {
        // First time playing
        newStreak = 1
      } else if (lastPlayDate === today) {
        // Already played today, no change
        return
      } else if (lastPlayDate === yesterdayString) {
        // Played yesterday, continue streak
        newStreak = currentStreak + 1
      } else {
        // Streak broken, reset to 1
        newStreak = 1
      }

      setCurrentStreak(newStreak)
      setLastPlayDate(today)
      
      localStorage.setItem('currentStreak', newStreak.toString())
      localStorage.setItem('lastPlayDate', today)
    } catch (err) {
      console.error('Error updating streak:', err)
    }
  }

  // Check if streak is still valid (not broken by missing days)
  const validateStreak = () => {
    try {
      if (!lastPlayDate) return

      const lastPlay = new Date(lastPlayDate)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      // If last play was more than 1 day ago, reset streak
      if (lastPlay.toDateString() !== today.toDateString() && 
          lastPlay.toDateString() !== yesterday.toDateString()) {
        setCurrentStreak(0)
        localStorage.setItem('currentStreak', '0')
      }
    } catch (err) {
      console.error('Error validating streak:', err)
    }
  }

  useEffect(() => {
    loadStreakData()
    validateStreak()
  }, [])

  return {
    currentStreak,
    lastPlayDate,
    updateStreak,
    validateStreak
  }
}


