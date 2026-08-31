'use client';

export default function Error({ error, reset }) {
  return (
    <div className="center" style={{ padding: '6rem 1.5rem' }}>
      <h2>Something broke</h2>
      <p className="muted" style={{ maxWidth: '46ch', margin: '0 auto 1.5rem' }}>
        That page didn&apos;t load. It&apos;s our side, not yours — try again, and if it keeps
        happening, call the workshop.
      </p>
      <button type="button" className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
