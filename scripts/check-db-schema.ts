import { createClient } from '@/utils/supabase/server'

async function checkDBSchema() {
  try {
    const supabase = await createClient()
    
    console.log('🔍 Checking database schema...')
    
    // Check required tables
    const requiredTables = [
      'users',
      'user_preferences',
      'oauth_connections',
      'user_sessions',
      'audit_logs',
      'data_export_requests',
      'account_deletion_requests'
    ]
    
    console.log('\n📋 Checking for required tables...')
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .in('schemaname', ['public'])
      .in('tablename', requiredTables)
    
    if (tablesError) throw tablesError
    
    const existingTables = tables.map(t => t.tablename)
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))
    
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '))
      console.log('\n💡 Run the SQL in supabase-schema.sql to create the required tables')
    } else {
      console.log('✅ All required tables exist')
    }
    
    // Check storage bucket
    console.log('\n📦 Checking storage bucket...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Error checking storage buckets:', bucketError.message)
    } else {
      const hasProfileImages = buckets.some(b => b.name === 'profile-images')
      if (hasProfileImages) {
        console.log('✅ profile-images bucket exists')
      } else {
        console.error('❌ profile-images bucket is missing')
      }
    }
    
    // Check RLS policies
    console.log('\n🔒 Checking Row Level Security (RLS) policies...')
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('get_rls_policies')
      
    if (rlsError) {
      console.error('❌ Error checking RLS policies:', rlsError.message)
    } else {
      const requiredPolicies = [
        'users_policy',
        'user_preferences_policy',
        'oauth_connections_policy',
        'user_sessions_policy',
        'audit_logs_policy'
      ]
      
      const existingPolicies = rlsPolicies.map((p: any) => p.policyname)
      const missingPolicies = requiredPolicies.filter(p => !existingPolicies.includes(p))
      
      if (missingPolicies.length > 0) {
        console.error('❌ Missing RLS policies:', missingPolicies.join(', '))
      } else {
        console.log('✅ All required RLS policies exist')
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error)
  }
}

checkDBSchema()
