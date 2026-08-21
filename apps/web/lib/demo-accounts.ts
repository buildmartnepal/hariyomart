export const DEMO_PASSWORD = 'HariyoDemo@2026';

export const demoAccounts = [
  { label: 'Buyer', email: 'buyer@demo.hariyomart.local', workspace: 'Customer account' },
  { label: 'Farmer owner', email: 'farmer@demo.hariyomart.local', workspace: 'Growth Farmer OS' },
  { label: 'Cooperative', email: 'cooperative@demo.hariyomart.local', workspace: 'Enterprise cooperative' },
  { label: 'Manager', email: 'manager@demo.hariyomart.local', workspace: 'Farm manager' },
  { label: 'Procurement', email: 'procurement@demo.hariyomart.local', workspace: 'Procurement role' },
  { label: 'Inventory', email: 'inventory@demo.hariyomart.local', workspace: 'Inventory role' },
  { label: 'Sales', email: 'sales@demo.hariyomart.local', workspace: 'Sales role' },
  { label: 'Delivery', email: 'delivery@demo.hariyomart.local', workspace: 'Delivery role' },
  { label: 'Accounting', email: 'accounting@demo.hariyomart.local', workspace: 'Accounting role' },
  { label: 'Vendor', email: 'vendor@demo.hariyomart.local', workspace: 'Vendor workspace' },
  { label: 'Platform admin', email: 'admin@demo.hariyomart.local', workspace: 'Platform administration' },
  { label: 'Tenant admin', email: 'tenantadmin@demo.hariyomart.local', workspace: 'Tenant administration' },
  { label: 'Field farmer', email: 'fieldfarmer@demo.hariyomart.local', workspace: 'Field farmer role' },
  { label: 'Viewer', email: 'viewer@demo.hariyomart.local', workspace: 'Read-only tenant role' },
] as const;

export const productionTestAccounts = [
  { label: 'Buyer', email: 'buyer@demo.hariyomart.local', workspace: 'Customer checkout & account' },
  { label: 'Farmer owner', email: 'farmer@demo.hariyomart.local', workspace: 'Farmer OS / seller workspace' },
  { label: 'Manager', email: 'manager@demo.hariyomart.local', workspace: 'Operations manager role' },
  { label: 'Vendor', email: 'vendor@demo.hariyomart.local', workspace: 'Vendor workspace' },
  { label: 'Platform admin', email: 'admin@demo.hariyomart.local', workspace: 'Platform admin test workspace' },
] as const;

const demoAccountEmailSet = new Set(demoAccounts.map((account) => account.email.toLowerCase()));

export function isKnownDemoAccountEmail(email: string) {
  return demoAccountEmailSet.has(email.trim().toLowerCase());
}

