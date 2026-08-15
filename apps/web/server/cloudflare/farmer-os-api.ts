import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiJson,
  audit,
  cloudflareEnv,
  CloudflareApiError,
  parseJson,
  requestBody,
  requireAuth,
  requireTenantAccess,
  type TenantMemberRole,
} from './platform';

const farmerWriteRoles: TenantMemberRole[] = ['owner', 'admin', 'manager', 'farmer', 'accounting'];

function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new CloudflareApiError(400, 'Invalid Farmer OS operation', result.error.flatten());
  return result.data;
}

function one(result: { results?: unknown[] }) {
  return (result.results?.[0] || {}) as Record<string, unknown>;
}

async function recordUsage(tenantId: string, metricKey: string, quantity = 1) {
  const env = cloudflareEnv();
  await env.HARIYO_DB.prepare(`INSERT INTO tenant_usage_daily (tenant_id,usage_date,metric_key,quantity)
    VALUES (?,date('now'),?,?)
    ON CONFLICT(tenant_id,usage_date,metric_key) DO UPDATE SET quantity=tenant_usage_daily.quantity+excluded.quantity,updated_at=datetime('now')`)
    .bind(tenantId, metricKey, quantity).run();
}

const cropCycleInput = z.object({
  farmId: z.string().optional(),
  productId: z.string().optional(),
  cropName: z.string().min(2).max(160),
  variety: z.string().max(120).optional(),
  areaValue: z.coerce.number().min(0).default(0),
  areaUnit: z.enum(['ropani', 'hectare', 'bigha', 'kattha', 'sqm', 'acre']).default('ropani'),
  plantingDate: z.string().max(40).optional(),
  expectedHarvestDate: z.string().max(40).optional(),
  expectedQuantity: z.coerce.number().min(0).default(0),
  unit: z.string().min(1).max(40).default('kg'),
  targetPriceNpr: z.coerce.number().min(0).default(0),
  budgetNpr: z.coerce.number().min(0).default(0),
  status: z.enum(['planned', 'planted', 'growing', 'ready', 'harvesting', 'completed', 'cancelled']).default('planned'),
  notes: z.string().max(3000).optional(),
});

