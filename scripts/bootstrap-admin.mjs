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

function passwordIssue(value) {
  if (value.length < 14) return 'Use at least 14 characters.';
  if (!/[a-z]/.test(value)) return 'Add a lowercase letter.';
  if (!/[A-Z]/.test(value)) return 'Add an uppercase letter.';
  if (!/\d/.test(value)) return 'Add a number.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Add a symbol.';
  return '';
}

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || (await ask('Production site URL'));
if (!URL.canParse(rawUrl) || new URL(rawUrl).protocol !== 'https:') {
  throw new Error('Enter the deployed HTTPS Worker URL.');
}
const siteUrl = rawUrl.replace(/\/$/, '');
const name = process.env.HARIYO_ADMIN_NAME || (await ask('Admin name', 'Hariyo Mart Admin'));
const email = process.env.HARIYO_ADMIN_EMAIL || (await ask('Admin email', 'greenmandux@gmail.com'));
const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY || (await askHidden('One-time bootstrap key'));
const password = await askHidden('Create admin password');
const confirmation = await askHidden('Confirm admin password');

if (bootstrapKey.length < 24)
  throw new Error('The one-time bootstrap key is missing or too short.');
if (password !== confirmation) throw new Error('The admin passwords do not match.');
const passwordProblem = passwordIssue(password);
if (passwordProblem) throw new Error(`Admin password is not strong enough. ${passwordProblem}`);

const response = await fetch(`${siteUrl}/api/auth/bootstrap-admin`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-bootstrap-key': bootstrapKey },
  body: JSON.stringify({ name, email, password }),
});
const body = await response.json();
if (!response.ok) throw new Error(body.error || `Admin creation failed (${response.status})`);

const loginResponse = await fetch(`${siteUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-client-platform': 'mobile' },
  body: JSON.stringify({ email, password }),
});
const loginBody = await loginResponse.json();
if (!loginResponse.ok || loginBody.user?.role !== 'admin') {
  throw new Error('Admin was created, but the verification sign-in failed.');
}
if (loginBody.refreshToken) {
  await fetch(`${siteUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-platform': 'mobile' },
    body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
  });
}
console.log(`Admin created and sign-in verified for ${body.user.email}.`);
console.log(`Open ${siteUrl}/login and use the password you just created.`);
console.log(
  'The bootstrap endpoint is permanently locked because an admin now exists. You may also rotate the key for defence in depth; the production finisher does this automatically.',
);
