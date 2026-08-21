export const DEMO_PASSWORD = 'HariyoDemo@2026';

export type DemoAccountProfile = {
  id: string;
  label: string;
  email: string;
  workspace: string;
  name: string;
  phone: string;
  role: 'customer' | 'farmer' | 'vendor' | 'admin';
  tenantRole?: 'owner' | 'admin' | 'manager' | 'procurement' | 'inventory' | 'sales' | 'delivery' | 'accounting' | 'farmer' | 'viewer';
  language: 'en' | 'ne';
};

export const demoAccounts = [
  { id: 'demo-user-buyer', label: 'Buyer', email: 'buyer@demo.hariyomart.local', workspace: 'Customer account', name: 'Hariyo Demo Buyer', phone: '9801000001', role: 'customer', language: 'en' },
  { id: 'demo-user-farmer', label: 'Farmer owner', email: 'farmer@demo.hariyomart.local', workspace: 'Growth Farmer OS', name: 'Hariyo Demo Farmer', phone: '9801000002', role: 'farmer', tenantRole: 'owner', language: 'ne' },
  { id: 'demo-user-cooperative', label: 'Cooperative', email: 'cooperative@demo.hariyomart.local', workspace: 'Enterprise cooperative', name: 'Hariyo Demo Cooperative', phone: '9801000003', role: 'farmer', tenantRole: 'owner', language: 'en' },
  { id: 'demo-user-manager', label: 'Manager', email: 'manager@demo.hariyomart.local', workspace: 'Farm manager', name: 'Hariyo Demo Manager', phone: '9801000004', role: 'farmer', tenantRole: 'manager', language: 'en' },
  { id: 'demo-user-procurement', label: 'Procurement', email: 'procurement@demo.hariyomart.local', workspace: 'Procurement role', name: 'Hariyo Demo Procurement', phone: '9801000005', role: 'farmer', tenantRole: 'procurement', language: 'en' },
  { id: 'demo-user-inventory', label: 'Inventory', email: 'inventory@demo.hariyomart.local', workspace: 'Inventory role', name: 'Hariyo Demo Inventory', phone: '9801000006', role: 'farmer', tenantRole: 'inventory', language: 'en' },
  { id: 'demo-user-sales', label: 'Sales', email: 'sales@demo.hariyomart.local', workspace: 'Sales role', name: 'Hariyo Demo Sales', phone: '9801000007', role: 'farmer', tenantRole: 'sales', language: 'en' },
  { id: 'demo-user-delivery', label: 'Delivery', email: 'delivery@demo.hariyomart.local', workspace: 'Delivery role', name: 'Hariyo Demo Delivery', phone: '9801000008', role: 'farmer', tenantRole: 'delivery', language: 'ne' },
  { id: 'demo-user-accounting', label: 'Accounting', email: 'accounting@demo.hariyomart.local', workspace: 'Accounting role', name: 'Hariyo Demo Accounting', phone: '9801000009', role: 'farmer', tenantRole: 'accounting', language: 'en' },
  { id: 'demo-user-vendor', label: 'Vendor', email: 'vendor@demo.hariyomart.local', workspace: 'Vendor workspace', name: 'Hariyo Demo Vendor', phone: '9801000010', role: 'vendor', tenantRole: 'manager', language: 'en' },
  { id: 'demo-user-admin', label: 'Platform admin', email: 'admin@demo.hariyomart.local', workspace: 'Platform administration', name: 'Hariyo Platform Demo Admin', phone: '9801000011', role: 'admin', language: 'en' },
  { id: 'demo-user-tenant-admin', label: 'Tenant admin', email: 'tenantadmin@demo.hariyomart.local', workspace: 'Tenant administration', name: 'Hariyo Demo Tenant Admin', phone: '9801000012', role: 'farmer', tenantRole: 'admin', language: 'en' },
  { id: 'demo-user-field-farmer', label: 'Field farmer', email: 'fieldfarmer@demo.hariyomart.local', workspace: 'Field farmer role', name: 'Hariyo Demo Field Farmer', phone: '9801000013', role: 'farmer', tenantRole: 'farmer', language: 'ne' },
  { id: 'demo-user-viewer', label: 'Viewer', email: 'viewer@demo.hariyomart.local', workspace: 'Read-only tenant role', name: 'Hariyo Demo Viewer', phone: '9801000014', role: 'farmer', tenantRole: 'viewer', language: 'en' },
] as const satisfies readonly DemoAccountProfile[];

export const productionTestAccounts = demoAccounts.filter((account) =>
  ['buyer@demo.hariyomart.local', 'farmer@demo.hariyomart.local', 'manager@demo.hariyomart.local', 'vendor@demo.hariyomart.local', 'admin@demo.hariyomart.local'].includes(account.email),
);

const demoAccountEmailSet = new Set(demoAccounts.map((account) => account.email.toLowerCase()));
const demoAccountMap = new Map<string, DemoAccountProfile>(demoAccounts.map((account) => [account.email.toLowerCase(), account]));

export function isKnownDemoAccountEmail(email: string) {
  return demoAccountEmailSet.has(email.trim().toLowerCase());
}

export function getDemoAccountProfile(email: string) {
  return demoAccountMap.get(email.trim().toLowerCase());
}
