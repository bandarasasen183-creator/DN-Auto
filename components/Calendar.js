'use client';

import { useState, useMemo } from 'react';
import { isBookableOnline } from '@/lib/business';
import Icon from '@/components/Icon';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Local YYYY-MM-DD. Never use toISOString here — it shifts across timezones. */
function toKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Month calendar for picking an appointment date.
 *
 * Only days the workshop actually takes online bookings on are selectable —
 * everything else is visibly there but disabled, so the customer can see the
 * shape of the week rather than wondering why their click did nothing.
 */
export default function Calendar({ value, onChange, monthsAhead = 3 }) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => {
    const from = value ? new Date(`${value}T00:00`) : today;
    return new Date(from.getFullYear(), from.getMonth(), 1);
  });

  const lastMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);
    return d;
  }, [today, monthsAhead]);

  const canGoBack = cursor > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoForward = cursor < lastMonth;

  /** The 6-week grid: leading blanks, then every day of the month. */
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = firstOfMonth.getDay();

    const out = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      out.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    return out;
  }, [cursor]);

  const nextOpenDay = useMemo(() => {
    const probe = new Date(today);
    for (let i = 0; i < 14; i += 1) {
      if (isBookableOnline(probe) && probe >= today) return new Date(probe);
      probe.setDate(probe.getDate() + 1);
    }
    return null;
  }, [today]);

  function move(delta) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div className="cal">
      <div className="cal__head">
        <button
          type="button"
          className="cal__nav"
          onClick={() => move(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <strong className="cal__month" aria-live="polite">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </strong>
        <button
          type="button"
          className="cal__nav"
          onClick={() => move(1)}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <div className="cal__weekdays" aria-hidden>
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="cal__grid" role="grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} className="cal__blank" />;

          const key = toKey(date);
          const isPast = date < today;
          const open = isBookableOnline(date) && !isPast;
          const selected = value === key;

          return (
            <button
              key={key}
              type="button"
              className="cal__day"
              data-open={open}
              data-selected={selected}
              data-today={date.getTime() === today.getTime()}
              disabled={!open}
              onClick={() => onChange(key)}
              aria-pressed={selected}
              aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]}${open ? '' : ' — not available'}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="cal__legend small muted">
        <span className="cal__dot" aria-hidden /> Available for online booking.
        {nextOpenDay && (
          <>
            {' '}Next open day is{' '}
            <button
              type="button"
              className="cal__jump"
              onClick={() => {
                setCursor(new Date(nextOpenDay.getFullYear(), nextOpenDay.getMonth(), 1));
                onChange(toKey(nextOpenDay));
              }}
            >
              {nextOpenDay.toLocaleDateString('en-LK', { weekday: 'long', day: 'numeric', month: 'long' })}
            </button>
            .
          </>
        )}
      </p>
    </div>
  );
}
