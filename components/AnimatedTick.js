export default function AnimatedTick() {
  return (
    <div className="tick tick--xl" aria-hidden>
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tick-svg"
      >
        <path d="M16 32l10.5 10.5L48 20" />
      </svg>
      <style>{`
        .tick-svg path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          animation-delay: 0.2s;
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
