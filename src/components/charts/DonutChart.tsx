'use client'

interface DonutChartProps {
  segments: Array<{ label: string; value: number; color: string }>
  size?: number
}

function formatLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function DonutChart({ segments, size = 140 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          className="rounded-full border-4 border-rule flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-mute text-sm">0</span>
        </div>
        <p className="text-mute text-sm">No open items</p>
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const innerR = outerR * 0.62
  const circumference = 2 * Math.PI * outerR

  // Build segments
  let offset = 0
  const svgSegments = segments
    .filter(s => s.value > 0)
    .map(seg => {
      const ratio = seg.value / total
      const dash = ratio * circumference
      const gap = circumference - dash
      const startOffset = circumference - offset * circumference
      offset += ratio
      return { ...seg, dash, gap, strokeDashoffset: startOffset }
    })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke="#E4DED2"
            strokeWidth={outerR - innerR}
          />
          {/* Segments */}
          {svgSegments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={outerR}
              fill="none"
              stroke={seg.color}
              strokeWidth={outerR - innerR}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={seg.strokeDashoffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}
        </svg>
        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="text-2xl font-semibold text-ink tracking-tight">{total}</span>
          <span className="text-[10px] text-mute uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
            open
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-ink">{formatLabel(seg.label)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink tabular-nums">{seg.value}</span>
              <span className="text-[10px] text-mute tabular-nums">
                {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
