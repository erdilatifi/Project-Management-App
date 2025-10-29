/**
 * Input sanitization utilities
 * Additional layer of protection against XSS and injection attacks
 */

/**
 * Sanitize HTML content - removes dangerous tags and attributes
 * Use for user-generated content that might be rendered as HTML
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '')
  
  return sanitized.trim()
}

/**
 * Sanitize plain text - removes control characters and normalizes whitespace
 */
export function sanitizePlainText(input: string): string {
  if (!input) return ''
  
  // Remove control characters except newline and tab
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ')
  
  return sanitized.trim()
}

/**
 * Sanitize username - ensures only safe characters
 */
export function sanitizeUsername(input: string): string {
  if (!input) return ''
  
  // Convert to lowercase and remove unsafe characters
  const sanitized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_.-]/g, '')
    // Collapse multiple dots, underscores, hyphens
    .replace(/\.{2,}/g, '.')
    .replace(/_{2,}/g, '_')
    .replace(/-{2,}/g, '-')
    // Remove leading/trailing special chars
    .replace(/^[._-]+|[._-]+$/g, '')
    // Limit length
    .slice(0, 32)
  
  return sanitized
}

/**
 * Sanitize email - basic email format enforcement
 */
export function sanitizeEmail(input: string): string {
  if (!input) return ''
  
  // Remove whitespace and convert to lowercase
  const sanitized = input.trim().toLowerCase()
  
  // Basic validation - must contain @ and domain
  if (!sanitized.includes('@') || sanitized.length > 255) {
    return ''
  }
  
  return sanitized
}

/**
 * Sanitize search query - prevents SQL injection patterns
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input) return ''
  
  // Remove SQL injection patterns
  let sanitized = input
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bUNION\b/gi, '') // Remove UNION keyword
    .replace(/\bSELECT\b/gi, '') // Remove SELECT keyword
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bINSERT\b/gi, '') // Remove INSERT keyword
    .replace(/\bUPDATE\b/gi, '') // Remove UPDATE keyword
    .trim()
  
  // Limit length
  sanitized = sanitized.slice(0, 255)
  
  return sanitized
}

/**
 * Sanitize URL - ensures safe URL format
 */
export function sanitizeUrl(input: string): string {
  if (!input) return ''
  
  const sanitized = input.trim()
  
  // Only allow http, https, and relative URLs
  if (
    !sanitized.startsWith('http://') &&
    !sanitized.startsWith('https://') &&
    !sanitized.startsWith('/')
  ) {
    return ''
  }
  
  // Block javascript: and data: protocols
  if (sanitized.toLowerCase().includes('javascript:') || sanitized.toLowerCase().includes('data:')) {
    return ''
  }
  
  return sanitized.slice(0, 2048)
}

/**
 * Sanitize file name - removes path traversal attempts
 */
export function sanitizeFileName(input: string): string {
  if (!input) return ''
  
  // Remove path traversal patterns
  let sanitized = input
    .replace(/\.\./g, '') // Remove ..
    .replace(/\//g, '') // Remove forward slashes
    .replace(/\\/g, '') // Remove backslashes
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename chars
    .trim()
  
  // Limit length
  sanitized = sanitized.slice(0, 255)
  
  return sanitized
}

/**
 * Sanitize JSON input - prevents prototype pollution
 */
export function sanitizeJsonKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJsonKeys)
  }
  
  const sanitized: any = {}
  
  for (const key in obj) {
    // Skip prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }
    
    sanitized[key] = sanitizeJsonKeys(obj[key])
  }
  
  return sanitized
}

/**
 * Escape SQL LIKE pattern special characters
 * Use when building LIKE queries with user input
 */
export function escapeLikePattern(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/\\/g, '\\\\') // Escape backslash
    .replace(/%/g, '\\%') // Escape percent
    .replace(/_/g, '\\_') // Escape underscore
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUuid(input: string): string | null {
  if (!input) return null
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  const sanitized = input.trim().toLowerCase()
  
  if (!uuidRegex.test(sanitized)) {
    return null
  }
  
  return sanitized
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: any, defaultValue: number = 0): number {
  const parsed = parseInt(String(input), 10)
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue
  }
  
  return parsed
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input
  }
  
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1'
  }
  
  return Boolean(input)
}
