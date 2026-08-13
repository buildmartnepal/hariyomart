import readline from 'node:readline';

function ask(question, fallback = '') {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    terminal.question(`${question}${fallback ? ` [${fallback}]` : ''}: `, (answer) => {
      terminal.close();
      resolve(answer.trim() || fallback);
    }),
  );
}

function askHidden(question) {
  if (!process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve) => {
    process.stdout.write(`${question}: `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (character) => {
      if (character === '\r' || character === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (character === '\u0003') {
        process.stdin.setRawMode(false);
        process.exit(130);
      } else if (character === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || (await ask('Production site URL'));
if (!URL.canParse(rawUrl) || new URL(rawUrl).protocol !== 'https:') {
  throw new Error('Enter the deployed HTTPS Worker URL.');
}
const siteUrl = rawUrl.replace(/\/$/, '');
const name = process.env.HARIYO_ADMIN_NAME || (await ask('Admin name', 'Hariyo Mart Admin'));
const email = process.env.HARIYO_ADMIN_EMAIL || (await ask('Admin email', 'greenmandux@gmail.com'));
const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY || (await askHidden('One-time bootstrap key'));
const password = process.env.HARIYO_ADMIN_PASSWORD || (await askHidden('Admin password'));

if (bootstrapKey.length < 24)
  throw new Error('The one-time bootstrap key is missing or too short.');
if (password.length < 12) throw new Error('Admin password must contain at least 12 characters.');

const response = await fetch(`${siteUrl}/api/auth/bootstrap-admin`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-bootstrap-key': bootstrapKey },
  body: JSON.stringify({ name, email, password }),
});
const body = await response.json();
if (!response.ok) throw new Error(body.error || `Admin creation failed (${response.status})`);

console.log(`Admin created for ${body.user.email}. Sign in at ${siteUrl}/login`);
console.log('Now rotate or delete ADMIN_BOOTSTRAP_KEY in Cloudflare.');
