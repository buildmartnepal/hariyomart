import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const catalog = JSON.parse(await readFile(path.join(webRoot, 'server/data/catalog.json'), 'utf8'));

const sourceClusters = Object.fromEntries(
  (catalog.sourcingClusters || []).map((cluster) => [cluster.key, cluster]),
);

const provinceDefaults = {
  koshi: 'ilam-highlands',
  madhesh: 'dhanusha-janakpur',
  bagmati: 'kavre-hills',
  gandaki: 'kaski-pokhara',
  lumbini: 'rupandehi-butwal',
  karnali: 'jumla-highlands',
  sudurpashchim: 'kailali-dhangadhi',
};

const origins = Object.fromEntries(
  Object.entries(provinceDefaults).map(([province, clusterKey]) => {
    const cluster = sourceClusters[clusterKey];
    return [province, [
      `seed-tenant-${clusterKey}`,
      `${clusterKey}-market`,
      cluster.name,
      `${cluster.district} Sourcing Team`,
      cluster.district,
      cluster.municipality,
      cluster.lat,
      cluster.lng,
      province === 'bagmati' ? 60 : 160,
    ]];
  }),
);


const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const jsonString = (value) => sqlString(JSON.stringify(value ?? []));
const lines = [
  '-- Generated from server/data/catalog.json. Safe to re-run.',
  'PRAGMA foreign_keys = ON;',
];

for (const cluster of Object.values(sourceClusters)) {
  const id = `seed-tenant-${cluster.key}`;
  const slug = `${cluster.key}-market`;
  const owner = `${cluster.district} Sourcing Team`;
  const radius = cluster.province === 'bagmati' ? 60 : 160;
  lines.push(
    `INSERT OR IGNORE INTO tenants (id,slug,name,owner_name,type,plan,status,province,district,municipality,lat,lng,specialties,delivery_radius_km,pickup_enabled,same_day_enabled,commission_rate) VALUES (${[
      id, slug, cluster.name, owner, 'cooperative', 'growth', 'verified', cluster.province, cluster.district, cluster.municipality,
    ].map(sqlString).join(',')},${cluster.lat},${cluster.lng},${jsonString(['Nepal origin sourcing', 'Wholesale supply', 'Trade inquiry'])},${radius},1,1,0.08);`,
  );
  lines.push(
    `INSERT OR IGNORE INTO export_supplier_profiles (tenant_id,export_capable,packing_capabilities,certifications,notes) VALUES (${sqlString(id)},0,${jsonString(['Retail packs','Wholesale bags/cartons','Buyer-specific packing after qualification'])},'[]',${sqlString('Seed sourcing cluster. Export capability and certifications must be verified against the actual supplier before quotation.')});`,
  );
}

