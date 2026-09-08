import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n');
const getEnv = (key) => env.find(l => l.startsWith(key))?.split('=')[1]?.replace(/"/g, '');

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function run() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, number, created_at, customer_name, customer_phone,
      registration, make, model, total_cents,
      invoice_items(id, description, price_cents, quantity, warranty_months),
      mechanic:profiles!invoices_issued_by_fkey(full_name)
    `)
    .limit(1);
  console.log("Error:", error);
}
run();
