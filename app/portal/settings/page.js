import PortalShell from '@/components/PortalShell';
import { ProfileForm, PasswordForm } from '@/components/SettingsForms';
import { requireRole } from '@/lib/auth/session';
import { CUSTOMER_NAV } from '../nav';

export const metadata = { title: 'Settings' };

export default async function CustomerSettings() {
  const { profile } = await requireRole('customer', { from: '/portal/settings' });

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/settings"
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
