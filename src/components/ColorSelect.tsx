'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

export type ColorOption = { value: string; label: string }

interface ColorSelectProps {
  value?: string
  onChange: (value: string) => void
  options: ColorOption[]
  placeholder?: string
  className?: string
}

export default function ColorSelect({ value, onChange, options, placeholder = 'Choose color', className = '' }: ColorSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 hover:border-gray-400 flex items-center gap-2 w-fit shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `Color selected` : placeholder}
        title={selected ? `Color selected` : placeholder}
      >
        <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: selected?.value || 'transparent' }}></span>
        <span className="text-sm text-gray-600">{selected?.label || placeholder}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-fit rounded-lg border border-gray-200 bg-white text-gray-800 shadow-lg p-3"
        >
          <div className="flex items-center gap-2">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-8 h-8 rounded-full border ${opt.value === value ? 'border-gray-400 ring-2 ring-indigo-500' : 'border-gray-300'} hover:ring-2 hover:ring-indigo-300 transition-all`}
                title={opt.label}
                aria-label={opt.label}
                style={{ backgroundColor: opt.value }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


