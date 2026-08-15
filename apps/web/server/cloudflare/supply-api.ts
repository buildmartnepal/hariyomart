import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiJson,
  audit,
  cloudflareEnv,
  CloudflareApiError,
  requestBody,
  requireAuth,
  requireTenantAccess,
  type TenantMemberRole,
} from './platform';

const writeRoles: TenantMemberRole[] = ['owner', 'admin', 'manager'];
const procurementRoles: TenantMemberRole[] = [...writeRoles, 'procurement'];
const inventoryRoles: TenantMemberRole[] = [...writeRoles, 'inventory', 'procurement'];
const salesRoles: TenantMemberRole[] = [...writeRoles, 'sales', 'accounting'];
const deliveryRoles: TenantMemberRole[] = [...writeRoles, 'delivery', 'sales'];

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new CloudflareApiError(400, 'Invalid supply operation', result.error.flatten());
  return result.data;
}

async function nextNumber(tenantId: string, key: string, prefix: string) {
  const env = cloudflareEnv();
  if (env.HARIYO_SERVICES) {
    const response = await env.HARIYO_SERVICES.fetch('https://hariyo-services/sequence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId, key, prefix }),
    });
    if (response.ok) {
      const body = (await response.json()) as { formatted?: string };
      if (body.formatted) return body.formatted;
    }
  }
  if (env.APP_ENV === 'production')
    throw new CloudflareApiError(503, 'Tenant sequencing service is unavailable');
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function supplyOverview(req: NextRequest) {
  const { tenantId } = await requireTenantAccess(req);
  const env = cloudflareEnv();
  const [products, suppliers, lots, pos, routes, subscriptions, members] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(stock),0) stock FROM products WHERE tenant_id=? AND status!='archived'").bind(tenantId),
    env.HARIYO_DB.prepare('SELECT COUNT(*) count FROM suppliers WHERE tenant_id=? AND active=1').bind(tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(quantity_available),0) available FROM produce_lots WHERE tenant_id=? AND status IN ('available','held','quarantine')").bind(tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(total_npr),0) value FROM purchase_orders WHERE tenant_id=? AND status NOT IN ('received','cancelled')").bind(tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM delivery_routes WHERE tenant_id=? AND route_date>=date('now') AND status!='cancelled'").bind(tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM produce_subscriptions WHERE tenant_id=? AND status='active'").bind(tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM tenant_members WHERE tenant_id=? AND status='active'").bind(tenantId),
  ]);
  const row = (result: { results?: unknown[] }) => (result.results?.[0] || {}) as Record<string, unknown>;
  return apiJson({
    tenantId,
    products: { count: Number(row(products).count || 0), stock: Number(row(products).stock || 0) },
    suppliers: Number(row(suppliers).count || 0),
    lots: { count: Number(row(lots).count || 0), available: Number(row(lots).available || 0) },
    openPurchaseOrders: { count: Number(row(pos).count || 0), valueNpr: Number(row(pos).value || 0) },
    upcomingRoutes: Number(row(routes).count || 0),
    activeSubscriptions: Number(row(subscriptions).count || 0),
    activeMembers: Number(row(members).count || 0),
  });
}

const supplierInput = z.object({
  supplierType: z.enum(['farmer', 'cooperative', 'wholesaler', 'processor', 'importer', 'other']).default('farmer'),
  code: z.string().min(1).max(40),
  name: z.string().min(2).max(160),
  contactName: z.string().max(120).optional(), phone: z.string().max(40).optional(), email: z.string().email().optional(),
  panVatNumber: z.string().max(80).optional(), province: z.string().max(100).optional(), district: z.string().max(100).optional(),
  municipality: z.string().max(120).optional(), addressLine: z.string().max(240).optional(), paymentTermsDays: z.coerce.number().int().min(0).max(365).default(0),
  creditLimitNpr: z.coerce.number().min(0).default(0), notes: z.string().max(2000).optional(),
});

