import { Info } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  trend?: { value: number; label: string }
  accent?: boolean
  info?: string
}

export function StatCard({ label, value, sublabel, trend, accent, info }: StatCardProps) {
  const trendPositive = trend && trend.value >= 0
  const trendColor = trendPositive ? '#1A8F5E' : '#F25A3C'

  return (
    <div className="bg-card border border-rule rounded-lg p-6">
      <p
        className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-3 flex items-center gap-1.5"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
        {info && (
          <span className="relative inline-flex group align-middle normal-case tracking-normal">
            <Info className="h-3 w-3 text-mute cursor-help" />
            <span className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 w-52 rounded-md bg-ink text-white text-[11px] font-normal leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
              {info}
            </span>
          </span>
        )}
      </p>
      <p
        className={`text-3xl font-semibold tracking-tight ${accent ? 'text-action' : 'text-ink'}`}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-mute mt-1">{sublabel}</p>
      )}
      {trend && (
        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: trendColor }}>
          <span>{trendPositive ? '↑' : '↓'}</span>
          <span className="font-medium">{Math.abs(trend.value)}%</span>
          <span className="text-mute">{trend.label}</span>
        </p>
      )}
    </div>
  )
}
