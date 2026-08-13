'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  MapPinned,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Store,
  TrendingUp,
  Truck,
  UsersRound,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

type Props = { role: 'Farmer' | 'Admin' | 'Account'; section: string };
type Bundle = {
  dash: any;
  products: any[];
  orders: any[];
  tenants: any[];
  inventoryEvents: any[];
};
const nf = (n: any) => new Intl.NumberFormat('en-NP').format(Number(n || 0));
const money = (n: any) => `NPR ${nf(Math.round(Number(n || 0)))}`;
export function WorkspaceLive({ role, section }: Props) {
  const auth = useAuth();
  const [data, setData] = useState<Bundle>({
    dash: null,
    products: [],
    orders: [],
    tenants: [],
    inventoryEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const authorized =
    role === 'Admin'
      ? auth.user?.role === 'admin'
      : role === 'Farmer'
        ? ['farmer', 'vendor', 'admin'].includes(auth.user?.role || '')
        : ['customer', 'admin'].includes(auth.user?.role || '');
  const load = useCallback(async () => {
    if (!auth.ready) {
      return;
    }
    if (!auth.user || !authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint =
        role === 'Admin'
          ? '/dashboard/admin'
          : role === 'Farmer'
            ? '/dashboard/farmer'
            : '/dashboard/buyer';
      const dash = await auth.apiRequest(endpoint);
      const requests: Promise<any>[] = [];
      const keys: string[] = [];
      if (role === 'Farmer' && ['products', 'inventory', 'overview'].includes(section)) {
        keys.push('products');
        requests.push(auth.apiRequest('/products/seller/mine'));
      }
      if (role === 'Farmer' && section === 'inventory') {
        keys.push('inventoryEvents');
        requests.push(auth.apiRequest('/inventory/events'));
      }
      if (
        role === 'Farmer' &&
        ['orders', 'payments', 'payouts', 'customers', 'overview'].includes(section)
      ) {
        keys.push('orders');
        requests.push(auth.apiRequest('/orders/seller'));
      }
      if (role === 'Admin' && ['tenants', 'farmer-onboarding', 'overview'].includes(section)) {
        keys.push('tenants');
        requests.push(auth.apiRequest('/tenants'));
      }
      if (
        role === 'Admin' &&
        ['products', 'inventory', 'categories', 'overview'].includes(section)
      ) {
        keys.push('products');
        requests.push(auth.apiRequest('/products/seller/mine'));
      }
      if (role === 'Admin' && ['orders', 'settlements', 'payments', 'overview'].includes(section)) {
        keys.push('orders');
        requests.push(auth.apiRequest('/orders/seller'));
      }
      const extra = await Promise.all(requests);
      const next: Bundle = {
        dash,
        products: [],
        orders: [],
        tenants: [],
        inventoryEvents: [],
      };
      extra.forEach((x, i) => {
        const key = keys[i] as keyof Bundle;
        if (key === 'products') next.products = Array.isArray(x?.data) ? x.data : [];
        if (key === 'orders') next.orders = Array.isArray(x) ? x : [];
        if (key === 'tenants') next.tenants = Array.isArray(x?.data) ? x.data : [];
        if (key === 'inventoryEvents') next.inventoryEvents = Array.isArray(x?.data) ? x.data : [];
      });
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load workspace');
    } finally {
      setLoading(false);
    }
  }, [auth, authorized, role, section]);
  useEffect(() => {
    void load();
  }, [load]);
  async function run(label: string, fn: () => Promise<any>) {
    setAction(label);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setAction('');
    }
  }
  if (!auth.ready || loading)
    return (
      <WorkspaceState
        icon={<LoaderCircle className="spin" />}
        title="Loading secure workspace"
        copy="Connecting your role and marketplace data…"
      />
    );
  if (!auth.user)
    return (
      <WorkspaceState
        icon={<ShieldAlert />}
        title="Sign in to open this workspace"
        copy={
          role === 'Farmer'
            ? 'Use your farmer account created during seller onboarding.'
            : role === 'Admin'
              ? 'Marketplace administration requires an admin account.'
              : 'Sign in to see orders, addresses, rewards and saved products.'
        }
        actions={
          <>
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
            {role === 'Farmer' && (
              <Link href="/sell" className="btn btn-secondary">
                Create farmer store
              </Link>
            )}
          </>
        }
      />
    );
  if (!authorized)
    return (
      <WorkspaceState
        icon={<ShieldAlert />}
        title="This account has a different role"
        copy={`You are signed in as ${auth.user.role}. This ${role.toLowerCase()} workspace is role-protected.`}
        actions={
          <Link
            href={
              auth.user.role === 'admin'
                ? '/admin/overview'
                : ['farmer', 'vendor'].includes(auth.user.role)
                  ? '/farmer/overview'
                  : '/account/overview'
            }
            className="btn btn-primary"
          >
            Open my workspace
          </Link>
        }
      />
    );
  if (error && !data.dash)
    return (
      <WorkspaceState
        icon={<ShieldAlert />}
        title="Workspace could not load"
        copy={error}
        actions={
          <button onClick={() => void load()} className="btn btn-primary">
            <RefreshCw size={16} /> Retry
          </button>
        }
      />
    );
  const d = data.dash || {};
  return (
    <div className="live-workspace">
      {error && <div className="workspace-error">{error}</div>}
      {role === 'Farmer' ? (
        <FarmerView section={section} data={data} action={action} run={run} auth={auth} />
      ) : role === 'Admin' ? (
        <AdminView section={section} data={data} action={action} run={run} auth={auth} />
      ) : (
        <BuyerView section={section} data={data} action={action} run={run} auth={auth} />
      )}
      <div className="workspace-footnote">
        <BadgeCheck size={15} />{' '}
        {d.source === 'database' ? 'Live database workspace' : 'Demo-safe workspace'} · tenant and
        role scope enforced by API
      </div>
    </div>
  );
}

function WorkspaceState({
  icon,
  title,
  copy,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="workspace-state">
      <div className="workspace-state-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{copy}</p>
      {actions && <div className="hero-actions">{actions}</div>}
    </div>
  );
}
function Metrics({
  items,
}: {
  items: { label: string; value: string; note: string; icon: React.ReactNode }[];
}) {
  return (
    <div className="grid metric-grid">
      {items.map((x) => (
        <div className="metric" key={x.label}>
          <div>
            <small>{x.label}</small>
            <strong>{x.value}</strong>
          </div>
          {x.icon}
          <p>{x.note}</p>
        </div>
      ))}
    </div>
  );
}

function FarmerView({ section, data, action, run, auth }: any) {
  const d = data.dash || {},
    m = d.metrics || {};
  const metrics = [
    {
      label: 'Sales · 7 days',
      value: money(m.sales7d),
      note: 'Seller fulfillment value',
      icon: <TrendingUp />,
    },
    {
      label: 'Open orders',
      value: nf(m.openOrders),
      note: 'Need fulfillment action',
      icon: <ClipboardList />,
    },
    {
      label: 'Live inventory',
      value: `${nf(m.stockUnits)} units`,
      note: `${nf(m.liveProducts)} active listings`,
      icon: <Boxes />,
    },
    {
      label: 'Pending payout',
      value: money(m.pendingPayout),
      note: `${nf(m.customers)} unique buyers`,
      icon: <CircleDollarSign />,
    },
  ];
  if (section === 'overview')
    return (
      <>
        <Metrics items={metrics} />
        <div className="dash-grid">
          <Panel title="Recent seller orders" link="/farmer/orders">
            {(d.recentOrders || []).length ? (
              (d.recentOrders || []).map((o: any) => <OrderRow key={o.orderNumber} order={o} />)
            ) : (
              <Empty text="No seller orders yet." />
            )}
          </Panel>
          <Panel title="Low stock watch" link="/farmer/inventory">
            {(d.lowStock || []).length ? (
              (d.lowStock || []).map((p: any) => (
                <div className="stock-live" key={p.slug || p.name}>
                  <span>🌱</span>
                  <div>
                    <b>{p.name}</b>
                    <small>
                      {p.stock} {p.unit} remaining
                    </small>
                  </div>
                  <em>{p.status}</em>
                </div>
              ))
            ) : (
              <Empty text="No low-stock items." />
            )}
          </Panel>
        </div>
      </>
    );
  if (['products', 'inventory'].includes(section))
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title={section === 'products' ? 'Seller catalogue' : 'Inventory control'}
          subtitle="Every listing belongs to this tenant. Public activation requires marketplace approval."
        >
          {data.products.length ? (
            <div className="workspace-table">
              <div className="workspace-tr head">
                <span>Product</span>
                <span>Stock</span>
                <span>Price</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {data.products.map((p: any) => (
                <div className="workspace-tr" key={p._id}>
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {p.district} · {p.unit}
                    </small>
                  </span>
                  <span>{p.stock}</span>
                  <span>{money(p.price)}</span>
                  <span>
                    <Status value={p.status} />
                  </span>
                  <span>
                    {p.status === 'active' ? (
                      <button
                        disabled={!!action}
                        onClick={() =>
                          run(`pause-${p._id}`, () =>
                            auth.apiRequest(`/products/${p._id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'paused' }),
                            }),
                          )
                        }
                      >
                        Pause
                      </button>
                    ) : p.status === 'paused' ? (
                      <button
                        disabled={!!action}
                        onClick={() =>
                          run(`review-${p._id}`, () =>
                            auth.apiRequest(`/products/${p._id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'pending_review' }),
                            }),
                          )
                        }
                      >
                        Submit review
                      </button>
                    ) : (
                      <small>{p.status}</small>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="List your first harvest to create tenant inventory." />
          )}
          <Link className="btn btn-primary compact-action" href="/farmer/list-harvest">
            + List harvest
          </Link>
        </DataPanel>
        {section === 'inventory' && (
          <InventoryManager
            products={data.products}
            events={data.inventoryEvents}
            auth={auth}
            run={run}
            action={action}
          />
        )}
      </>
    );
  if (section === 'orders')
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Seller fulfillment queue"
          subtitle="Only this tenant's fulfillment can be updated by a farmer account."
        >
          {data.orders.length ? (
            data.orders.map((o: any) => {
              const f =
                (o.fulfillments || []).find(
                  (x: any) => String(x.tenantId) === String(auth.user?.tenantId),
                ) || (o.fulfillments || [])[0];
              if (!f) return null;
              return (
                <div className="fulfillment-card" key={o._id}>
                  <div>
                    <small>{o.orderNumber}</small>
                    <h3>{o.guestCustomer?.name || 'Registered buyer'}</h3>
                    <p>
                      {o.deliveryAddress?.municipality}, {o.deliveryAddress?.district} ·{' '}
                      {f.distanceKm ?? '—'} km
                    </p>
                  </div>
                  <div className="fulfillment-total">
                    <b>{money(f.total)}</b>
                    <Status value={f.status} />
                  </div>
                  <div className="fulfillment-actions">
                    {['pending', 'accepted'].includes(f.status) && (
                      <button
                        disabled={!!action}
                        onClick={() =>
                          run(`accept-${f._id}`, () =>
                            auth.apiRequest(`/orders/${o._id}/fulfillments/${f._id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                status: f.status === 'pending' ? 'accepted' : 'picking',
                              }),
                            }),
                          )
                        }
                      >
                        {f.status === 'pending' ? 'Accept' : 'Start picking'}
                      </button>
                    )}
                    {['picking'].includes(f.status) && (
                      <button
                        disabled={!!action}
                        onClick={() =>
                          run(`pack-${f._id}`, () =>
                            auth.apiRequest(`/orders/${o._id}/fulfillments/${f._id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'packed' }),
                            }),
                          )
                        }
                      >
                        Mark packed
                      </button>
                    )}
                    {['packed'].includes(f.status) && (
                      <button
                        disabled={!!action}
                        onClick={() =>
                          run(`out-${f._id}`, () =>
                            auth.apiRequest(`/orders/${o._id}/fulfillments/${f._id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'out_for_delivery' }),
                            }),
                          )
                        }
                      >
                        Out for delivery
                      </button>
                    )}
                    {['out_for_delivery', 'ready_for_pickup'].includes(f.status) && (
                      <button
                        disabled={!!action}
                        onClick={() =>
                          run(`delivered-${f._id}`, () =>
                            auth.apiRequest(`/orders/${o._id}/fulfillments/${f._id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'delivered' }),
                            }),
                          )
                        }
                      >
                        Delivered
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <Empty text="No seller orders yet." />
          )}
        </DataPanel>
      </>
    );
  if (['payments', 'payouts'].includes(section))
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Seller settlement ledger"
          subtitle="Commission, farmer net and payout state are calculated per fulfillment."
        >
          {data.orders
            .flatMap((o: any) =>
              (o.fulfillments || [])
                .filter((f: any) => String(f.tenantId) === String(auth.user?.tenantId))
                .map((f: any) => ({ o, f })),
            )
            .slice(0, 30)
            .map(({ o, f }: any) => (
              <div className="settlement-row" key={f._id}>
                <span>
                  <b>{o.orderNumber}</b>
                  <small>{f.status}</small>
                </span>
                <span>
                  <small>Gross</small>
                  {money(f.subtotal)}
                </span>
                <span>
                  <small>Commission</small>
                  {money(f.commissionAmount)}
                </span>
                <span>
                  <small>Farmer net</small>
                  {money(f.farmerNet)}
                </span>
                <Status value={f.payoutStatus} />
              </div>
            ))}
        </DataPanel>
      </>
    );
  if (['delivery-zone', 'store-profile'].includes(section))
    return <SellerSettings d={d} auth={auth} run={run} action={action} />;
  if (section === 'customers')
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Buyer relationships"
          subtitle="Customer count is tenant-scoped from orders. Repeat buyer CRM can build on this ledger."
        >
          <div className="feature-module-grid">
            <Module
              icon={<UsersRound />}
              title={`${nf(m.customers)} buyers`}
              copy="Unique buyers served by this tenant."
            />
            <Module
              icon={<Truck />}
              title="Local service"
              copy={`Current radius: ${d.tenant?.delivery?.radiusKm || d.farm?.serviceRadiusKm || 35} km.`}
            />
            <Module
              icon={<Store />}
              title="Retail + B2B"
              copy="Household and wholesale lines remain traceable to the same farm."
            />
          </div>
        </DataPanel>
      </>
    );
  return (
    <DataPanel
      title={section.replaceAll('-', ' ')}
      subtitle="This module is included in the seller SaaS information architecture and shares the same tenant/auth layer."
    >
      <ModuleGrid section={section} />
    </DataPanel>
  );
}

function AdminView({ section, data, action, run, auth }: any) {
  const d = data.dash || {},
    m = d.metrics || {};
  const metrics = [
    {
      label: 'Seller tenants',
      value: nf(m.tenants),
      note: `${nf(m.pendingFarmers)} pending verification`,
      icon: <Store />,
    },
    {
      label: 'Live products',
      value: nf(m.liveProducts),
      note: 'Approved public inventory',
      icon: <Boxes />,
    },
    {
      label: 'Marketplace orders',
      value: nf(m.orders),
      note: `${nf(m.users)} registered users`,
      icon: <ClipboardList />,
    },
    {
      label: 'GMV observed',
      value: money(m.gmv),
      note: `${money(m.payoutLiability)} payout liability`,
      icon: <CircleDollarSign />,
    },
  ];
  if (section === 'overview')
    return (
      <>
        <Metrics items={metrics} />
        <div className="dash-grid">
          <Panel title="Farmer verification queue" link="/admin/farmer-onboarding">
            {(d.pendingTenants || []).map((t: any) => (
              <div className="admin-queue" key={t._id}>
                <div>
                  <b>{t.name}</b>
                  <small>
                    {t.location?.district} · {t.ownerName}
                  </small>
                </div>
                <button
                  disabled={!!action}
                  onClick={() =>
                    run(`verify-${t._id}`, () =>
                      auth.apiRequest(`/tenants/${t._id}/verify`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'verified' }),
                      }),
                    )
                  }
                >
                  Verify
                </button>
              </div>
            ))}
          </Panel>
          <Panel title="Product approval queue" link="/admin/products">
            {(d.pendingProducts || []).map((p: any) => (
              <div className="admin-queue" key={p._id}>
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.district} · {money(p.price)}
                  </small>
                </div>
                <button
                  disabled={!!action}
                  onClick={() =>
                    run(`approve-${p._id}`, () =>
                      auth.apiRequest(`/products/${p._id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: 'active' }),
                      }),
                    )
                  }
                >
                  Approve
                </button>
              </div>
            ))}
          </Panel>
        </div>
      </>
    );
  if (['tenants', 'farmer-onboarding'].includes(section))
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Farmer and producer tenants"
          subtitle="Verification activates farm trust state and allows reviewed products to become public."
        >
          <div className="workspace-table">
            <div className="workspace-tr head">
              <span>Seller</span>
              <span>Location</span>
              <span>Plan</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {data.tenants.map((t: any) => (
              <div className="workspace-tr" key={t._id}>
                <span>
                  <b>{t.name}</b>
                  <small>{t.ownerName || t.type}</small>
                </span>
                <span>{t.location?.district || '—'}</span>
                <span>{t.plan}</span>
                <span>
                  <Status value={t.status} />
                </span>
                <span>
                  {t.status === 'pending' ? (
                    <button
                      disabled={!!action}
                      onClick={() =>
                        run(`verify-${t._id}`, () =>
                          auth.apiRequest(`/tenants/${t._id}/verify`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'verified' }),
                          }),
                        )
                      }
                    >
                      Verify
                    </button>
                  ) : (
                    <small>Reviewed</small>
                  )}
                </span>
              </div>
            ))}
          </div>
        </DataPanel>
      </>
    );
  if (['products', 'inventory', 'categories'].includes(section))
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Marketplace product moderation"
          subtitle="Approve only listings from verified seller tenants."
        >
          <div className="workspace-table">
            <div className="workspace-tr head">
              <span>Product</span>
              <span>Origin</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Moderation</span>
            </div>
            {data.products.map((p: any) => (
              <div className="workspace-tr" key={p._id}>
                <span>
                  <b>{p.name}</b>
                  <small>
                    {money(p.price)} · {p.unit}
                  </small>
                </span>
                <span>{p.district}</span>
                <span>{p.stock}</span>
                <span>
                  <Status value={p.status} />
                </span>
                <span className="moderation-actions">
                  {p.status !== 'active' && (
                    <button
                      disabled={!!action}
                      onClick={() =>
                        run(`approve-${p._id}`, () =>
                          auth.apiRequest(`/products/${p._id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: 'active' }),
                          }),
                        )
                      }
                    >
                      Approve
                    </button>
                  )}
                  <button
                    disabled={!!action}
                    onClick={() =>
                      run(`reject-${p._id}`, () =>
                        auth.apiRequest(`/products/${p._id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: 'rejected' }),
                        }),
                      )
                    }
                  >
                    Reject
                  </button>
                </span>
              </div>
            ))}
          </div>
        </DataPanel>
      </>
    );
  if (['orders', 'settlements', 'payments'].includes(section))
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Marketplace order & settlement control"
          subtitle="One buyer order can contain independent seller fulfillments and payouts."
        >
          {data.orders.slice(0, 40).map((o: any) => (
            <div className="admin-order" key={o._id}>
              <span>
                <b>{o.orderNumber}</b>
                <small>
                  {o.guestCustomer?.name || 'Registered buyer'} · {o.status}
                </small>
              </span>
              <strong>{money(o.total)}</strong>
              <span>{(o.fulfillments || []).length} seller fulfillment(s)</span>
            </div>
          ))}
        </DataPanel>
      </>
    );
  return (
    <>
      <Metrics items={metrics} />
      <DataPanel
        title={section.replaceAll('-', ' ')}
        subtitle="Platform operations module under the same admin permission boundary."
      >
        <ModuleGrid section={section} />
      </DataPanel>
    </>
  );
}

function BuyerView({ section, data, auth, run, action }: any) {
  const d = data.dash || {},
    m = d.metrics || {},
    p = d.profile || {};
  const metrics = [
    {
      label: 'Orders',
      value: nf(m.orders),
      note: `${nf(m.delivered)} delivered`,
      icon: <PackageCheck />,
    },
    {
      label: 'Reward points',
      value: nf(m.rewardPoints),
      note: 'Earned across Hariyo orders',
      icon: <TrendingUp />,
    },
    {
      label: 'Saved products',
      value: nf(m.wishlist),
      note: 'Wishlist across farmer stores',
      icon: <Store />,
    },
    {
      label: 'Nearby buying',
      value: 'Location-first',
      note: 'Delivery radius checked at checkout',
      icon: <MapPinned />,
    },
  ];
  if (section === 'overview')
    return (
      <>
        <Metrics items={metrics} />
        <div className="dash-grid">
          <Panel title="Recent orders" link="/account/orders">
            {(d.orders || []).slice(0, 5).map((o: any) => (
              <OrderRow
                key={o._id}
                order={{
                  orderNumber: o.orderNumber,
                  buyer: o.deliveryAddress?.municipality || 'Delivery',
                  amount: o.total,
                  fulfillmentStatus: o.status,
                }}
              />
            ))}
            {!(d.orders || []).length && (
              <Empty text="No orders yet. Find a nearby farm to start." />
            )}
          </Panel>
          <Panel title="My Hariyo profile">
            <div className="buyer-profile">
              <div className="buyer-avatar">{String(p.name || 'H').slice(0, 1)}</div>
              <div>
                <b>{p.name}</b>
                <span>{p.email}</span>
                <small>
                  {(p.addresses || []).length} saved address(es) ·{' '}
                  {p.language === 'ne' ? 'नेपाली' : 'English'}
                </small>
              </div>
            </div>
            <Link className="btn btn-soft compact-action" href="/nearby">
              Find food near me
            </Link>
          </Panel>
        </div>
      </>
    );
  if (section === 'orders')
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Order history"
          subtitle="Track the overall order and seller-level fulfillment status."
        >
          {(d.orders || []).map((o: any) => (
            <div className="buyer-order" key={o._id}>
              <div>
                <small>{o.orderNumber}</small>
                <h3>{new Date(o.createdAt).toLocaleDateString()}</h3>
                <p>
                  {o.deliveryAddress?.street}, {o.deliveryAddress?.municipality}
                </p>
              </div>
              <div>
                <strong>{money(o.total)}</strong>
                <Status value={o.status} />
              </div>
            </div>
          ))}
        </DataPanel>
      </>
    );
  if (section === 'addresses')
    return <AddressManager profile={p} auth={auth} run={run} action={action} />;
  if (section === 'settings')
    return <BuyerSettings profile={p} auth={auth} run={run} action={action} />;
  if (section === 'wishlist')
    return (
      <>
        <Metrics items={metrics} />
        <DataPanel
          title="Saved products"
          subtitle="Wishlist slugs are stored on your buyer account and can be resolved to live listings."
        >
          {(p.wishlist || []).length ? (
            (p.wishlist || []).map((slug: string) => (
              <Link className="wishlist-row" href={`/products/${slug}`} key={slug}>
                {slug.replaceAll('-', ' ')} <span>View →</span>
              </Link>
            ))
          ) : (
            <Empty text="No saved products yet." />
          )}
        </DataPanel>
      </>
    );
  return (
    <>
      <Metrics items={metrics} />
      <DataPanel
        title={section.replaceAll('-', ' ')}
        subtitle="Buyer lifecycle module connected to the shared identity and order layer."
      >
        <ModuleGrid section={section} />
      </DataPanel>
    </>
  );
}

function InventoryManager({ products, events, auth, run, action }: any) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run('inventory-adjustment', () =>
      auth.apiRequest('/inventory/events', {
        method: 'POST',
        body: JSON.stringify({
          productId: data.get('productId'),
          eventType: data.get('eventType'),
          quantityChange: Number(data.get('quantityChange')),
          reason: data.get('reason'),
        }),
      }),
    );
    form.reset();
  }
  return (
    <DataPanel
      title="Inventory event ledger"
      subtitle="Record harvests, spoilage, returns and corrections. Every change is linked to the actor and final stock level."
    >
      <form className="inventory-adjust-form" onSubmit={submit}>
        <label>
          Product
          <select name="productId" required>
            <option value="">Choose a listing</option>
            {products.map((product: any) => (
              <option value={product._id} key={product._id}>
                {product.name} · {product.stock} {product.unit}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event
          <select name="eventType">
            <option value="harvest">New harvest</option>
            <option value="adjustment">Stock correction</option>
            <option value="return">Customer return</option>
            <option value="spoilage">Spoilage / loss</option>
          </select>
        </label>
        <label>
          Change (+ or −)
          <input
            name="quantityChange"
            type="number"
            step="any"
            required
            placeholder="e.g. 20 or -3"
          />
        </label>
        <label>
          Reason
          <input
            name="reason"
            required
            minLength={2}
            placeholder="Harvest batch or adjustment note"
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!!action || !products.length}>
          Save inventory event
        </button>
      </form>
      <div className="inventory-event-list">
        {events.length ? (
          events.slice(0, 30).map((item: any) => (
            <div key={item.id}>
              <span>
                <b>{item.product_name}</b>
                <small>{item.reason || item.event_type}</small>
              </span>
              <em className={Number(item.quantity_change) >= 0 ? 'stock-in' : 'stock-out'}>
                {Number(item.quantity_change) >= 0 ? '+' : ''}
                {item.quantity_change}
              </em>
              <span>
                <b>{item.stock_after}</b>
                <small>stock after</small>
              </span>
            </div>
          ))
        ) : (
          <Empty text="No inventory events recorded yet." />
        )}
      </div>
    </DataPanel>
  );
}

function SellerSettings({ d, auth, run, action }: any) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget),
      id = d.tenant?._id;
    if (!id) return;
    await run('save-seller-settings', () =>
      auth.apiRequest(`/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(fd.get('name')),
          delivery: {
            radiusKm: Number(fd.get('radiusKm') || 35),
            pickup: fd.get('pickup') === 'on',
            localDelivery: true,
            nationwide: fd.get('nationwide') === 'on',
          },
        }),
      }),
    );
  }
  return (
    <DataPanel
      title="Store & delivery settings"
      subtitle="These settings belong only to your tenant and directly influence buyer matching."
    >
      <form className="workspace-form" onSubmit={submit}>
        <label>
          Store name
          <input name="name" defaultValue={d.tenant?.name || d.farm?.name || ''} />
        </label>
        <label>
          Local delivery radius (km)
          <input
            name="radiusKm"
            type="number"
            min="1"
            max="1000"
            defaultValue={d.tenant?.delivery?.radiusKm || d.farm?.serviceRadiusKm || 35}
          />
        </label>
        <label className="checkline">
          <input
            name="pickup"
            type="checkbox"
            defaultChecked={d.tenant?.delivery?.pickup !== false}
          />
          <span>Allow farm / collection-point pickup</span>
        </label>
        <label className="checkline">
          <input
            name="nationwide"
            type="checkbox"
            defaultChecked={!!d.tenant?.delivery?.nationwide}
          />
          <span>Enable nationwide/intercity offer where operationally supported</span>
        </label>
        <button className="btn btn-primary" disabled={!!action} type="submit">
          Save seller settings
        </button>
      </form>
    </DataPanel>
  );
}
function AddressManager({ profile, auth, run, action }: any) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run('add-address', () =>
      auth.apiRequest('/account/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: String(fd.get('label')),
          province: String(fd.get('province')),
          district: String(fd.get('district')),
          municipality: String(fd.get('municipality')),
          ward: String(fd.get('ward')),
          street: String(fd.get('street')),
          phone: String(fd.get('phone')),
          isDefault: fd.get('isDefault') === 'on',
        }),
      }),
    );
  }
  return (
    <DataPanel
      title="Delivery addresses"
      subtitle="Saved addresses shorten checkout. Live coordinates can still be attached during delivery matching."
    >
      <div className="saved-addresses">
        {(profile.addresses || []).map((a: any) => (
          <div className="saved-address" key={a._id}>
            <div>
              <b>
                {a.label}
                {a.isDefault ? ' · Default' : ''}
              </b>
              <span>
                {a.street}, Ward {a.ward}, {a.municipality}, {a.district}
              </span>
              <small>{a.phone}</small>
            </div>
            <button
              disabled={!!action}
              onClick={() =>
                run(`delete-${a._id}`, () =>
                  auth.apiRequest(`/account/addresses/${a._id}`, { method: 'DELETE' }),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <form className="workspace-form form-grid" onSubmit={submit}>
        <label>
          Label
          <input name="label" defaultValue="Home" />
        </label>
        <label>
          Province
          <input name="province" defaultValue="bagmati" required />
        </label>
        <label>
          District
          <input name="district" required />
        </label>
        <label>
          Municipality
          <input name="municipality" required />
        </label>
        <label>
          Ward
          <input name="ward" required />
        </label>
        <label>
          Mobile
          <input name="phone" required />
        </label>
        <label className="span-2">
          Street / landmark
          <input name="street" required />
        </label>
        <label className="checkline span-2">
          <input name="isDefault" type="checkbox" />
          <span>Make this my default address</span>
        </label>
        <button className="btn btn-primary" disabled={!!action}>
          Save address
        </button>
      </form>
    </DataPanel>
  );
}
function BuyerSettings({ profile, auth, run, action }: any) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run('profile', () =>
      auth.apiRequest('/account/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(fd.get('name')),
          phone: String(fd.get('phone')),
          language: String(fd.get('language')),
          marketingOptIn: fd.get('marketingOptIn') === 'on',
        }),
      }),
    );
  }
  return (
    <DataPanel
      title="Account settings"
      subtitle="Your buyer identity is shared across web and mobile."
    >
      <form className="workspace-form" onSubmit={submit}>
        <label>
          Name
          <input name="name" defaultValue={profile.name} />
        </label>
        <label>
          Mobile
          <input name="phone" defaultValue={profile.phone || ''} />
        </label>
        <label>
          Language
          <select name="language" defaultValue={profile.language || 'en'}>
            <option value="en">English</option>
            <option value="ne">नेपाली</option>
          </select>
        </label>
        <label className="checkline">
          <input
            name="marketingOptIn"
            type="checkbox"
            defaultChecked={profile.marketingOptIn !== false}
          />
          <span>Receive useful marketplace and seasonal harvest updates</span>
        </label>
        <button className="btn btn-primary" disabled={!!action}>
          Save settings
        </button>
        <button className="btn btn-secondary" type="button" onClick={auth.logout}>
          Sign out
        </button>
      </form>
    </DataPanel>
  );
}