export async function suppliersApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? procurementRoles : undefined);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare('SELECT * FROM suppliers WHERE tenant_id=? ORDER BY active DESC,name LIMIT 500').bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(supplierInput, await requestBody(req));
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO suppliers
    (id,tenant_id,supplier_type,code,name,contact_name,phone,email,pan_vat_number,province,district,municipality,address_line,payment_terms_days,credit_limit_npr,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.supplierType, input.code, input.name, input.contactName || null, input.phone || null, input.email || null,
      input.panVatNumber || null, input.province || null, input.district || null, input.municipality || null, input.addressLine || null,
      input.paymentTermsDays, input.creditLimitNpr, input.notes || null).run();
  await audit(req, access.user, 'supply.supplier_created', 'supplier', id, { tenantId: access.tenantId });
  return apiJson({ id }, 201);
}

const warehouseInput = z.object({
  code: z.string().min(1).max(40), name: z.string().min(2).max(160), warehouseType: z.enum(['standard','cold_room','collection_center','store','vehicle']).default('standard'),
  province: z.string().max(100).optional(), district: z.string().max(100).optional(), municipality: z.string().max(120).optional(), addressLine: z.string().max(240).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(), longitude: z.coerce.number().min(-180).max(180).optional(),
});
export async function warehousesApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? inventoryRoles : undefined);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT w.*,(SELECT COUNT(*) FROM warehouse_bins b WHERE b.warehouse_id=w.id AND b.active=1) bin_count FROM warehouses w WHERE tenant_id=? ORDER BY active DESC,name`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(warehouseInput, await requestBody(req));
  const warehouseUsage = await env.HARIYO_DB.prepare(`SELECT COALESCE(p.max_warehouses,1) max_warehouses,(SELECT COUNT(*) FROM warehouses w WHERE w.tenant_id=t.id AND w.active=1) used_warehouses FROM tenants t LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id LEFT JOIN plan_catalog p ON p.code=COALESCE(s.plan_code,'starter') WHERE t.id=?`).bind(access.tenantId).first<{ max_warehouses: number; used_warehouses: number }>();
  if (warehouseUsage && Number(warehouseUsage.used_warehouses || 0) >= Number(warehouseUsage.max_warehouses || 1))
    throw new CloudflareApiError(409, `Your SaaS plan allows ${Number(warehouseUsage.max_warehouses || 1)} active warehouse(s). Upgrade the workspace plan to add another location.`);
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO warehouses (id,tenant_id,code,name,warehouse_type,province,district,municipality,address_line,latitude,longitude) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.code, input.name, input.warehouseType, input.province || null, input.district || null, input.municipality || null, input.addressLine || null, input.latitude ?? null, input.longitude ?? null).run();
  await audit(req, access.user, 'supply.warehouse_created', 'warehouse', id);
  return apiJson({ id }, 201);
}

const harvestInput = z.object({
  farmId: z.string().optional(), productId: z.string().min(1), expectedHarvestDate: z.string().min(8).max(40), expectedQuantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(40), committedQuantity: z.coerce.number().min(0).default(0), status: z.enum(['forecast','committed','harvested','cancelled']).default('forecast'), notes: z.string().max(2000).optional(),
});
export async function harvestPlansApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? [...inventoryRoles, 'farmer'] : undefined);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT h.*,p.name product_name,f.name farm_name FROM harvest_plans h LEFT JOIN products p ON p.id=h.product_id LEFT JOIN farms f ON f.id=h.farm_id WHERE h.tenant_id=? ORDER BY h.expected_harvest_date LIMIT 500`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(harvestInput, await requestBody(req));
  const product = await env.HARIYO_DB.prepare('SELECT id FROM products WHERE id=? AND tenant_id=?').bind(input.productId, access.tenantId).first();
  if (!product) throw new CloudflareApiError(404, 'Tenant product not found');
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO harvest_plans (id,tenant_id,farm_id,product_id,expected_harvest_date,expected_quantity,unit,committed_quantity,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.farmId || null, input.productId, input.expectedHarvestDate, input.expectedQuantity, input.unit, input.committedQuantity, input.status, input.notes || null).run();
  await audit(req, access.user, 'supply.harvest_plan_created', 'harvest_plan', id);
  return apiJson({ id }, 201);
}