catalog.products.forEach((product, index) => {
  const cluster = sourceClusters[product.supplierCluster] || sourceClusters[provinceDefaults[product.province]] || sourceClusters['kavre-hills'];
  const tenantId = `seed-tenant-${cluster.key}`;
  const district = product.district || cluster.district;
  const municipality = product.municipality || cluster.municipality;
  const lat = cluster.lat;
  const lng = cluster.lng;
  const radius = product.province === 'bagmati' ? 60 : 160;
  const values = [
    `seed-product-${String(index + 1).padStart(3, '0')}`,
    tenantId,
    product.slug,
    product.name,
    product.category,
    product.province,
    product.district || district,
    municipality,
    product.unit,
  ].map(sqlString);
  lines.push(
    `INSERT OR IGNORE INTO products (id,tenant_id,slug,name,category,province,district,municipality,unit,price,old_price,stock,minimum_order,organic,grade,harvest_window,unique_story,short_description,description,benefits,image_url,images_json,lat,lng,delivery_radius_km,wholesale,subscription,status,rating,featured,export_ready,export_status,hs_code_hint,botanical_name,origin_altitude,harvest_season,processing_method,typical_shelf_life_days,storage_guidance,trade_pack,export_moq,lead_time_days,destination_markets,domestic_markets,traceability_level,compliance_note,source_type,supplier_cluster) VALUES (${values.join(',')},${Number(product.price)},${Number(product.oldPrice || product.price)},${Number(product.stock || 0)},${Number(product.minimumOrder || 1)},${product.organic ? 1 : 0},${sqlString(product.exportReady ? 'Trade specification' : 'Marketplace grade')},${sqlString(product.harvestSeason || '')},${sqlString(product.uniqueStory || '')},${sqlString(product.shortDescription)},${sqlString(product.description)},${jsonString(product.benefits)},${sqlString(product.image)},${jsonString(product.images || [])},${lat},${lng},${radius},${product.wholesale ? 1 : 0},${product.subscription ? 1 : 0},'active',${Number(product.rating || 4.8)},${product.featured ? 1 : 0},${product.exportReady ? 1 : 0},${sqlString(product.exportStatus || '')},${sqlString(product.hsCodeHint || '')},${product.botanicalName ? sqlString(product.botanicalName) : 'NULL'},${sqlString(product.originAltitude || '')},${sqlString(product.harvestSeason || '')},${sqlString(product.processingMethod || '')},${Number(product.typicalShelfLifeDays || 0)},${sqlString(product.storageGuidance || '')},${sqlString(product.tradePack || '')},${Number(product.exportMoq || 0)},${Number(product.leadTimeDays || 0)},${jsonString(product.destinationMarkets || [])},${jsonString(product.domesticMarkets || [])},${sqlString(product.traceabilityLevel || '')},${sqlString(product.complianceNote || '')},${sqlString(product.sourceType || '')},${sqlString(product.supplierCluster || '')});`,
  );
});

// Operational identities intentionally cannot sign in. Real owner and seller passwords are created
// through the secure bootstrap/onboarding flows, never committed to seed SQL.
const disabledPasswordHash = '!seed-account-login-disabled!';
const buyerSeeds = [
  ['seed-user-buyer-anisha', 'Anisha Karki', 'anisha@buyer.seed.invalid', '9800000001', 420],
  ['seed-user-buyer-dipen', 'Dipen Gurung', 'dipen@buyer.seed.invalid', '9800000002', 185],
  ['seed-user-buyer-samira', 'Samira Tharu', 'samira@buyer.seed.invalid', '9800000003', 310],
];
for (const [id, name, email, phone, points] of buyerSeeds) {
  lines.push(
    `INSERT OR IGNORE INTO users (id,name,email,phone,password_hash,role,is_verified,marketing_opt_in,reward_points,addresses) VALUES (${sqlString(id)},${sqlString(name)},${sqlString(email)},${sqlString(phone)},${sqlString(disabledPasswordHash)},'customer',1,1,${points},${jsonString(
      [
        {
          _id: `${id}-address`,
          label: 'Home',
          province: 'bagmati',
          district: 'Kathmandu',
          municipality: 'Kathmandu',
          ward: '10',
          street: 'New Baneshwor',
          phone,
          isDefault: true,
        },
      ],
    )});`,
  );
}

for (const [province, origin] of Object.entries(origins)) {
  const [tenantId, slug, , owner] = origin;
  lines.push(
    `INSERT OR IGNORE INTO users (id,tenant_id,name,email,phone,password_hash,role,is_verified,language) VALUES (${sqlString(`seed-user-farmer-${province}`)},${sqlString(tenantId)},${sqlString(owner)},${sqlString(`${slug}@seller.seed.invalid`)},${sqlString(`981${String(Object.keys(origins).indexOf(province) + 1).padStart(7, '0')}`)},${sqlString(disabledPasswordHash)},'farmer',1,'ne');`,
  );
}

