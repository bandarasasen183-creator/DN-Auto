import PortalShell from '@/components/PortalShell';
import { ProfileForm, PasswordForm } from '@/components/SettingsForms';
import { requireRole } from '@/lib/auth/session';
import { WORKER_NAV } from '../nav';

export const metadata = { title: 'Settings' };

export default async function WorkerSettings() {
  const { profile } = await requireRole('worker', { from: '/worker/settings' });

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
      </div>
    </PortalShell>
  );
}
