// Brand logos for connector integrations. Kept as inline SVG so they render
// crisply at any size and don't depend on external assets.

export function GoogleMeetLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87 72" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z" />
      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z" />
      <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z" />
      <path fill="#2684fc" d="M0 20.5h20.5v31H0z" />
      <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.32zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08L49.5 36z" />
      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z" />
    </svg>
  )
}

export function MicrosoftTeamsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle fill="#5059C9" cx="37.7" cy="11.3" r="4.3" />
      <path fill="#5059C9" d="M31.6 18.5h10.6c1 0 1.8.8 1.8 1.8v9.4c0 3.8-3.1 6.9-6.9 6.9s-6.9-3.1-6.9-6.9V19.3c0-.45.35-.8.8-.8z" />
      <circle fill="#7B83EB" cx="23.7" cy="9.5" r="6.3" />
      <path fill="#7B83EB" d="M31 18.5H15c-1 .25-1.7.95-1.78 1.85v11c-.14 5.95 4.56 10.88 10.5 11.02 5.95-.14 10.65-5.07 10.5-11.02V20.35c-.08-.9-.78-1.6-1.78-1.85z" />
      <rect fill="#4B53BC" x="3.5" y="12.5" width="21" height="21" rx="2.5" />
      <path fill="#fff" d="M19.4 18.85h-3.6V29h-2.4V18.85H9.9v-2.2h9.5z" />
    </svg>
  )
}

export function ZoomLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#2D8CFF" />
      <path fill="#fff" d="M11 19a3 3 0 013-3h11a3 3 0 013 3v10a3 3 0 01-3 3H14a3 3 0 01-3-3V19z" />
      <path fill="#fff" d="M30 20.8l5.4-3.45c.7-.45 1.6.05 1.6.9v11.5c0 .85-.9 1.35-1.6.9L30 27.2z" />
    </svg>
  )
}

// Official Slack brand mark — 4-arm hashtag at correct coordinates.
export function SlackLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 127 127" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#E01E5A" d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80z" />
      <path fill="#E01E5A" d="M33.7 80c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" />
      <path fill="#36C5F0" d="M46.9 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.7 6.7 39.6.8 46.9.8c7.3 0 13.2 5.9 13.2 13.2v13.2H46.9z" />
      <path fill="#36C5F0" d="M46.9 33.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2h33z" />
      <path fill="#2EB67D" d="M99.8 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.8V46.9z" />
      <path fill="#2EB67D" d="M93.3 46.9c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.9C66.9 6.6 72.8.7 80.1.7c7.3 0 13.2 5.9 13.2 13.2v33z" />
      <path fill="#ECB22E" d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2z" />
      <path fill="#ECB22E" d="M80.1 93.3c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2h-33z" />
    </svg>
  )
}

export function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#25D366" />
      <path fill="#fff" d="M24 11c-7.2 0-13 5.8-13 13 0 2.3.6 4.5 1.7 6.4L11 37l6.8-1.8c1.8 1 3.9 1.5 6.2 1.5 7.2 0 13-5.8 13-13S31.2 11 24 11zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-4 1.1 1.1-3.9-.3-.4a10.5 10.5 0 01-1.6-5.6c0-5.8 4.7-10.6 10.6-10.6 5.8 0 10.6 4.7 10.6 10.6S29.8 34.6 24 34.6z" />
      <path fill="#fff" d="M30 27.2c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.4-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.3 5.2 4.6 2.5 1.1 3 .9 3.6.8.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" />
    </svg>
  )
}

export function GoogleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="4" fill="#fff" stroke="#e0e0e0" strokeWidth="1" />
      <rect x="6" y="6" width="36" height="11" rx="4" fill="#fff" />
      <rect x="6" y="13" width="36" height="4" fill="#fff" />
      {/* Top bar */}
      <rect x="6" y="6" width="36" height="11" rx="0" fill="#1a73e8" />
      <rect x="6" y="6" width="36" height="11" rx="4" fill="#1a73e8" />
      <rect x="6" y="11" width="36" height="6" fill="#1a73e8" />
      {/* Date number */}
      <text x="24" y="35" textAnchor="middle" fill="#1a73e8" fontSize="14" fontWeight="700" fontFamily="sans-serif">24</text>
      {/* Pin circles */}
      <circle cx="16" cy="7" r="2" fill="#fff" />
      <circle cx="32" cy="7" r="2" fill="#fff" />
      {/* Grid lines */}
      <line x1="6" y1="24" x2="42" y2="24" stroke="#e0e0e0" strokeWidth="0.8" />
      <line x1="6" y1="32" x2="42" y2="32" stroke="#e0e0e0" strokeWidth="0.8" />
      <line x1="18" y1="17" x2="18" y2="42" stroke="#e0e0e0" strokeWidth="0.8" />
      <line x1="30" y1="17" x2="30" y2="42" stroke="#e0e0e0" strokeWidth="0.8" />
    </svg>
  )
}

export function OutlookCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Outlook calendar — blue Microsoft style */}
      <rect x="5" y="8" width="38" height="34" rx="3" fill="#0078D4" />
      <rect x="5" y="8" width="38" height="12" rx="3" fill="#0078D4" />
      <rect x="5" y="16" width="38" height="4" fill="#0078D4" />
      <rect x="5" y="19" width="38" height="23" rx="0" fill="#fff" />
      <rect x="5" y="36" width="38" height="6" rx="3" fill="#fff" />
      {/* Top bar with month */}
      <rect x="5" y="8" width="38" height="14" rx="3" fill="#0078D4" />
      <rect x="5" y="16" width="38" height="6" fill="#0078D4" />
      <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="600" fontFamily="sans-serif">CALENDAR</text>
      {/* Pin circles */}
      <circle cx="15" cy="9" r="2" fill="#fff" opacity="0.7" />
      <circle cx="33" cy="9" r="2" fill="#fff" opacity="0.7" />
      {/* Date */}
      <text x="24" y="36" textAnchor="middle" fill="#0078D4" fontSize="14" fontWeight="700" fontFamily="sans-serif">24</text>
      {/* Grid */}
      <line x1="5" y1="28" x2="43" y2="28" stroke="#e8e8e8" strokeWidth="0.8" />
      <line x1="19" y1="22" x2="19" y2="42" stroke="#e8e8e8" strokeWidth="0.8" />
      <line x1="29" y1="22" x2="29" y2="42" stroke="#e8e8e8" strokeWidth="0.8" />
    </svg>
  )
}

export function AppleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="5" y="7" width="38" height="35" rx="5" fill="#fff" stroke="#ddd" strokeWidth="0.8" />
      {/* Red top strip */}
      <rect x="5" y="7" width="38" height="13" rx="5" fill="#E74C3C" />
      <rect x="5" y="14" width="38" height="6" fill="#E74C3C" />
      {/* Pin circles */}
      <circle cx="15" cy="8" r="2.5" fill="#C0392B" />
      <circle cx="33" cy="8" r="2.5" fill="#C0392B" />
      <circle cx="15" cy="8" r="1.2" fill="#fff" opacity="0.5" />
      <circle cx="33" cy="8" r="1.2" fill="#fff" opacity="0.5" />
      {/* Day of week row */}
      <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="600" fontFamily="sans-serif" letterSpacing="0.5">CALENDAR</text>
      {/* Large date */}
      <text x="24" y="37" textAnchor="middle" fill="#1a1a1a" fontSize="16" fontWeight="300" fontFamily="sans-serif">24</text>
    </svg>
  )
}
