import fs from 'node:fs';
import path from 'node:path';

const d1 = process.env.CLOUDFLARE_D1_DATABASE_ID;
const kv = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!d1 || !/^[0-9a-f-]{36}$/i.test(d1)) {
  throw new Error('CLOUDFLARE_D1_DATABASE_ID must be a D1 database UUID');
}
if (!kv || !/^[0-9a-f]{32}$/i.test(kv)) {
  throw new Error('CLOUDFLARE_KV_NAMESPACE_ID must be a 32-character KV namespace ID');
}
if (!siteUrl || !URL.canParse(siteUrl) || new URL(siteUrl).protocol !== 'https:') {
  throw new Error('NEXT_PUBLIC_SITE_URL must be the final HTTPS Workers or custom-domain URL');
}
if (siteUrl.includes('YOUR_SUBDOMAIN')) {
  throw new Error('NEXT_PUBLIC_SITE_URL still contains the YOUR_SUBDOMAIN placeholder');
}

for (const file of ['apps/web/wrangler.jsonc', 'infra/cloudflare/services/wrangler.jsonc']) {
  const resolved = path.resolve(file);
  const source = fs.readFileSync(resolved, 'utf8');
  const configured = source
    .replace(/("database_id"\s*:\s*")[^"]+("\s*,?)/g, `$1${d1}$2`)
    .replace(/("id"\s*:\s*")[0-9a-f]{32}("\s*,?)/gi, `$1${kv}$2`)
    .replace(/("NEXT_PUBLIC_SITE_URL"\s*:\s*")[^"]+("\s*,?)/g, `$1${siteUrl}$2`);
  fs.writeFileSync(resolved, configured);
  console.log(`Configured ${file}`);
}
