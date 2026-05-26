'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/Logo'
import { Loader2 } from 'lucide-react'

const providers = [
  {
    id: 'google',
    label: 'Continue with Google',
    available: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    id: 'microsoft',
    label: 'Continue with Microsoft',
    available: false,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <rect x="1" y="1" width="10" height="10" rx="1" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" rx="1" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" rx="1" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" rx="1" fill="#FFB900"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Continue with Apple',
    available: false,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Continue with Meta',
    available: false,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
]

export default function SignupPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSignIn = async (providerId: string, available: boolean) => {
    if (!available) return
    setLoading(providerId)
    // New users are redirected to /connect by the dashboard onboarding check.
    // Returning users land directly on /dashboard.
    await signIn(providerId, { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 border-b border-[rgb(11_18_32/8%)]">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-7 w-8 flex-shrink-0" />
          <span className="text-xl font-semibold tracking-[-0.02em] text-ink">Pendingly</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-ink mb-2">Create your account</h1>
            <p className="text-[rgb(11_18_32/55%)]">Start your 3-month free trial. No credit card required.</p>
          </div>

          <div className="space-y-3">
            {providers.map(p => (
              <button
                key={p.id}
                onClick={() => handleSignIn(p.id, p.available)}
                disabled={!p.available || !!loading}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border text-sm font-medium transition-all
                  ${p.available
                    ? 'bg-white border-[rgb(11_18_32/15%)] text-ink hover:border-ink hover:shadow-sm cursor-pointer'
                    : 'bg-[rgb(11_18_32/3%)] border-[rgb(11_18_32/8%)] text-[rgb(11_18_32/35%)] cursor-not-allowed'
                  }
                  ${loading === p.id ? 'opacity-70' : ''}
                `}
              >
                <span className={p.available ? '' : 'opacity-40'}>
                  {loading === p.id ? <Loader2 className="h-5 w-5 animate-spin" /> : p.icon}
                </span>
                <span className="flex-1 text-left">
                  {loading === p.id ? 'Redirecting…' : p.label}
                </span>
                {!p.available && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(11_18_32/30%)] bg-[rgb(11_18_32/6%)] px-2 py-0.5 rounded">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-[rgb(11_18_32/40%)] leading-relaxed">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline hover:text-ink">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
            <br />
            Already have an account?{' '}
            <button onClick={() => handleSignIn('google', true)} className="underline hover:text-ink">Sign in</button>
          </p>
        </div>
      </main>
    </div>
  )
}
