'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BUSINESS } from '@/lib/business';

export default function AppLauncher() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Only show launcher once per browser session
    const hasLaunched = sessionStorage.getItem('dn_app_launched');
    if (hasLaunched) return;

    setVisible(true);

    // Smoothly animate the loading bar
    const p1 = setTimeout(() => setProgress(45), 200);
    const p2 = setTimeout(() => setProgress(80), 500);
    const p3 = setTimeout(() => setProgress(100), 850);

    // Fade out smoothly
    const tFade = setTimeout(() => {
      setFadeOut(true);
      sessionStorage.setItem('dn_app_launched', 'true');
    }, 1100);

    // Remove from DOM
    const tEnd = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(tFade);
      clearTimeout(tEnd);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#0b0e13',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.4s ease-out',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          maxWidth: '320px',
          width: '85%',
        }}
      >
        {/* Rounded logo card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '1.25rem 2rem',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
            display: 'grid',
            placeItems: 'center',
            transform: 'scale(1)',
            animation: 'pulse 2.5s infinite ease-in-out',
          }}
        >
          <Image
            src="/logo-small.png"
            alt={BUSINESS.name}
            width={160}
            height={50}
            style={{ objectFit: 'contain', height: 'auto' }}
            priority
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
          <h2
            style={{
              color: '#ffffff',
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              margin: '0 0 0.25rem',
              fontFamily: 'var(--font-display, sans-serif)',
            }}
          >
            {BUSINESS.shortName.toUpperCase()}
          </h2>
          <p
            style={{
              color: 'var(--steel-400, #94a3b8)',
              fontSize: '0.8rem',
              margin: 0,
              letterSpacing: '0.04em',
            }}
          >
            Workshop & Counter Terminal
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '5px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginTop: '1.5rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--amber-500, #f59e0b), #fbbf24)',
              borderRadius: '999px',
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)',
            }}
          />
        </div>

        <span
          style={{
            color: 'var(--steel-400, #64748b)',
            fontSize: '0.75rem',
            marginTop: '-0.5rem',
          }}
        >
          {progress < 100 ? 'Starting workshop…' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
