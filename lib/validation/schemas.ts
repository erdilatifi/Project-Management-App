/**
 * Centralized validation schemas using Zod
 * Prevents SQL injection and ensures data integrity
 */

import { z } from 'zod'

// ============================================================================
// Common Validation Patterns
// ============================================================================

/**
 * UUID validation - strict format check
 */
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' })

/**
 * Email validation - RFC 5322 compliant
 */
export const emailSchema = z.string().email({ message: 'Invalid email address' }).max(255)

/**
 * Username validation - alphanumeric, underscores, hyphens, dots
 * Length: 3-32 characters
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-z0-9_.-]+$/, 'Username can only contain lowercase letters, numbers, underscores, hyphens, and dots')
  .regex(/^[a-z0-9]/, 'Username must start with a letter or number')
  .regex(/[a-z0-9]$/, 'Username must end with a letter or number')

/**
 * Password validation - minimum security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * Relaxed password for reset (Supabase default)
 */
export const passwordResetSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be at most 128 characters')

/**
 * Text content validation - general purpose
 */
export const textContentSchema = z
  .string()
  .min(1, 'Content cannot be empty')
  .max(10000, 'Content is too long')
  .trim()

/**
 * Short text validation - titles, names, etc.
 */
export const shortTextSchema = z
  .string()
  .min(1, 'Text cannot be empty')
  .max(255, 'Text is too long')
  .trim()

/**
 * Optional short text
 */
export const optionalShortTextSchema = z
  .string()
  .max(255, 'Text is too long')
  .trim()
  .optional()
  .nullable()

/**
 * Pagination limit validation
 */
export const paginationLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)

/**
 * ISO date string validation
 */
export const isoDateSchema = z.string().datetime({ message: 'Invalid ISO date format' })

/**
 * URL validation
 */
export const urlSchema = z.string().url({ message: 'Invalid URL format' }).max(2048)

/**
 * Search query validation
 */
export const searchQuerySchema = z
  .string()
  .max(255, 'Search query is too long')
  .trim()
  .transform((val) => val.toLowerCase())

// ============================================================================
// Authentication Schemas
// ============================================================================

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
})

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  password: passwordResetSchema,
  confirmPassword: passwordResetSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// ============================================================================
// Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  display_name: shortTextSchema.optional(),
  bio: z.string().max(500, 'Bio is too long').trim().optional().nullable(),
  avatar_url: urlSchema.optional().nullable(),
})

// ============================================================================
// Workspace Schemas
// ============================================================================

export const workspaceIdSchema = z.object({
  workspaceId: uuidSchema,
})

export const createWorkspaceSchema = z.object({
  name: shortTextSchema,
  description: z.string().max(1000).trim().optional().nullable(),
})

export const updateWorkspaceSchema = z.object({
  name: shortTextSchema.optional(),
  description: z.string().max(1000).trim().optional().nullable(),
})

export const inviteUserSchema = z.object({
  workspaceId: uuidSchema,
  userId: uuidSchema.optional(),
  email: emailSchema.optional(),
}).refine((data) => data.userId || data.email, {
  message: 'Either userId or email must be provided',
})

const optionalStr = z.string().min(1).optional().nullable().transform((v) => (v == null ? undefined : v))

export const acceptInvitationSchema = z
  .object({
    workspaceId: optionalStr,
    notificationId: optionalStr,
    token: z.string().min(6).max(64).optional().nullable().transform((v) => (v == null ? undefined : v)),
  })
  .refine((data) => !!(data.workspaceId || data.notificationId || data.token), {
    message: 'workspaceId, notificationId, or token is required',
    path: ['workspaceId'],
  })

export const declineInvitationSchema = z
  .object({
    workspaceId: optionalStr,
    notificationId: optionalStr,
  })
  .refine((data) => !!(data.workspaceId || data.notificationId), {
    message: 'workspaceId or notificationId is required',
    path: ['workspaceId'],
  })

// ============================================================================
// Notification Schemas
// ============================================================================

export const notificationQuerySchema = z.object({
  limit: z.string().transform((val) => Math.min(parseInt(val, 10) || 20, 50)).optional(),
  cursor: isoDateSchema.optional(),
})

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one notification ID is required').max(100),
})

export const markSingleNotificationReadSchema = z.object({
  id: z.number().int().positive(),
})

// ============================================================================
// User Search Schemas
// ============================================================================

export const userSearchSchema = z.object({
  q: searchQuerySchema,
})

export const usersByIdsSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
})

// ============================================================================
// Message/Chat Schemas
// ============================================================================

export const createMessageSchema = z.object({
  threadId: uuidSchema,
  content: textContentSchema,
})

export const updateMessageSchema = z.object({
  id: uuidSchema,
  content: textContentSchema,
})

export const deleteMessageSchema = z.object({
  id: uuidSchema,
})

// ============================================================================
// Project/Task Schemas
// ============================================================================

export const projectIdSchema = z.object({
  id: uuidSchema,
})

export const createProjectSchema = z.object({
  name: shortTextSchema,
  description: z.string().max(2000).trim().optional().nullable(),
  workspaceId: uuidSchema,
})

export const updateProjectSchema = z.object({
  name: shortTextSchema.optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
})

export const createTaskSchema = z.object({
  projectId: uuidSchema,
  title: shortTextSchema,
  description: z.string().max(5000).trim().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assignee_id: uuidSchema.optional().nullable(),
  due_date: isoDateSchema.optional().nullable(),
})

export const updateTaskSchema = z.object({
  title: shortTextSchema.optional(),
  description: z.string().max(5000).trim().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assignee_id: uuidSchema.optional().nullable(),
  due_date: isoDateSchema.optional().nullable(),
})

// ============================================================================
// File Upload Schemas
// ============================================================================

export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(2 * 1024 * 1024), // 2MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
})

// ============================================================================
// API Response Types
// ============================================================================

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
