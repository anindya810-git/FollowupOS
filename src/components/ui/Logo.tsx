export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" fill="none" className={className}>
      {/* Tick/checkmark */}
      <path d="M4 12 L12 20 L28 4" stroke="#F25A3C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Two lines below */}
      <line x1="4" y1="25" x2="20" y2="25" stroke="#F25A3C" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="4" y1="25" x2="14" y2="25" stroke="rgb(11 18 32 / 30%)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
