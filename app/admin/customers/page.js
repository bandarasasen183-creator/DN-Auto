import PortalShell from '@/components/PortalShell';
import PeopleTable from '@/components/PeopleTable';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';

export const metadata = { title: 'Customers' };

export default async function AdminCustomers() {
  const { profile } = await requireRole('admin', { from: '/admin/customers' });
  const supabase = createClient();

  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/customers"
      title="Customers"
      subtitle="Everyone with an account. Promote someone here to give them a staff portal."
    >
      <div className="rise">
        <PeopleTable people={customers ?? []} emptyMessage="No customers yet." />
      </div>
    </PortalShell>
  );
}
