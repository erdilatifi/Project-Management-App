import { createClient } from '@/utils/supabase/client'

export interface UserProfile {
  id: string
  username?: string | null
  full_name: string
  display_name: string
  email: string
  email_verified: boolean
  role_title: string | null
  timezone: string
  avatar_url: string | null
  two_factor_enabled: boolean
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

