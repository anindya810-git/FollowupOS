'use client'
import { useEffect, useState } from 'react'

interface BarChartProps {
  data: Array<{ label: string; value: number; sublabel?: string }>
  maxValue?: number
  color?: string
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function BarChart({ data, maxValue, color = '#F25A3C' }: BarChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Small delay to trigger CSS transition from 0 to actual width
    const id = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(id)
  }, [])

  if (!data || data.length === 0) {
    return <p className="text-mute text-sm py-4">No data</p>
  }

  const max = maxValue ?? Math.max(...data.map(d => d.value), 1)

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-ink">{formatLabel(item.label)}</span>
              <div className="flex items-center gap-2">
                {item.sublabel && (
                  <span className="text-xs text-mute">{item.sublabel}</span>
                )}
                <span className="text-sm font-semibold text-ink tabular-nums">
                  {item.value}
                </span>
              </div>
            </div>
            <div className="h-2 bg-rule rounded-full overflow-hidden">
              <div
                className="h-full rounded-r-full transition-all duration-700 ease-out"
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  backgroundColor: color,
                  transitionDelay: `${i * 60}ms`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
