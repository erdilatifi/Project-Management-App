import { createClient } from '@/utils/supabase/client'

export interface UserProfile {
  id: string
  full_name: string
  display_name: string
  email: string
  email_verified: boolean
  role_title: string | null
  timezone: string
  avatar_url: string | null
  two_factor_enabled: boolean
}

export interface UserPreferences {
  email_notifications: boolean
  email_frequency: string
  push_notifications: boolean
  task_updates_notifications: boolean
  default_task_view: string
  work_start_time: string
  work_end_time: string
  theme: string
}

export interface OAuthConnection {
  id: string
  provider: string
  provider_email: string | null
  connected_at: string
}

// Fetch user profile
export async function getUserProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data as UserProfile
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Upload avatar
export async function uploadAvatar(userId: string, file: File) {
  const supabase = createClient()
  
  // Create unique file name
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `avatars/${fileName}`
  
  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('profile-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })
  
  if (uploadError) throw uploadError
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('profile-images')
    .getPublicUrl(filePath)
  
  // Update user profile with new avatar URL
  await updateUserProfile(userId, { avatar_url: publicUrl })
  
  return publicUrl
}

// Get user preferences
export async function getUserPreferences(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data as UserPreferences
}

// Update user preferences
export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_preferences')
    .update(preferences)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Get OAuth connections
export async function getOAuthConnections(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('oauth_connections')
    .select('id, provider, provider_email, connected_at')
    .eq('user_id', userId)
  
  if (error) throw error
  return data as OAuthConnection[]
}

// Disconnect OAuth
export async function disconnectOAuth(userId: string, provider: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('oauth_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
  
  if (error) throw error
}

// Get active sessions
export async function getActiveSessions(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_activity_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Revoke session
export async function revokeSession(sessionId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId)
  
  if (error) throw error
}

// Revoke all other sessions
export async function revokeAllOtherSessions(userId: string, currentSessionId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
    .neq('id', currentSessionId)
  
  if (error) throw error
}

// Toggle 2FA
export async function toggle2FA(userId: string, enabled: boolean) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .update({ two_factor_enabled: enabled })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Request data export
export async function requestDataExport(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('data_export_requests')
    .insert({
      user_id: userId,
      status: 'pending'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Request account deletion
export async function requestAccountDeletion(userId: string, reason?: string) {
  const supabase = createClient()
  
  // Schedule deletion for 30 days from now
  const scheduledDate = new Date()
  scheduledDate.setDate(scheduledDate.getDate() + 30)
  
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .insert({
      user_id: userId,
      reason: reason,
      scheduled_deletion_at: scheduledDate.toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Log audit event
export async function logAuditEvent(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: any,
  newValues?: any
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues
    })
  
  if (error) console.error('Audit log error:', error)
}
