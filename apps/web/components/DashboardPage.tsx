import { notFound } from 'next/navigation';
import Link from 'next/link';
import { HarvestPublisher } from './HarvestPublisher';
import { WorkspaceLive } from './WorkspaceLive';
import { BadgeCheck, Plus, Store } from 'lucide-react';
import { OperationsManager } from './OperationsManager';
const roleCopy = {
  Farmer: {
    kicker: 'SELLER WORKSPACE',
    title: 'Hariyo Farmer Studio',
    note: 'Manage harvests, orders, delivery radius, customer relationships and payouts inside your own seller tenant.',
  },
  Admin: {
    kicker: 'MARKETPLACE CONTROL',
    title: 'Hariyo Mart Operations',
    note: 'Verify farmers, moderate products, inspect orders, settlements, coverage and marketplace health.',
  },
  Account: {
    kicker: 'BUYER WORKSPACE',
    title: 'My Hariyo',
    note: 'Track orders, nearby farms, addresses, saved produce, rewards and preferences.',
  },
} as const;
export function DashboardPage({
  role,
  section,
  sections,
}: {
  role: 'Farmer' | 'Admin' | 'Account';
  section: string;
  sections: readonly string[];
}) {
  if (!sections.includes(section)) notFound();
  const copy = roleCopy[role];
  const farmer = role === 'Farmer';
  const base = role === 'Account' ? 'account' : role.toLowerCase();
  return (
    <main className="workspace-page">
      <section className="workspace-top">
        <div className="container">
          <span className="eyebrow">{copy.kicker}</span>
          <div className="workspace-title">
            <div>
              <h1>{copy.title}</h1>
              <p>{copy.note}</p>
            </div>
            {farmer && (
              <Link href="/farmer/list-harvest" className="btn btn-primary">
                <Plus size={17} /> List today’s harvest
              </Link>
            )}
          </div>
        </div>
      </section>
      <section className="workspace-section">
        <div className="container dashboard-shell">
          <aside className="dashboard-nav">
            <div className="tenant-card">
              <div className="tenant-logo">
                <Store />
              </div>
              <div>
                <b>{role}</b>
                <span>Secure workspace</span>
              </div>
            </div>
            {sections.map((s) => (
              <Link className={s === section ? 'active' : ''} href={`/${base}/${s}`} key={s}>
                {s.replaceAll('-', ' ')}
              </Link>
            ))}
            <div className="dashboard-security">
              <BadgeCheck size={16} />
              <span>Role + tenant scoped</span>
            </div>
          </aside>
          <div className="dashboard-main">
            {farmer && section === 'list-harvest' ? (
              <HarvestPublisher />
            ) : (
              <>
                <div className="dash-heading">
                  <div>
                    <span className="eyebrow">{section.replaceAll('-', ' ')}</span>
                    <h2>
                      {section === 'overview'
                        ? 'Today’s marketplace pulse'
                        : section.replaceAll('-', ' ')}
                    </h2>
                  </div>
                </div>
                {role === 'Admin' &&
                [
                  'content',
                  'categories',
                  'pages',
                  'media',
                  'delivery-zones',
                  'promotions',
                  'support',
                  'reviews',
                  'settings',
                  'analytics',
                  'audit-log',
                ].includes(section) ? (
                  <OperationsManager section={section} />
                ) : (
                  <WorkspaceLive role={role} section={section} />
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
