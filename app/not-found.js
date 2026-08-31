import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="center" style={{ padding: '6rem 1.5rem' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '5rem', margin: 0, color: 'var(--steel-200)' }}>
        404
      </p>
      <h2>Nothing here</h2>
      <p className="muted" style={{ maxWidth: '42ch', margin: '0 auto 1.5rem' }}>
        That page doesn&apos;t exist — or it belongs to a part of the workshop you&apos;re not
        signed in for.
      </p>
      <Link href="/" className="btn">Back to the workshop</Link>
    </div>
  );
}
