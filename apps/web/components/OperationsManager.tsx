'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Headphones,
  LoaderCircle,
  MapPinned,
  Megaphone,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  Star,
  UsersRound,
} from 'lucide-react';
import { catalog } from '@/lib/catalog';
import { useAuth } from './AuthProvider';

type Props = { section: string };
type Resource = Record<string, any>;

const resourceEndpoints: Record<string, string> = {
  content: '/admin/content/posts',
  'delivery-zones': '/admin/service-areas',
  promotions: '/admin/promotions',
  support: '/admin/support',
  reviews: '/admin/reviews',
  settings: '/admin/settings',
};

export function OperationsManager({ section }: Props) {
  const auth = useAuth();
  const [items, setItems] = useState<Resource[]>([]);
  const [summary, setSummary] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!auth.ready) return;
    if (auth.user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const operations = await auth.apiRequest('/admin/operations');
      setSummary(operations);
      const endpoint = resourceEndpoints[section];
      if (endpoint) {
        const response = await auth.apiRequest(endpoint);
        setItems(Array.isArray(response?.data) ? response.data : []);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load operations data');
    } finally {
      setLoading(false);
    }
  }, [auth, section]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(endpoint: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown) {
    setError('');
    setNotice('');
    try {
      await auth.apiRequest(endpoint, { method, body: JSON.stringify(body) });
      setNotice('Saved successfully.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action failed');
    }
  }

  if (!auth.ready || loading)
    return (
      <OperationsState
        icon={<LoaderCircle className="spin" />}
        title="Loading operations center"
        copy="Connecting content, coverage and support data…"
      />
    );
  if (!auth.user)
    return (
      <OperationsState
        icon={<ShieldAlert />}
        title="Admin sign-in required"
        copy="Sign in with the bootstrapped admin account to manage the marketplace."
      />
    );
  if (auth.user.role !== 'admin')
    return (
      <OperationsState
        icon={<ShieldAlert />}
        title="Admin permission required"
        copy="This control center is isolated from buyer and seller accounts."
      />
    );

  return (
    <div className="operations-manager">
      {error && <div className="workspace-error">{error}</div>}
      {notice && (
        <div className="operations-notice">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      <OperationsMetrics summary={summary} />
      {section === 'content' && <ContentManager items={items} mutate={mutate} />}
      {section === 'delivery-zones' && <ServiceAreaManager items={items} mutate={mutate} />}
      {section === 'promotions' && <PromotionManager items={items} mutate={mutate} />}
      {section === 'support' && <SupportManager items={items} mutate={mutate} />}
      {section === 'reviews' && <ReviewManager items={items} mutate={mutate} />}
      {section === 'settings' && <SettingsManager items={items} mutate={mutate} />}
      {section === 'analytics' && <OperationsOverview summary={summary} refresh={load} />}
    </div>
  );
}

function OperationsMetrics({ summary }: { summary: Resource | null }) {
  const metrics = summary?.metrics || {};
  const cards = [
    { label: 'Open orders', value: metrics.openOrders || 0, icon: <CircleDollarSign /> },
    { label: 'Low stock', value: metrics.lowStock || 0, icon: <Megaphone /> },
    { label: 'Support queue', value: metrics.openTickets || 0, icon: <Headphones /> },
    { label: 'Subscribers', value: metrics.subscribers || 0, icon: <UsersRound /> },
  ];
  return (
    <div className="operations-metrics">
      {cards.map((card) => (
        <div key={card.label}>
          <span>{card.icon}</span>
          <strong>{card.value}</strong>
          <small>{card.label}</small>
        </div>
      ))}
    </div>
  );
}

function ContentManager({ items, mutate }: ManagerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = String(data.get('body') || '').trim();
    void mutate('/admin/content/posts', 'POST', {
      title: data.get('title'),
      excerpt: data.get('excerpt'),
      category: data.get('category'),
      author: data.get('author'),
      relatedCategory: data.get('relatedCategory'),
      status: data.get('status'),
      featured: data.get('featured') === 'on',
      content: [
        { heading: data.get('heading'), paragraphs: body.split(/\n\s*\n/).filter(Boolean) },
      ],
    });
    event.currentTarget.reset();
  }
  return (
    <OperationsPanel
      icon={<BookOpen />}
      title="Editorial publishing"
      copy="Create, schedule, publish and archive journal stories from D1."
    >
      <form className="operations-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Title
            <input name="title" required minLength={4} />
          </label>
          <label>
            Author
            <input name="author" defaultValue="Hariyo Mart Editorial" required />
          </label>
        </div>
        <label>
          Excerpt
          <textarea name="excerpt" required minLength={10} rows={2} />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select name="category">
              <option>Buying guide</option>
              <option>Farm story</option>
              <option>Food knowledge</option>
              <option>Seller academy</option>
            </select>
          </label>
          <label>
            Related products
            <select name="relatedCategory">
              {catalog.categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Section heading
          <input name="heading" required defaultValue="What buyers should know" />
        </label>
        <label>
          Article paragraphs
          <textarea
            name="body"
            required
            minLength={20}
            rows={5}
            placeholder="Separate paragraphs with a blank line."
          />
        </label>
        <div className="form-grid">
          <label>
            Publication state
            <select name="status">
              <option value="draft">Draft</option>
              <option value="published">Publish now</option>
            </select>
          </label>
          <label className="operation-check">
            <input type="checkbox" name="featured" /> Featured story
          </label>
        </div>
        <button className="btn btn-primary" type="submit">
          <Save size={16} /> Save story
        </button>
      </form>
      <ResourceTable headers={['Story', 'Category', 'State', 'Action']}>
        {items.map((item) => (
          <div className="operations-row" key={item.id}>
            <span>
              <b>{item.title}</b>
              <small>{item.author}</small>
            </span>
            <span>{item.category}</span>
            <span>
              <State value={item.status} />
            </span>
            <span className="operation-actions">
              {item.status !== 'published' && (
                <button
                  onClick={() =>
                    void mutate(`/admin/content/posts/${item.id}`, 'PATCH', { status: 'published' })
                  }
                >
                  Publish
                </button>
              )}
              <button
                onClick={() =>
                  void mutate(`/admin/content/posts/${item.id}`, 'PATCH', { status: 'archived' })
                }
              >
                Archive
              </button>
            </span>
          </div>
        ))}
      </ResourceTable>
    </OperationsPanel>
  );
}

function ServiceAreaManager({ items, mutate }: ManagerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void mutate('/admin/service-areas', 'POST', {
      name: data.get('name'),
      province: data.get('province'),
      districts: String(data.get('districts') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      centerLat: Number(data.get('centerLat')),
      centerLng: Number(data.get('centerLng')),
      radiusKm: Number(data.get('radiusKm')),
      deliveryFee: Number(data.get('deliveryFee')),
      minimumOrder: Number(data.get('minimumOrder')),
      deliveryDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      active: true,
    });
    event.currentTarget.reset();
  }
  return (
    <OperationsPanel
      icon={<MapPinned />}
      title="Delivery zones"
      copy="Control market coverage, distance, fees and minimum orders."
    >
      <form className="operations-form compact-operations-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Zone name
            <input name="name" required />
          </label>
          <label>
            Province
            <select name="province">
              {catalog.provinces.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Districts, comma separated
          <input name="districts" required placeholder="Kathmandu, Lalitpur, Bhaktapur" />
        </label>
        <div className="four-form-grid">
          <label>
            Center lat
            <input name="centerLat" type="number" step="any" required />
          </label>
          <label>
            Center lng
            <input name="centerLng" type="number" step="any" required />
          </label>
          <label>
            Radius km
            <input name="radiusKm" type="number" defaultValue={35} min={1} required />
          </label>
          <label>
            Fee NPR
            <input name="deliveryFee" type="number" defaultValue={120} min={0} required />
          </label>
        </div>
        <label>
          Minimum order NPR
          <input name="minimumOrder" type="number" defaultValue={300} min={0} required />
        </label>
        <button className="btn btn-primary" type="submit">
          <Save size={16} /> Add service zone
        </button>
      </form>
      <ResourceTable headers={['Zone', 'Coverage', 'Rules', 'Action']}>
        {items.map((item) => (
          <div className="operations-row" key={item.id}>
            <span>
              <b>{item.name}</b>
              <small>{item.province}</small>
            </span>
            <span>
              {item.radiusKm} km · {(item.districts || []).join(', ')}
            </span>
            <span>
              NPR {item.deliveryFee} · min {item.minimumOrder}
            </span>
            <span>
              <button
                onClick={() =>
                  void mutate(`/admin/service-areas/${item.id}`, 'PATCH', { active: !item.active })
                }
              >
                {item.active ? 'Pause' : 'Activate'}
              </button>
            </span>
          </div>
        ))}
      </ResourceTable>
    </OperationsPanel>
  );
}

function PromotionManager({ items, mutate }: ManagerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void mutate('/admin/promotions', 'POST', {
      code: data.get('code'),
      name: data.get('name'),
      description: data.get('description'),
      discountType: data.get('discountType'),
      discountValue: Number(data.get('discountValue')),
      minimumOrder: Number(data.get('minimumOrder')),
      active: true,
    });
    event.currentTarget.reset();
  }
  return (
    <OperationsPanel
      icon={<Megaphone />}
      title="Promotions"
      copy="Manage marketplace or seller-scoped offers with safe usage controls."
    >
      <form className="operations-form compact-operations-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Promotion name
            <input name="name" required />
          </label>
          <label>
            Code
            <input name="code" required />
          </label>
        </div>
        <label>
          Description
          <input name="description" />
        </label>
        <div className="form-grid">
          <label>
            Discount type
            <select name="discountType">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed NPR</option>
              <option value="free_delivery">Free delivery</option>
            </select>
          </label>
          <label>
            Value
            <input name="discountValue" type="number" defaultValue={10} min={0} required />
          </label>
        </div>
        <label>
          Minimum order
          <input name="minimumOrder" type="number" defaultValue={500} min={0} />
        </label>
        <button className="btn btn-primary" type="submit">
          <Save size={16} /> Create promotion
        </button>
      </form>
      <ResourceTable headers={['Promotion', 'Offer', 'Usage', 'Action']}>
        {items.map((item) => (
          <div className="operations-row" key={item.id}>
            <span>
              <b>{item.name}</b>
              <small>{item.code || 'Automatic offer'}</small>
            </span>
            <span>
              {item.discountType} · {item.discountValue}
            </span>
            <span>
              {item.usageCount}
              {item.usageLimit ? ` / ${item.usageLimit}` : ''}
            </span>
            <span>
              <button
                onClick={() =>
                  void mutate(`/admin/promotions/${item.id}`, 'PATCH', { active: !item.active })
                }
              >
                {item.active ? 'Pause' : 'Activate'}
              </button>
            </span>
          </div>
        ))}
      </ResourceTable>
    </OperationsPanel>
  );
}

function SupportManager({ items, mutate }: ManagerProps) {
  return (
    <OperationsPanel
      icon={<Headphones />}
      title="Support desk"
      copy="Triage buyer and seller issues without exposing private tickets publicly."
    >
      <ResourceTable headers={['Ticket', 'Contact', 'Priority', 'Action']}>
        {items.map((item) => (
          <div className="operations-row" key={item.id}>
            <span>
              <b>{item.ticket_number}</b>
              <small>{item.subject}</small>
            </span>
            <span>
              {item.name}
              <small>{item.email || item.phone}</small>
            </span>
            <span>
              <State value={item.priority} />
            </span>
            <span className="operation-actions">
              <button
                onClick={() =>
                  void mutate(`/admin/support/${item.id}`, 'PATCH', { status: 'in_progress' })
                }
              >
                Take
              </button>
              <button
                onClick={() =>
                  void mutate(`/admin/support/${item.id}`, 'PATCH', { status: 'resolved' })
                }
              >
                Resolve
              </button>
            </span>
          </div>
        ))}
      </ResourceTable>
    </OperationsPanel>
  );
}

function ReviewManager({ items, mutate }: ManagerProps) {
  return (
    <OperationsPanel
      icon={<Star />}
      title="Review moderation"
      copy="Publish verified feedback or reject unsafe and irrelevant submissions."
    >
      <ResourceTable headers={['Review', 'Product', 'Rating', 'Action']}>
        {items.map((item) => (
          <div className="operations-row" key={item.id}>
            <span>
              <b>{item.title || item.buyer_name}</b>
              <small>{item.body}</small>
            </span>
            <span>{item.product_name}</span>
            <span>{'★'.repeat(Number(item.rating || 0))}</span>
            <span className="operation-actions">
              <button
                onClick={() =>
                  void mutate(`/admin/reviews/${item.id}`, 'PATCH', { status: 'published' })
                }
              >
                Publish
              </button>
              <button
                onClick={() =>
                  void mutate(`/admin/reviews/${item.id}`, 'PATCH', { status: 'rejected' })
                }
              >
                Reject
              </button>
            </span>
          </div>
        ))}
      </ResourceTable>
    </OperationsPanel>
  );
}

function SettingsManager({ items, mutate }: ManagerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let value: unknown = data.get('value');
    try {
      value = JSON.parse(String(value));
    } catch {}
    void mutate('/admin/settings', 'PUT', {
      key: data.get('key'),
      value,
      isPublic: data.get('isPublic') === 'on',
    });
  }
  return (
    <OperationsPanel
      icon={<Settings2 />}
      title="Platform settings"
      copy="Centralize public configuration and protected operational switches."
    >
      <form className="operations-form compact-operations-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Setting key
            <input name="key" pattern="[a-z0-9_.-]+" required />
          </label>
          <label>
            JSON or text value
            <input name="value" required />
          </label>
        </div>
        <label className="operation-check">
          <input type="checkbox" name="isPublic" /> Safe to expose publicly
        </label>
        <button className="btn btn-primary" type="submit">
          <Save size={16} /> Save setting
        </button>
      </form>
      <ResourceTable headers={['Key', 'Value', 'Visibility', 'Updated']}>
        {items.map((item) => (
          <div className="operations-row" key={item.key}>
            <span>
              <b>{item.key}</b>
            </span>
            <span>{JSON.stringify(item.value)}</span>
            <span>{item.isPublic ? 'Public' : 'Protected'}</span>
            <span>{item.updatedAt || 'Seed'}</span>
          </div>
        ))}
      </ResourceTable>
    </OperationsPanel>
  );
}

