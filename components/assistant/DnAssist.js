'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VoicePanel from './VoicePanel';
import HistoryPanel from './HistoryPanel';

const TABS = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'voice', label: 'Voice', icon: '🎙' },
  { key: 'forms', label: 'Forms', icon: '📋' },
  { key: 'history', label: 'History', icon: '🕘' },
];

const QUICK_ACTIONS = [
  { label: 'Book a service', message: 'I need to book a service.' },
  { label: 'Where are you?', message: 'Where is the workshop and when are you open?' },
  { label: 'What do you charge?', message: 'What do you charge for a general service?' },
  { label: 'Share feedback', message: 'I would like to share some feedback.' },
];

const GREETING = {
  role: 'assistant',
  content:
    "Hello — I'm DN Assist. Ask me about a service, our prices, or what's happening with your car. What can I help with?",
};

export default function DnAssist({ signedIn }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);
  const router = useRouter();

  // Keep the newest message in view as the reply streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // Escape closes the panel, the way every other overlay on the web does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      setInput('');
      setMessages((m) => [...m, { role: 'user', content: trimmed }]);
      setBusy(true);

      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, conversationId }),
        });

        if (!res.ok) {
          const { error } = await res.json().catch(() => ({}));
          setMessages((m) => [
            ...m,
            {
              role: 'assistant',
              content:
                error ??
                "I couldn't reach the workshop's system just then. Please try again.",
            },
          ]);
          return;
        }

        const id = res.headers.get('X-Conversation-Id');
        if (id) setConversationId(id);

        // Render the reply as it arrives rather than after it finishes.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        setMessages((m) => [...m, { role: 'assistant', content: '' }]);

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: acc }]);
        }
      } catch {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, conversationId]
  );

  function loadConversation(id, loaded) {
    setConversationId(id);
    setMessages(loaded.length ? loaded : [GREETING]);
    setTab('chat');
  }

  function startFresh() {
    setConversationId(null);
    setMessages([GREETING]);
    setTab('chat');
  }

  return (
    <>
      <button
        type="button"
        className="assist__launcher"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close DN Assist' : 'Open DN Assist'}
      >
        <span aria-hidden>{open ? '✕' : 'DN'}</span>
      </button>

      {open && (
        <section className="assist" role="dialog" aria-label="DN Assist">
          <header className="assist__head">
            <div className="row">
              <span className="assist__avatar" aria-hidden>DN</span>
              <div>
                <strong style={{ display: 'block', lineHeight: 1.2 }}>DN Assist</strong>
                <span className="small" style={{ color: 'var(--steel-300)' }}>
                  {busy ? 'Typing…' : 'Here to help'}
                </span>
              </div>
            </div>
            <button type="button" className="assist__close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </header>

          <nav className="assist__tabs" aria-label="Assistant modes">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className="assist__tab"
                data-active={tab === t.key}
                onClick={() => setTab(t.key)}
              >
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>

          {!signedIn ? (
            <div className="assist__body center">
              <p className="small muted">
                Sign in and I can talk about your bookings, your vehicles and your quotes.
              </p>
              <button type="button" className="btn" onClick={() => router.push('/login')}>
                Sign in
              </button>
            </div>
          ) : (
            <>
              {tab === 'chat' && (
                <>
                  <div className="assist__body" ref={scrollRef}>
                    {messages.map((m, i) => (
                      <div key={i} className="bubble" data-role={m.role}>
                        {m.content || <TypingDots />}
                      </div>
                    ))}
                    {busy && messages[messages.length - 1]?.role === 'user' && (
                      <div className="bubble" data-role="assistant"><TypingDots /></div>
                    )}
                  </div>

                  <div className="assist__quick">
                    {QUICK_ACTIONS.map((q) => (
                      <button key={q.label} type="button" className="chip" onClick={() => send(q.message)} disabled={busy}>
                        {q.label}
                      </button>
                    ))}
                  </div>

                  <form
                    className="assist__composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(input);
                    }}
                  >
                    <input
                      className="input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about a service, a price, your car…"
                      aria-label="Message DN Assist"
                      disabled={busy}
                    />
                    <button type="submit" className="btn" disabled={busy || !input.trim()}>
                      Send
                    </button>
                  </form>
                </>
              )}

              {tab === 'voice' && <VoicePanel onSend={send} busy={busy} lastReply={
                [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''
              } />}

              {tab === 'forms' && (
                <div className="assist__body">
                  <p className="small muted">Jump straight to what you need.</p>
                  <div className="grid" style={{ gap: '0.6rem' }}>
                    <button type="button" className="pick" onClick={() => router.push('/portal/book')}>
                      <strong>Book a service</strong>
                      <span className="small muted">Five steps, about a minute.</span>
                    </button>
                    <button type="button" className="pick" onClick={() => router.push('/portal/bookings')}>
                      <strong>Check my repair</strong>
                      <span className="small muted">Live status and the full repair log.</span>
                    </button>
                    <button type="button" className="pick" onClick={() => router.push('/portal/quotes')}>
                      <strong>Approve a quote</strong>
                      <span className="small muted">Nothing gets fixed until you say yes.</span>
                    </button>
                    <button type="button" className="pick" onClick={() => send('I would like to share some feedback.')}>
                      <strong>Share feedback</strong>
                      <span className="small muted">Tell us how we did.</span>
                    </button>
                  </div>
                </div>
              )}

              {tab === 'history' && (
                <HistoryPanel
                  activeId={conversationId}
                  onOpen={loadConversation}
                  onNew={startFresh}
                />
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

function TypingDots() {
  return (
    <span className="typing" aria-label="Typing">
      <i /><i /><i />
    </span>
  );
}
