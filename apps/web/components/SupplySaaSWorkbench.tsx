'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  Layers3,
  LoaderCircle,
  Radio,
  ShieldCheck,
  Workflow,
  RefreshCw,
  Rows3,
} from 'lucide-react';
import { supplyCapabilities, supplyModuleCopy, type SupplySection } from '@/lib/supply-saas';

 
const liveEndpointBySection: Partial<Record<SupplySection, string>> = {
  'business-center': '/api/supply/saas-profile',
  'supply-planning': '/api/supply/harvest-plans',
  procurement: '/api/supply/purchase-orders',
  'lots-quality': '/api/supply/lots',
  warehouses: '/api/supply/warehouses',
  pricing: '/api/supply/price-lists',
  wholesale: '/api/supply/customers',
  'trade-catalog': '/api/products?limit=50&exportReady=true',
  'trade-desk': '/api/export/inquiries',
  'delivery-routes': '/api/supply/delivery-routes',
  subscriptions: '/api/supply/subscriptions',
  reports: '/api/supply/reports',
  'team-access': '/api/supply/team',
  'saas-tenants': '/api/supply/platform/tenants',
  'plans-billing': '/api/supply/platform/plans',
  'supply-network': '/api/supply/platform/network',
  'platform-events': '/api/supply/platform/events',
  'data-platform': '/api/system/supply-stack',
};

function summarizePayload(payload: unknown): Array<[string, unknown]> {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const arrayEntry = Object.entries(record).find(([, value]) => Array.isArray(value));
  if (arrayEntry) {
    return (arrayEntry[1] as unknown[])
      .slice(0, 8)
      .map((value, index): [string, unknown] => [String(index + 1), value]);
  }
  return Object.entries(record)
    .filter(([key]) => key !== 'timestamp')
    .slice(0, 10);
}


type FarmerSaaSProfile = {
  tenant?: { name?: string; status?: string; province?: string | null; district?: string | null };
  subscription?: { planCode?: string; planName?: string; status?: string; monthlyPriceNpr?: number; trialEndsAt?: string | null };
  usage?: {
    members?: { used?: number; limit?: number; percent?: number };
    products?: { used?: number; limit?: number; percent?: number };
    warehouses?: { used?: number; limit?: number; percent?: number };
    stockUnits?: number;
    activityThisMonth?: number;
    activityByMetric?: Array<{ metric_key?: string; quantity?: number }>;
  };
  performance30d?: {
    salesOrders?: number;
    revenueNpr?: number;
    purchaseOrders?: number;
    procurementNpr?: number;
    activeProduceSubscriptions?: number;
    activeBusinessCustomers?: number;
  };
};

function asFarmerSaaSProfile(value: unknown): FarmerSaaSProfile | null {
  return value && typeof value === 'object' ? (value as FarmerSaaSProfile) : null;
}