function OperationsOverview({
  summary,
  refresh,
}: {
  summary: Resource | null;
  refresh: () => Promise<void>;
}) {
  const metrics = summary?.metrics || {};
  return (
    <OperationsPanel
      icon={<RefreshCw />}
      title="Marketplace operations pulse"
      copy="One view across support, inventory, editorial and growth workflows."
    >
      <div className="feature-module-grid">
        <OperationTile
          title={`${metrics.serviceAreas || 0} service areas`}
          copy="Active delivery coverage records"
        />
        <OperationTile
          title={`${metrics.activePromotions || 0} active offers`}
          copy="Marketplace promotion rules"
        />
        <OperationTile
          title={`${metrics.pendingReviews || 0} pending reviews`}
          copy="Waiting for moderation"
        />
        <OperationTile
          title={`${metrics.contentQueue || 0} content items`}
          copy="Draft or scheduled stories"
        />
      </div>
      <button className="btn btn-dark compact-action" onClick={() => void refresh()}>
        <RefreshCw size={16} /> Refresh control center
      </button>
    </OperationsPanel>
  );
}

type ManagerProps = {
  items: Resource[];
  mutate: (endpoint: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown) => Promise<void>;
};
function OperationsPanel({
  icon,
  title,
  copy,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section className="operations-panel">
      <div className="operations-panel-head">
        <span>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{copy}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
function ResourceTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="operations-table">
      <div className="operations-row operations-head">
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      {children}
    </div>
  );
}
function State({ value }: { value: string }) {
  return <em className={`operation-state state-${value}`}>{String(value).replaceAll('_', ' ')}</em>;
}
function OperationTile({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="feature-module">
      <CheckCircle2 />
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
function OperationsState({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="workspace-state">
      <div className="workspace-state-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}
