'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchVehicles } from './actions';
import Icon from '@/components/Icon';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.length >= 2) {
      setSearching(true);
      const timer = setTimeout(() => {
        searchVehicles(query).then(res => {
          setResults(res);
          setSearching(false);
        });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelect = (registration) => {
    setQuery(registration);
    setResults([]);
    router.push(`/worker/history?q=${registration}`);
  };

  return (
    <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '2rem' }}>
      <label className="field">
        <span>Vehicle registration</span>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input 
            type="search" 
            className="input" 
            placeholder="CAB-1234" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            autoComplete="off"
          />
          <button className="btn" onClick={() => handleSelect(query)}>Search</button>
        </div>
      </label>

      {results.length > 0 && (
        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, padding: 0, marginTop: '4px', overflow: 'hidden' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {results.map(v => (
              <li key={v.registration}>
                <button 
                  type="button" 
                  onClick={() => handleSelect(v.registration)}
                  style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--surface-sunken)' }}
                >
                  <strong style={{ display: 'block', fontSize: '1.1em' }}>{v.registration}</strong>
                  <span className="small muted">{v.make} {v.model}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