function npr(value: unknown) {
  return `NPR ${new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
}

type PlatformStatus = {
  version?: string;
  mode?: string;
  d1?: { schemaReady?: boolean; detail?: string };
  auth?: { turnstileConfigured?: boolean; detail?: string };
  cloudflare?: {
    r2?: boolean;
    kv?: boolean;
    queues?: boolean;
    durableObjects?: boolean;
  };
};

export function SupplySaaSWorkbench({ section, role }: { section: SupplySection; role: 'Farmer' | 'Admin' }) {
  const copy = supplyModuleCopy[section];
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [liveData, setLiveData] = useState<unknown>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveError, setLiveError] = useState('');
  const liveEndpoint = liveEndpointBySection[section];

  const refreshLiveData = useCallback(async () => {
    if (!liveEndpoint) return;
    setLiveBusy(true);
    setLiveError('');
    try {
      const response = await fetch(liveEndpoint, { cache: 'no-store', credentials: 'include' });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error((payload as { error?: string } | null)?.error || 'Unable to load module data');
      setLiveData(payload);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : 'Unable to load module data');
      setLiveData(null);
    } finally {
      setLiveBusy(false);
    }
  }, [liveEndpoint]);

  useEffect(() => {
    let active = true;
    fetch('/api/system/supply-stack', { cache: 'no-store', credentials: 'include' })
      .then(async (response): Promise<PlatformStatus | null> => {
        if (!response.ok) return null;
        return (await response.json()) as PlatformStatus;
      })
      .then((payload) => {
        if (active) setStatus(payload);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void refreshLiveData();
  }, [refreshLiveData]);

  const liveRows = summarizePayload(liveData);
  const farmerSaaS = section === 'business-center' ? asFarmerSaaSProfile(liveData) : null;

  return (
    <div className="supply-saas-workbench">
      <section className="supply-hero-card">
        <div>
          <span className="eyebrow">V10 NEPAL ORIGIN SUPPLY & EXPORT OS</span>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <div className="supply-stack-badge">
          <Cloud size={18} /> Cloudflare Workers <span>+</span> <Database size={18} /> D1 + Durable Objects
        </div>
      </section>

      <div className="supply-status-grid">
        <StatusCard
          icon={<Database />}
          label="Cloudflare D1"
          value={!status ? 'Checking' : status.d1?.schemaReady ? 'v8 schema ready' : 'Migration needed'}
          note={status?.d1?.detail || 'Tenant, procurement, traceability, orders, delivery and accounting records'}
          pending={!status}
        />
        <StatusCard icon={<ShieldCheck />} label="Tenant security" value="Worker enforced" note="D1 memberships + fresh role checks + tenant-scoped service APIs" />
        <StatusCard icon={<Radio />} label="Realtime" value="Durable Object hub" note="Tenant-scoped Hibernatable WebSocket architecture for orders, stock and delivery events" />
        <StatusCard icon={<Workflow />} label="Queues + Workflows" value="Durable async" note="Order fulfillment, subscriptions, audit, exports and integrations stay off request latency" />
      </div>

      <section className="supply-module-card">
        <div className="supply-section-heading">
          <div>
            <span className="eyebrow">MODULE CAPABILITY</span>
            <h3>{role === 'Admin' ? 'Platform controls' : 'Tenant workspace controls'}</h3>
          </div>
          <BadgeCheck />
        </div>
        <div className="supply-bullet-grid">
          {copy.bullets.map((item) => (
            <div key={item}><CheckCircle2 size={18} /><span>{item}</span></div>
          ))}
        </div>
      </section>


      {section === 'business-center' && farmerSaaS && (
        <>
          <div className="supply-status-grid">
            <StatusCard
              icon={<BadgeCheck />}
              label="SaaS plan"
              value={`${farmerSaaS.subscription?.planName || 'Starter'} · ${farmerSaaS.subscription?.status || 'trialing'}`}
              note={`${npr(farmerSaaS.subscription?.monthlyPriceNpr)} / month · tenant ${farmerSaaS.tenant?.status || 'active'}`}
            />
            <StatusCard
              icon={<Database />}
              label="30-day revenue"
              value={npr(farmerSaaS.performance30d?.revenueNpr)}
              note={`${farmerSaaS.performance30d?.salesOrders || 0} sales orders · ${farmerSaaS.performance30d?.activeBusinessCustomers || 0} B2B customers`}
            />
            <StatusCard
              icon={<Workflow />}
              label="Procurement"
              value={npr(farmerSaaS.performance30d?.procurementNpr)}
              note={`${farmerSaaS.performance30d?.purchaseOrders || 0} purchase orders in the last 30 days`}
            />
            <StatusCard
              icon={<Radio />}
              label="Recurring boxes"
              value={String(farmerSaaS.performance30d?.activeProduceSubscriptions || 0)}
              note={`${farmerSaaS.usage?.stockUnits || 0} units currently represented in tenant product stock`}
            />
          </div>
          <section className="supply-module-card">
            <div className="supply-section-heading">
              <div>
                <span className="eyebrow">PLAN USAGE</span>
                <h3>Grow without losing control of limits</h3>
              </div>
              <Layers3 />
            </div>
            <div className="supply-bullet-grid">
              <div><CheckCircle2 size={18} /><span>Team: {farmerSaaS.usage?.members?.used || 0} / {farmerSaaS.usage?.members?.limit || 0} ({farmerSaaS.usage?.members?.percent || 0}%)</span></div>
              <div><CheckCircle2 size={18} /><span>Products: {farmerSaaS.usage?.products?.used || 0} / {farmerSaaS.usage?.products?.limit || 0} ({farmerSaaS.usage?.products?.percent || 0}%)</span></div>
              <div><CheckCircle2 size={18} /><span>Warehouses: {farmerSaaS.usage?.warehouses?.used || 0} / {farmerSaaS.usage?.warehouses?.limit || 0} ({farmerSaaS.usage?.warehouses?.percent || 0}%)</span></div>
              <div><CheckCircle2 size={18} /><span>Farmer OS actions this month: {farmerSaaS.usage?.activityThisMonth || 0}</span></div>
              <div><CheckCircle2 size={18} /><span>Workspace: {farmerSaaS.tenant?.name || 'Farmer business'} · {farmerSaaS.tenant?.district || farmerSaaS.tenant?.province || 'Nepal'}</span></div>
            </div>
          </section>
        </>
      )}

      {liveEndpoint && (
        <section className="supply-module-card supply-live-card">
          <div className="supply-section-heading">
            <div>
              <span className="eyebrow">LIVE CLOUDFLARE DATA</span>
              <h3>{role === 'Admin' ? 'Platform records' : 'Tenant operational records'}</h3>
            </div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => void refreshLiveData()} disabled={liveBusy}>
              {liveBusy ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} Refresh
            </button>
          </div>
          {liveError ? (
            <div className="supply-live-empty"><Rows3 size={18} /><span>{liveError}</span></div>
          ) : liveRows.length ? (
            <div className="supply-live-grid">
              {liveRows.map(([key, value]) => (
                <div className="supply-live-row" key={key}>
                  <strong>{key.replaceAll('_', ' ')}</strong>
                  <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="supply-live-empty"><Rows3 size={18} /><span>{liveBusy ? 'Loading module data…' : 'No records yet. Create the first record through this module API.'}</span></div>
          )}
        </section>
      )}

      <section className="supply-module-card">
        <div className="supply-section-heading">
          <div>
            <span className="eyebrow">END-TO-END</span>
            <h3>Fresh produce feature map</h3>
          </div>
          <Layers3 />
        </div>
        <div className="supply-capability-grid">
          {supplyCapabilities.map(({ label, icon: Icon }) => (
            <div className="supply-capability" key={label}><Icon size={18} /><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="supply-workflow">
        <strong>Operational flow</strong>
        <span>Farm / Supplier</span><b>→</b><span>Purchase Order</span><b>→</b><span>Quality + Lot</span><b>→</b><span>Warehouse</span><b>→</b><span>Order Allocation</span><b>→</b><span>Route</span><b>→</b><span>Delivery + Settlement</span>
      </section>

      <div className="supply-guide-callout">
        <div>
          <b>Production setup is documented step-by-step.</b>
          <span>Use the v8 Cloudflare-only guide to apply D1 migrations, deploy services, configure Turnstile and enable production cutover.</span>
        </div>
        <Link href="/how-it-works" className="btn btn-secondary">How Hariyo works <ExternalLink size={15} /></Link>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, note, pending = false }: { icon: React.ReactNode; label: string; value: string; note: string; pending?: boolean }) {
  return (
    <div className="supply-status-card">
      <div className="supply-status-icon">{pending ? <LoaderCircle className="spin" /> : icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
