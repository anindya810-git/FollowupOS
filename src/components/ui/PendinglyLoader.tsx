interface PendinglyLoaderProps {
  size?: number
  variant?: 'light' | 'dark'
  label?: string
  sublabel?: string
  className?: string
}

export function PendinglyLoader({
  size = 80,
  variant = 'light',
  label,
  sublabel,
  className = '',
}: PendinglyLoaderProps) {
  const rowFill = variant === 'dark' ? '#F6F2EA' : '#0B1220'

  return (
    <div className={`flex flex-col items-center gap-5 ${className}`}>
      <div role="status" aria-label={label ?? 'Loading'} style={{ width: size, height: size }}>
        <svg viewBox="0 0 56 56" fill="none" width={size} height={size} aria-hidden="true">
          <path
            className="pndl-check"
            d="M8 16 L18 26 L42 6"
            stroke="#F25A3C"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect className="pndl-row-1" x="8" y="29" width="40" height="5" rx="2.5" fill={rowFill} />
          <rect className="pndl-row-2" x="8" y="40" width="40" height="5" rx="2.5" fill={rowFill} />
        </svg>
      </div>
      {label && (
        <div className="text-center space-y-1">
          <p className={`text-base font-semibold ${variant === 'dark' ? 'text-white' : 'text-ink'}`}>{label}</p>
          {sublabel && (
            <p className={`text-sm ${variant === 'dark' ? 'text-[#B9BFCB]' : 'text-[rgb(11_18_32/55%)]'}`}>{sublabel}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function PendinglyLoaderPage({
  variant = 'light',
  label = 'Loading…',
  sublabel,
}: {
  variant?: 'light' | 'dark'
  label?: string
  sublabel?: string
}) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${variant === 'dark' ? 'bg-ink' : 'bg-paper'}`}>
      <PendinglyLoader size={96} variant={variant} label={label} sublabel={sublabel} />
    </div>
  )
}
