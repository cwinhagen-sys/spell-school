'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Zap, ArrowRight, Lock } from 'lucide-react'
import Link from 'next/link'

interface PaymentWallModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  currentLimit: number | null
  upgradeTier: 'premium' | 'pro'
  upgradeMessage: string
}

export default function PaymentWallModal({
  isOpen,
  onClose,
  feature,
  currentLimit,
  upgradeTier,
  upgradeMessage,
}: PaymentWallModalProps) {
  if (!isOpen) return null

  const tierInfo = {
    premium: {
      name: 'Premium',
      icon: Zap,
      color: 'from-cyan-500 to-blue-600',
      price: '79 SEK/month',
    },
    pro: {
      name: 'Pro',
      icon: Crown,
      color: 'from-amber-500 to-orange-600',
      price: '129 SEK/month',
    },
  }

  const tier = tierInfo[upgradeTier]
  const Icon = tier.icon

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md"
          >
            <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl" />
            <div className="relative bg-[#12122a] border border-white/10 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center`}>
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Upgrade Required</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  {upgradeMessage}
                </p>
                {currentLimit !== null && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                    <p className="text-sm text-amber-300">
                      <strong>Current limit:</strong> {currentLimit} {feature}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    <p className="text-sm text-gray-400">{tier.price}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors font-medium"
                >
                  Cancel
                </button>
                <Link
                  href="/teacher/account"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all flex items-center justify-center gap-2"
                >
                  Upgrade Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


