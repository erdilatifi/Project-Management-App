import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

async function testAvatarUpload() {
  try {
    // Test Supabase client creation
    const supabase = await createClient()
    console.log('✅ Supabase client created successfully')

    // Test authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message || 'No user found')
      return
    }
    
    console.log('✅ Authenticated as:', user.email)

    // Test storage bucket access
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Failed to list buckets:', bucketError.message)
      return
    }
    
    console.log('✅ Available buckets:', buckets.map(b => b.name))
    
    const profileImagesBucket = buckets.find(b => b.name === 'profile-images')
    
    if (!profileImagesBucket) {
      console.error('❌ profile-images bucket not found')
      return
    }
    
    console.log('✅ profile-images bucket exists and is accessible')
    
    // Test if we can list files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('profile-images')
      .list('avatars')
    
    if (filesError) {
      console.error('❌ Failed to list files in bucket:', filesError.message)
      return
    }
    
    console.log(`✅ Successfully accessed avatars directory. Found ${files.length} files`)
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testAvatarUpload()
