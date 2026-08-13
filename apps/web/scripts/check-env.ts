import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
const checks: ReadonlyArray<readonly [string, (value: string) => boolean]> = [
  ['NEXT_PUBLIC_API_URL', (v) => /^https?:\/\//.test(v)],
  ['NEXT_PUBLIC_SITE_URL', (v) => /^https?:\/\//.test(v)],
  ['MONGODB_URI', (v) => /^mongodb(\+srv)?:\/\//.test(v)],
  ['JWT_SECRET', (v) => v.length >= 32],
  ['JWT_REFRESH_SECRET', (v) => v.length >= 32],
  ['CORS_ORIGIN', (v) => /^https?:\/\//.test(v)],
];
let failed = false;
for (const [key, test] of checks) {
  const value = process.env[key] || '';
  const ok = test(value);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${key}`);
  if (!ok) failed = true;
}
const redis = Boolean(
  process.env.REDIS_URL ||
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
);
console.log(`${redis ? 'PASS' : 'FAIL'} Redis credentials (REDIS_URL or Upstash REST pair)`);
if (!redis) failed = true;
console.log(
  `${process.env.ADMIN_BOOTSTRAP_KEY && process.env.ADMIN_BOOTSTRAP_KEY.length >= 24 ? 'PASS' : 'WARN'} ADMIN_BOOTSTRAP_KEY`,
);
console.log(
  `${process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET ? 'PASS' : 'WARN'} Cloudinary signed upload credentials`,
);
if (failed) process.exitCode = 1;
