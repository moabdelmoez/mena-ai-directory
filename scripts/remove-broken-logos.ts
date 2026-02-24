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

// Companies with broken logo URLs
const COMPANIES_TO_FIX = ['Teammates AI', 'Arabot'];

async function removeBrokenLogos() {
  console.log('Removing broken logos...');

  for (const companyName of COMPANIES_TO_FIX) {
    const { data, error } = await supabase
      .from('companies')
      .update({ logo: null })
      .ilike('name', companyName)
      .select('name, logo');

    if (error) {
      console.error(`Error updating ${companyName}:`, error);
    } else if (data && data.length > 0) {
      console.log(`Removed logo for: ${data.map(c => c.name).join(', ')}`);
    } else {
      console.log(`No company found matching: ${companyName}`);
    }
  }

  console.log('Done!');
}

removeBrokenLogos().catch(console.error);
