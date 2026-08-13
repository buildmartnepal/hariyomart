import fs from 'node:fs';

const webPath = 'apps/web/wrangler.jsonc';
const servicesPath = 'infra/cloudflare/services/wrangler.jsonc';
const web = fs.readFileSync(webPath, 'utf8');
const services = fs.readFileSync(servicesPath, 'utf8');

const value = (source, key) => source.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`))?.[1] || '';

const webD1 = value(web, 'database_id');
const servicesD1 = value(services, 'database_id');
const kv = value(web, 'id');
const siteUrl = value(web, 'NEXT_PUBLIC_SITE_URL');

if (!/^[0-9a-f-]{36}$/i.test(webD1) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(webD1)) {
  throw new Error(`${webPath} does not contain a provisioned D1 database ID`);
}
if (servicesD1 !== webD1) {
  throw new Error('The web and services Workers must bind the same production D1 database');
}
if (!/^[0-9a-f]{32}$/i.test(kv) || /^0{32}$/.test(kv)) {
  throw new Error(`${webPath} does not contain a provisioned KV namespace ID`);
}
if (!URL.canParse(siteUrl) || new URL(siteUrl).protocol !== 'https:') {
  throw new Error(`${webPath} must contain the final HTTPS site URL`);
}
if (siteUrl.includes('YOUR_SUBDOMAIN')) {
  throw new Error(`${webPath} still contains the YOUR_SUBDOMAIN placeholder`);
}

console.log('Cloudflare production configuration PASS');
