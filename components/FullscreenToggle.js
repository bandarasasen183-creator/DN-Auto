'use client';
import { useEffect, useState } from 'react';

export default function FullscreenToggle({ className, style }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Check if fullscreen API is available
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
      setIsSupported(false);
      return;
    }

    const updateState = () => {
      const active = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        (typeof window !== 'undefined' &&
          window.innerHeight >= (window.screen?.height || 0) - 20 &&
          window.innerWidth >= (window.screen?.width || 0) - 20)
      );
      setIsFullscreen(active);
    };

    updateState();
    document.addEventListener('fullscreenchange', updateState);
    document.addEventListener('webkitfullscreenchange', updateState);
    window.addEventListener('resize', updateState);

    return () => {
      document.removeEventListener('fullscreenchange', updateState);
      document.removeEventListener('webkitfullscreenchange', updateState);
      window.removeEventListener('resize', updateState);
    };
  }, []);

  if (!isSupported) return null;

  const toggle = (e) => {
    e.stopPropagation();
    try {
      const isCurrentlyFs =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        isFullscreen;

      if (!isCurrentlyFs) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  return (
    <button 
      type="button"
      onClick={toggle}
      className={className || "btn btn--ghost small hide-on-print"}
      style={style}
      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', flexShrink: 0 }}>
        {isFullscreen ? (
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        ) : (
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        )}
      </svg>
      <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
    </button>
  );
}
