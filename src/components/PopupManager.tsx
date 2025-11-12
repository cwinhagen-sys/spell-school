'use client'

import { useEffect } from 'react'
import { usePopupQueue, type PopupType } from '@/hooks/usePopupQueue'
import LevelUpModal from './LevelUpModal'
import StreakMilestoneAnimation from './StreakMilestoneAnimation'
import BadgeNotification from './BadgeNotification'

interface PopupManagerProps {
  // Callbacks to integrate with existing state
  onLevelUpClose?: () => void
  onStreakClose?: () => void
  onBadgeClose?: () => void
}

export default function PopupManager({
  onLevelUpClose,
  onStreakClose,
  onBadgeClose
}: PopupManagerProps) {
  const { currentPopup, isShowing, dismissCurrent } = usePopupQueue()

  // Handle dismiss with callbacks
  const handleDismiss = () => {
    if (!currentPopup) return

    switch (currentPopup.type) {
      case 'level_up':
        onLevelUpClose?.()
        break
      case 'streak':
        onStreakClose?.()
        break
      case 'badge':
        onBadgeClose?.()
        break
    }

    dismissCurrent()
  }

  if (!isShowing || !currentPopup) {
    return null
  }

  // Render appropriate popup based on type
  switch (currentPopup.type) {
    case 'level_up':
      return (
        <LevelUpModal
          level={currentPopup.data.level}
          title={currentPopup.data.title}
          image={currentPopup.data.image}
          description={currentPopup.data.description}
          onClose={handleDismiss}
        />
      )

    case 'streak':
      return (
        <StreakMilestoneAnimation
          streak={currentPopup.data.streak}
          show={true}
          onDismiss={handleDismiss}
        />
      )

    case 'badge':
      return (
        <BadgeNotification
          badge={currentPopup.data}
          onClose={handleDismiss}
          duration={3000}
        />
      )

    case 'bonus':
      // Could add bonus quest notification here
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-8 py-4 rounded-2xl shadow-2xl pointer-events-auto cursor-pointer"
            onClick={handleDismiss}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-xl font-bold">All Quests Complete!</div>
              <div className="text-lg">+{currentPopup.data.xp} Bonus XP</div>
            </div>
          </div>
        </div>
      )

    default:
      return null
  }
}

// Export hook for external use
export { usePopupQueue }

















