import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const webConfig = path.join(root, 'apps/web/wrangler.jsonc');
const webConfigJson = JSON.parse(fs.readFileSync(webConfig, 'utf8'));
const siteUrl = webConfigJson.vars?.NEXT_PUBLIC_SITE_URL;

if (!siteUrl || !URL.canParse(siteUrl) || new URL(siteUrl).protocol !== 'https:') {
  throw new Error('apps/web/wrangler.jsonc must contain the final HTTPS NEXT_PUBLIC_SITE_URL.');
}
if (/REPLACE_WITH|PLACEHOLDER/i.test(String(webConfigJson.vars?.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''))) {
  console.warn('WARNING: Turnstile site key is still a placeholder. Deployment can continue, but configure Turnstile before public launch.');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });
  if (options.capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result;
}

function wrangler(args, options) {
  return run(npx, ['wrangler', ...args], options);
}
function randomSecret() {
  return randomBytes(48).toString('base64url');
}
function bulkSecrets(values, prefix) {
  const secretFile = path.join(os.tmpdir(), `${prefix}-${process.pid}.json`);
  fs.writeFileSync(secretFile, JSON.stringify(values), { mode: 0o600 });
  try {
    wrangler(['secret', 'bulk', secretFile, '--config', 'apps/web/wrangler.jsonc']);
  } finally {
    fs.rmSync(secretFile, { force: true });
  }
}

console.log('\n1/8 Validating local production configuration');
run(npm, ['run', 'cloudflare:config:check']);

console.log('\n2/8 Checking Cloudflare login and required secrets');
wrangler(['whoami']);
const secretList = wrangler(['secret', 'list', '--config', 'apps/web/wrangler.jsonc'], {
  capture: true,
  allowFailure: true,
});
const currentSecrets = `${secretList.stdout || ''}\n${secretList.stderr || ''}`;
if (!currentSecrets.includes('TURNSTILE_SECRET_KEY')) {
  console.warn('WARNING: TURNSTILE_SECRET_KEY is missing. D1 rate limiting remains active; configure Turnstile before public launch.');
}
const missingJwt = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter((name) => !currentSecrets.includes(name));
if (missingJwt.length) {
  bulkSecrets(Object.fromEntries(missingJwt.map((name) => [name, randomSecret()])), 'hariyo-jwt-secrets');
  console.log(`Generated and stored missing session secret(s): ${missingJwt.join(', ')}`);
} else {
  console.log('JWT and Turnstile secrets are already configured.');
}

console.log('\n3/8 Backing up remote D1');
const backup = path.join(root, `hariyo-pre-v8-2-${new Date().toISOString().slice(0, 10)}.sql`);
wrangler([
  'd1', 'export', 'hariyo-mart-production-apac', '--remote', '--output', backup,
]);
console.log(`D1 backup written to ${backup}`);

console.log('\n4/8 Applying D1 migrations');
run(npm, ['run', 'cloudflare:db:remote']);

console.log('\n5/8 Standalone deployment selected');
console.log('The optional hariyo-mart-services Worker is not required for the web deploy.');

console.log('\n6/8 Building and deploying the OpenNext web Worker');
run(npm, ['--workspace', 'apps/web', 'run', 'cf:deploy']);

console.log(`\n7/8 Verifying live endpoints at ${siteUrl}`);
const checks = [
  ['/api/health', 'health'],
  ['/api/system/readiness', 'readiness'],
  ['/api/system/supply-stack', 'supplyStack'],
  ['/api/products?limit=2', 'products'],
];
const verification = {};
for (const [pathname, key] of checks) {
  const response = await fetch(`${siteUrl}${pathname}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
  verification[key] = await response.json();
}
console.log(JSON.stringify({ siteUrl, verification }, null, 2));

console.log('\n8/8 Verifying owner admin');
let readiness = verification.readiness;
let adminBootstrapKey = null;
if (!readiness?.adminConfigured) {
  console.log('Owner setup is required. A one-time bootstrap secret will be created and rotated after use.');
  adminBootstrapKey = randomSecret();
  bulkSecrets({ ADMIN_BOOTSTRAP_KEY: adminBootstrapKey }, 'hariyo-admin-bootstrap');
  run(npm, ['run', 'bootstrap:admin'], {
    env: {
      NEXT_PUBLIC_SITE_URL: siteUrl,
      ADMIN_BOOTSTRAP_KEY: adminBootstrapKey,
      HARIYO_ADMIN_EMAIL: process.env.HARIYO_ADMIN_EMAIL || 'greenmandux@gmail.com',
    },
  });
  bulkSecrets({ ADMIN_BOOTSTRAP_KEY: randomSecret() }, 'hariyo-admin-lock');
  const response = await fetch(`${siteUrl}/api/system/readiness`);
  readiness = response.ok ? await response.json() : null;
  if (!readiness?.adminConfigured) throw new Error('Owner account verification did not complete.');
} else {
  console.log('Owner admin already exists; bootstrap was skipped.');
}

console.log(`\nHariyo Mart v8.3.3 is live: ${siteUrl}`);
console.log(`Owner sign-in: ${siteUrl}/login`);
