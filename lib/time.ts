export function formatTimeAgo(iso: string | Date): string {
  const now = new Date()
  const then = typeof iso === 'string' ? new Date(iso) : iso
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

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
    if (Math.abs(delta) >= 1) return rtf.format(-delta, unit)
  }
  return rtf.format(0, 'second')
}

