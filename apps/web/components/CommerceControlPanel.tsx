'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, PackageCheck, RefreshCw, RotateCcw, ShoppingCart, Tag } from 'lucide-react';
import { useAuth } from './AuthProvider';

type Summary = {
  last30Days?: { orders?: number; grossNpr?: number };
  openReturns?: number;
  activeCoupons?: number;
  lowStockProducts?: number;
  expiringLots?: number;
};
type ReturnRow = {
  id: string;
  rma_number?: string;
  order_number?: string;
  status?: string;
  reason?: string;
  buyer_name?: string;
  item_count?: number;
  requested_at?: string;
};
type AlertRule = {
  id: string;
  rule_type: string;
  threshold_value?: number | null;
  threshold_days?: number | null;
  product_name?: string | null;
  active?: number;
};
type OrderItem = {
  id?: string;
  _id?: string;
  tenantId?: string;
  tenant_id?: string;
  productName?: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
};
type BuyerOrder = {
  id?: string;
  _id?: string;
  orderNumber?: string;
  order_number?: string;
  status?: string;
  items?: OrderItem[];
};

const finalStatuses = new Set(['rejected', 'refunded', 'replaced', 'closed']);

export function CommerceControlPanel({ role }: { role: 'Farmer' | 'Admin' | 'Account' }) {
  const auth = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sellerMode = role !== 'Account';

  const load = useCallback(async () => {
    if (!auth.ready || !auth.user) return;
    setBusy(true);
    setError('');
    try {
      if (sellerMode) {
        const [summaryData, returnData, alertData] = await Promise.all([
          auth.apiRequest<Summary>('/commerce/summary'),
          auth.apiRequest<{ data?: ReturnRow[] }>('/commerce/tenant/returns'),
          auth.apiRequest<{ data?: AlertRule[] }>('/commerce/inventory-alerts'),
        ]);
        setSummary(summaryData);
        setReturns(Array.isArray(returnData.data) ? returnData.data : []);
        setAlerts(Array.isArray(alertData.data) ? alertData.data : []);
      } else {
        const [returnData, orderData] = await Promise.all([
          auth.apiRequest<{ data?: ReturnRow[] }>('/commerce/returns'),
          auth.apiRequest<BuyerOrder[]>('/orders/mine'),
        ]);
        setReturns(Array.isArray(returnData.data) ? returnData.data : []);
        setOrders(Array.isArray(orderData) ? orderData : []);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load commerce controls');
    } finally {
      setBusy(false);
    }
  }, [auth, sellerMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const returnableItems = useMemo(
    () =>
      orders.flatMap((order) => {
        if (!['delivered', 'partially_fulfilled', 'confirmed'].includes(order.status || '')) return [];
        return (order.items || []).map((item) => ({
          orderId: String(order.id || order._id || ''),
          orderNumber: String(order.orderNumber || order.order_number || ''),
          itemId: String(item.id || item._id || ''),
          tenantId: String(item.tenantId || item.tenant_id || ''),
          label: `${order.orderNumber || order.order_number} · ${item.productName || item.product_name || 'Item'}`,
          quantity: Number(item.quantity || 1),
          unit: item.unit || '',
        }));
      }),
    [orders],
  );

  async function updateReturn(id: string, status: string) {
    setBusy(true);
    setError('');
    try {
      await auth.apiRequest(`/commerce/tenant/returns/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(status === 'refunded'
            ? { resolution: 'refund' }
            : status === 'replaced'
              ? { resolution: 'replacement' }
              : status === 'rejected'
                ? { resolution: 'reject' }
                : {}),
        }),
      });
      setNotice(`Return updated to ${status.replaceAll('_', ' ')}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update return');
    } finally {
      setBusy(false);
    }
  }

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const ruleType = String(data.get('ruleType') || 'low_stock');
      const threshold = Number(data.get('threshold') || 0);
      await auth.apiRequest('/commerce/inventory-alerts', {
        method: 'POST',
        body: JSON.stringify({
          ruleType,
          ...(ruleType === 'expiry' ? { thresholdDays: threshold } : { thresholdValue: threshold }),
        }),
      });
      event.currentTarget.reset();
      setNotice('Inventory alert rule created.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create alert rule');
    } finally {
      setBusy(false);
    }
  }

  async function requestReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selected = returnableItems.find((item) => item.itemId === data.get('orderItemId'));
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await auth.apiRequest('/commerce/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selected.orderId,
          tenantId: selected.tenantId,
          reason: String(data.get('reason') || 'Quality issue'),
          note: String(data.get('note') || ''),
          items: [
            {
              orderItemId: selected.itemId,
              quantity: Number(data.get('quantity') || 1),
              condition: String(data.get('condition') || 'quality_issue'),
            },
          ],
        }),
      });
      event.currentTarget.reset();
      setNotice('Return request created. Hariyo and the seller can now track it by RMA.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create return request');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return <div className="workspace-empty">Loading secure commerce workspace…</div>;
  if (!auth.user)
    return <div className="workspace-empty">Sign in to use returns, synchronized commerce and tenant controls.</div>;

  return (
    <div className="commerce-control">
      <section className="data-panel">
        <div className="commerce-toolbar">
          <div className="data-panel-head" style={{ marginBottom: 0 }}>
            <div>
              <span className="eyebrow">CLOUDFLARE COMMERCE CONTROL</span>
              <h2>{sellerMode ? 'Sales, returns & stock risk' : 'Returns & post-purchase care'}</h2>
              <p>
                {sellerMode
                  ? 'Live D1 commerce state for the active tenant, with tenant-scoped write controls.'
                  : 'Create and track quality, damage and wrong-item cases against your real order items.'}
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void load()}>
            <RefreshCw size={15} /> {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {error && <div className="workspace-error">{error}</div>}
        {notice && <div className="commerce-sync-note"><PackageCheck size={14} /> {notice}</div>}
      </section>

      {sellerMode && (
        <div className="commerce-kpis">
          <Kpi icon={<ShoppingCart size={17} />} label="Orders · 30 days" value={summary?.last30Days?.orders || 0} />
          <Kpi icon={<Tag size={17} />} label="Gross · 30 days" value={`NPR ${Number(summary?.last30Days?.grossNpr || 0).toLocaleString()}`} />
          <Kpi icon={<RotateCcw size={17} />} label="Open returns" value={summary?.openReturns || 0} />
          <Kpi icon={<AlertTriangle size={17} />} label="Low stock" value={summary?.lowStockProducts || 0} />
          <Kpi icon={<AlertTriangle size={17} />} label="Expiring lots" value={summary?.expiringLots || 0} />
        </div>
      )}

      {!sellerMode && (
        <section className="data-panel">
          <div className="data-panel-head">
            <div>
              <span className="eyebrow">NEW RETURN</span>
              <h2>Open a return / quality case</h2>
              <p>Only eligible items from your authenticated order history are selectable.</p>
            </div>
          </div>
          {returnableItems.length ? (
            <form className="workspace-form" onSubmit={requestReturn}>
              <label>
                Order item
                <select name="orderItemId" required>
                  {returnableItems.map((item) => (
                    <option key={item.itemId} value={item.itemId}>{item.label} · max {item.quantity} {item.unit}</option>
                  ))}
                </select>
              </label>
              <div className="form-2">
                <label>
                  Reason
                  <input name="reason" required defaultValue="Produce quality issue" />
                </label>
                <label>
                  Quantity
                  <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required />
                </label>
              </div>
              <label>
                Condition
                <select name="condition" defaultValue="quality_issue">
                  <option value="quality_issue">Quality issue</option>
                  <option value="spoiled">Spoiled</option>
                  <option value="damaged">Damaged</option>
                  <option value="wrong_item">Wrong item</option>
                  <option value="unopened">Unopened</option>
                  <option value="unknown">Other / unknown</option>
                </select>
              </label>
              <label>
                Notes
                <textarea name="note" rows={3} placeholder="Describe the issue and preferred resolution." />
              </label>
              <button className="btn btn-primary" disabled={busy}>Create RMA request</button>
            </form>
          ) : (
            <div className="workspace-empty">No delivered or return-eligible order items are available right now.</div>
          )}
        </section>
      )}

      <section className="data-panel">
        <div className="data-panel-head">
          <div>
            <span className="eyebrow">RMA / RETURNS</span>
            <h2>{sellerMode ? 'Tenant return queue' : 'My return requests'}</h2>
            <p>Every request keeps an RMA number, order link, reason, status and resolution trail.</p>
          </div>
        </div>
        {returns.length ? (
          <div className="workspace-table">
            <div className="workspace-tr head">
              <span>RMA / Order</span><span>Status</span><span>Reason</span><span>{sellerMode ? 'Buyer' : 'Requested'}</span><span>Action</span>
            </div>
            {returns.map((row) => (
              <div className="workspace-tr" key={row.id}>
                <span><b>{row.rma_number || row.id}</b><small>{row.order_number || 'Order'}</small></span>
                <span><i className={`status-chip status-${String(row.status || '').replaceAll('_', '-')}`}>{row.status || 'requested'}</i></span>
                <span>{row.reason || 'Return request'}<small>{row.item_count ? `${row.item_count} item(s)` : ''}</small></span>
                <span>{sellerMode ? row.buyer_name || 'Buyer' : String(row.requested_at || '').slice(0, 10)}</span>
                <span>
                  {sellerMode && !finalStatuses.has(row.status || '') ? (
                    <div className="commerce-return-actions">
                      {row.status === 'requested' && <button className="primary" disabled={busy} onClick={() => void updateReturn(row.id, 'approved')}>Approve</button>}
                      {row.status === 'approved' && <button className="primary" disabled={busy} onClick={() => void updateReturn(row.id, 'received')}>Received</button>}
                      {row.status === 'received' && <button className="primary" disabled={busy} onClick={() => void updateReturn(row.id, 'refunded')}>Refunded</button>}
                      <button disabled={busy} onClick={() => void updateReturn(row.id, 'rejected')}>Reject</button>
                    </div>
                  ) : <small>{sellerMode ? 'Complete' : 'Tracked by seller'}</small>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">No return requests yet.</div>
        )}
      </section>

      {sellerMode && (
        <section className="data-panel">
          <div className="data-panel-head">
            <div>
              <span className="eyebrow">INVENTORY SAFETY</span>
              <h2>Alert rules</h2>
              <p>Define tenant-wide stock or expiry thresholds. Product-specific rules can be added through the API/product studio.</p>
            </div>
          </div>
          <form className="commerce-alert-form" onSubmit={createAlert}>
            <label>
              Rule
              <select name="ruleType" defaultValue="low_stock">
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="expiry">Expiry window</option>
                <option value="overstock">Overstock</option>
              </select>
            </label>
            <label>
              Threshold value / days
              <input name="threshold" type="number" min="0" step="1" defaultValue="10" />
            </label>
            <button className="btn btn-primary" disabled={busy}>Add rule</button>
          </form>
          <div className="workspace-table" style={{ marginTop: 16 }}>
            {alerts.length ? alerts.map((rule) => (
              <div className="workspace-tr" key={rule.id}>
                <span><b>{rule.product_name || 'All tenant products'}</b><small>{rule.rule_type.replaceAll('_', ' ')}</small></span>
                <span>{rule.threshold_value ?? rule.threshold_days ?? '—'}</span>
                <span><i className={`status-chip ${rule.active ? 'status-active' : ''}`}>{rule.active ? 'active' : 'paused'}</i></span>
                <span>Cloudflare D1</span>
                <span><small>Tenant scoped</small></span>
              </div>
            )) : <div className="workspace-empty">No custom inventory alert rules yet.</div>}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="commerce-kpi"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}
