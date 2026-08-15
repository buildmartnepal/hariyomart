'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CalendarDays, Leaf, MapPin, PackageCheck, QrCode } from 'lucide-react';

type TracePayload = {
  lot?: Record<string, unknown>;
  events?: Array<Record<string, unknown> & { details?: Record<string, unknown> }>;
};

function t(v: unknown) { return v == null ? '' : String(v); }

export function TraceabilityPublicView({ token }: { token: string }) {
  const [payload, setPayload] = useState<TracePayload | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/trace/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => { const p = await r.json() as TracePayload & { error?: string }; if (!r.ok) throw new Error(p.error || 'Traceability record unavailable'); return p; })
      .then(setPayload).catch((e) => setError(e instanceof Error ? e.message : 'Traceability record unavailable'));
  }, [token]);
  const lot = payload?.lot || {};
  return <main className="trace-public-page"><section className="trace-public-hero"><div className="container"><Link href="/" className="trace-back">← Hariyo Mart Nepal</Link><div className="trace-public-badge"><QrCode size={18}/> FARM-TO-MARKET TRACE</div><h1>{payload ? t(lot.product_name) : 'Produce traceability'}</h1><p>See where this produce came from and the key handling events recorded by the Hariyo Mart supply network.</p></div></section><section className="container trace-public-body">{error ? <div className="farmer-os-error">{error}</div> : !payload ? <div className="farmer-os-empty">Loading verified lot history…</div> : <><div className="trace-summary-grid"><div><Leaf/><span>Product</span><b>{t(lot.product_name)}</b></div><div><PackageCheck/><span>Lot</span><b>{t(lot.lot_code)}</b></div><div><MapPin/><span>Origin</span><b>{t(lot.farm_name) || t(lot.origin_label) || 'Hariyo supplier'}</b><small>{[t(lot.farm_district), t(lot.farm_province)].filter(Boolean).join(', ')}</small></div><div><CalendarDays/><span>Harvest</span><b>{t(lot.harvest_date) || 'Recorded by supplier'}</b></div><div><BadgeCheck/><span>Grade</span><b>{t(lot.grade) || 'Standard'}</b><small>{Number(lot.organic || 0) ? 'Organic listing' : 'Marketplace verified'}</small></div></div><section className="trace-timeline"><h2>Trace timeline</h2>{payload.events?.length ? payload.events.map((e, i) => <div className="trace-event" key={`${t(e.event_at)}-${i}`}><div className="trace-dot"/><div><span>{t(e.event_type).replaceAll('_',' ')}</span><h3>{t(e.location_label) || 'Hariyo supply network'}</h3><p>{new Date(t(e.event_at)).toLocaleString('en-NP')} {e.actor_name ? `· ${t(e.actor_name)}` : ''}</p></div></div>) : <div className="farmer-os-empty">The lot is registered for traceability; additional handling events will appear here.</div>}</section></>}</section></main>;
}
