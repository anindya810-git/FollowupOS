'use client'
import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        className="flex h-10 w-full appearance-none rounded-lg border border-[rgb(11_18_32/12%)] bg-white px-3 py-2 pr-8 text-sm text-ink shadow-sm transition-colors hover:border-[rgb(11_18_32/22%)] focus:outline-none focus:ring-2 focus:ring-action/40 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(11_18_32/35%)]" />
    </div>
  )
)
Select.displayName = 'Select'
