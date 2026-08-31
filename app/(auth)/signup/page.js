import Link from 'next/link';
import AuthShell from '../AuthShell';
import SignupForm from './SignupForm';

export const metadata = { title: 'Create an account' };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Book services, follow your repair live and keep every job's history in one place."
      footer={
        <>
          Already registered?{' '}
          <Link href="/login" style={{ color: 'var(--amber-600)', fontWeight: 600 }}>
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