const orderStates = [
  ['delivered', 'delivered', 'paid', 'paid'],
  ['confirmed', 'accepted', 'pending', 'pending'],
  ['partially_fulfilled', 'packed', 'paid', 'scheduled'],
  ['placed', 'pending', 'pending', 'pending'],
  ['delivered', 'delivered', 'paid', 'paid'],
  ['confirmed', 'picking', 'pending', 'held'],
  ['partially_fulfilled', 'out_for_delivery', 'paid', 'scheduled'],
];
const orderIds = [];
Object.entries(origins).forEach(([province, origin], index) => {
  const [tenantId, , farmName, , district, municipality] = origin;
  const productIndex = catalog.products.findIndex((product) => product.province === province);
  const product = catalog.products[productIndex];
  const productId = `seed-product-${String(productIndex + 1).padStart(3, '0')}`;
  const orderId = `seed-order-${String(index + 1).padStart(3, '0')}`;
  const fulfillmentId = `seed-fulfillment-${String(index + 1).padStart(3, '0')}`;
  const itemId = `seed-order-item-${String(index + 1).padStart(3, '0')}`;
  const buyer = buyerSeeds[index % buyerSeeds.length];
  const quantity = index % 3 === 0 ? 2 : 1;
  const subtotal = Number(product.price) * quantity;
  const deliveryFee = [130, 150, 100, 170, 140, 220, 180][index];
  const commission = Math.round(subtotal * 0.08 * 100) / 100;
  const [orderStatus, fulfillmentStatus, paymentStatus, payoutStatus] = orderStates[index];
  const timeline = [
    {
      status: 'pending',
      at: `2026-08-${String(index + 2).padStart(2, '0')}T03:15:00.000Z`,
      note: 'Order received',
    },
    ...(fulfillmentStatus !== 'pending'
      ? [
          {
            status: fulfillmentStatus,
            at: `2026-08-${String(index + 2).padStart(2, '0')}T05:30:00.000Z`,
            note: 'Seeded operational milestone',
          },
        ]
      : []),
  ];
  orderIds.push(orderId);
  lines.push(
    `INSERT OR IGNORE INTO orders (id,order_number,buyer_id,delivery_address,payment_method,payment_status,status,subtotal,delivery_fee,total,idempotency_key,created_at,updated_at) VALUES (${sqlString(orderId)},${sqlString(`HMN-DEMO-${String(index + 1).padStart(4, '0')}`)},${sqlString(buyer[0])},${jsonString({ province, district, municipality, ward: String(index + 1), street: `${farmName} delivery route`, phone: buyer[3] })},'cod',${sqlString(paymentStatus)},${sqlString(orderStatus)},${subtotal},${deliveryFee},${subtotal + deliveryFee},${sqlString(`seed-idempotency-${index + 1}`)},datetime('now','-${index + 2} days'),datetime('now','-${index + 1} days'));`,
    `INSERT OR IGNORE INTO fulfillments (id,order_id,tenant_id,status,subtotal,delivery_fee,commission_amount,farmer_net,payout_status,distance_km,timeline,created_at,updated_at) VALUES (${sqlString(fulfillmentId)},${sqlString(orderId)},${sqlString(tenantId)},${sqlString(fulfillmentStatus)},${subtotal},${deliveryFee},${commission},${subtotal - commission},${sqlString(payoutStatus)},${8 + index * 3.7},${jsonString(timeline)},datetime('now','-${index + 2} days'),datetime('now','-${index + 1} days'));`,
    `INSERT OR IGNORE INTO order_items (id,order_id,fulfillment_id,product_id,tenant_id,product_name,product_slug,unit,unit_price,quantity,line_total) VALUES (${sqlString(itemId)},${sqlString(orderId)},${sqlString(fulfillmentId)},${sqlString(productId)},${sqlString(tenantId)},${sqlString(product.name)},${sqlString(product.slug)},${sqlString(product.unit)},${Number(product.price)},${quantity},${subtotal});`,
    `INSERT OR IGNORE INTO inventory_events (id,product_id,tenant_id,actor_id,event_type,quantity_change,stock_after,reason,reference_type,reference_id,created_at) VALUES (${sqlString(`seed-inventory-${province}`)},${sqlString(productId)},${sqlString(tenantId)},${sqlString(`seed-user-farmer-${province}`)},'harvest',${20 + index * 3},${Number(product.stock || 0)},${sqlString('Morning harvest batch received and graded')},'seed_batch',${sqlString(`BATCH-${province.toUpperCase()}-01`)},datetime('now','-${index + 4} days'));`,
    `INSERT OR IGNORE INTO audit_logs (id,actor_id,tenant_id,action,entity_type,entity_id,meta,created_at) VALUES (${sqlString(`seed-audit-${province}`)},${sqlString(`seed-user-farmer-${province}`)},${sqlString(tenantId)},'inventory.harvest_recorded','product',${sqlString(productId)},${jsonString({ source: 'production_seed', quantity: 20 + index * 3 })},datetime('now','-${index + 4} days'));`,
  );
});

