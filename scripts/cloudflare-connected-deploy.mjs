import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const openNextWorker = path.join(root, 'apps/web/.open-next/worker.js');
const openNextAssets = path.join(root, 'apps/web/.open-next/assets');
const webConfig = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/wrangler.jsonc'), 'utf8'));
const productionTestMode = String(webConfig.vars?.PRODUCTION_TEST_MODE) === 'true';

function run(args, extraEnv = {}) {
  const result = spawnSync(npm, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed with exit code ${result.status}`);
}

console.log('\nHariyo Mart v8.7.0 connected production deployment');
console.log('Order: guard -> config -> optional services -> D1 migrations -> idempotent seed -> OpenNext build -> public standalone web Worker.');

console.log('\n1/7 Running production safety guard');
run(['run', 'production:guard']);

console.log('\n2/7 Validating Cloudflare configuration');
// Packaging may still contain the public Turnstile placeholder. Wrangler itself
// will enforce required private secrets; the public key remains a launch warning.
run(['run', 'cloudflare:config:check'], { ALLOW_TURNSTILE_PLACEHOLDER: '1' });

console.log('\n3/7 Optional internal Cloudflare services');
if (process.env.ENABLE_HARIYO_SERVICES === '1') {
  console.log('ENABLE_HARIYO_SERVICES=1: deploying the optional coordination Worker.');
  run(['run', 'cloudflare:bootstrap:services']);
} else {
  console.log('Skipping optional hariyo-mart-services. D1/KV/Queue fallbacks keep the public Worker fully deployable.');
}

console.log('\n4/7 Applying production D1 migrations');
run(['--workspace', 'apps/web', 'run', 'cf:db:remote']);

console.log('\n5/7 Idempotently seeding operational and Production Test Mode data');
run(['--workspace', 'apps/web', 'run', 'cf:seed:remote']);
if (productionTestMode) {
  run(['--workspace', 'apps/web', 'run', 'cf:demo:remote']);
} else {
  console.log('Production Test Mode is disabled; demo identities were not seeded.');
}

console.log('\n6/7 Ensuring a current OpenNext build exists');
if (!fs.existsSync(openNextWorker) || !fs.existsSync(openNextAssets)) {
  console.log('No built OpenNext artifact found; building now...');
  run(['run', 'build:cloudflare']);
} else {
  console.log('Existing .open-next build found; reusing the connected-build artifact.');
}

console.log('\n7/7 Deploying public OpenNext Worker');
run(['--workspace', 'apps/web', 'run', 'cf:deploy:built']);

console.log('\nHariyo Mart v8.7.0 deployment completed.');
console.log('Verify /api/health, /api/system/readiness, login/register, multi-photo product listing, Nearby matching, mobile flow and checkout.');