const lotInput = z.object({
  lotCode: z.string().min(1).max(80), productId: z.string().min(1), variantId: z.string().optional(), supplierId: z.string().optional(), farmId: z.string().optional(), warehouseId: z.string().optional(), binId: z.string().optional(),
  harvestDate: z.string().max(40).optional(), receivedDate: z.string().max(40).optional(), bestBeforeDate: z.string().max(40).optional(), grade: z.string().max(80).optional(), originLabel: z.string().max(160).optional(),
  quantityReceived: z.coerce.number().min(0), quantityAvailable: z.coerce.number().min(0).optional(), unitCost: z.coerce.number().min(0).default(0), status: z.enum(['quarantine','available','held','depleted','expired','disposed']).default('available'),
});
export async function lotsApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? inventoryRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT l.*,p.name product_name,w.name warehouse_name,s.name supplier_name FROM produce_lots l JOIN products p ON p.id=l.product_id LEFT JOIN warehouses w ON w.id=l.warehouse_id LEFT JOIN suppliers s ON s.id=l.supplier_id WHERE l.tenant_id=? ORDER BY CASE WHEN l.best_before_date IS NULL THEN 1 ELSE 0 END,l.best_before_date,l.created_at DESC LIMIT 1000`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(lotInput, await requestBody(req));
  const product = await env.HARIYO_DB.prepare('SELECT id FROM products WHERE id=? AND tenant_id=?').bind(input.productId, access.tenantId).first();
  if (!product) throw new CloudflareApiError(404, 'Tenant product not found');
  const id = crypto.randomUUID(); const available = input.quantityAvailable ?? input.quantityReceived;
  await env.HARIYO_DB.prepare(`INSERT INTO produce_lots (id,tenant_id,lot_code,product_id,variant_id,supplier_id,farm_id,warehouse_id,bin_id,harvest_date,received_date,best_before_date,grade,origin_label,quantity_received,quantity_available,unit_cost,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.lotCode, input.productId, input.variantId || null, input.supplierId || null, input.farmId || null, input.warehouseId || null, input.binId || null, input.harvestDate || null, input.receivedDate || null, input.bestBeforeDate || null, input.grade || null, input.originLabel || null, input.quantityReceived, available, input.unitCost, input.status).run();
  await audit(req, access.user, 'supply.lot_created', 'produce_lot', id);
  return apiJson({ id, quantityAvailable: available }, 201);
}

