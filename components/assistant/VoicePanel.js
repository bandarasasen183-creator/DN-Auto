'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon';

/**
 * Voice mode: dictate with the Web Speech API, and have the reply read back.
 * Both halves are progressive enhancement — the browser either has them or the
 * panel says so plainly rather than pretending to listen.
 */
export default function VoicePanel({ onSend, busy, lastReply }) {
  const [supported, setSupported] = useState(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speakBack, setSpeakBack] = useState(true);
  const recognitionRef = useRef(null);
  const spokenRef = useRef('');

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setTranscript(text);

      // Send once the browser marks the phrase final, so the user doesn't have
      // to reach for a button mid-sentence.
      if (event.results[event.results.length - 1].isFinal && text.trim()) {
        onSend(text);
        setTranscript('');
        setListening(false);
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setSupported(true);

    return () => recognition.abort();
  }, [onSend]);

  // Read each new reply out once, never the same one twice.
  useEffect(() => {
    if (!speakBack || !lastReply || busy) return;
    if (spokenRef.current === lastReply) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    spokenRef.current = lastReply;
    const utterance = new SpeechSynthesisUtterance(lastReply);
    utterance.lang = 'en-GB';
    utterance.rate = 1.02;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [lastReply, speakBack, busy]);

  function toggle() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      window.speechSynthesis?.cancel();
      recognitionRef.current.start();
      setListening(true);
    }
  }

  if (supported === false) {
    return (
      <div className="assist__body center">
        <p className="small muted">
          This browser doesn&apos;t support voice input. Chrome or Edge on desktop, or Safari
          on iOS, will work — or just use the Chat tab.
        </p>
      </div>
    );
  }

  return (
    <div className="assist__body center">
      <button
        type="button"
        className="mic"
        data-listening={listening}
        onClick={toggle}
        disabled={busy}
        aria-pressed={listening}
        aria-label={listening ? 'Stop listening' : 'Start listening'}
      >
        <Icon name="mic" size={34} />
      </button>

      <p style={{ minHeight: '3rem', marginTop: '1rem' }}>
        {transcript || (
          <span className="muted small">
            {listening ? 'Listening…' : 'Tap the microphone and say what you need.'}
          </span>
        )}
      </p>

      {lastReply && !listening && (
        <p className="small" style={{ textAlign: 'left', padding: '0.75rem', background: 'var(--steel-100)', borderRadius: 'var(--r-md)' }}>
          {lastReply}
        </p>
      )}

      <label className="row small muted" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <input type="checkbox" checked={speakBack} onChange={(e) => setSpeakBack(e.target.checked)} />
        Read replies aloud
      </label>
    </div>
  );
}
