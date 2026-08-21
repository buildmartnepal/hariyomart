import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const serviceConfig = 'infra/cloudflare/services/wrangler.jsonc';
const webConfig = 'apps/web/wrangler.jsonc';

function run(command, args, { capture = false, allowFailure = false, env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    env,
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queueExists(name, output) {
  // `wrangler queues list` is currently human-readable. Match the complete queue
  // name as a table/token value so `hariyo-mart-events-dlq` cannot be mistaken
  // for `hariyo-mart-events`.
  const escaped = escapeRegExp(name);
  return new RegExp(`(?:^|[\\s│|])${escaped}(?:$|[\\s│|])`, 'm').test(output);
}

function ensureQueue(name) {
  const listed = wrangler(['queues', 'list'], { capture: true });
  const output = `${listed.stdout || ''}\n${listed.stderr || ''}`;
  if (queueExists(name, output)) {
    console.log(`Queue ${name} already exists.`);
    return;
  }
  console.log(`Creating missing Queue ${name}...`);
  wrangler(['queues', 'create', name]);
}

function assertWorkerDeployed(name) {
  const result = wrangler(['deployments', 'list', '--name', name, '--json'], { capture: true });
  let deployments;
  try {
    deployments = JSON.parse(result.stdout || '[]');
  } catch {
    throw new Error(`Could not parse Wrangler deployment status for ${name}.`);
  }
  if (!Array.isArray(deployments) || deployments.length === 0) {
    throw new Error(`${name} has no active deployment. Refusing to deploy the web Worker with a broken service binding.`);
  }
  console.log(`Verified ${name}: ${deployments.length} recent deployment record(s) returned by Wrangler.`);
}

if (!fs.existsSync(path.join(root, serviceConfig))) throw new Error(`${serviceConfig} not found`);
if (!fs.existsSync(path.join(root, webConfig))) throw new Error(`${webConfig} not found`);

console.log('\nHariyo Mart Cloudflare services bootstrap v8.9.0');
console.log('The internal service Worker is deployed and verified before the public web Worker.');

console.log('\n1/6 Checking Cloudflare authentication');
wrangler(['whoami']);

console.log('\n2/6 Ensuring event queues exist');
ensureQueue('hariyo-mart-events');
ensureQueue('hariyo-mart-events-dlq');

console.log('\n3/6 Generating/checking Worker binding types');
run(npm, ['run', 'cloudflare:types']);
run(npm, ['run', 'typecheck:services']);

console.log('\n4/6 Deploying private target Worker FIRST');
wrangler(['deploy', '--config', serviceConfig, '--message', 'Hariyo Mart v8.9.0 services bootstrap']);

console.log('\n5/6 Verifying target Worker exists before public web deployment');
assertWorkerDeployed('hariyo-mart-services');

console.log('\n6/6 Service bootstrap complete');
console.log('hariyo-mart-services is deployed and safe to bind from hariyo-mart-nepal.');
