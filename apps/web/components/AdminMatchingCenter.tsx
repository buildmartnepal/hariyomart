'use client';
import { useState } from 'react';
import { BadgeCheck, LocateFixed, Search, Sparkles, Truck } from 'lucide-react';

type MatchRow = {
  slug: string;
  name: string;
  price: number;
  unit?: string;
  district?: string;
  distanceKm?: number;
  matchScore?: number;
  matchReasons?: string[];
  image?: string;
};

type MatchResponse = {
  data?: MatchRow[];
  matching?: { engine?: string; factors?: string[] };
  error?: string;
};

export function AdminMatchingCenter() {
  const [lat, setLat] = useState('27.7172');
  const [lng, setLng] = useState('85.3240');
  const [radius, setRadius] = useState('35');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);

  async function runMatch() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ lat, lng, radiusKm: radius, limit: '8' });
      if (query.trim()) qs.set('q', query.trim());
      if (category.trim()) qs.set('category', category.trim());
      const response = await fetch(`/api/marketplace/nearby?${qs.toString()}`, { credentials: 'include' });
      const payload = await response.json() as MatchResponse;
      setResult(response.ok ? payload : { error: payload.error || `HTTP ${response.status}` });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Matching request failed' });
    } finally {
      setLoading(false);
    }
  }

  const factors = result?.matching?.factors || [
    'Delivery distance + seller service radius',
    'Live stock depth',
    'Harvest freshness',
    'Rating + verified seller trust',
    'Search/category intent',
    'Organic / wholesale / subscription fit',
    'Budget fit',
  ];

  return <section className="matching-admin-v85">
    <div className="platform-control-heading">
      <div><span className="eyebrow">DISCOVERY INTELLIGENCE</span><h2>Hariyo Match v3</h2><p>Test the same explainable ranking engine used by Nearby, the shop and mobile discovery. Hard delivery and stock constraints are applied before ranking.</p></div>
      <span className="match-engine-live"><Sparkles size={15}/> Operational</span>
    </div>
    <div className="matching-admin-grid">
      <div className="access-panel matching-test-panel">
        <div className="access-panel-title"><LocateFixed/><div><h3>Match simulator</h3><p>Use a buyer location to inspect serviceability and ranking reasons.</p></div></div>
        <div className="matching-fields">
          <label>Latitude<input value={lat} onChange={(e)=>setLat(e.target.value)} inputMode="decimal" /></label>
          <label>Longitude<input value={lng} onChange={(e)=>setLng(e.target.value)} inputMode="decimal" /></label>
          <label>Radius km<input value={radius} onChange={(e)=>setRadius(e.target.value)} inputMode="decimal" /></label>
          <label>Category<input value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="vegetables" /></label>
          <label className="matching-query-field">Search intent<input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="tomato, apple, tea…" /></label>
        </div>
        <button className="btn btn-primary" type="button" onClick={runMatch} disabled={loading}><Search size={16}/>{loading ? 'Matching…' : 'Run smart match'}</button>
        {result?.error ? <p className="password-change-message">{result.error}</p> : null}
      </div>
      <div className="access-panel">
        <div className="access-panel-title"><BadgeCheck/><div><h3>Ranking rules</h3><p>Transparent signals keep marketplace discovery understandable and auditable.</p></div></div>
        <div className="matching-factor-list">{factors.map((factor)=><div key={factor}><span/><b>{factor}</b></div>)}</div>
      </div>
    </div>
    {result?.data ? <div className="access-panel matching-results-panel">
      <div className="access-panel-title"><Truck/><div><h3>Top serviceable products</h3><p>{result.matching?.engine || 'Hariyo Match v3'} returned {result.data.length} ranked results.</p></div></div>
      <div className="matching-results-list">{result.data.length ? result.data.map((item,index)=><div className="matching-result-row" key={item.slug}>
        <span className="matching-rank">#{index+1}</span><div className="matching-result-main"><b>{item.name}</b><small>{item.district || 'Nepal'} · {item.distanceKm ?? '—'} km · NPR {item.price}{item.unit ? `/${item.unit}` : ''}</small><div className="match-reasons">{item.matchReasons?.map((reason)=><span key={reason}>{reason}</span>)}</div></div><strong>{item.matchScore ?? 0}%</strong>
      </div>) : <p className="muted-copy">No product is serviceable for this location/filter combination.</p>}</div>
    </div> : null}
  </section>;
}
