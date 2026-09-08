import PortalShell from '@/components/PortalShell';
import { ProfileForm, PasswordForm } from '@/components/SettingsForms';
import FaceIdSetup from '@/components/FaceIdSetup';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';

export const metadata = { title: 'Settings' };

export default async function WorkerSettings() {
  const { profile } = await requireRole('worker', { from: '/worker/settings' });
  
  const supabase = createClient();
  const { data: mechanics } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['worker', 'admin'])
    .eq('is_active', true)
    .order('full_name');

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/settings"
      title="Settings"
      subtitle="Your details and your password."
    >
      <div className="grid cols-2 rise" style={{ alignItems: 'start' }}>
        <ProfileForm profile={profile} />
        <PasswordForm />
        <FaceIdSetup mechanics={mechanics || []} />
      </div>
    </PortalShell>
  );
}