export async function cropCyclesApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? farmerWriteRoles : undefined);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT c.*,f.name farm_name,p.name product_name,
      COALESCE((SELECT SUM(e.amount_npr) FROM farm_expenses e WHERE e.tenant_id=c.tenant_id AND e.crop_cycle_id=c.id),0) actual_cost_npr,
      (c.expected_quantity*c.target_price_npr) projected_revenue_npr
      FROM crop_cycles c
      LEFT JOIN farms f ON f.id=c.farm_id
      LEFT JOIN products p ON p.id=c.product_id
      WHERE c.tenant_id=?
      ORDER BY CASE c.status WHEN 'harvesting' THEN 0 WHEN 'ready' THEN 1 WHEN 'growing' THEN 2 ELSE 3 END,
               COALESCE(c.expected_harvest_date,'9999-12-31'),c.created_at DESC LIMIT 500`)
      .bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(cropCycleInput, await requestBody(req));
  if (input.farmId) {
    const farm = await env.HARIYO_DB.prepare('SELECT id FROM farms WHERE id=? AND tenant_id=?').bind(input.farmId, access.tenantId).first();
    if (!farm) throw new CloudflareApiError(404, 'Farm not found in this workspace');
  }
  if (input.productId) {
    const product = await env.HARIYO_DB.prepare('SELECT id FROM products WHERE id=? AND tenant_id=?').bind(input.productId, access.tenantId).first();
    if (!product) throw new CloudflareApiError(404, 'Product not found in this workspace');
  }
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO crop_cycles
    (id,tenant_id,farm_id,product_id,crop_name,variety,area_value,area_unit,planting_date,expected_harvest_date,expected_quantity,unit,target_price_npr,budget_npr,status,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.farmId || null, input.productId || null, input.cropName, input.variety || null,
      input.areaValue, input.areaUnit, input.plantingDate || null, input.expectedHarvestDate || null, input.expectedQuantity,
      input.unit, input.targetPriceNpr, input.budgetNpr, input.status, input.notes || null, access.user.id).run();
  await recordUsage(access.tenantId, 'crop_cycles_created');
  await audit(req, access.user, 'farmer_os.crop_cycle_created', 'crop_cycle', id, { crop: input.cropName, expectedQuantity: input.expectedQuantity });
  return apiJson({ id }, 201);
}

const expenseInput = z.object({
  cropCycleId: z.string().optional(),
  supplierId: z.string().optional(),
  expenseDate: z.string().min(8).max(40),
  category: z.enum(['seed','fertilizer','labor','irrigation','electricity','equipment','rent','packaging','transport','storage','commission','certification','other']),
  description: z.string().min(2).max(300),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().max(40).optional(),
  unitCostNpr: z.coerce.number().min(0).optional(),
  amountNpr: z.coerce.number().min(0),
  paymentMethod: z.enum(['cash','bank','wallet','credit','other']).default('cash'),
  paymentStatus: z.enum(['paid','payable','partial']).default('paid'),
});

export async function farmExpensesApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? farmerWriteRoles : undefined);
  const env = cloudflareEnv();
  if (req.method === 'GET') {
    const result = await env.HARIYO_DB.prepare(`SELECT e.*,c.crop_name,s.name supplier_name
      FROM farm_expenses e
      LEFT JOIN crop_cycles c ON c.id=e.crop_cycle_id
      LEFT JOIN suppliers s ON s.id=e.supplier_id
      WHERE e.tenant_id=? ORDER BY e.expense_date DESC,e.created_at DESC LIMIT 750`).bind(access.tenantId).all();
    return apiJson({ data: result.results || [] });
  }
  const input = parsed(expenseInput, await requestBody(req));
  if (input.cropCycleId) {
    const cycle = await env.HARIYO_DB.prepare('SELECT id FROM crop_cycles WHERE id=? AND tenant_id=?').bind(input.cropCycleId, access.tenantId).first();
    if (!cycle) throw new CloudflareApiError(404, 'Crop cycle not found in this workspace');
  }
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO farm_expenses
    (id,tenant_id,crop_cycle_id,supplier_id,expense_date,category,description,quantity,unit,unit_cost_npr,amount_npr,payment_method,payment_status,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, access.tenantId, input.cropCycleId || null, input.supplierId || null, input.expenseDate, input.category,
      input.description, input.quantity ?? null, input.unit || null, input.unitCostNpr ?? null, input.amountNpr,
      input.paymentMethod, input.paymentStatus, access.user.id).run();
  await recordUsage(access.tenantId, 'expenses_recorded');
  await audit(req, access.user, 'farmer_os.expense_created', 'farm_expense', id, { category: input.category, amountNpr: input.amountNpr });
  return apiJson({ id }, 201);
}

export async function farmerProfitabilityApi(req: NextRequest) {
  const access = await requireTenantAccess(req);
  const env = cloudflareEnv();
  const [cycles, expenses30, sales30, waste30, categorySpend] = await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare(`SELECT c.id,c.crop_name,c.variety,c.status,c.area_value,c.area_unit,c.expected_quantity,c.actual_quantity,c.unit,c.target_price_npr,c.budget_npr,
      COALESCE((SELECT SUM(e.amount_npr) FROM farm_expenses e WHERE e.crop_cycle_id=c.id AND e.tenant_id=c.tenant_id),0) actual_cost_npr,
      (CASE WHEN c.actual_quantity>0 THEN c.actual_quantity ELSE c.expected_quantity END)*c.target_price_npr estimated_revenue_npr
      FROM crop_cycles c WHERE c.tenant_id=? ORDER BY c.created_at DESC LIMIT 200`).bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(amount_npr),0) value,COUNT(*) count FROM farm_expenses WHERE tenant_id=? AND expense_date>=date('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(farmer_net),0) revenue,COUNT(*) orders FROM fulfillments WHERE tenant_id=? AND status!='cancelled' AND created_at>=datetime('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(estimated_cost_npr),0) loss,COALESCE(SUM(quantity),0) quantity FROM waste_events WHERE tenant_id=? AND created_at>=datetime('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT category,COALESCE(SUM(amount_npr),0) value FROM farm_expenses WHERE tenant_id=? AND expense_date>=date('now','-90 days') GROUP BY category ORDER BY value DESC").bind(access.tenantId),
  ]);
  const expense = one(expenses30); const sales = one(sales30); const waste = one(waste30);
  const revenue = Number(sales.revenue || 0); const costs = Number(expense.value || 0); const wasteLoss = Number(waste.loss || 0);
  return apiJson({
    period: 'last_30_days',
    summary: { revenueNpr: revenue, farmExpensesNpr: costs, wasteLossNpr: wasteLoss, operatingContributionNpr: revenue - costs - wasteLoss, orderCount: Number(sales.orders || 0), expenseCount: Number(expense.count || 0) },
    cropCycles: cycles.results || [],
    categorySpend: categorySpend.results || [],
  });
}

const demandInput = z.object({
  buyerName: z.string().min(2).max(160),
  buyerType: z.enum(['household','restaurant','hotel','retailer','wholesaler','school','hospital','processor','corporate','cooperative','other']).default('other'),
  productName: z.string().min(2).max(160),
  category: z.string().max(100).optional(),
  grade: z.string().max(80).optional(),
  organicRequired: z.boolean().default(false),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(40).default('kg'),
  frequency: z.enum(['one_time','weekly','biweekly','monthly','contract']).default('one_time'),
  targetPriceNpr: z.coerce.number().min(0).optional(),
  province: z.string().max(100).optional(), district: z.string().max(100).optional(), municipality: z.string().max(120).optional(),
  deliveryDate: z.string().max(40).optional(), contractMonths: z.coerce.number().int().min(1).max(60).optional(), notes: z.string().max(3000).optional(),
});

export async function buyerDemandsApi(req: NextRequest) {
  const env = cloudflareEnv();
  if (req.method === 'POST') {
    const user = await requireAuth(req);
    const input = parsed(demandInput, await requestBody(req));
    const id = crypto.randomUUID();
    await env.HARIYO_DB.prepare(`INSERT INTO buyer_demands
      (id,buyer_user_id,buyer_tenant_id,buyer_name,buyer_type,product_name,category,grade,organic_required,quantity,unit,frequency,target_price_npr,province,district,municipality,delivery_date,contract_months,notes,status,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'open',datetime('now','+30 days'))`)
      .bind(id,user.id,user.active_tenant_id || user.tenant_id || null,input.buyerName,input.buyerType,input.productName,input.category || null,input.grade || null,input.organicRequired ? 1 : 0,
        input.quantity,input.unit,input.frequency,input.targetPriceNpr ?? null,input.province || null,input.district || null,input.municipality || null,input.deliveryDate || null,input.contractMonths ?? null,input.notes || null).run();
    await audit(req,user,'market.buyer_demand_created','buyer_demand',id,{ product: input.productName, quantity: input.quantity, unit: input.unit });
    return apiJson({ id },201);
  }
  if (new URL(req.url).searchParams.get('scope') === 'mine') {
    const user = await requireAuth(req);
    const mine = await env.HARIYO_DB.prepare(`SELECT d.*,
      (SELECT COUNT(*) FROM buyer_demand_offers o WHERE o.demand_id=d.id) offer_count,
      (SELECT MIN(o.unit_price_npr) FROM buyer_demand_offers o WHERE o.demand_id=d.id AND o.status!='withdrawn') best_offer_npr
      FROM buyer_demands d WHERE d.buyer_user_id=? ORDER BY d.created_at DESC LIMIT 300`).bind(user.id).all();
    return apiJson({ data: mine.results || [] });
  }
  const access = await requireTenantAccess(req);
  const tenant = await env.HARIYO_DB.prepare('SELECT province,district,municipality FROM tenants WHERE id=?').bind(access.tenantId).first<{ province:string;district:string;municipality:string }>();
  const result = await env.HARIYO_DB.prepare(`SELECT d.*,
    CASE
      WHEN lower(COALESCE(d.district,''))=lower(?) THEN 40
      WHEN lower(COALESCE(d.province,''))=lower(?) THEN 25
      WHEN d.province IS NULL OR d.province='' THEN 15 ELSE 5 END
      + CASE WHEN EXISTS(SELECT 1 FROM products p WHERE p.tenant_id=? AND p.status='active' AND (lower(p.name) LIKE '%'||lower(d.product_name)||'%' OR (d.category IS NOT NULL AND lower(p.category)=lower(d.category)))) THEN 45 ELSE 0 END
      + CASE WHEN d.delivery_date IS NULL OR d.delivery_date>=date('now') THEN 10 ELSE 0 END match_score,
    o.status offer_status,o.quantity offer_quantity,o.unit_price_npr offer_price_npr
    FROM buyer_demands d
    LEFT JOIN buyer_demand_offers o ON o.demand_id=d.id AND o.tenant_id=?
    WHERE d.status IN ('open','matched') AND (d.expires_at IS NULL OR d.expires_at>datetime('now'))
    ORDER BY match_score DESC,d.created_at DESC LIMIT 300`)
    .bind(tenant?.district || '',tenant?.province || '',access.tenantId,access.tenantId).all();
  return apiJson({ tenantId: access.tenantId, data: result.results || [] });
}

const offerInput = z.object({ demandId:z.string().min(1), quantity:z.coerce.number().positive(), unitPriceNpr:z.coerce.number().min(0), availableFrom:z.string().max(40).optional(), deliveryFeeNpr:z.coerce.number().min(0).default(0), message:z.string().max(2000).optional() });
export async function buyerDemandOffersApi(req: NextRequest) {
  const access = await requireTenantAccess(req, ['owner','admin','manager','sales','farmer']);
  const env = cloudflareEnv();
  const input = parsed(offerInput, await requestBody(req));
  const demand = await env.HARIYO_DB.prepare("SELECT id,status FROM buyer_demands WHERE id=? AND status IN ('open','matched')").bind(input.demandId).first();
  if (!demand) throw new CloudflareApiError(404,'Open buyer demand not found');
  const id = crypto.randomUUID();
  await env.HARIYO_DB.prepare(`INSERT INTO buyer_demand_offers (id,demand_id,tenant_id,offered_by,quantity,unit_price_npr,available_from,delivery_fee_npr,message)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(demand_id,tenant_id) DO UPDATE SET quantity=excluded.quantity,unit_price_npr=excluded.unit_price_npr,available_from=excluded.available_from,delivery_fee_npr=excluded.delivery_fee_npr,message=excluded.message,status='submitted',updated_at=datetime('now')`)
    .bind(id,input.demandId,access.tenantId,access.user.id,input.quantity,input.unitPriceNpr,input.availableFrom || null,input.deliveryFeeNpr,input.message || null).run();
  await env.HARIYO_DB.prepare("UPDATE buyer_demands SET status='matched',updated_at=datetime('now') WHERE id=? AND status='open'").bind(input.demandId).run();
  await recordUsage(access.tenantId, 'buyer_demand_offers');
  await audit(req,access.user,'market.buyer_demand_offer_submitted','buyer_demand',input.demandId,{ quantity:input.quantity,unitPriceNpr:input.unitPriceNpr });
  return apiJson({ ok:true },201);
}

const traceInput = z.object({ lotId:z.string().min(1), eventType:z.enum(['planted','harvested','received','quality_checked','graded','packed','stored','transferred','dispatched','delivered','returned','disposed','note']), eventAt:z.string().min(8).max(50), locationLabel:z.string().max(160).optional(), actorName:z.string().max(160).optional(), details:z.record(z.unknown()).default({}) });
export async function traceabilityApi(req: NextRequest) {
  const access = await requireTenantAccess(req, req.method === 'POST' ? ['owner','admin','manager','inventory','farmer','delivery'] : undefined);
  const env = cloudflareEnv();
  if (req.method === 'POST') {
    const input = parsed(traceInput,await requestBody(req));
    const lot = await env.HARIYO_DB.prepare('SELECT id FROM produce_lots WHERE id=? AND tenant_id=?').bind(input.lotId,access.tenantId).first();
    if (!lot) throw new CloudflareApiError(404,'Tenant lot not found');
    const id=crypto.randomUUID();
    await env.HARIYO_DB.batch([
      env.HARIYO_DB.prepare(`INSERT INTO lot_traceability_events (id,tenant_id,lot_id,event_type,event_at,location_label,actor_name,details_json,created_by) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id,access.tenantId,input.lotId,input.eventType,input.eventAt,input.locationLabel || null,input.actorName || access.user.name,JSON.stringify(input.details),access.user.id),
      env.HARIYO_DB.prepare(`INSERT OR IGNORE INTO lot_traceability_links(lot_id,tenant_id,public_token) VALUES (?,?,lower(hex(randomblob(16))))`).bind(input.lotId,access.tenantId),
    ]);
    await recordUsage(access.tenantId, 'traceability_events');
    await audit(req,access.user,'traceability.event_created','produce_lot',input.lotId,{ eventType:input.eventType });
    return apiJson({ id },201);
  }
  const result = await env.HARIYO_DB.prepare(`SELECT l.id,l.lot_code,l.harvest_date,l.best_before_date,l.grade,l.origin_label,l.quantity_available,l.status,p.name product_name,f.name farm_name,w.name warehouse_name,t.public_token,
    (SELECT COUNT(*) FROM lot_traceability_events e WHERE e.lot_id=l.id) event_count,
    (SELECT MAX(e.event_at) FROM lot_traceability_events e WHERE e.lot_id=l.id) last_event_at
    FROM produce_lots l JOIN products p ON p.id=l.product_id
    LEFT JOIN farms f ON f.id=l.farm_id LEFT JOIN warehouses w ON w.id=l.warehouse_id LEFT JOIN lot_traceability_links t ON t.lot_id=l.id
    WHERE l.tenant_id=? ORDER BY l.created_at DESC LIMIT 500`).bind(access.tenantId).all();
  return apiJson({ data: result.results || [] });
}

