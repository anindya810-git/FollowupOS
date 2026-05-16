import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'cta' | 'done'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-ink text-white hover:bg-[#1a2540]',
      outline: 'border border-[rgb(11_18_32/15%)] bg-white text-ink hover:bg-paper',
      ghost: 'text-[rgb(11_18_32/55%)] hover:bg-[rgb(11_18_32/6%)] hover:text-ink',
      destructive: 'bg-action text-white hover:opacity-90',
      secondary: 'bg-[rgb(11_18_32/8%)] text-ink hover:bg-[rgb(11_18_32/12%)]',
      cta: 'bg-action text-white hover:opacity-90',
      done: 'bg-done text-white hover:opacity-90',
    }
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-6 text-sm',
      icon: 'h-9 w-9',
    }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
