/** Shown while a server component streams in. */
export default function Loading() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__bar" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
