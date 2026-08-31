'use client';

/**
 * The top progress bar from the Jotform flow: a filling rail plus numbered
 * step markers that fill as you pass them.
 */
export default function ProgressBar({ steps, current }) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className="progress" role="group" aria-label="Booking progress">
      <div className="progress__rail">
        <div
          className="progress__fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
        />
      </div>

      <ol className="progress__steps">
        {steps.map((label, i) => (
          <li
            key={label}
            className="progress__step"
            data-state={i < current ? 'done' : i === current ? 'active' : 'todo'}
          >
            <span className="progress__dot" aria-hidden>
              {i < current ? '✓' : i + 1}
            </span>
            <span className="progress__label">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
