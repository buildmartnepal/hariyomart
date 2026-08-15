import {
  BadgeDollarSign,
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  Gauge,
  Leaf,
  MapPinned,
  PackageCheck,
  Route,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Tags,
  ThermometerSnowflake,
  Truck,
  UsersRound,
  Warehouse,
} from 'lucide-react';

export const farmerSupplySections = [
  'business-center',
  'supply-planning',
  'procurement',
  'lots-quality',
  'warehouses',
  'pricing',
  'wholesale',
  'delivery-routes',
  'subscriptions',
  'reports',
  'team-access',
] as const;

export const adminSupplySections = [
  'saas-tenants',
  'plans-billing',
  'supply-network',
  'platform-events',
  'data-platform',
] as const;

export type SupplySection = (typeof farmerSupplySections)[number] | (typeof adminSupplySections)[number];

export const supplyModuleCopy: Record<SupplySection, { title: string; description: string; bullets: string[] }> = {
  'business-center': {
    title: 'Farmer SaaS Business Center',
    description: 'Run the farm as a digital business with plan usage, sales, procurement, subscriptions and team capacity in one tenant-safe cockpit.',
    bullets: ['Current SaaS plan and subscription health', 'Member, product and warehouse usage vs plan limits', '30-day revenue and procurement pulse', 'Recurring produce-box and customer growth visibility'],
  },
  'supply-planning': {
    title: 'Harvest & supply planning',
    description: 'Plan incoming volume before produce reaches the collection center.',
    bullets: ['Harvest forecast by farm and date', 'Demand vs expected supply', 'Shortage and over-supply alerts', 'Supplier commitment tracking'],
  },
  procurement: {
    title: 'Procurement & receiving',
    description: 'Buy from farmers, cooperatives and wholesalers with traceable receiving.',
    bullets: ['Purchase orders and approvals', 'Goods receipts and rejection reasons', 'Supplier terms and balances', 'Automatic lot creation on receipt'],
  },
  'lots-quality': {
    title: 'Lots, freshness & quality',
    description: 'Track every batch from harvest date through sale, expiry or disposal.',
    bullets: ['Lot/harvest traceability', 'Quality grading and photo evidence', 'FEFO expiry allocation', 'Spoilage and loss analytics'],
  },
  warehouses: {
    title: 'Warehouses & cold chain',
    description: 'Manage collection centers, stores, cold rooms, bins and transfer stock.',
    bullets: ['Multi-warehouse inventory', 'Ambient/chilled/frozen bin zones', 'Transfers and adjustments', 'Low-stock and expiry warnings'],
  },
  pricing: {
    title: 'Dynamic produce pricing',
    description: 'Maintain retail, wholesale and contract prices without changing the product master.',
    bullets: ['Retail/wholesale price lists', 'Quantity breaks', 'Customer contracts', 'Margin and landed-cost visibility'],
  },
  wholesale: {
    title: 'B2B & institutional sales',
    description: 'Serve restaurants, hotels, schools, hospitals, resellers and corporate buyers.',
    bullets: ['Customer-specific terms', 'Credit limits and due days', 'Standing order templates', 'Bulk dispatch workflow'],
  },
  'delivery-routes': {
    title: 'Delivery routing',
    description: 'Turn packed orders into route stops with driver accountability.',
    bullets: ['Zone and cutoff rules', 'Driver/vehicle assignment', 'Stop sequencing and ETA', 'Proof of delivery'],
  },
  subscriptions: {
    title: 'Recurring produce boxes',
    description: 'Create weekly, biweekly or monthly vegetable and fruit subscriptions.',
    bullets: ['Customer preferences', 'Next delivery generation', 'Flexible box contents', 'Pause/resume and substitutions'],
  },
  reports: {
    title: 'Produce business intelligence',
    description: 'Measure what makes a fresh-food operation profitable.',
    bullets: ['Sales and gross margin', 'Stock age and expiry exposure', 'Supplier performance', 'Waste, fill-rate and on-time delivery'],
  },
  'team-access': {
    title: 'Tenant team & roles',
    description: 'Give each business its own isolated workspace and role-based access.',
    bullets: ['Owner/admin/manager', 'Procurement/inventory/sales', 'Delivery/accounting/farmer', 'Invites, suspension and audit trail'],
  },
  'saas-tenants': {
    title: 'SaaS tenant control',
    description: 'Operate Hariyo Mart as a platform serving many independent produce businesses.',
    bullets: ['Tenant lifecycle and plans', 'Custom storefront slug/domain', 'Usage and entitlement limits', 'Tenant support and suspension'],
  },
  'plans-billing': {
    title: 'Plans & SaaS billing',
    description: 'Package capabilities for Starter, Growth and Enterprise tenants.',
    bullets: ['Member/warehouse/product limits', 'Feature entitlements', 'Trial and subscription status', 'Upgrade-ready billing references'],
  },
  'supply-network': {
    title: 'Network operations',
    description: 'See the platform-wide farmer, supplier, product and delivery network without mixing tenant data.',
    bullets: ['Tenant-safe aggregate metrics', 'Regional supply coverage', 'Verification workflow', 'Cross-tenant marketplace projection'],
  },
  'platform-events': {
    title: 'Events, queues & audit',
    description: 'Keep slow and retriable work outside buyer checkout requests.',
    bullets: ['Cloudflare Queues event fan-out', 'Dead-letter handling', 'Audit/event outbox', 'Notification and export workers'],
  },
  'data-platform': {
    title: 'Cloudflare-native data platform',
    description: 'One Cloudflare-native operating platform for compute, SQL, coordination, media, caching, events and realtime.',
    bullets: ['D1 business data + tenant isolation', 'Workers auth + D1 sessions + Turnstile', 'Durable Objects inventory + realtime', 'R2 media + KV cache/config + Queues/Workflows'],
  },
};

export const supplyCapabilities = [
  { label: 'Crop cycle planning', icon: Sprout },
  { label: 'Farm profitability', icon: BadgeDollarSign },
  { label: 'Buyer demand matching', icon: Gauge },
  { label: 'QR traceability', icon: ShieldCheck },
  { label: 'SaaS usage metering', icon: Building2 },
  { label: 'Harvest planning', icon: Sprout },
  { label: 'Supplier CRM', icon: Factory },
  { label: 'Purchase orders', icon: ClipboardList },
  { label: 'Quality checks', icon: ClipboardCheck },
  { label: 'Lot traceability', icon: Leaf },
  { label: 'Cold chain', icon: ThermometerSnowflake },
  { label: 'Warehouse bins', icon: Warehouse },
  { label: 'Inventory ledger', icon: Boxes },
  { label: 'Price lists', icon: Tags },
  { label: 'Weights & packs', icon: Scale },
  { label: 'Sales orders', icon: ShoppingCart },
  { label: 'Fulfillment', icon: PackageCheck },
  { label: 'Delivery routes', icon: Route },
  { label: 'Delivery zones', icon: MapPinned },
  { label: 'Supplier settlement', icon: BadgeDollarSign },
  { label: 'Tenant roles', icon: UsersRound },
  { label: 'SaaS plans', icon: Building2 },
  { label: 'Tenant isolation', icon: ShieldCheck },
  { label: 'Realtime ops', icon: Gauge },
  { label: 'Last-mile delivery', icon: Truck },
];
