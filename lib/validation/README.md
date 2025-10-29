# Validation Library

Comprehensive input validation and sanitization library to prevent SQL injection, XSS, and other security vulnerabilities.

## Structure

```
lib/validation/
├── schemas.ts      # Zod validation schemas
├── sanitize.ts     # Input sanitization utilities
├── middleware.ts   # API route middleware
├── index.ts        # Centralized exports
└── README.md       # This file
```

## Quick Start

### 1. API Route Validation

```typescript
import { validateBody, authenticateRequest } from '@/lib/validation'
import { createProjectSchema } from '@/lib/validation'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Authenticate
  const authResult = await authenticateRequest(supabase)
  if (!authResult.success) return authResult.response
  
  // Validate body
  const bodyValidation = await validateBody(request, createProjectSchema)
  if (!bodyValidation.success) return bodyValidation.response
  
  // Use validated data
  const { name, description } = bodyValidation.data
}
```

### 2. Server Action Validation

```typescript
import { signInSchema, sanitizeEmail } from '@/lib/validation'

export async function signIn(email: string, password: string) {
  const validation = signInSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }
  
  const sanitizedEmail = sanitizeEmail(validation.data.email)
  // ... proceed
}
```

### 3. Form Validation

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema } from '@/lib/validation'

const form = useForm({
  resolver: zodResolver(signUpSchema),
})
```

## Available Schemas

### Authentication
- `signInSchema` - Email + password sign in
- `signUpSchema` - User registration
- `resetPasswordRequestSchema` - Password reset request
- `updatePasswordSchema` - Password update with confirmation

### Profile
- `updateProfileSchema` - User profile updates
- `updatePreferencesSchema` - User preferences
- `toggle2FASchema` - Two-factor authentication toggle

### Workspace
- `workspaceIdSchema` - Workspace ID validation
- `createWorkspaceSchema` - Create workspace
- `updateWorkspaceSchema` - Update workspace
- `inviteUserSchema` - Invite user to workspace
- `acceptInvitationSchema` - Accept workspace invitation

### Notifications
- `notificationQuerySchema` - Notification list query params
- `markNotificationsReadSchema` - Mark notifications as read
- `markSingleNotificationReadSchema` - Mark single notification

### Common
- `uuidSchema` - UUID validation
- `emailSchema` - Email validation
- `usernameSchema` - Username validation
- `passwordSchema` - Strong password validation
- `searchQuerySchema` - Search query validation
- `urlSchema` - URL validation

## Sanitization Functions

### Text Sanitization
- `sanitizeHtml(input)` - Remove dangerous HTML
- `sanitizePlainText(input)` - Clean plain text
- `sanitizeSearchQuery(input)` - Remove SQL injection patterns

### Specific Types
- `sanitizeEmail(input)` - Email format enforcement
- `sanitizeUsername(input)` - Username format enforcement
- `sanitizeUrl(input)` - URL validation
- `sanitizeFileName(input)` - Remove path traversal
- `sanitizeUuid(input)` - UUID validation

### Data Types
- `sanitizeInteger(input, default)` - Safe integer parsing
- `sanitizeBoolean(input)` - Safe boolean parsing
- `sanitizeJsonKeys(obj)` - Prevent prototype pollution

### SQL Safety
- `escapeLikePattern(input)` - Escape LIKE wildcards

## Middleware Functions

### Authentication
```typescript
authenticateRequest(supabase)
// Returns: { success: true, userId: string } | { success: false, response: NextResponse }
```

### Validation
```typescript
validateBody(request, schema)
// Returns: { success: true, data: T } | { success: false, response: NextResponse }

validateSearchParams(url, schema)
// Returns: { success: true, data: T } | { success: false, response: NextResponse }

validateFile(file, options)
// Returns: { success: true, file: File } | { success: false, response: NextResponse }
```

### Rate Limiting
```typescript
checkRateLimit(identifier, options)
// Returns: { success: true } | { success: false, response: NextResponse }
```

### Error Handling
```typescript
errorResponse(message, status, errors?)
// Returns: NextResponse with standardized error format

formatZodErrors(error)
// Returns: ValidationError[]

withErrorHandling(handler)
// Wraps handler with automatic error handling
```

## Security Features

### SQL Injection Prevention
- ✅ Parameterized queries (via Supabase)
- ✅ Input validation with Zod
- ✅ Search query sanitization
- ✅ UUID format validation
- ✅ SQL keyword removal

### XSS Prevention
- ✅ HTML sanitization
- ✅ Script tag removal
- ✅ Event handler removal
- ✅ Protocol validation

### Other Protections
- ✅ Path traversal prevention
- ✅ Prototype pollution prevention
- ✅ CSRF protection (via Supabase)
- ✅ Rate limiting
- ✅ File upload validation

## Examples

### Complete API Route

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { 
  validateBody, 
  authenticateRequest, 
  errorResponse,
  createProjectSchema 
} from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 1. Authenticate
    const authResult = await authenticateRequest(supabase)
    if (!authResult.success) {
      return authResult.response
    }
    
    // 2. Validate input
    const bodyValidation = await validateBody(request, createProjectSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }
    
    // 3. Process validated data
    const { name, description, workspaceId } = bodyValidation.data
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        workspace_id: workspaceId,
        created_by: authResult.userId,
      })
      .select()
      .single()
    
    if (error) {
      return errorResponse('Failed to create project', 500)
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse('Internal server error', 500)
  }
}
```

### Custom Schema

```typescript
import { z } from 'zod'

const customSchema = z.object({
  title: z.string().min(1).max(100),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().optional(),
})

const validation = await validateBody(request, customSchema)
```

## Best Practices

1. **Always validate on server**: Client-side validation is UX, not security
2. **Use schemas consistently**: Define once, use everywhere
3. **Sanitize before use**: Even after validation
4. **Log security events**: Track suspicious activity
5. **Fail securely**: Return generic errors to clients
6. **Test edge cases**: Empty strings, null, undefined, special chars

## Testing

```typescript
import { signInSchema, sanitizeEmail } from '@/lib/validation'

describe('Validation', () => {
  it('validates email format', () => {
    const result = signInSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })
  
  it('sanitizes email', () => {
    expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com')
  })
})
```
