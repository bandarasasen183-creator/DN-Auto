require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, number, created_at, customer_name, customer_phone,
      registration, make, model, total_cents,
      invoice_items(id, description, price_cents, quantity, warranty_months),
      mechanic:profiles!issued_by(full_name)
    `)
    .limit(1);
  console.log("Error:", error);
}
run();
