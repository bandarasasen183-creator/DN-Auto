'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';

export default function FaceScanner({ mechanics, onIdentified, onClose }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('initializing'); // initializing, scanning, recognized
  const [recognizedName, setRecognizedName] = useState(null);

  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('scanning');

        // SIMULATION: Since we don't have a trained AI model with employee photos yet,
        // we simulate the AI recognizing a face after 2.5 seconds.
        // In production, this would pass the video frame to face-api.js or AWS Rekognition.
        setTimeout(() => {
          if (mechanics && mechanics.length > 0) {
            // Pick a random mechanic for the demo, or pick the first one
            const randomMechanic = mechanics[Math.floor(Math.random() * mechanics.length)].full_name;
            setRecognizedName(randomMechanic);
            setStatus('recognized');
          } else {
            setRecognizedName('Mechanic');
            setStatus('recognized');
          }
        }, 2500);

      } catch (err) {
        console.error("Camera error:", err);
        setStatus('error');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mechanics]);

  if (status === 'error') {
    return (
      <div className="card rise center" style={{ background: '#000', color: '#fff', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000 }}>
        <p>Could not access the camera. Please check permissions.</p>
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="card rise center" style={{ width: '100%', maxWidth: '400px', background: '#fff', overflow: 'hidden' }}>
        
        <h3 style={{ marginTop: 0 }}>Face ID</h3>

        <div style={{ 
          position: 'relative', 
          width: '240px', 
          height: '240px', 
          margin: '0 auto 1.5rem',
          borderRadius: '50%',
          overflow: 'hidden',
          border: status === 'recognized' ? '4px solid #22c55e' : '4px solid #eab308'
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transform: 'scaleX(-1)' // mirror for front camera
            }} 
          />
          
          {status === 'scanning' && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '4px',
              background: '#eab308',
              boxShadow: '0 0 10px #eab308',
              animation: 'scan 2s infinite linear'
            }} />
          )}
        </div>

        {status === 'scanning' && (
          <p className="muted">Scanning face...</p>
        )}

        {status === 'recognized' && (
          <div className="stack" style={{ '--gap': '1rem' }}>
            <p style={{ fontSize: '1.2rem', margin: 0 }}>
              Recognized: <strong>{recognizedName}</strong>
            </p>
            <p className="small muted" style={{ margin: 0 }}>Is this you?</p>
            <div className="grid cols-2">
              <button 
                type="button" 
                className="btn btn--ghost" 
                onClick={onClose}
              >
                No, close
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ background: '#22c55e', color: '#fff', border: 'none' }}
                onClick={() => onIdentified(recognizedName)}
              >
                Yes, it&apos;s me
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
          }
        `}</style>

        {status === 'scanning' && (
          <button 
            type="button" 
            className="btn btn--ghost small" 
            style={{ marginTop: '1rem' }}
            onClick={onClose}
          >
            Cancel
          </button>
        )}

      </div>
    </div>
  );
}
