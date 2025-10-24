import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('Avatar upload request received')
  
  try {
    const supabase = await createClient()
    
    // Get current user
    console.log('Getting current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Processing file upload for user:', user.id)
    
    // Get file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      console.error('No file found in form data')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const error = `Invalid file type: ${file.type}. Only images are allowed.`
      console.error(error)
      return NextResponse.json({ error }, { status: 400 })
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      const error = `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max size is 2MB.`
      console.error(error)
      return NextResponse.json({ error }, { status: 400 })
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`
    
    console.log('Uploading file to storage:', filePath)

    try {
      // Convert File to ArrayBuffer then to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Supabase Storage
      console.log('Uploading to Supabase Storage...')
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

      console.log('File uploaded successfully:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)

      // Update user profile
      console.log('Updating user profile with new avatar URL...')
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

      console.log('Profile updated successfully:', updateData)

      // Log audit event
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'avatar_updated',
          entity_type: 'user',
          entity_id: user.id,
          new_values: { avatar_url: publicUrl },
          created_at: new Date().toISOString()
        })
        console.log('Audit log created')
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError)
        // Don't fail the request if audit logging fails
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