export async function publicTraceabilityApi(token: string) {
  const env=cloudflareEnv();
  const lot=await env.HARIYO_DB.prepare(`SELECT l.id,l.lot_code,l.harvest_date,l.received_date,l.best_before_date,l.grade,l.origin_label,l.status,p.name product_name,p.organic,p.unit,f.name farm_name,f.province farm_province,f.district farm_district,t.name tenant_name
    FROM lot_traceability_links x JOIN produce_lots l ON l.id=x.lot_id JOIN products p ON p.id=l.product_id LEFT JOIN farms f ON f.id=l.farm_id JOIN tenants t ON t.id=l.tenant_id
    WHERE x.public_token=? AND x.enabled=1 LIMIT 1`).bind(token).first<Record<string,unknown>>();
  if(!lot) throw new CloudflareApiError(404,'Traceability record not found');
  const events=await env.HARIYO_DB.prepare(`SELECT event_type,event_at,location_label,actor_name,details_json FROM lot_traceability_events WHERE lot_id=? ORDER BY event_at,created_at`).bind(String(lot.id)).all<Record<string,unknown>>();
  return apiJson({ lot, events:(events.results || []).map((e)=>({...e,details:parseJson(String(e.details_json || '{}'),{})})) });
}

export async function farmerRecommendationsApi(req: NextRequest) {
  const access=await requireTenantAccess(req); const env=cloudflareEnv();
  const [lowStock,expiry,demand,crops,usage,waste]=await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare("SELECT id,name,stock,unit FROM products WHERE tenant_id=? AND status='active' AND stock<=10 ORDER BY stock LIMIT 8").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT l.id,l.lot_code,p.name product_name,l.quantity_available,l.best_before_date FROM produce_lots l JOIN products p ON p.id=l.product_id WHERE l.tenant_id=? AND l.status='available' AND l.best_before_date IS NOT NULL AND l.best_before_date<=date('now','+3 days') ORDER BY l.best_before_date LIMIT 8").bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT d.id,d.product_name,d.quantity,d.unit,d.district,d.target_price_npr FROM buyer_demands d WHERE d.status IN ('open','matched') AND EXISTS(SELECT 1 FROM products p WHERE p.tenant_id=? AND p.status='active' AND (lower(p.name) LIKE '%'||lower(d.product_name)||'%' OR lower(p.category)=lower(COALESCE(d.category,'')))) ORDER BY d.created_at DESC LIMIT 8`).bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT id,crop_name,expected_harvest_date,expected_quantity,unit,status FROM crop_cycles WHERE tenant_id=? AND status IN ('growing','ready','harvesting') ORDER BY expected_harvest_date LIMIT 8").bind(access.tenantId),
    env.HARIYO_DB.prepare(`SELECT COALESCE(p.max_products,150) max_products,(SELECT COUNT(*) FROM products x WHERE x.tenant_id=t.id AND x.status!='archived') product_count FROM tenants t LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id LEFT JOIN plan_catalog p ON p.code=COALESCE(s.plan_code,'starter') WHERE t.id=?`).bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(estimated_cost_npr),0) loss FROM waste_events WHERE tenant_id=? AND created_at>=datetime('now','-30 days')").bind(access.tenantId),
  ]);
  const recommendations:Array<Record<string,unknown>>=[];
  for(const item of (lowStock.results || []) as Array<Record<string,unknown>>) recommendations.push({type:'stock',priority:Number(item.stock||0)<=0?'critical':'high',title:`Restock ${item.name}`,message:`Only ${item.stock} ${item.unit} is currently available.`,actionLabel:'Open inventory',actionHref:'/farmer/inventory'});
  for(const item of (expiry.results || []) as Array<Record<string,unknown>>) recommendations.push({type:'expiry',priority:'critical',title:`Move ${item.product_name} before expiry`,message:`Lot ${item.lot_code} has ${item.quantity_available} units and reaches best-before on ${item.best_before_date}. Consider a flash offer or B2B match.`,actionLabel:'Trace lot',actionHref:'/farmer/traceability'});
  for(const item of (demand.results || []) as Array<Record<string,unknown>>) recommendations.push({type:'demand',priority:'high',title:`Buyer demand: ${item.product_name}`,message:`A buyer needs ${item.quantity} ${item.unit}${item.district ? ` in ${item.district}`:''}. Send an offer from your Farmer Studio.`,actionLabel:'View demand',actionHref:'/farmer/buyer-demand'});
  for(const item of (crops.results || []) as Array<Record<string,unknown>>) recommendations.push({type:'harvest',priority:item.status==='ready'?'high':'medium',title:`${item.crop_name} harvest ${item.status}`,message:`${item.expected_quantity} ${item.unit} expected around ${item.expected_harvest_date || 'the planned harvest window'}.`,actionLabel:'Open crop plan',actionHref:'/farmer/farm-planning'});
  const u=one(usage); const max=Number(u.max_products||150),count=Number(u.product_count||0); if(max && count/max>=0.85) recommendations.push({type:'saas',priority:'medium',title:'Product limit is getting close',message:`You are using ${count} of ${max} product slots. Archive old listings or review your plan.`,actionLabel:'Business Center',actionHref:'/farmer/business-center'});
  const loss=Number(one(waste).loss||0); if(loss>0) recommendations.push({type:'waste',priority:loss>5000?'high':'medium',title:'Reduce produce waste',message:`Recorded waste cost in the last 30 days is NPR ${Math.round(loss).toLocaleString('en-NP')}. Use FEFO and expiry offers to recover margin.`,actionLabel:'Open lots',actionHref:'/farmer/lots-quality'});
  return apiJson({ generatedAt:new Date().toISOString(), data:recommendations.slice(0,24) });
}

