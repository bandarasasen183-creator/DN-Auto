import PortalShell from '@/components/PortalShell';
import { ProfileForm, PasswordForm } from '@/components/SettingsForms';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import WorkshopSettings from './WorkshopSettings';

export const metadata = { title: 'Settings' };

export default async function AdminSettings() {
  const { profile } = await requireRole('admin', { from: '/admin/settings' });
  const supabase = createClient();

  const { data: settings } = await supabase
    .from('workshop_settings')
    .select('phone, whatsapp, email, announcement, accepting_bookings')
    .eq('id', 1)
    .maybeSingle();

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/settings"
      title="Settings"
      subtitle="Workshop details customers see, plus your own account."
    >
      <div className="grid cols-2 rise" style={{ alignItems: 'start' }}>
        <WorkshopSettings settings={settings ?? {}} />
        <div className="stack" style={{ '--gap': '1.5rem' }}>
          <ProfileForm profile={profile} />
          <PasswordForm />
        </div>
      </div>
    </PortalShell>
  );
}
