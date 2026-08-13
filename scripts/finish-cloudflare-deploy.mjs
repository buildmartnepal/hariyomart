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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
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

function findWorkersUrl(output) {
  const urls = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/gi) || [];
  return urls.find((url) => new URL(url).hostname.startsWith('hariyo-mart-nepal.')) || urls[0];
}

console.log('\n1/7 Checking Cloudflare login');
wrangler(['whoami']);

console.log('\n2/7 Deploying the private services Worker');
wrangler([
  'deploy',
  '--config',
  'infra/cloudflare/services/wrangler.jsonc',
  '--message',
  'Hariyo Mart v6 services production release',
]);

console.log('\n3/7 Deploying the public Worker to resolve its workers.dev URL');
const firstDeploy = run(npm, ['--workspace', 'apps/web', 'run', 'cf:deploy'], { capture: true });
const deploymentOutput = `${firstDeploy.stdout || ''}\n${firstDeploy.stderr || ''}`;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || findWorkersUrl(deploymentOutput);
if (!siteUrl || !URL.canParse(siteUrl) || new URL(siteUrl).protocol !== 'https:') {
  throw new Error(
    'The Worker deployed, but its HTTPS URL could not be detected. Set NEXT_PUBLIC_SITE_URL and run this command again.',
  );
}

console.log('\n4/7 Installing missing production secrets');
const secretList = wrangler(['secret', 'list', '--config', 'apps/web/wrangler.jsonc'], {
  capture: true,
  allowFailure: true,
});
const currentSecrets = `${secretList.stdout || ''}\n${secretList.stderr || ''}`;
const requiredSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_BOOTSTRAP_KEY'];
const missingSecrets = requiredSecrets.filter((name) => !currentSecrets.includes(name));
let adminBootstrapKey = null;

if (missingSecrets.length) {
  const values = Object.fromEntries(missingSecrets.map((name) => [name, randomSecret()]));
  if (values.ADMIN_BOOTSTRAP_KEY) adminBootstrapKey = values.ADMIN_BOOTSTRAP_KEY;
  const secretFile = path.join(os.tmpdir(), `hariyo-cloudflare-secrets-${process.pid}.json`);
  fs.writeFileSync(secretFile, JSON.stringify(values), { mode: 0o600 });
  try {
    wrangler(['secret', 'bulk', secretFile, '--config', 'apps/web/wrangler.jsonc']);
  } finally {
    fs.rmSync(secretFile, { force: true });
  }
} else {
  console.log('All required secrets already exist; no secrets were rotated.');
}

console.log(`\n5/7 Configuring the production hostname: ${siteUrl}`);
const config = fs.readFileSync(webConfig, 'utf8');
const configured = config.replace(
  /("NEXT_PUBLIC_SITE_URL"\s*:\s*")[^"]+("\s*,?)/,
  `$1${siteUrl}$2`,
);
if (configured === config && !config.includes(siteUrl)) {
  throw new Error('Unable to update NEXT_PUBLIC_SITE_URL in apps/web/wrangler.jsonc');
}
fs.writeFileSync(webConfig, configured);

console.log('\n6/7 Rebuilding and publishing the final hostname-aware Worker');
run(npm, ['run', 'cloudflare:config:check']);
run(npm, ['--workspace', 'apps/web', 'run', 'cf:deploy']);

console.log('\n7/7 Verifying the live marketplace');
const health = await fetch(`${siteUrl}/api/health`);
const products = await fetch(`${siteUrl}/api/products?limit=2`);
if (!health.ok || !products.ok) {
  throw new Error(`Live verification failed: health=${health.status}, products=${products.status}`);
}
const healthBody = await health.json();
const productBody = await products.json();
console.log(
  JSON.stringify(
    {
      siteUrl,
      health: healthBody,
      productsReturned: Array.isArray(productBody?.products) ? productBody.products.length : null,
    },
    null,
    2,
  ),
);

if (adminBootstrapKey) {
  console.log('\nSAVE THIS ONE-TIME ADMIN BOOTSTRAP KEY IN A PASSWORD MANAGER:');
  console.log(adminBootstrapKey);
  console.log('Delete or rotate ADMIN_BOOTSTRAP_KEY after creating the first admin.');
}

console.log(`\nHariyo Mart is live: ${siteUrl}`);