const qualityInput = z.object({ lotId: z.string().min(1), checkType: z.string().min(2).max(80), result: z.enum(['pass','conditional','fail']), temperatureC: z.coerce.number().min(-100).max(100).optional(), score: z.coerce.number().min(0).max(100).optional(), notes: z.string().max(2000).optional(), attachmentObjectKey: z.string().max(500).optional() });
export async function qualityApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? inventoryRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT q.*,l.lot_code,p.name product_name FROM quality_checks q JOIN produce_lots l ON l.id=q.lot_id JOIN products p ON p.id=l.product_id WHERE q.tenant_id=? ORDER BY q.checked_at DESC LIMIT 500`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(qualityInput, await requestBody(req));
  const lot = await env.HARIYO_DB.prepare('SELECT id FROM produce_lots WHERE id=? AND tenant_id=?').bind(input.lotId, access.tenantId).first(); if (!lot) throw new CloudflareApiError(404, 'Tenant lot not found');
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO quality_checks (id,tenant_id,lot_id,check_type,result,temperature_c,score,notes,attachment_object_key,checked_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.lotId, input.checkType, input.result, input.temperatureC ?? null, input.score ?? null, input.notes || null, input.attachmentObjectKey || null, access.user.id).run();
  await audit(req, access.user, 'supply.quality_checked', 'quality_check', id, { result: input.result });
  return apiJson({ id }, 201);
}

const customerInput = z.object({ customerType: z.enum(['retail','wholesale','restaurant','hotel','school','hospital','corporate','reseller','other']).default('retail'), code: z.string().min(1).max(40), name: z.string().min(2).max(160), contactName: z.string().max(120).optional(), phone: z.string().max(40).optional(), email: z.string().email().optional(), panVatNumber: z.string().max(80).optional(), province: z.string().max(100).optional(), district: z.string().max(100).optional(), municipality: z.string().max(120).optional(), addressLine: z.string().max(240).optional(), creditDays: z.coerce.number().int().min(0).max(365).default(0), creditLimitNpr: z.coerce.number().min(0).default(0) });
export async function customersApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? salesRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') { const result = await env.HARIYO_DB.prepare('SELECT * FROM business_customers WHERE tenant_id=? ORDER BY active DESC,name LIMIT 1000').bind(access.tenantId).all(); return apiJson({ data: result.results || [] }); }
  const input = parsed(customerInput, await requestBody(req)); const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO business_customers (id,tenant_id,customer_type,code,name,contact_name,phone,email,pan_vat_number,province,district,municipality,address_line,credit_days,credit_limit_npr) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.customerType, input.code, input.name, input.contactName || null, input.phone || null, input.email || null, input.panVatNumber || null, input.province || null, input.district || null, input.municipality || null, input.addressLine || null, input.creditDays, input.creditLimitNpr).run();
  await audit(req, access.user, 'supply.customer_created', 'business_customer', id); return apiJson({ id }, 201);
}

const purchaseOrderInput = z.object({ supplierId: z.string().min(1), warehouseId: z.string().optional(), orderDate: z.string().min(8).max(40), expectedDate: z.string().max(40).optional(), taxNpr: z.coerce.number().min(0).default(0), notes: z.string().max(2000).optional(), items: z.array(z.object({ productId: z.string().min(1), variantId: z.string().optional(), quantity: z.coerce.number().positive(), unit: z.string().min(1).max(40), unitCost: z.coerce.number().min(0) })).min(1).max(200) });
export async function purchaseOrdersApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? procurementRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') { const result = await env.HARIYO_DB.prepare(`SELECT po.*,s.name supplier_name,w.name warehouse_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN warehouses w ON w.id=po.warehouse_id WHERE po.tenant_id=? ORDER BY po.order_date DESC,po.created_at DESC LIMIT 500`).bind(access.tenantId).all(); return apiJson({ data: result.results || [] }); }
  const input = parsed(purchaseOrderInput, await requestBody(req));
  const supplier = await env.HARIYO_DB.prepare('SELECT id FROM suppliers WHERE id=? AND tenant_id=? AND active=1').bind(input.supplierId, access.tenantId).first(); if (!supplier) throw new CloudflareApiError(404, 'Tenant supplier not found');
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const placeholders = productIds.map(() => '?').join(',');
  const products = await env.HARIYO_DB.prepare(`SELECT id FROM products WHERE tenant_id=? AND id IN (${placeholders})`).bind(access.tenantId, ...productIds).all<{ id: string }>();
  if ((products.results || []).length !== productIds.length) throw new CloudflareApiError(400, 'Purchase order contains a product from another tenant');
  const id = crypto.randomUUID(); const poNumber = await nextNumber(access.tenantId, 'purchase_order', 'PO');
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const taxNpr = input.taxNpr ?? 0;
  const total = subtotal + taxNpr;
  const now = new Date().toISOString();
  const statements = [env.HARIYO_DB.prepare(`INSERT INTO purchase_orders (id,tenant_id,po_number,supplier_id,warehouse_id,order_date,expected_date,subtotal_npr,tax_npr,total_npr,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, access.tenantId, poNumber, input.supplierId, input.warehouseId || null, input.orderDate, input.expectedDate || null, subtotal, taxNpr, total, input.notes || null, access.user.id, now, now),
    ...input.items.map((item) => env.HARIYO_DB.prepare(`INSERT INTO purchase_order_items (id,purchase_order_id,tenant_id,product_id,variant_id,ordered_quantity,unit,unit_cost,line_total) VALUES (?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), id, access.tenantId, item.productId, item.variantId || null, item.quantity, item.unit, item.unitCost, item.quantity * item.unitCost))];
  await env.HARIYO_DB.batch(statements); await audit(req, access.user, 'supply.purchase_order_created', 'purchase_order', id, { poNumber, totalNpr: total }); return apiJson({ id, poNumber, subtotalNpr: subtotal, totalNpr: total }, 201);
}

const routeInput = z.object({ routeDate: z.string().min(8).max(40), driverName: z.string().max(120).optional(), driverPhone: z.string().max(40).optional(), vehicleNumber: z.string().max(80).optional(), zoneName: z.string().max(120).optional() });
export async function deliveryRoutesApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? deliveryRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') { const result = await env.HARIYO_DB.prepare(`SELECT r.*,(SELECT COUNT(*) FROM delivery_stops s WHERE s.route_id=r.id) stop_count FROM delivery_routes r WHERE r.tenant_id=? ORDER BY r.route_date DESC,r.created_at DESC LIMIT 500`).bind(access.tenantId).all(); return apiJson({ data: result.results || [] }); }
  const input = parsed(routeInput, await requestBody(req)); const id = crypto.randomUUID(); const routeNumber = await nextNumber(access.tenantId, 'delivery_route', 'RT');
  await env.HARIYO_DB.prepare(`INSERT INTO delivery_routes (id,tenant_id,route_number,route_date,driver_name,driver_phone,vehicle_number,zone_name,created_by) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, access.tenantId, routeNumber, input.routeDate, input.driverName || null, input.driverPhone || null, input.vehicleNumber || null, input.zoneName || null, access.user.id).run();
  await audit(req, access.user, 'supply.delivery_route_created', 'delivery_route', id); return apiJson({ id, routeNumber }, 201);
}

