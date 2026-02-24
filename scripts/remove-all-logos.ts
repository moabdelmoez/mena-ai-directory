import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeAllLogos() {
  console.log('Removing all company logos...');

  // First, count companies with logos
  const { count: beforeCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('logo', 'is', null);

  console.log(`Found ${beforeCount} companies with logos`);

  if (beforeCount === 0) {
    console.log('No logos to remove. Done!');
    return;
  }

  // Update all companies, set logo to null
  const { data, error } = await supabase
    .from('companies')
    .update({ logo: null })
    .not('logo', 'is', null)
    .select('id, name');

  if (error) {
    console.error('Error removing logos:', error);
    process.exit(1);
  }

  console.log(`Successfully removed logos from ${data?.length || 0} companies:`);
  data?.forEach((company) => {
    console.log(`  - ${company.name}`);
  });

  console.log('Done!');
}

removeAllLogos().catch(console.error);
