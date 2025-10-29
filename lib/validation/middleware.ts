/**
 * Validation middleware for API routes
 * Provides consistent validation and error handling
 */

import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { sanitizeJsonKeys } from './sanitize'

/**
 * Validation error response format
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Standard error response
 */
export function errorResponse(message: string, status: number = 400, errors?: ValidationError[]) {
  return NextResponse.json(
    {
      error: message,
      errors: errors || undefined,
    },
    { status }
  )
}

/**
 * Format Zod validation errors into readable format
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((err: z.ZodIssue) => ({
    field: err.path.join('.'),
    message: err.message,
  }))
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    // Parse JSON body
    const rawBody = await request.json()
    
    // Sanitize JSON keys to prevent prototype pollution
    const sanitizedBody = sanitizeJsonKeys(rawBody)
    
    // Validate against schema
    const data = schema.parse(sanitizedBody)
    
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: errorResponse('Validation failed', 400, formatZodErrors(error)),
      }
    }
    
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: errorResponse('Invalid JSON format', 400),
      }
    }
    
    return {
      success: false,
      response: errorResponse('Invalid request body', 400),
    }
  }
}

/**
 * Validate URL search parameters against a Zod schema
 */
export function validateSearchParams<T>(
  url: URL,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    // Convert URLSearchParams to object
    const params: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    // Validate against schema
    const data = schema.parse(params)
    
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: errorResponse('Invalid query parameters', 400, formatZodErrors(error)),
      }
    }
    
    return {
      success: false,
      response: errorResponse('Invalid query parameters', 400),
    }
  }
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File | null,
  options: {
    maxSize?: number
    allowedTypes?: string[]
    required?: boolean
  } = {}
): { success: true; file: File } | { success: false; response: NextResponse } {
  const {
    maxSize = 2 * 1024 * 1024, // 2MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = true,
  } = options
  
  // Check if file is provided
  if (!file) {
    if (required) {
      return {
        success: false,
        response: errorResponse('No file provided', 400),
      }
    }
    return { success: true, file: null as any }
  }
  
  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      response: errorResponse(
        `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`,
        400
      ),
    }
  }
  
  // Validate file size
  if (file.size > maxSize) {
    return {
      success: false,
      response: errorResponse(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max size: ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
        400
      ),
    }
  }
  
  return { success: true, file }
}

/**
 * Rate limiting helper (basic implementation)
 * For production, use a proper rate limiting solution like Upstash or Redis
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  options: {
    maxRequests?: number
    windowMs?: number
  } = {}
): { success: true } | { success: false; response: NextResponse } {
  const { maxRequests = 100, windowMs = 60000 } = options // 100 requests per minute default
  
  const now = Date.now()
  const record = rateLimitMap.get(identifier)
  
  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key)
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    // Create new record
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return { success: true }
  }
  
  if (record.count >= maxRequests) {
    return {
      success: false,
      response: errorResponse('Too many requests. Please try again later.', 429),
    }
  }
  
  // Increment count
  record.count++
  return { success: true }
}

/**
 * Authenticate user from request
 * Returns user ID or error response
 */
export async function authenticateRequest(
  supabase: any
): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        success: false,
        response: errorResponse('Unauthorized', 401),
      }
    }
    
    return { success: true, userId: user.id }
  } catch (error) {
    return {
      success: false,
      response: errorResponse('Authentication failed', 401),
    }
  }
}

/**
 * Wrapper for API route handlers with built-in error handling
 */
export function withErrorHandling(
  handler: (request: Request) => Promise<NextResponse>
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('API Error:', error)
      
      if (error instanceof ZodError) {
        return errorResponse('Validation failed', 400, formatZodErrors(error))
      }
      
      return errorResponse('Internal server error', 500)
    }
  }
}
