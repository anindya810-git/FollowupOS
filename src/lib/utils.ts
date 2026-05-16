import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(d)
}

export function encrypt(text: string): string {
  // Simple base64 encoding for MVP - in production use proper AES-256 encryption
  return Buffer.from(text).toString('base64')
}

export function decrypt(text: string): string {
  return Buffer.from(text, 'base64').toString('utf-8')
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result)) added++
  }
  return result
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    reply_needed: 'Reply Needed',
    waiting_on_them: 'Waiting on Them',
    followup_due: 'Follow-up Due',
    commitment_detected: 'Commitment',
    overdue_commitment: 'Overdue',
    no_action_needed: 'No Action',
  }
  return labels[category] || category
}

export function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    reply_needed: 'bg-red-100 text-red-700 border-red-200',
    waiting_on_them: 'bg-blue-100 text-blue-700 border-blue-200',
    followup_due: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    commitment_detected: 'bg-purple-100 text-purple-700 border-purple-200',
    overdue_commitment: 'bg-orange-100 text-orange-700 border-orange-200',
    no_action_needed: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return colors[category] || 'bg-gray-100 text-gray-600'
}

export function priorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }
  return colors[priority] || 'bg-gray-400'
}
