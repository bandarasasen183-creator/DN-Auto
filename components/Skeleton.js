/** Placeholder blocks shown while a route's data is still on the wire. */
export default function Skeleton({ rows = 4, title = true }) {
  return (
    <div aria-hidden style={{ padding: '2rem 1.5rem' }}>
      {title && <div className="skeleton skeleton--title" />}
      <div className="grid cols-3" style={{ marginBottom: '2rem' }}>
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton--line" style={{ width: `${90 - i * 12}%` }} />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
