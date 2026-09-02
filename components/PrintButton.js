'use client';

import Icon from '@/components/Icon';

/** Prints the current page. The print stylesheet reduces it to the receipt. */
export default function PrintButton({ label = 'Print receipt' }) {
  return (
    <button type="button" className="btn btn--ghost small" onClick={() => window.print()}>
      <Icon name="print" size={14} /> {label}
    </button>
  );
}
