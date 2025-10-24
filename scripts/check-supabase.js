// Simple script to check Supabase connection and storage
import { createClient } from '@supabase/supabase-js';

// These should match your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database tables...');
  
  try {
    // Check if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (usersError) {
      console.error('❌ Error accessing users table:', usersError.message);
      console.log('\n💡 Make sure you have run the SQL migrations to create the required tables.');
      console.log('Check the supabase-schema.sql file for the table definitions.');
    } else {
      console.log('✅ Users table is accessible');
    }
    
    // Check if user_preferences table exists
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
      
    if (prefsError) {
      console.error('❌ Error accessing user_preferences table:', prefsError.message);
    } else {
      console.log('✅ User preferences table is accessible');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

async function checkStorage() {
  console.log('\n🔍 Checking storage buckets...');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      return;
    }
    
    const bucketNames = buckets.map(b => b.name);
    console.log('Available buckets:', bucketNames);
    
    const hasProfileImages = bucketNames.includes('profile-images');
    
    if (hasProfileImages) {
      console.log('✅ profile-images bucket exists');
      
      // Check if we can list files in the bucket
      const { data: files, error: listError } = await supabase.storage
        .from('profile-images')
        .list('avatars');
        
      if (listError) {
        console.error('❌ Error listing files in bucket:', listError.message);
      } else {
        console.log(`✅ Can access avatars directory (${files.length} files)`);
      }
    } else {
      console.error('❌ profile-images bucket is missing');
      console.log('\n💡 Create a bucket named "profile-images" in your Supabase Storage.');
      console.log('Make sure it has public access for reading images.');
    }
  } catch (error) {
    console.error('❌ Storage check failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting Supabase configuration check...\n');
  
  await checkDatabase();
  await checkStorage();
  
  console.log('\n✨ Check complete!');
  
  // Close any open connections
  process.exit(0);
}

main();
