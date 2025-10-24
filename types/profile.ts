import { z } from 'zod';

// Schema and Types
export const timezones = ['utc-5', 'utc', 'utc+1', 'utc+2', 'utc+3', 'utc+5.5', 'utc+8', 'utc+9'] as const;
export const themes = ['light', 'dark', 'system'] as const;
export const emailFrequencies = ['instant', 'hourly', 'daily', 'weekly'] as const;
export const taskViews = ['board', 'list', 'calendar'] as const;

export type Timezone = typeof timezones[number];
export type Theme = typeof themes[number];
export type EmailFrequency = typeof emailFrequencies[number];
export type TaskView = typeof taskViews[number];

// Form Schemas
export const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  displayName: z.string()
    .min(3, 'Display name must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_@.-]+$/, 'Only letters, numbers, and special characters (_, ., @, -) are allowed'),
  email: z.string().email('Please enter a valid email address'),
  role: z.string().min(2, 'Role must be at least 2 characters'),
  timezone: z.enum(timezones),
  avatarUrl: z.string().nullable().optional()
});

export const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  emailFrequency: z.enum(emailFrequencies),
  pushNotifications: z.boolean(),
  taskUpdates: z.boolean(),
  defaultTaskView: z.enum(taskViews),
  startTime: z.string(),
  endTime: z.string(),
  theme: z.enum(themes)
});

export const privacySchema = z.object({
  showProfile: z.boolean(),
  allowMentions: z.boolean(),
  showTyping: z.boolean(),
  maskEmail: z.boolean()
});

// Local storage keys
export const STORAGE_KEYS = {
  PROFILE: 'userProfile',
  PREFERENCES: 'userPreferences',
  PRIVACY: 'privacySettings'
} as const;

// Default values
export const DEFAULT_PROFILE: z.infer<typeof profileSchema> = {
  fullName: 'Jordan Davis',
  displayName: '@jordandavis',
  email: 'jordan.davis@company.com',
  role: 'Senior Product Manager',
  timezone: 'utc-5',
  avatarUrl: null
};

export const DEFAULT_PREFERENCES: z.infer<typeof preferencesSchema> = {
  emailNotifications: true,
  emailFrequency: 'instant',
  pushNotifications: true,
  taskUpdates: true,
  defaultTaskView: 'board',
  startTime: '09:00',
  endTime: '17:00',
  theme: 'system'
};

export const DEFAULT_PRIVACY: z.infer<typeof privacySchema> = {
  showProfile: true,
  allowMentions: true,
  showTyping: true,
  maskEmail: true
};

// Types for form data
export type ProfileFormData = z.infer<typeof profileSchema>;
export type PreferencesFormData = z.infer<typeof preferencesSchema>;
export type PrivacyFormData = z.infer<typeof privacySchema>;
