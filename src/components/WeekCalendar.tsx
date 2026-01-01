'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface WeekCalendarProps {
  selectedDate: string | null
  onDateSelect: (date: string) => void
  onClear: () => void
}

export default function WeekCalendar({ selectedDate, onDateSelect, onClear }: WeekCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    return startOfWeek
  })

  const getWeekDates = () => {
    const dates: Date[] = []
    const start = new Date(currentWeek)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newWeek)
  }

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newWeek)
  }

  const goToToday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    setCurrentWeek(startOfWeek)
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const formatDayNumber = (date: Date) => {
    return date.getDate().toString()
  }

  const formatMonthYear = () => {
    return currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate < today
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return formatDate(date) === selectedDate
  }

  const weekDates = getWeekDates()
  const today = new Date()

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Select Due Date</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPreviousWeek}
            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={goToNextWeek}
            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-white">{formatMonthYear()}</p>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDates.map((date, index) => {
          const dateStr = formatDate(date)
          const isPastDate = isPast(date)
          const isTodayDate = isToday(date)
          const isSelectedDate = isSelected(date)

          return (
            <button
              key={index}
              onClick={() => onDateSelect(dateStr)}
              className={`
                relative p-3 rounded-xl border transition-all
                ${isSelectedDate
                  ? 'bg-orange-500/20 border-orange-500/50 text-white'
                  : isPastDate
                  ? 'bg-white/5 border-white/10 text-gray-500 opacity-60'
                  : isTodayDate
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                }
              `}
            >
              <div className="text-xs font-medium mb-1 text-gray-400">{formatDayName(date)}</div>
              <div className={`text-lg font-bold ${isSelectedDate ? 'text-orange-400' : ''}`}>
                {formatDayNumber(date)}
              </div>
              {isTodayDate && !isSelectedDate && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <p className="text-sm text-gray-400">Selected:</p>
            <p className="text-white font-medium">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