export async function farmerOsOverviewApi(req: NextRequest) {
  const access=await requireTenantAccess(req); const env=cloudflareEnv();
  const [orders,payouts,products,expiry,crops,demands,expenses,customers,usage]=await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(farmer_net),0) value FROM fulfillments WHERE tenant_id=? AND status NOT IN ('cancelled') AND created_at>=datetime('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(farmer_net),0) pending FROM fulfillments WHERE tenant_id=? AND payout_status IN ('pending','scheduled')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(stock),0) stock,SUM(CASE WHEN stock<=10 THEN 1 ELSE 0 END) low_stock FROM products WHERE tenant_id=? AND status='active'").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(quantity_available),0) quantity FROM produce_lots WHERE tenant_id=? AND status='available' AND best_before_date IS NOT NULL AND best_before_date<=date('now','+3 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count,COALESCE(SUM(expected_quantity),0) quantity FROM crop_cycles WHERE tenant_id=? AND status IN ('growing','ready','harvesting') AND COALESCE(expected_harvest_date,date('now'))<=date('now','+14 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM buyer_demands d WHERE d.status IN ('open','matched') AND EXISTS(SELECT 1 FROM products p WHERE p.tenant_id=? AND p.status='active' AND (lower(p.name) LIKE '%'||lower(d.product_name)||'%' OR lower(p.category)=lower(COALESCE(d.category,''))))").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(amount_npr),0) value FROM farm_expenses WHERE tenant_id=? AND expense_date>=date('now','-30 days')").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) count FROM business_customers WHERE tenant_id=? AND active=1").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COALESCE(SUM(quantity),0) quantity FROM tenant_usage_daily WHERE tenant_id=? AND usage_date>=date('now','start of month')").bind(access.tenantId),
  ]);
  const sales=one(orders), cost=Number(one(expenses).value||0), revenue=Number(sales.value||0);
  return apiJson({
    tenantId:access.tenantId,
    metrics:{ revenue30dNpr:revenue,orderCount30d:Number(sales.count||0),pendingPayoutNpr:Number(one(payouts).pending||0),farmExpense30dNpr:cost,operatingContribution30dNpr:revenue-cost,activeProducts:Number(one(products).count||0),stockUnits:Number(one(products).stock||0),lowStockProducts:Number(one(products).low_stock||0),expiringLots:Number(one(expiry).count||0),expiringQuantity:Number(one(expiry).quantity||0),upcomingHarvestCycles:Number(one(crops).count||0),upcomingHarvestQuantity:Number(one(crops).quantity||0),matchingBuyerDemands:Number(one(demands).count||0),businessCustomers:Number(one(customers).count||0),saasActionsThisMonth:Number(one(usage).quantity||0)},
  });
}


