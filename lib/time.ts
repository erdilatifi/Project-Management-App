/**
 * Format a date/time as a relative time string (e.g., "2 hours ago", "in 3 days")
 * Uses Intl.RelativeTimeFormat for localized output
 */
export function formatTimeAgo(iso: string | Date): string {
  const now = new Date()
  const then = typeof iso === 'string' ? new Date(iso) : iso
  
  // Handle invalid dates
  if (isNaN(then.getTime())) {
    return 'just now'
  }
  
  const diffMs = now.getTime() - then.getTime()
  const seconds = Math.floor(diffMs / 1000)
  
  // If less than 5 seconds or future date (clock skew), show "just now"
  if (seconds < 5 || seconds < 0) {
    return 'just now'
  }
  
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  // Time intervals in descending order for accurate formatting
  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, secs] of intervals) {
    const delta = Math.floor(seconds / secs)
    if (Math.abs(delta) >= 1) {
      // For past dates, negate the delta for "ago" format
      return rtf.format(-Math.abs(delta), unit)
    }
  }
  
  return 'just now'
}

