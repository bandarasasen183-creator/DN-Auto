'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';

export async function fetchInvoiceDetails(invoiceId) {
  await requireRole(['worker', 'admin']);
  const supabase = createClient();
  
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, number, created_at, customer_name, customer_phone,
      registration, make, model, total_cents,
      invoice_items(id, description, price_cents, quantity, warranty_months),
      mechanic:profiles!invoices_performed_by_fkey(full_name)
    `)
    .eq('id', invoiceId)
    .maybeSingle();
    
  return invoice;
}