const aiQuestionInput = z.object({ question:z.string().min(2).max(2000), language:z.enum(['en','ne']).default('en') });
export async function farmerAiAssistantApi(req: NextRequest) {
  const access=await requireTenantAccess(req);
  const env=cloudflareEnv();
  const input=parsed(aiQuestionInput,await requestBody(req));
  const plan=await env.HARIYO_DB.prepare(`SELECT COALESCE(p.features_json,'{}') features_json FROM tenants t LEFT JOIN tenant_subscriptions s ON s.tenant_id=t.id LEFT JOIN plan_catalog p ON p.code=COALESCE(s.plan_code,'starter') WHERE t.id=?`).bind(access.tenantId).first<{features_json:string}>();
  const features=parseJson<Record<string,unknown>>(plan?.features_json || '{}',{});
  const maxAi=Math.max(0,Number(features.max_ai_monthly || 0));
  const usedRow=await env.HARIYO_DB.prepare("SELECT COALESCE(SUM(quantity),0) used FROM tenant_usage_daily WHERE tenant_id=? AND metric_key='ai_calls' AND usage_date>=date('now','start of month')").bind(access.tenantId).first<{used:number}>();
  const used=Number(usedRow?.used || 0);
  if(maxAi && used>=maxAi) throw new CloudflareApiError(429,`Monthly Hariyo AI limit reached (${used}/${maxAi}). Review your SaaS plan.`);
  const [tenant,products,crops,expenses,demands,orders]=await env.HARIYO_DB.batch([
    env.HARIYO_DB.prepare('SELECT name,province,district,municipality,status FROM tenants WHERE id=?').bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT name,category,stock,unit,price,status FROM products WHERE tenant_id=? AND status='active' ORDER BY stock ASC LIMIT 20").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT crop_name,status,expected_harvest_date,expected_quantity,unit,target_price_npr,budget_npr FROM crop_cycles WHERE tenant_id=? AND status!='cancelled' ORDER BY expected_harvest_date LIMIT 20").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT category,COALESCE(SUM(amount_npr),0) amount FROM farm_expenses WHERE tenant_id=? AND expense_date>=date('now','-30 days') GROUP BY category ORDER BY amount DESC").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT product_name,quantity,unit,frequency,target_price_npr,district FROM buyer_demands d WHERE d.status IN ('open','matched') AND EXISTS(SELECT 1 FROM products p WHERE p.tenant_id=? AND p.status='active' AND (lower(p.name) LIKE '%'||lower(d.product_name)||'%' OR lower(p.category)=lower(COALESCE(d.category,'')))) ORDER BY d.created_at DESC LIMIT 10").bind(access.tenantId),
    env.HARIYO_DB.prepare("SELECT COUNT(*) orders,COALESCE(SUM(farmer_net),0) revenue FROM fulfillments WHERE tenant_id=? AND status!='cancelled' AND created_at>=datetime('now','-30 days')").bind(access.tenantId),
  ]);
  const context={tenant:one(tenant),products:products.results||[],cropCycles:crops.results||[],expense30d:expenses.results||[],matchingBuyerDemand:demands.results||[],marketplace30d:one(orders)};
  const fallback=()=>{
    const revenue=Number((context.marketplace30d as Record<string,unknown>).revenue || 0);
    const expenseTotal=(context.expense30d as Array<Record<string,unknown>>).reduce((sum,r)=>sum+Number(r.amount||0),0);
    const matches=(context.matchingBuyerDemand as unknown[]).length;
    const low=(context.products as Array<Record<string,unknown>>).filter((p)=>Number(p.stock||0)<=10).length;
    return input.language==='ne'
      ? `तपाईंको पछिल्लो ३० दिनको किसान आम्दानी करिब NPR ${Math.round(revenue).toLocaleString('en-NP')} र फार्म खर्च NPR ${Math.round(expenseTotal).toLocaleString('en-NP')} छ। ${matches} वटा मिल्ने खरिद माग र ${low} वटा कम स्टक संकेत छन्। Farmer Studio को Buyer Demand, Profitability र Inventory भाग पहिले हेर्नुहोस्।`
      : `Your last-30-day farmer revenue is about NPR ${Math.round(revenue).toLocaleString('en-NP')} against NPR ${Math.round(expenseTotal).toLocaleString('en-NP')} in recorded farm expenses. You currently have ${matches} matching buyer demands and ${low} low-stock signals. Prioritize Buyer Demand, Profitability and Inventory in Farmer Studio.`;
  };
  let answer=fallback(); let source='data-engine';
  if(env.AI){
    try{
      const system=input.language==='ne'
        ? 'तपाईं Hariyo AI हुनुहुन्छ। नेपाली किसान/सहकारीलाई दिइएको व्यवसायिक डाटामात्र प्रयोग गरेर छोटो, व्यवहारिक र सुरक्षित सुझाव दिनुहोस्। नदिइएको मौसम, रोग वा बजार तथ्य नबनाउनुहोस्।'
        : 'You are Hariyo AI, a practical farm-business copilot for Nepal. Use only the supplied tenant business data. Give concise actions. Never invent weather, disease, market prices, legal facts, or data not present in context.';
      const result=await env.AI.run('@cf/zai-org/glm-4.7-flash',{messages:[{role:'system',content:system},{role:'user',content:`Tenant context:\n${JSON.stringify(context)}\n\nQuestion: ${input.question}`}],max_completion_tokens:500}) as {response?:string};
      if(result?.response?.trim()){answer=result.response.trim();source='workers-ai';}
    }catch{}
  }
  await recordUsage(access.tenantId,'ai_calls');
  await audit(req,access.user,'farmer_os.ai_assistant_used','tenant',access.tenantId,{source,questionLength:input.question.length});
  return apiJson({answer,source,usage:{used:used+1,limit:maxAi||null},model:source==='workers-ai'?'@cf/zai-org/glm-4.7-flash':null});
}
