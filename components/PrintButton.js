'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';

/** Prints the current page. The print stylesheet reduces it to the receipt. */
export default function PrintButton({ label = 'Print receipt' }) {
  const [showPrompt, setShowPrompt] = useState(false);

  const printFormat = (format) => {
    setShowPrompt(false);
    
    // We add a class to the body so our CSS knows which print layout to apply
    document.body.classList.add(`print-${format}`);
    
    // Give the DOM a tiny bit to apply the class before blocking with print
    setTimeout(() => {
      window.print();
      // Wait for print dialog to close before removing class
      setTimeout(() => {
        document.body.classList.remove(`print-${format}`);
      }, 500);
    }, 50);
  };

  return (
    <>
      <button 
        type="button" 
        className="btn btn--ghost small" 
        onClick={() => setShowPrompt(true)}
      >
        <Icon name="print" size={14} /> {label}
      </button>

      {showPrompt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="card rise" style={{ width: '100%', maxWidth: '320px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Print format</h3>
              <button className="btn btn--ghost small" onClick={() => setShowPrompt(false)}>
                <Icon name="close" size={16} />
              </button>
            </div>
            
            <div className="stack" style={{ '--gap': '0.75rem' }}>
              <button 
                type="button" 
                className="btn"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => printFormat('thermal')}
              >
                <Icon name="file" size={16} /> Receipt (80mm thermal)
              </button>
              <button 
                type="button" 
                className="btn btn--ghost"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => printFormat('a4')}
              >
                <Icon name="file" size={16} /> Normal printer (A4)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