const subscriptionInput = z.object({
  customerId: z.string().optional(), buyerUserId: z.string().optional(), name: z.string().min(2).max(160), cadence: z.enum(['weekly','biweekly','monthly']), boxSize: z.string().max(80).optional(), preferences: z.record(z.unknown()).default({}), deliveryAddress: z.record(z.unknown()).default({}), nextDeliveryDate: z.string().max(40).optional(),
  items: z.array(z.object({ productId: z.string().min(1), variantId: z.string().optional(), quantity: z.coerce.number().positive(), unit: z.string().min(1).max(40), substitutionAllowed: z.boolean().default(true) })).min(1).max(100),
});
export async function subscriptionsApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? salesRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT s.*,(SELECT COUNT(*) FROM produce_subscription_items i WHERE i.subscription_id=s.id) item_count FROM produce_subscriptions s WHERE s.tenant_id=? ORDER BY s.status,s.next_delivery_date LIMIT 500`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const entitlement = await env.HARIYO_DB.prepare(`SELECT COALESCE(p.features_json,'{}') features_json FROM tenants t LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id LEFT JOIN plan_catalog p ON p.code=COALESCE(s.plan_code,'starter') WHERE t.id=?`).bind(access.tenantId).first<{ features_json: string }>();
  let features: Record<string, unknown> = {};
  try { features = JSON.parse(entitlement?.features_json || '{}') as Record<string, unknown>; } catch { features = {}; }
  if (features.subscriptions !== true) throw new CloudflareApiError(403, 'Recurring produce subscriptions are available on Growth and Enterprise plans.');
  const input = parsed(subscriptionInput, await requestBody(req)); const id = crypto.randomUUID();
  const productIds = [...new Set(input.items.map((item) => item.productId))]; const placeholders = productIds.map(() => '?').join(',');
  const products = await env.HARIYO_DB.prepare(`SELECT id FROM products WHERE tenant_id=? AND id IN (${placeholders})`).bind(access.tenantId, ...productIds).all<{ id: string }>();
  if ((products.results || []).length !== productIds.length) throw new CloudflareApiError(400, 'Subscription contains a product from another tenant');
  await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(`INSERT INTO produce_subscriptions (id,tenant_id,customer_id,buyer_user_id,name,cadence,box_size,preferences_json,delivery_address_json,next_delivery_date) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, access.tenantId, input.customerId || null, input.buyerUserId || null, input.name, input.cadence, input.boxSize || null, JSON.stringify(input.preferences), JSON.stringify(input.deliveryAddress), input.nextDeliveryDate || null),
    ...input.items.map((item) => env.HARIYO_DB.prepare(`INSERT INTO produce_subscription_items (id,subscription_id,tenant_id,product_id,variant_id,quantity,unit,substitution_allowed) VALUES (?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), id, access.tenantId, item.productId, item.variantId || null, item.quantity, item.unit, item.substitutionAllowed ? 1 : 0)),
  ]);
  await audit(req, access.user, 'supply.subscription_created', 'produce_subscription', id); return apiJson({ id, items: input.items.length }, 201);
}

export async function tenantTeamApi(req: NextRequest) {
  const access = await requireTenantAccess(req); const env = cloudflareEnv();
  const result = await env.HARIYO_DB.prepare(`SELECT m.user_id,m.role,m.status,m.joined_at,m.created_at,u.name,u.email,u.phone FROM tenant_members m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,u.name`).bind(access.tenantId).all();
  return apiJson({ tenantId: access.tenantId, data: result.results || [] });
}

const priceListInput = z.object({
  code: z.string().min(1).max(40), name: z.string().min(2).max(160), priceMode: z.enum(['retail','wholesale','contract']).default('retail'),
  customerId: z.string().optional(), startsAt: z.string().max(40).optional(), endsAt: z.string().max(40).optional(),
  items: z.array(z.object({ productId: z.string().min(1), variantId: z.string().optional(), minQuantity: z.coerce.number().min(0).default(0), unitPrice: z.coerce.number().min(0) })).min(1).max(500),
});
export async function priceListsApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? salesRoles : undefined); const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT p.*,(SELECT COUNT(*) FROM price_list_items i WHERE i.price_list_id=p.id) item_count FROM price_lists p WHERE p.tenant_id=? ORDER BY p.active DESC,p.name`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(priceListInput, await requestBody(req)); const id = crypto.randomUUID();
  const productIds = [...new Set(input.items.map((item) => item.productId))]; const placeholders = productIds.map(() => '?').join(',');
  const products = await env.HARIYO_DB.prepare(`SELECT id FROM products WHERE tenant_id=? AND id IN (${placeholders})`).bind(access.tenantId, ...productIds).all<{ id: string }>();
  if ((products.results || []).length !== productIds.length) throw new CloudflareApiError(400, 'Price list contains a product from another tenant');
  await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(`INSERT INTO price_lists (id,tenant_id,code,name,price_mode,customer_id,starts_at,ends_at) VALUES (?,?,?,?,?,?,?,?)`).bind(id, access.tenantId, input.code, input.name, input.priceMode, input.customerId || null, input.startsAt || null, input.endsAt || null),
    ...input.items.map((item) => env.HARIYO_DB.prepare(`INSERT INTO price_list_items (id,price_list_id,tenant_id,product_id,variant_id,min_quantity,unit_price) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), id, access.tenantId, item.productId, item.variantId || null, item.minQuantity, item.unitPrice)),
  ]);
  await audit(req, access.user, 'supply.price_list_created', 'price_list', id); return apiJson({ id, items: input.items.length }, 201);
}

export async function supplyReportsApi(req: NextRequest) {
  const access = await requireTenantAccess(req); const env = cloudflareEnv();
  const [sales, purchase, waste, expiring, suppliers, deliveries] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(`SELECT COUNT(*) orders,COALESCE(SUM(total_npr),0) revenue FROM sales_orders WHERE tenant_id=? AND status!='cancelled' AND order_date>=date('now','-30 days')`).bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT COUNT(*) orders,COALESCE(SUM(total_npr),0) value FROM purchase_orders WHERE tenant_id=? AND status!='cancelled' AND order_date>=date('now','-30 days')`).bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT COALESCE(SUM(quantity),0) quantity,COALESCE(SUM(estimated_cost_npr),0) loss FROM waste_events WHERE tenant_id=? AND created_at>=datetime('now','-30 days')`).bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT COUNT(*) lots,COALESCE(SUM(quantity_available),0) quantity FROM produce_lots WHERE tenant_id=? AND status='available' AND best_before_date IS NOT NULL AND best_before_date<=date('now','+3 days')`).bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT COUNT(*) suppliers,COALESCE(AVG(rating),0) avg_rating FROM suppliers WHERE tenant_id=? AND active=1`).bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT COUNT(*) routes,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed FROM delivery_routes WHERE tenant_id=? AND route_date>=date('now','-30 days')`).bind(access.tenantId),
  ]);
  const one = (result: { results?: unknown[] }) => (result.results?.[0] || {}) as Record<string, unknown>;
  return apiJson({ tenantId: access.tenantId, period: 'last_30_days', sales: one(sales), procurement: one(purchase), waste: one(waste), expiringSoon: one(expiring), suppliers: one(suppliers), deliveries: one(deliveries) });
}

