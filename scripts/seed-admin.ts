import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAdmin() {
  console.log('Seeding admin user...');

  // Check if admin already exists
  const { data: existingAdmin } = await supabase
    .from('admins')
    .select('id')
    .eq('email', adminEmail)
    .single();

  if (existingAdmin) {
    console.log('Admin user already exists. Updating password...');

    const passwordHash = await bcrypt.hash(adminPassword!, 10);

    const { error } = await supabase
      .from('admins')
      .update({ password_hash: passwordHash })
      .eq('email', adminEmail);

    if (error) {
      console.error('Error updating admin:', error);
      process.exit(1);
    }

    console.log('Admin password updated successfully!');
  } else {
    // Create new admin
    const passwordHash = await bcrypt.hash(adminPassword!, 10);

    const { error } = await supabase.from('admins').insert({
      email: adminEmail,
      password_hash: passwordHash,
    });

    if (error) {
      console.error('Error creating admin:', error);
      process.exit(1);
    }

    console.log('Admin user created successfully!');
  }

  console.log(`Email: ${adminEmail}`);
}

seedAdmin().catch(console.error);
