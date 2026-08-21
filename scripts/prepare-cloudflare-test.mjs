import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(args) {
  const result = spawnSync(npm, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed with exit code ${result.status}`);
}

console.log('Hariyo Mart v9.0.0 production-test database preparation');
console.log('1/4 Applying all remote D1 migrations');
run(['--workspace','apps/web','run','cf:db:remote']);
console.log('2/4 Idempotently seeding the full operational catalog/data set');
run(['--workspace','apps/web','run','cf:seed:remote']);
console.log('3/4 Seeding test identities because this release ships with PRODUCTION_TEST_MODE=true');
run(['--workspace','apps/web','run','cf:demo:remote']);
console.log('4/4 Database preparation complete. Verify /api/system/readiness after deployment.');
