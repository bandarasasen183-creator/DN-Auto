'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';

export async function fetchInvoiceDetails(invoiceId) {
  if (!invoiceId) return null;
  await requireRole(['worker', 'admin']);
  const supabase = createClient();
  
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, number, created_at, customer_name, customer_phone,
      registration, vehicle_note, total_cents, performed_by_name,
      invoice_items(id, description, unit_price_cents, quantity, warranty_months),
      mechanic:profiles!performed_by(full_name)
    `)
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) {
    console.error('fetchInvoiceDetails error:', error);
    return null;
  }
    
  return invoice;
}
