'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  dot?: string  // CSS color string for a colored dot indicator
  initials?: string  // short text for an avatar circle
  avatarColor?: string  // bg color for the initials circle
}

interface FilterSelectProps {
  options: FilterOption[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export function FilterSelect({ options, value, onChange, className }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value) ?? options[0]

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-rule bg-white px-2.5 text-sm text-ink shadow-sm hover:border-[rgb(11_18_32/22%)] transition-colors focus:outline-none focus:ring-2 focus:ring-action/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {selected.dot && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: selected.dot }} />
          )}
          {selected.initials && (
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
              style={{ background: selected.avatarColor ?? '#6366f1' }}
            >
              {selected.initials}
            </span>
          )}
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDown className={cn(
          'h-3.5 w-3.5 shrink-0 text-[rgb(11_18_32/35%)] transition-transform duration-150',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-full rounded-xl border border-[rgb(11_18_32/10%)] bg-white shadow-lg overflow-hidden">
          <div className="p-1">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                  opt.value === value
                    ? 'bg-[rgb(11_18_32/6%)] text-ink font-medium'
                    : 'text-[rgb(11_18_32/70%)] hover:bg-[rgb(11_18_32/4%)] hover:text-ink'
                )}
              >
                {opt.dot && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: opt.dot }} />
                )}
                {opt.initials && (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: opt.avatarColor ?? '#6366f1' }}
                  >
                    {opt.initials}
                  </span>
                )}
                <span className="flex-1 text-left truncate">{opt.label}</span>
                {opt.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-action" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
