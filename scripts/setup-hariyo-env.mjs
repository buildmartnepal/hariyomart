import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const web = path.join(root, 'apps', 'web');
const mobile = path.join(root, 'apps', 'mobile');
const devVarsPath = path.join(web, '.dev.vars');
const rotateSecrets = process.argv.includes('--rotate-secrets');
const nonInteractive = process.argv.includes('--non-interactive');

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }
  return out;
}

const generatedSecret = () => randomBytes(48).toString('base64url');
const existingSecrets = parseEnvFile(devVarsPath);

async function main() {
  const terminal = nonInteractive ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (question, fallback = '', envKey = '') => {
    if (nonInteractive) return String((envKey && process.env[envKey]) || fallback || '').trim();
    const answer = (await terminal.question(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
    return answer || fallback || '';
  };

  try {
    const site = (await ask('Production site URL', 'https://hariyo-mart-nepal.nishrutesh.workers.dev', 'HARIYO_SETUP_SITE')).replace(/\/$/, '');
    if (!URL.canParse(site) || new URL(site).protocol !== 'https:') throw new Error('Production site URL must be HTTPS.');
    const email = await ask('Admin email', 'greenmandux@gmail.com', 'HARIYO_SETUP_ADMIN_EMAIL');
    const name = await ask('Admin name', 'Hariyo Mart Admin', 'HARIYO_SETUP_ADMIN_NAME');
    const turnstileSite = await ask('Cloudflare Turnstile SITE key (public; can add later)', '', 'HARIYO_SETUP_TURNSTILE_SITE_KEY');
    const turnstileSecretInput = await ask('Cloudflare Turnstile SECRET key (private; required before production deploy)', '', 'HARIYO_SETUP_TURNSTILE_SECRET_KEY');

    const jwt = rotateSecrets ? generatedSecret() : existingSecrets.JWT_SECRET || generatedSecret();
    const refresh = rotateSecrets ? generatedSecret() : existingSecrets.JWT_REFRESH_SECRET || generatedSecret();
    const bootstrap = rotateSecrets ? generatedSecret() : existingSecrets.ADMIN_BOOTSTRAP_KEY || generatedSecret();
    const turnstileSecret = turnstileSecretInput || existingSecrets.TURNSTILE_SECRET_KEY || '';

    if (fs.existsSync(devVarsPath) && !rotateSecrets) {
      console.log('Existing .dev.vars detected: JWT/bootstrap secrets are being reused. Use --rotate-secrets only when you intentionally want to invalidate/rotate them.');
    }

    fs.writeFileSync(path.join(web, '.env.local'), [
      'NEXT_PUBLIC_API_URL=/api',
      `NEXT_PUBLIC_SITE_URL=${site}`,
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileSite}`,
      `HARIYO_ADMIN_NAME=${name}`,
      `HARIYO_ADMIN_EMAIL=${email}`,
      '',
    ].join('\n'));

    const wranglerPath = path.join(web, 'wrangler.jsonc');
    const wrangler = JSON.parse(fs.readFileSync(wranglerPath, 'utf8'));
    wrangler.vars.NEXT_PUBLIC_SITE_URL = site;
    if (turnstileSite) wrangler.vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY = turnstileSite;
    wrangler.vars.RELEASE_VERSION = '8.5.0';
    fs.writeFileSync(wranglerPath, `${JSON.stringify(wrangler, null, 2)}\n`);

    fs.writeFileSync(path.join(mobile, '.env'), [
      `EXPO_PUBLIC_API_URL=${site}/api`,
      `EXPO_PUBLIC_WEB_URL=${site}`,
      '',
    ].join('\n'));

    fs.writeFileSync(devVarsPath, [
      `JWT_SECRET="${jwt}"`,
      `JWT_REFRESH_SECRET="${refresh}"`,
      `TURNSTILE_SECRET_KEY="${turnstileSecret}"`,
      `ADMIN_BOOTSTRAP_KEY="${bootstrap}"`,
      '',
    ].join('\n'));

    fs.writeFileSync(path.join(root, 'HARIYO-PRIVATE-SETUP.generated.txt'), `HARIYO MART PRIVATE SETUP — DO NOT COMMIT\n\nSITE=${site}\nADMIN_NAME=${name}\nADMIN_EMAIL=${email}\nJWT_SECRET=${jwt}\nJWT_REFRESH_SECRET=${refresh}\nADMIN_BOOTSTRAP_KEY=${bootstrap}\nTURNSTILE_SITE_KEY=${turnstileSite || 'PASTE_FROM_CLOUDFLARE'}\nTURNSTILE_SECRET_KEY=${turnstileSecret || 'PASTE_FROM_CLOUDFLARE'}\n\nNext:\n1. npm run secrets:push\n2. npm run cloudflare:db:remote\n3. npm run deploy:cloudflare\n4. npm run bootstrap:admin\n\nAfter the first admin is successfully created, remove/rotate ADMIN_BOOTSTRAP_KEY.\n`);

    console.log('\nCreated apps/web/.env.local, apps/mobile/.env, apps/web/.dev.vars and HARIYO-PRIVATE-SETUP.generated.txt.');
    console.log(turnstileSecret && turnstileSite ? 'Turnstile keys captured.' : 'Before production deploy, add the real Cloudflare Turnstile site/secret keys.');
    console.log('Private secrets were not written to wrangler.jsonc or any tracked source file.');
  } finally {
    terminal?.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
