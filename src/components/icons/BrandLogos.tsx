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
      <defs>
        <clipPath id="gcal-r">
          <rect width="48" height="48" rx="8"/>
        </clipPath>
      </defs>
      {/* White base */}
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <g clipPath="url(#gcal-r)">
        {/* Blue header */}
        <rect width="48" height="16" fill="#1a73e8"/>
        {/* Google-color stripes at bottom corners */}
        <rect x="0" y="40" width="12" height="8" fill="#34a853"/>
        <rect x="36" y="40" width="12" height="8" fill="#ea4335"/>
        <rect x="0" y="32" width="12" height="8" fill="#fbbc04"/>
        <rect x="36" y="32" width="12" height="8" fill="#4285f4"/>
      </g>
      {/* Ring holes in blue header */}
      <circle cx="13" cy="4" r="4.5" fill="white"/>
      <circle cx="13" cy="4" r="2.2" fill="#1a73e8"/>
      <circle cx="35" cy="4" r="4.5" fill="white"/>
      <circle cx="35" cy="4" r="2.2" fill="#1a73e8"/>
      {/* Large bold date */}
      <text x="24" y="38" textAnchor="middle" fill="#1a73e8" fontSize="20" fontWeight="700" fontFamily="Arial,Helvetica,sans-serif">31</text>
    </svg>
  )
}

export function OutlookCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="ocal-r">
          <rect width="48" height="48" rx="8"/>
        </clipPath>
      </defs>
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <g clipPath="url(#ocal-r)">
        {/* Microsoft blue header */}
        <rect width="48" height="16" fill="#0078D4"/>
        {/* White calendar body */}
        <rect y="16" width="48" height="32" fill="#fff"/>
        {/* Subtle grid lines */}
        <line x1="0" y1="26" x2="48" y2="26" stroke="#e8f0fe" strokeWidth="0.8"/>
        <line x1="0" y1="36" x2="48" y2="36" stroke="#e8f0fe" strokeWidth="0.8"/>
        <line x1="16" y1="16" x2="16" y2="48" stroke="#e8f0fe" strokeWidth="0.8"/>
        <line x1="32" y1="16" x2="32" y2="48" stroke="#e8f0fe" strokeWidth="0.8"/>
      </g>
      {/* Ring holes */}
      <circle cx="13" cy="4" r="4.5" fill="white" opacity="0.9"/>
      <circle cx="35" cy="4" r="4.5" fill="white" opacity="0.9"/>
      {/* Outlook "O" lettermark in header */}
      <text x="24" y="13" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="'Segoe UI',Arial,sans-serif">Outlook</text>
      {/* Large date in Microsoft blue */}
      <text x="24" y="39" textAnchor="middle" fill="#0078D4" fontSize="20" fontWeight="700" fontFamily="'Segoe UI',Arial,sans-serif">31</text>
    </svg>
  )
}

export function AppleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="acal-r">
          <rect width="48" height="48" rx="10"/>
        </clipPath>
      </defs>
      <rect width="48" height="48" rx="10" fill="#fff"/>
      <g clipPath="url(#acal-r)">
        {/* Red top band */}
        <rect width="48" height="17" fill="#FF3B30"/>
        {/* White calendar body */}
        <rect y="17" width="48" height="31" fill="#fff"/>
      </g>
      {/* Binder rings — small dark pins on red */}
      <circle cx="13" cy="5" r="3.5" fill="#C0302A"/>
      <circle cx="13" cy="5" r="1.8" fill="#fff" opacity="0.5"/>
      <circle cx="35" cy="5" r="3.5" fill="#C0302A"/>
      <circle cx="35" cy="5" r="1.8" fill="#fff" opacity="0.5"/>
      {/* Day abbreviation in white on red */}
      <text x="24" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="600" fontFamily="-apple-system,'SF Pro Text',Arial,sans-serif" letterSpacing="0.5">CALENDAR</text>
      {/* Large date in near-black */}
      <text x="24" y="40" textAnchor="middle" fill="#1c1c1e" fontSize="21" fontWeight="300" fontFamily="-apple-system,'SF Pro Display',Arial,sans-serif">31</text>
    </svg>
  )
}
