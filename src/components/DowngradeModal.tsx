'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Users, BookOpen, CheckCircle2, Circle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TIER_LIMITS } from '@/lib/subscription'

interface Class {
  id: string
  name: string
  studentCount: number
}

interface WordSet {
  id: string
  title: string
}

interface DowngradeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (classesToKeep: string[], wordSetsToKeep: string[]) => Promise<void>
  classes: Class[]
  wordSets: WordSet[]
  totalStudents: number
}

export default function DowngradeModal({
  isOpen,
  onClose,
  onConfirm,
  classes,
  wordSets,
  totalStudents
}: DowngradeModalProps) {
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectedWordSets, setSelectedWordSets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const freeLimits = TIER_LIMITS.free
  const maxClasses = freeLimits.maxClasses || 1
  const maxWordSets = freeLimits.maxWordSets || 5
  const maxStudents = freeLimits.maxTotalStudents || 30

  // Initialize selections - keep first N items by default
  useEffect(() => {
    if (isOpen) {
      const defaultClasses = new Set(classes.slice(0, maxClasses).map(c => c.id))
      const defaultWordSets = new Set(wordSets.slice(0, maxWordSets).map(ws => ws.id))
      setSelectedClasses(defaultClasses)
      setSelectedWordSets(defaultWordSets)
      setError(null)
    }
  }, [isOpen, classes, wordSets, maxClasses, maxWordSets])

  const handleClassToggle = (classId: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(classId)) {
      newSelected.delete(classId)
    } else {
      if (newSelected.size < maxClasses) {
        newSelected.add(classId)
      } else {
        setError(`Du kan bara behålla ${maxClasses} ${maxClasses === 1 ? 'klass' : 'klasser'} med Free-planen`)
        return
      }
    }
    setSelectedClasses(newSelected)
    setError(null)
  }

  const handleWordSetToggle = (wordSetId: string) => {
    const newSelected = new Set(selectedWordSets)
    if (newSelected.has(wordSetId)) {
      newSelected.delete(wordSetId)
    } else {
      if (newSelected.size < maxWordSets) {
        newSelected.add(wordSetId)
      } else {
        setError(`Du kan bara behålla ${maxWordSets} ordlistor med Free-planen`)
        return
      }
    }
    setSelectedWordSets(newSelected)
    setError(null)
  }

  const handleConfirm = async () => {
    // Check total students
    const selectedClassIds = Array.from(selectedClasses)
    const selectedClassesData = classes.filter(c => selectedClassIds.includes(c.id))
    const totalStudentsInSelected = selectedClassesData.reduce((sum, c) => sum + c.studentCount, 0)

    if (totalStudentsInSelected > maxStudents) {
      setError(`De valda klasserna har totalt ${totalStudentsInSelected} elever, men Free-planen tillåter max ${maxStudents} elever. Välj färre klasser eller ta bort elever.`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onConfirm(Array.from(selectedClasses), Array.from(selectedWordSets))
      onClose()
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod vid nedgradering')
    } finally {
      setLoading(false)
    }
  }

  const classesToDelete = classes.length - selectedClasses.size
  const wordSetsToDelete = wordSets.length - selectedWordSets.size

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#12122a] rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nedgradera till Free-planen</h2>
                <p className="text-sm text-gray-400">Välj vilka klasser och ordlistor som ska behållas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-200">
                Free-planen tillåter: <strong>{maxClasses} {maxClasses === 1 ? 'klass' : 'klasser'}</strong>, <strong>{maxWordSets} ordlistor</strong>, och <strong>{maxStudents} elever totalt</strong>.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Classes Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Klasser ({selectedClasses.size}/{maxClasses} valda)
                </h3>
                {classesToDelete > 0 && (
                  <span className="text-sm text-red-400">
                    {classesToDelete} {classesToDelete === 1 ? 'klass kommer att tas bort' : 'klasser kommer att tas bort'}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {classes.map((cls) => {
                  const isSelected = selectedClasses.has(cls.id)
                  const canSelect = isSelected || selectedClasses.size < maxClasses
                  return (
                    <button
                      key={cls.id}
                      onClick={() => canSelect && handleClassToggle(cls.id)}
                      disabled={!canSelect}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : canSelect
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-500" />
                          )}
                          <div>
                            <p className="font-medium text-white">{cls.name}</p>
                            <p className="text-xs text-gray-400">{cls.studentCount} {cls.studentCount === 1 ? 'elev' : 'elever'}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Word Sets Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  Ordlistor ({selectedWordSets.size}/{maxWordSets} valda)
                </h3>
                {wordSetsToDelete > 0 && (
                  <span className="text-sm text-red-400">
                    {wordSetsToDelete} {wordSetsToDelete === 1 ? 'ordlista kommer att tas bort' : 'ordlistor kommer att tas bort'}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {wordSets.map((ws) => {
                  const isSelected = selectedWordSets.has(ws.id)
                  const canSelect = isSelected || selectedWordSets.size < maxWordSets
                  return (
                    <button
                      key={ws.id}
                      onClick={() => canSelect && handleWordSetToggle(ws.id)}
                      disabled={!canSelect}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/50'
                          : canSelect
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-amber-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-500" />
                          )}
                          <p className="font-medium text-white">{ws.title}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || selectedClasses.size === 0 || selectedWordSets.size === 0}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Bearbetar...' : 'Bekräfta nedgradering'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}









