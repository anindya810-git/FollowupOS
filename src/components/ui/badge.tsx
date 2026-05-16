import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variant === 'outline'
          ? 'border border-[rgb(11_18_32/15%)] text-[rgb(11_18_32/55%)]'
          : 'bg-[rgb(11_18_32/8%)] text-ink',
        className
      )}
      {...props}
    />
  )
}