[
  [
    'seed-review-1',
    'seed-product-001',
    buyerSeeds[0][0],
    orderIds[0],
    5,
    'Excellent origin details',
    'The tea arrived well packed and matched the farm description.',
  ],
  [
    'seed-review-2',
    'seed-product-049',
    buyerSeeds[1][0],
    orderIds[4],
    4,
    'Fresh and traceable',
    'Clear seller information and a dependable delivery update.',
  ],
  [
    'seed-review-3',
    'seed-product-025',
    buyerSeeds[2][0],
    orderIds[2],
    5,
    'Very fresh harvest',
    'Good quality, accurate weight and useful harvest information.',
  ],
].forEach(([id, productId, buyerId, orderId, rating, title, body], index) =>
  lines.push(
    `INSERT OR IGNORE INTO reviews (id,product_id,buyer_id,order_id,rating,title,body,status,seller_reply,created_at,updated_at) VALUES (${sqlString(id)},${sqlString(productId)},${sqlString(buyerId)},${sqlString(orderId)},${rating},${sqlString(title)},${sqlString(body)},${index === 2 ? "'pending'" : "'published'"},${index === 0 ? sqlString('Thank you for supporting local producers.') : 'NULL'},datetime('now','-${index + 1} days'),datetime('now','-${index + 1} days'));`,
  ),
);

[
  ['seed-promo-fresh', null, 'FRESH150', 'Fresh-start credit', 'fixed', 150, 1200, 150, 500],
  [
    'seed-promo-local',
    'seed-tenant-kavre-hills',
    'LOCAL10',
    'Kathmandu local harvest',
    'percent',
    10,
    900,
    250,
    300,
  ],
  [
    'seed-promo-delivery',
    null,
    'HARIYODELIVERY',
    'Free delivery weekend',
    'free_delivery',
    0,
    1600,
    null,
    200,
  ],
].forEach(([id, tenantId, code, name, type, value, minimum, maximum, limit]) =>
  lines.push(
    `INSERT OR IGNORE INTO promotions (id,tenant_id,code,name,description,discount_type,discount_value,minimum_order,maximum_discount,usage_limit,usage_count,starts_at,ends_at,active) VALUES (${sqlString(id)},${tenantId ? sqlString(tenantId) : 'NULL'},${sqlString(code)},${sqlString(name)},${sqlString('Seeded launch promotion ready for admin management')},${sqlString(type)},${value},${minimum},${maximum == null ? 'NULL' : maximum},${limit},${Number(value) === 150 ? 18 : 6},datetime('now','-7 days'),datetime('now','+45 days'),1);`,
  ),
);

