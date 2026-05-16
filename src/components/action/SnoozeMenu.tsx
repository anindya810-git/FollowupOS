'use client'
import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface SnoozeOption { label: string; getValue: () => string }

function nextWeekday(targetDay: number, hour: number): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  const currentDay = d.getDay()
  let daysUntil = (targetDay - currentDay + 7) % 7
  if (daysUntil === 0 && d.getTime() < Date.now()) daysUntil = 7
  d.setDate(d.getDate() + daysUntil)
  return d.toISOString().split('T')[0]
}

const OPTIONS: SnoozeOption[] = [
  { label: 'Later today (3pm)', getValue: () => {
    const d = new Date(); d.setHours(15, 0, 0, 0)
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }},
  { label: 'Tomorrow 9am', getValue: () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0)
    return d.toISOString().split('T')[0]
  }},
  { label: 'This weekend (Sat)', getValue: () => nextWeekday(6, 9) },
  { label: 'Next Monday', getValue: () => nextWeekday(1, 9) },
  { label: 'Next week', getValue: () => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }},
  { label: '2 weeks', getValue: () => {
    const d = new Date(); d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  }},
]

export function SnoozeMenu({ onSelect, children }: { onSelect: (snoozedUntil: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>{children}</div>
      {open && (
        <div className="absolute z-30 left-0 mt-1 w-48 bg-white border border-rule rounded-lg shadow-lg py-1 animate-fade-up">
          {OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={(e) => { e.stopPropagation(); onSelect(opt.getValue()); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-paper-2 transition-colors flex items-center gap-2"
            >
              <Clock className="h-3 w-3 text-mute" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
