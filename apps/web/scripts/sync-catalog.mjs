import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const projectRoot = path.resolve(webRoot, '../..');
const sourcePath = path.join(webRoot, 'server/data/catalog.json');
const source = await readFile(sourcePath, 'utf8');
const catalog = JSON.parse(source);

if (!Array.isArray(catalog.categories) || !Array.isArray(catalog.products)) {
  throw new Error('Catalog must include categories and products arrays.');
}

const slugs = new Set();
for (const product of catalog.products) {
  if (!product.slug || slugs.has(product.slug))
    throw new Error(`Duplicate or empty product slug: ${product.slug}`);
  if (!catalog.categories.some((category) => category.slug === product.category)) {
    throw new Error(`Unknown category ${product.category} on ${product.slug}`);
  }
  slugs.add(product.slug);
}

const generated = `export const catalog = ${JSON.stringify(catalog, null, 2)} as const;

export type Product = {
  slug: string;
  name: string;
  category: string;
  province: string;
  provinceName: string;
  district: string;
  emoji: string;
  unit: string;
  price: number;
  oldPrice: number;
  rating: number;
  stock: number;
  organic: boolean;
  featured: boolean;
  shortDescription: string;
  description: string;
  benefits: readonly string[];
  image: string;
  minimumOrder?: number;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
};

export type Province = {
  slug: string;
  name: string;
  description: string;
  district: string;
  specialty: string;
};
`;
await Promise.all([
  writeFile(path.join(webRoot, 'lib/catalog.ts'), generated),
  writeFile(path.join(projectRoot, 'apps/mobile/data/catalog.ts'), generated),
  writeFile(path.join(projectRoot, 'apps/api/src/data/catalog.json'), `${source.trim()}\n`),
]);

console.log(
  `Synced ${catalog.categories.length} categories and ${catalog.products.length} products.`,
);
