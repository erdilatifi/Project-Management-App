import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API endpoint for uploading user avatar images
 * Handles file validation, storage upload, and profile update
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Only images are allowed.` 
      }, { status: 400 })
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ 
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max size is 2MB.` 
      }, { status: 400 })
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    try {
      // Convert File to Buffer for upload
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Supabase Storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return NextResponse.json({ 
          error: 'Upload failed', 
          details: uploadError.message 
        }, { status: 500 })
      }

      // Generate public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      // Update user profile with new avatar URL
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('avatar_url')
        .single()

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update profile',
          details: updateError.message
        }, { status: 500 })
      }

      // Create audit log (non-blocking)
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'avatar_updated',
          entity_type: 'user',
          entity_id: user.id,
          new_values: { avatar_url: publicUrl },
          created_at: new Date().toISOString()
        })
      } catch (auditError) {
        // Audit logging failure should not block the response
        console.error('Failed to create audit log:', auditError)
      }

      return NextResponse.json({ 
        success: true,
        url: publicUrl,
        path: filePath
      })
      
    } catch (error) {
      console.error('Error processing file upload:', error)
      return NextResponse.json({ 
        error: 'Failed to process file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error in avatar upload:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