[
  [
    'seed-ticket-1',
    'HM-SUPPORT-1001',
    buyerSeeds[0][0],
    orderIds[0],
    'Anisha Karki',
    buyerSeeds[0][2],
    'Order packaging follow-up',
    'Please confirm whether the tea pouch is reusable.',
    'normal',
    'open',
  ],
  [
    'seed-ticket-2',
    'HM-SUPPORT-1002',
    `seed-user-farmer-bagmati`,
    null,
    'Ramesh Shrestha',
    'kathmandu-valley-farm@seller.seed.invalid',
    'Delivery radius review',
    'Please review our request to expand the local delivery zone.',
    'high',
    'in_progress',
  ],
  [
    'seed-ticket-3',
    'HM-SUPPORT-1003',
    buyerSeeds[2][0],
    orderIds[4],
    'Samira Tharu',
    buyerSeeds[2][2],
    'Invoice copy',
    'I need an invoice copy for the delivered marketplace order.',
    'low',
    'resolved',
  ],
].forEach(([id, number, userId, orderId, name, email, subject, message, priority, status], index) =>
  lines.push(
    `INSERT OR IGNORE INTO support_tickets (id,ticket_number,user_id,order_id,name,email,subject,message,priority,status,admin_note,created_at,updated_at) VALUES (${sqlString(id)},${sqlString(number)},${sqlString(userId)},${orderId ? sqlString(orderId) : 'NULL'},${sqlString(name)},${sqlString(email)},${sqlString(subject)},${sqlString(message)},${sqlString(priority)},${sqlString(status)},${status === 'resolved' ? sqlString('Invoice link sent to the customer.') : 'NULL'},datetime('now','-${index + 1} days'),datetime('now','-${index} days'));`,
  ),
);

const editorialSeeds = [
  [
    'seed-blog-seasonal',
    'seasonal-produce-nepal-seven-provinces',
    'What Is in Season Across Nepal’s Seven Provinces?',
    'Shop with changing altitudes, harvest windows and regional strengths in mind.',
    'Buying guide',
    'Hariyo Mart Editorial',
    '/campaigns/fresh-every-corner.webp',
    'vegetables',
  ],
  [
    'seed-blog-storefront',
    'digital-storefront-for-nepal-farmers',
    'Build a Farm Storefront That Earns Repeat Orders',
    'Accurate stock, useful photos and realistic delivery zones create long-term trust.',
    'Seller academy',
    'Hariyo Mart Seller Team',
    '/campaigns/sell-from-home.webp',
    'vegetables',
  ],
  [
    'seed-blog-connection',
    'local-connections-behind-every-basket',
    'The Local Connections Behind Every Basket',
    'How location, verified origin and seller operations make fresh commerce more dependable.',
    'Farm story',
    'Hariyo Mart Editorial',
    '/campaigns/connect-suppliers.webp',
    'farm-boxes',
  ],
  [
    'seed-blog-growth',
    'grow-a-fresh-business-with-hariyo',
    'Grow a Fresh Business With Hariyo Mart',
    'A practical guide to stock, delivery, buyer relationships and settlement visibility.',
    'Seller academy',
    'Hariyo Mart Seller Team',
    '/campaigns/grow-with-hariyo.webp',
    'farm-boxes',
  ],
];
editorialSeeds.forEach(([id, slug, title, excerpt, category, author, cover, related], index) =>
  lines.push(
    `INSERT OR IGNORE INTO blog_posts (id,slug,title,excerpt,category,author,cover_image,content_json,related_category,status,featured,published_at,created_at,updated_at) VALUES (${sqlString(id)},${sqlString(slug)},${sqlString(title)},${sqlString(excerpt)},${sqlString(category)},${sqlString(author)},${sqlString(cover)},${jsonString(
      [
        {
          heading: 'Built around real local commerce',
          paragraphs: [
            'Hariyo Mart keeps seller identity, location, available stock and delivery coverage visible from discovery to fulfilment.',
            'The marketplace combines a trusted buyer experience with independent operating tools for each farmer and supplier.',
          ],
        },
        {
          heading: 'A system designed to grow',
          paragraphs: [
            'Start with accurate products and realistic routes, learn from repeat orders, and expand only when service quality can be maintained.',
          ],
        },
      ],
    )},${sqlString(related)},'published',${index === 0 ? 1 : 0},datetime('now','-${index + 8} days'),datetime('now','-${index + 10} days'),datetime('now','-${index + 8} days'));`,
  ),
);

