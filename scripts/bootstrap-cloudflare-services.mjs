import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const serviceConfig = 'infra/cloudflare/services/wrangler.jsonc';
const webConfig = 'apps/web/wrangler.jsonc';

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });
  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result;
}

function wrangler(args, options) {
  return run(npx, ['wrangler', ...args], options);
}

function ensureQueue(name) {
  const listed = wrangler(['queues', 'list'], { capture: true });
  const output = `${listed.stdout || ''}\n${listed.stderr || ''}`;
  if (output.includes(name)) {
    console.log(`Queue ${name} already exists.`);
    return;
  }
  console.log(`Creating missing Queue ${name}...`);
  wrangler(['queues', 'create', name]);
}

if (!fs.existsSync(path.join(root, serviceConfig))) throw new Error(`${serviceConfig} not found`);
if (!fs.existsSync(path.join(root, webConfig))) throw new Error(`${webConfig} not found`);

console.log('\nHariyo Mart Cloudflare services bootstrap');
console.log('This is intentionally separate from the connected web Worker build.');

console.log('\n1/5 Checking Cloudflare authentication');
wrangler(['whoami']);

console.log('\n2/5 Ensuring event queues exist');
ensureQueue('hariyo-mart-events');
ensureQueue('hariyo-mart-events-dlq');

console.log('\n3/5 Generating/checking service binding types');
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'cloudflare:types']);
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'typecheck:services']);

console.log('\n4/5 Deploying private target Worker FIRST');
wrangler(['deploy', '--config', serviceConfig, '--message', 'Hariyo Mart v8.4.0 services bootstrap']);

console.log('\n5/5 Complete');
console.log('hariyo-mart-services now exists. Retry the connected hariyo-mart-nepal web deployment.');
console.log('For a full local deployment, run: npm run deploy:cloudflare:first');
