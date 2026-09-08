'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';

const REASONS = [
  "Too expensive",
  "Took too long",
  "Staff was rude",
  "Issue not fully fixed",
  "Poor communication"
];

export default function CustomerFeedback({ onFinish }) {
  const [rating, setRating] = useState(0);

  if (rating === 0) {
    return (
      <div className="rise" style={{ textAlign: 'center' }}>
        <h2 style={{ marginTop: 0 }}>How did we do?</h2>
        <p className="muted">Please tap a star to rate our service.</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '2rem 0' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star);
                if (star === 5) {
                  onFinish(star, null);
                }
              }}
              className="btn btn--ghost"
              style={{ padding: '1rem', color: 'var(--brand)' }}
            >
              <Icon name="star" size={32} />
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost small" onClick={() => onFinish(null, null)}>
          Skip
        </button>
      </div>
    );
  }

  return (
    <div className="rise" style={{ textAlign: 'center', width: '100%' }}>
      <h2 style={{ marginTop: 0 }}>What could we improve?</h2>
      <p className="muted">Please select an option below.</p>
      <div className="grid" style={{ gap: '0.5rem', marginTop: '1.5rem', textAlign: 'left' }}>
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onFinish(rating, r)}
            className="btn btn--ghost"
            style={{ justifyContent: 'flex-start' }}
          >
            {r}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onFinish(rating, 'Other')}
          className="btn btn--ghost"
          style={{ justifyContent: 'flex-start' }}
        >
          Other
        </button>
      </div>
      <button type="button" className="btn btn--ghost small" onClick={() => onFinish(rating, null)} style={{ marginTop: '1.5rem' }}>
        Skip
      </button>
    </div>
  );
}
