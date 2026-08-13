import fs from 'node:fs';
const catalog = JSON.parse(
  fs.readFileSync(new URL('../apps/api/src/data/catalog.json', import.meta.url)),
);
const routeCount =
  1 +
  1 +
  catalog.categories.length +
  catalog.products.length +
  catalog.provinces.length +
  18 +
  12 +
  10 +
  12 +
  8;
const unique = new Set(catalog.products.map((p) => p.slug));
if (unique.size !== catalog.products.length) throw new Error('Duplicate product slugs');
if (catalog.products.length < 80) throw new Error('Expected at least 80 products');
console.log(
  JSON.stringify(
    {
      products: catalog.products.length,
      categories: catalog.categories.length,
      provinces: catalog.provinces.length,
      estimatedRoutes: routeCount,
    },
    null,
    2,
  ),
);
