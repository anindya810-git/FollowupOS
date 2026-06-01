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

// Zoho Mail logo — blue open-envelope with orange letter card inside
export function ZohoMailLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="8" fill="white"/>
      <rect x="6" y="17" width="36" height="23" rx="3" fill="#E8F0FE" stroke="#3A5DB7" strokeWidth="2"/>
      <path d="M6 17 L24 30 L42 17" fill="none" stroke="#3A5DB7" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="12" y="25" width="24" height="12" rx="2.5" fill="#FC7B1E"/>
    </svg>
  )
}

// Google G multicolor logo
export function GoogleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// Microsoft Outlook logo — blue bg, lighter-blue document panel, white O ring
export function OutlookCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="8" fill="#0F4AB5"/>
      {/* Lighter blue document/envelope panel */}
      <rect x="23" y="10" width="21" height="28" rx="3" fill="#3A7BD5"/>
      {/* Envelope fold crease */}
      <polyline points="23,10 33.5,19 44,10" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* White O ring — large circle with blue hole */}
      <circle cx="19" cy="30" r="13" fill="white"/>
      <circle cx="19" cy="30" r="8" fill="#0F4AB5"/>
    </svg>
  )
}

// Apple logo — bitten apple silhouette in black on transparent (white container shows through)
export function AppleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
