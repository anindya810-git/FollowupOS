interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  trend?: { value: number; label: string }
  accent?: boolean
}

export function StatCard({ label, value, sublabel, trend, accent }: StatCardProps) {
  const trendPositive = trend && trend.value >= 0
  const trendColor = trendPositive ? '#1A8F5E' : '#F25A3C'

  return (
    <div className="bg-card border border-rule rounded-lg p-6">
      <p
        className="text-[11px] font-medium tracking-[0.14em] uppercase text-mute mb-3"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
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