export async function tenantSaasProfileApi(req: NextRequest) {
  const access = await requireTenantAccess(req);
  const env = cloudflareEnv();
  const [tenantResult, membersResult, productsResult, warehousesResult, salesResult, procurementResult, recurringResult, customersResult, usageResult] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(`SELECT t.id,t.slug,t.name,t.type,t.status,t.plan,t.province,t.district,
      COALESCE(s.plan_code,'starter') plan_code,COALESCE(s.status,'trialing') subscription_status,
      s.trial_ends_at,s.current_period_starts_at,s.current_period_ends_at,
      COALESCE(p.name,'Starter') plan_name,COALESCE(p.monthly_price_npr,0) monthly_price_npr,
      COALESCE(p.max_members,3) max_members,COALESCE(p.max_warehouses,1) max_warehouses,
      COALESCE(p.max_products,150) max_products,COALESCE(p.features_json,'{}') features_json
      FROM tenants t
      LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id
      LEFT JOIN plan_catalog p ON p.code=COALESCE(s.plan_code,'starter')
      WHERE t.id=? LIMIT 1`).bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM tenant_members WHERE tenant_id=? AND status='active'").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(stock),0) stock FROM products WHERE tenant_id=? AND status!='archived'").bind(access.tenantId),
    env.HARIYO_DB.prepare('SELECT COUNT(*) count FROM warehouses WHERE tenant_id=? AND active=1').bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) orders,COALESCE(SUM(total_npr),0) revenue FROM sales_orders WHERE tenant_id=? AND status!='cancelled' AND order_date>=date('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) orders,COALESCE(SUM(total_npr),0) value FROM purchase_orders WHERE tenant_id=? AND status!='cancelled' AND order_date>=date('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM produce_subscriptions WHERE tenant_id=? AND status='active'").bind(access.tenantId),
    env.HARIYO_DB.prepare('SELECT COUNT(*) count FROM business_customers WHERE tenant_id=? AND active=1').bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT metric_key,COALESCE(SUM(quantity),0) quantity FROM tenant_usage_daily WHERE tenant_id=? AND usage_date>=date('now','start of month') GROUP BY metric_key ORDER BY quantity DESC").bind(access.tenantId),
  ]);
  const row = (result: { results?: unknown[] }) => (result.results?.[0] || {}) as Record<string, unknown>;
  const tenant = row(tenantResult);
  if (!tenant.id) throw new CloudflareApiError(404, 'Tenant workspace not found');
  const members = Number(row(membersResult).count || 0);
  const products = Number(row(productsResult).count || 0);
  const warehouses = Number(row(warehousesResult).count || 0);
  const maxMembers = Number(tenant.max_members || 3);
  const maxProducts = Number(tenant.max_products || 150);
  const maxWarehouses = Number(tenant.max_warehouses || 1);
  return apiJson({
    tenant: {
      id: String(tenant.id),
      slug: String(tenant.slug || ''),
      name: String(tenant.name || ''),
      type: String(tenant.type || ''),
      status: String(tenant.status || ''),
      province: tenant.province || null,
      district: tenant.district || null,
    },
    subscription: {
      planCode: String(tenant.plan_code || 'starter'),
      planName: String(tenant.plan_name || 'Starter'),
      status: String(tenant.subscription_status || 'trialing'),
      monthlyPriceNpr: Number(tenant.monthly_price_npr || 0),
      trialEndsAt: tenant.trial_ends_at || null,
      currentPeriodStartsAt: tenant.current_period_starts_at || null,
      currentPeriodEndsAt: tenant.current_period_ends_at || null,
    },
    usage: {
      members: { used: members, limit: maxMembers, percent: maxMembers ? Math.min(100, Math.round((members / maxMembers) * 100)) : 0 },
      products: { used: products, limit: maxProducts, percent: maxProducts ? Math.min(100, Math.round((products / maxProducts) * 100)) : 0 },
      warehouses: { used: warehouses, limit: maxWarehouses, percent: maxWarehouses ? Math.min(100, Math.round((warehouses / maxWarehouses) * 100)) : 0 },
      stockUnits: Number(row(productsResult).stock || 0),
      activityThisMonth: (usageResult.results || []).reduce((sum, item) => sum + Number((item as Record<string, unknown>).quantity || 0), 0),
      activityByMetric: usageResult.results || [],
    },
    performance30d: {
      salesOrders: Number(row(salesResult).orders || 0),
      revenueNpr: Number(row(salesResult).revenue || 0),
      purchaseOrders: Number(row(procurementResult).orders || 0),
      procurementNpr: Number(row(procurementResult).value || 0),
      activeProduceSubscriptions: Number(row(recurringResult).count || 0),
      activeBusinessCustomers: Number(row(customersResult).count || 0),
    },
    features: (() => {
      try { return JSON.parse(String(tenant.features_json || '{}')) as Record<string, unknown>; }
      catch { return {}; }
    })(),
  });
}

