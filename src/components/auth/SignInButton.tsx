'use client'
import Link from 'next/link'

export function SignInButton({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const cls = size === 'lg'
    ? 'inline-flex items-center justify-center rounded-md font-semibold transition-colors bg-action text-white hover:opacity-90 text-base px-8 py-3'
    : 'inline-flex items-center justify-center rounded-md font-medium transition-colors bg-action text-white hover:opacity-90 h-11 px-6 text-sm'
  return <Link href="/signup" className={cls}>Sign Up Free</Link>
}
