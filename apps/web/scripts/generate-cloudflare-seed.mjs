import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const catalog = JSON.parse(await readFile(path.join(webRoot, 'server/data/catalog.json'), 'utf8'));

const origins = {
  koshi: [
    'seed-tenant-koshi',
    'koshi-farmer-network',
    'Koshi Farmer Network',
    'Maya Rai',
    'Ilam',
    'Suryodaya',
    26.9115,
    88.0495,
    85,
  ],
  madhesh: [
    'seed-tenant-madhesh',
    'janakpur-natural-growers',
    'Janakpur Natural Growers',
    'Sita Mahato',
    'Dhanusha',
    'Janakpurdham',
    26.7271,
    85.9407,
    90,
  ],
  bagmati: [
    'seed-tenant-bagmati',
    'kathmandu-valley-farm',
    'Kathmandu Valley Farm',
    'Ramesh Shrestha',
    'Kathmandu',
    'Kageshwori Manohara',
    27.7286,
    85.4031,
    35,
  ],
  gandaki: [
    'seed-tenant-gandaki',
    'pokhara-hillside-growers',
    'Pokhara Hillside Growers',
    'Nabin Gurung',
    'Kaski',
    'Pokhara',
    28.2096,
    83.9856,
    120,
  ],
  lumbini: [
    'seed-tenant-lumbini',
    'rupandehi-green-basket',
    'Rupandehi Green Basket',
    'Sarita Tharu',
    'Rupandehi',
    'Butwal',
    27.7006,
    83.4484,
    95,
  ],
  karnali: [
    'seed-tenant-karnali',
    'jumla-heritage-harvest',
    'Jumla Heritage Harvest',
    'Kali Bahadur Rokaya',
    'Jumla',
    'Chandannath',
    29.2747,
    82.1838,
    160,
  ],
  sudurpashchim: [
    'seed-tenant-sudurpashchim',
    'dhangadhi-natural-produce',
    'Dhangadhi Natural Produce',
    'Hari Rana',
    'Kailali',
    'Dhangadhi',
    28.695,
    80.5938,
    100,
  ],
};

const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const jsonString = (value) => sqlString(JSON.stringify(value ?? []));
const lines = [
  '-- Generated from server/data/catalog.json. Safe to re-run.',
  'PRAGMA foreign_keys = ON;',
];

for (const [province, origin] of Object.entries(origins)) {
  const [id, slug, name, owner, district, municipality, lat, lng, radius] = origin;
  lines.push(
    `INSERT OR IGNORE INTO tenants (id,slug,name,owner_name,type,plan,status,province,district,municipality,lat,lng,specialties,delivery_radius_km,pickup_enabled,same_day_enabled,commission_rate) VALUES (${[
      id,
      slug,
      name,
      owner,
      'cooperative',
      'free',
      'verified',
      province,
      district,
      municipality,
    ]
      .map(sqlString)
      .join(
        ',',
      )},${lat},${lng},${jsonString(['Fresh produce', 'Province delivery'])},${radius},1,1,0.08);`,
  );
}

catalog.products.forEach((product, index) => {
  const origin = origins[product.province] || origins.bagmati;
  const [tenantId, , , , district, municipality, lat, lng, radius] = origin;
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
    `INSERT OR IGNORE INTO products (id,tenant_id,slug,name,category,province,district,municipality,unit,price,old_price,stock,minimum_order,organic,short_description,description,benefits,image_url,lat,lng,delivery_radius_km,status,rating,featured) VALUES (${values.join(',')},${Number(product.price)},${Number(product.oldPrice || product.price)},${Number(product.stock || 0)},1,${product.organic ? 1 : 0},${sqlString(product.shortDescription)},${sqlString(product.description)},${jsonString(product.benefits)},${sqlString(product.image)},${lat},${lng},${radius},'active',${Number(product.rating || 4.8)},${product.featured ? 1 : 0});`,
  );
});

await writeFile(path.join(webRoot, 'seed/cloudflare.sql'), `${lines.join('\n')}\n`);
console.log(
  `Generated ${catalog.products.length} products and ${Object.keys(origins).length} seller tenants.`,
);
