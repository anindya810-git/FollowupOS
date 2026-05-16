interface LogoMarkProps {
  className?: string
  variant?: 'default' | 'reversed' | 'white'
}

export function LogoMark({ className, variant = 'default' }: LogoMarkProps) {
  const lineColor = variant === 'white' ? '#FFFFFF' : '#0B1220'
  const lineOpacity = variant === 'white' ? '0.55' : '0.45'

  return (
    <svg viewBox="0 0 56 56" fill="none" className={className} aria-label="Pendingly">
      <path
        d="M8 16 L18 26 L42 6"
        stroke="#F25A3C"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8" y="29" width="40" height="5" rx="2.5" fill={lineColor} />
      <rect x="8" y="40" width="28" height="5" rx="2.5" fill={lineColor} opacity={lineOpacity} />
    </svg>
  )
}

export function LogoLockup({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: { mark: 'h-5 w-5', text: 'text-lg' }, md: { mark: 'h-6 w-6', text: 'text-xl' }, lg: { mark: 'h-8 w-8', text: 'text-2xl' } }
  const s = sizes[size]
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark className={s.mark} />
      <span className={`${s.text} font-semibold tracking-[-0.028em] leading-none`}>Pendingly</span>
    </div>
  )
}