export async function platformTenantsApi(req: NextRequest) {
  await requireAuth(req, ['admin']); const env = cloudflareEnv();
  const result = await env.HARIYO_DB.prepare(`SELECT t.id,t.slug,t.name,t.type,t.status,t.plan,t.province,t.district,t.created_at,
    COALESCE(s.plan_code,'starter') plan_code,COALESCE(s.status,'trialing') subscription_status,
    (SELECT COUNT(*) FROM tenant_members m WHERE m.tenant_id=t.id AND m.status='active') member_count,
    (SELECT COUNT(*) FROM products p WHERE p.tenant_id=t.id AND p.status!='archived') product_count,
    (SELECT COUNT(*) FROM warehouses w WHERE w.tenant_id=t.id AND w.active=1) warehouse_count
    FROM tenants t LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id ORDER BY t.created_at DESC LIMIT 1000`).all();
  return apiJson({ data: result.results || [] });
}

export async function platformPlansApi(req: NextRequest) {
  await requireAuth(req, ['admin']); const result = await cloudflareEnv().HARIYO_DB.prepare('SELECT * FROM plan_catalog WHERE active=1 ORDER BY monthly_price_npr').all();
  return apiJson({ data: result.results || [] });
}

export async function platformNetworkApi(req: NextRequest) {
  await requireAuth(req, ['admin']); const env = cloudflareEnv();
  const [regions, supply, tenants] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(`SELECT province,COUNT(*) tenants FROM tenants WHERE status='verified' GROUP BY province ORDER BY tenants DESC`),
    env.HARIYO_DB.prepare(`SELECT province,COUNT(*) products,COALESCE(SUM(stock),0) stock FROM products WHERE status='active' GROUP BY province ORDER BY products DESC`),
    env.HARIYO_DB.prepare(`SELECT status,COUNT(*) count FROM tenants GROUP BY status`),
  ]);
  return apiJson({ regions: regions.results || [], supply: supply.results || [], tenantStatus: tenants.results || [] });
}

export async function platformEventsApi(req: NextRequest) {
  await requireAuth(req, ['admin']); const env = cloudflareEnv();
  const [auditRows, outboxRows] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300'),
    env.HARIYO_DB.prepare('SELECT id,tenant_id,topic,aggregate_type,aggregate_id,status,attempt_count,available_at,delivered_at,last_error,created_at FROM integration_outbox ORDER BY created_at DESC LIMIT 300'),
  ]);
  return apiJson({ audit: auditRows.results || [], outbox: outboxRows.results || [] });
}
