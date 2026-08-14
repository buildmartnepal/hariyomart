import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'supabase/schema/v7_supply_saas.sql',
  'docs/CLOUDFLARE_SUPABASE_V7_COMPLETE_GUIDE.md',
  'infra/cloudflare/hyperdrive.supabase.example.jsonc',
  'apps/web/server/cloudflare/supply-stack.ts',
];

const rows = [];
for (const file of requiredFiles) {
  rows.push({ check: file, ok: existsSync(resolve(root, file)), note: 'required v7 artifact' });
}

const wrangler = readFileSync(resolve(root, 'apps/web/wrangler.jsonc'), 'utf8');
rows.push({ check: 'Cloudflare D1 transition binding', ok: wrangler.includes('HARIYO_DB'), note: 'keeps v6.4 migration path runnable' });
rows.push({ check: 'R2 media binding', ok: wrangler.includes('HARIYO_MEDIA'), note: 'product and tenant media' });
rows.push({ check: 'KV binding', ok: wrangler.includes('HARIYO_KV'), note: 'cache/config only' });
rows.push({ check: 'Queue binding', ok: wrangler.includes('HARIYO_EVENTS'), note: 'async events' });
rows.push({ check: 'Service binding', ok: wrangler.includes('HARIYO_SERVICES'), note: 'Durable Object checkout/rate limiting' });

const env = process.env;
rows.push({ check: 'SUPABASE_URL', ok: Boolean(env.SUPABASE_URL), note: 'set as Worker secret for live v7' });
rows.push({ check: 'SUPABASE_PUBLISHABLE_KEY', ok: Boolean(env.SUPABASE_PUBLISHABLE_KEY), note: 'server copy of public API key' });
rows.push({ check: 'SUPABASE_SECRET_KEY', ok: Boolean(env.SUPABASE_SECRET_KEY), note: 'server only; bypasses RLS' });
rows.push({ check: 'CLOUDFLARE_HYPERDRIVE_ID', ok: Boolean(env.CLOUDFLARE_HYPERDRIVE_ID), note: 'optional until direct Postgres jobs are enabled' });

const width = Math.max(...rows.map((row) => row.check.length));
for (const row of rows) {
  console.log(`${row.ok ? 'PASS' : '----'}  ${row.check.padEnd(width)}  ${row.note}`);
}

const structuralFailures = rows.slice(0, 9).filter((row) => !row.ok);
console.log('\nHariyo v7 mode:', env.SUPABASE_URL && env.SUPABASE_SECRET_KEY ? 'Supabase credentials detected' : 'D1 transition / Supabase setup pending');
if (structuralFailures.length) {
  console.error(`Structural checks failed: ${structuralFailures.length}`);
  process.exitCode = 1;
}