function Panel({
  title,
  link,
  children,
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dash-panel">
      <div className="panel-head">
        <h3>{title}</h3>
        {link && <Link href={link}>View all</Link>}
      </div>
      {children}
    </div>
  );
}
function DataPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="data-panel">
      <div className="data-panel-head">
        <div>
          <span className="eyebrow">LIVE MODULE</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
function OrderRow({ order: o }: { order: any }) {
  return (
    <div className="order-row">
      <div className="order-icon">
        <PackageCheck />
      </div>
      <div>
        <b>{o.orderNumber}</b>
        <span>{o.buyer || 'Buyer'}</span>
      </div>
      <strong>{money(o.amount)}</strong>
      <em className="soft">{o.fulfillmentStatus || o.status}</em>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status-chip status-${String(value || 'unknown').replaceAll('_', '-')}`}>
      {String(value || 'unknown').replaceAll('_', ' ')}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="workspace-empty">{text}</div>;
}
function Module({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="feature-module">
      <div>{icon}</div>
      <b>{title}</b>
      <p>{copy}</p>
    </div>
  );
}
function ModuleGrid({ section }: { section: string }) {
  const content: Record<string, [string, string, string][]> = {
    certifications: [
      ['Farm verification', 'Upload and review farm identity evidence.', 'Trust'],
      [
        'Product claims',
        'Separate organic/certification claims from normal produce.',
        'Compliance',
      ],
      ['Expiry watch', 'Track certification validity dates.', 'Safety'],
    ],
    team: [
      ['Tenant team', 'Keep staff inside one farmer tenant.', 'Access'],
      ['Role control', 'Separate owner, order and delivery duties.', 'Security'],
      ['Activity history', 'Prepare for audit logs as the team grows.', 'Audit'],
    ],
    analytics: [
      ['Marketplace GMV', 'Track demand and seller performance.', 'Growth'],
      ['Geo demand', 'Compare search and order density by area.', 'Location'],
      ['Supply gaps', 'Find high-demand locations with low farmer coverage.', 'Planning'],
    ],
    content: [
      ['Homepage CMS', 'Campaign and seasonal produce slots.', 'Content'],
      ['Stories', 'Farmer, harvest and recipe publishing.', 'SEO'],
      ['Promotions', 'Location-targeted marketplace messaging.', 'Growth'],
    ],
    ['delivery-zones']: [
      ['Service areas', 'Match seller radius to buyer coordinates.', 'Geo'],
      ['Collection hubs', 'Support future pickup and consolidation.', 'Logistics'],
      ['Fee rules', 'Distance-based delivery quote engine.', 'Pricing'],
    ],
    warehouses: [
      [
        'Collection points',
        'Model aggregation hubs without replacing farm identity.',
        'Operations',
      ],
      ['Inbound lots', 'Trace supplier and harvest batch.', 'Inventory'],
      ['Dispatch', 'Prepare intercity consolidation.', 'Logistics'],
    ],
    subscriptions: [
      ['Repeat basket', 'Reorder seasonal essentials.', 'Convenience'],
      ['Farmer CSA', 'Support recurring farm baskets.', 'Community'],
      ['Pause anytime', 'Buyer-controlled schedule.', 'Control'],
    ],
    wallet: [
      ['Hariyo balance', 'Future refunds and marketplace credits.', 'Wallet'],
      ['Payment history', 'Trace payment and refund state.', 'Finance'],
      ['Payout safe', 'Seller payouts stay separate.', 'Trust'],
    ],
    rewards: [
      ['Earn points', 'Reward fulfilled local purchases.', 'Loyalty'],
      ['Seasonal bonuses', 'Support local campaigns without hiding price.', 'Growth'],
      ['Redeem', 'Prepare controlled reward redemption.', 'Value'],
    ],
    reviews: [
      ['Verified purchase', 'Tie reviews to delivered orders.', 'Trust'],
      ['Farmer rating', 'Aggregate seller quality.', 'Quality'],
      ['Moderation', 'Admin control for abusive content.', 'Safety'],
    ],
    returns: [
      ['Issue request', 'Open a post-delivery quality case.', 'Support'],
      ['Evidence', 'Attach produce/order evidence.', 'Resolution'],
      ['Refund path', 'Connect to wallet/payment refund.', 'Finance'],
    ],
  };
  const rows = content[section] || [
    [
      'Connected module',
      'Designed to reuse Hariyo identity, permissions and tenant scope.',
      'Core',
    ],
    [
      'API ready pattern',
      'Extends existing marketplace resources instead of creating isolated records.',
      'Platform',
    ],
    ['Responsive UI', 'Workspace pattern works on desktop and mobile web.', 'UX'],
  ];
  return (
    <div className="feature-module-grid">
      {rows.map(([title, copy, tag]) => (
        <Module key={title} icon={<CheckCircle2 />} title={`${title} · ${tag}`} copy={copy} />
      ))}
    </div>
  );
}
