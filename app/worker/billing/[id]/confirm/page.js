import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import HandoverFlow from './HandoverFlow';

export const metadata = { title: 'Confirm payment' };

/**
 * Deliberately outside PortalShell.
 *
 * This screen is handed to the customer, so it carries no navigation, no
 * other jobs and no way into the rest of the portal. What they can see is
 * their own bill and nothing else.
 */
export default async function ConfirmPage({ params }) {
  await requireRole(['worker', 'admin'], { from: `/worker/billing/${params.id}/confirm` });
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, registration, customer_name, total_cents, paid_cents, signed_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!invoice) notFound();

  const outstanding = Number(invoice.total_cents) - Number(invoice.paid_cents);

  return (
    <main className="handover-screen">
      <HandoverFlow invoice={invoice} outstandingCents={outstanding} />
    </main>
  );
}
