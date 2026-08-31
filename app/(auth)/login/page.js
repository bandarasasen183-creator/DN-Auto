import Link from 'next/link';
import AuthShell from '../AuthShell';
import LoginForm from './LoginForm';

export const metadata = { title: 'Sign in' };

const ERRORS = {
  'account-disabled': 'This account has been disabled. Please call the workshop.',
};

export default function LoginPage({ searchParams }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '';
  const error = ERRORS[searchParams?.error] ?? null;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Customers, mechanics and admin all sign in here — we'll take you to the right place."
      footer={
        <>
          New customer? <Link href="/signup" style={{ color: 'var(--amber-600)', fontWeight: 600 }}>Create an account</Link>
        </>
      }
    >
      <LoginForm next={next} initialError={error} />
    </AuthShell>
  );
}