[
  [
    'seed-page-about',
    'about-hariyo-network',
    'About the Hariyo Network',
    'How Hariyo Mart connects buyers, suppliers and farms through transparent local commerce.',
  ],
  [
    'seed-page-seller',
    'seller-success-guide',
    'Seller Success Guide',
    'The operating principles for accurate listings, reliable delivery and repeat buyers.',
  ],
  [
    'seed-page-quality',
    'freshness-and-quality',
    'Freshness & Quality',
    'How origin, harvest notes, packing, reviews and issue resolution protect buyer trust.',
  ],
].forEach(([id, slug, title, summary], index) =>
  lines.push(
    `INSERT OR IGNORE INTO cms_pages (id,slug,title,summary,sections_json,status,seo_title,seo_description,published_at,created_at,updated_at) VALUES (${sqlString(id)},${sqlString(slug)},${sqlString(title)},${sqlString(summary)},${jsonString([{ heading: 'What you need to know', paragraphs: [summary, 'Administrators can edit, publish or archive this page from the Hariyo Mart operations workspace.'] }])},'published',${sqlString(`${title} | Hariyo Mart Nepal`)},${sqlString(summary)},datetime('now','-${index + 2} days'),datetime('now','-${index + 5} days'),datetime('now','-${index + 2} days'));`,
  ),
);

['namaste', 'seasonal', 'kitchen', 'farmer', 'community'].forEach((label, index) =>
  lines.push(
    `INSERT OR IGNORE INTO newsletter_subscribers (id,email,source,status,subscribed_at) VALUES (${sqlString(`seed-subscriber-${index + 1}`)},${sqlString(`${label}@newsletter.seed.invalid`)},${sqlString(index % 2 ? 'campaign' : 'website')},'subscribed',datetime('now','-${index + 1} days'));`,
  ),
);

buyerSeeds.forEach(([id], index) =>
  lines.push(
    `INSERT OR IGNORE INTO notifications (id,user_id,type,title,message,link,read_at,created_at) VALUES (${sqlString(`seed-notification-${index + 1}`)},${sqlString(id)},'order_update',${sqlString('Your Hariyo order is moving')},${sqlString('A local seller updated the fulfillment timeline for your fresh order.')},'/account/orders',${index === 0 ? "datetime('now','-1 day')" : 'NULL'},datetime('now','-${index + 1} days'));`,
  ),
);

// Cloudflare-native tenant access and SaaS backfill for seeded seller identities.
lines.push(
  `UPDATE users SET active_tenant_id=tenant_id WHERE active_tenant_id IS NULL AND tenant_id IS NOT NULL;`,
  `INSERT OR IGNORE INTO tenant_members(tenant_id,user_id,role,status,joined_at) SELECT tenant_id,id,'owner','active',created_at FROM users WHERE tenant_id IS NOT NULL;`,
  `INSERT OR IGNORE INTO tenant_subscriptions(tenant_id,plan_code,status) SELECT id,CASE WHEN plan='enterprise' THEN 'enterprise' WHEN plan='growth' THEN 'growth' ELSE 'starter' END,'active' FROM tenants;`,
  `INSERT OR IGNORE INTO tenant_settings_v8(tenant_id) SELECT id FROM tenants;`,
);

lines.push(
  `INSERT OR IGNORE INTO platform_settings (setting_key,value_json,is_public) VALUES ('marketplace.owner_email','"greenmandux@gmail.com"',0);`,
  `INSERT OR REPLACE INTO platform_settings (setting_key,value_json,is_public) VALUES ('marketplace.release','"10.0.1"',1);`,
  `INSERT OR IGNORE INTO platform_settings (setting_key,value_json,is_public) VALUES ('marketplace.campaign_assets','["/campaigns/trusted-marketplace.webp","/campaigns/fresh-every-corner.webp","/campaigns/sell-from-home.webp","/campaigns/grow-with-hariyo.webp"]',1);`,
);

await Promise.all([
  writeFile(path.join(webRoot, 'seed/cloudflare.sql'), `${lines.join('\n')}\n`),
  writeFile(path.join(webRoot, 'migrations/seed.sql'), `${lines.join('\n')}\n`),
]);
console.log(
  `Generated ${catalog.products.length} products, ${Object.keys(sourceClusters).length} sourcing tenants, ${orderIds.length} realistic orders and full operations data.`,
);
