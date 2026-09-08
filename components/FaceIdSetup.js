'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon';

export default function FaceIdSetup({ mechanics }) {
  const [pin, setPin] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [phase, setPhase] = useState('select'); // select, confirm, scan_center, scan_left, scan_right, scan_up, scan_down, done
  const videoRef = useRef(null);

  // Manager PIN for authorizing new face scans
  const MANAGER_PIN = '1357';

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === MANAGER_PIN) {
      setAuthorized(true);
    } else {
      alert("Incorrect Manager PIN");
      setPin('');
    }
  };

  const startScanning = async () => {
    setPhase('scan_center');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Simulate the scan progression with longer delays so they actually move
      setTimeout(() => setPhase('scan_left'), 3000);
      setTimeout(() => setPhase('scan_right'), 6000);
      setTimeout(() => setPhase('scan_up'), 9000);
      setTimeout(() => setPhase('scan_down'), 12000);
      setTimeout(() => {
        setPhase('done');
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
      }, 15000);

    } catch (err) {
      console.error(err);
      alert("Could not access camera.");
      setPhase('select');
    }
  };

  if (!authorized) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add / Update Face ID</h3>
        <p className="muted small">Requires Manager PIN to authorize registration.</p>
        <form onSubmit={handlePinSubmit} className="grid" style={{ gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
          <input 
            type="password" 
            className="input" 
            placeholder="Manager PIN" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required 
          />
          <button type="submit" className="btn">Unlock</button>
        </form>
      </div>
    );
  }

  if (phase === 'select') {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Select Staff Member</h3>
        <p className="muted small">Who are we registering Face ID for?</p>
        <div className="stack" style={{ '--gap': '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {mechanics.map(m => (
            <button 
              key={m.id}
              className="btn btn--ghost row" 
              style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
              onClick={() => {
                setSelectedMechanic(m);
                setPhase('confirm');
              }}
            >
              <Icon name="user" size={16} />
              <span>{m.full_name}</span>
            </button>
          ))}
        </div>
        <button className="btn btn--ghost small" style={{ marginTop: '1rem' }} onClick={() => setAuthorized(false)}>Lock</button>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="card center">
        <div style={{ padding: '1rem', background: 'var(--surface-sunken)', borderRadius: '50%', width: 64, height: 64, margin: '0 auto 1rem', display: 'grid', placeItems: 'center' }}>
          <Icon name="user" size={32} />
        </div>
        <h3>Is this your name?</h3>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--brand)' }}>{selectedMechanic.full_name}</p>
        <p className="muted small" style={{ marginBottom: '1.5rem' }}>Are you sure you want to change the Face ID for this person?</p>
        <div className="grid cols-2">
          <button className="btn btn--ghost" onClick={() => setPhase('select')}>No, go back</button>
          <button className="btn" onClick={startScanning}>Yes, it&apos;s me</button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="card center">
        <div className="tick" style={{ margin: '0 auto 1rem' }}><Icon name="check" size={32} /></div>
        <h3>Face ID Registered</h3>
        <p className="muted small">You can now use your face to assign tickets and sign off work.</p>
        <button className="btn" onClick={() => { setPhase('select'); setAuthorized(false); }}>Done</button>
      </div>
    );
  }

  // Scanning phases
  const getPrompt = () => {
    switch(phase) {
      case 'scan_center': return "Look straight at the camera";
      case 'scan_left': return "Turn your head ALL THE WAY left";
      case 'scan_right': return "Turn your head ALL THE WAY right";
      case 'scan_up': return "Tilt your head ALL THE WAY up";
      case 'scan_down': return "Tilt your head ALL THE WAY down";
      default: return "";
    }
  };
  
  const getProgress = () => {
    switch(phase) {
      case 'scan_center': return 20;
      case 'scan_left': return 40;
      case 'scan_right': return 60;
      case 'scan_up': return 80;
      case 'scan_down': return 100;
      default: return 0;
    }
  };

  return (
    <div className="card center">
      <h3 style={{ marginTop: 0 }}>Registering Face ID</h3>
      <p className="muted small">{selectedMechanic.full_name}</p>
      
      <div style={{ 
        position: 'relative', 
        width: '240px', 
        height: '240px', 
        margin: '1.5rem auto',
        borderRadius: '50%',
        padding: '8px',
        background: `conic-gradient(#22c55e ${getProgress()}%, var(--surface-sunken) ${getProgress()}%)`,
        transition: 'background 0.3s ease'
      }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#000' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transform: 'scaleX(-1)'
            }} 
          />
        </div>
      </div>
      
      <p style={{ fontSize: '1.1rem', fontWeight: 600, minHeight: '3rem' }}>{getPrompt()}</p>
    </div>
  );
}
