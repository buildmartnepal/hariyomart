import readline from 'node:readline';

function ask(question, fallback = '') {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => terminal.question(`${question}${fallback ? ` [${fallback}]` : ''}: `, (answer) => { terminal.close(); resolve(answer.trim() || fallback); }));
}
function askHidden(question) {
  if (!process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve) => {
    process.stdout.write(`${question}: `);
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (character) => {
      if (character === '\r' || character === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); resolve(value); }
      else if (character === '\u0003') { process.stdin.setRawMode(false); process.exit(130); }
      else if (character === '\u007f') value = value.slice(0, -1);
      else value += character;
    };
    process.stdin.on('data', onData);
  });
}

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || await ask('Production site URL');
if (!URL.canParse(rawUrl) || new URL(rawUrl).protocol !== 'https:') throw new Error('Use the deployed HTTPS site URL.');
const site = rawUrl.replace(/\/$/, '');
const adminEmail = process.env.HARIYO_ADMIN_EMAIL || await ask('Existing admin email', 'greenmandux@gmail.com');
const adminPassword = process.env.HARIYO_ADMIN_PASSWORD || await askHidden('Existing admin password');
const login = await fetch(`${site}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json','x-client-platform':'mobile'}, body:JSON.stringify({email:adminEmail,password:adminPassword}) });
const session = await login.json();
if (!login.ok || session.user?.role !== 'admin' || !session.accessToken) throw new Error(session.error || 'Admin sign-in failed.');
const headers = { 'content-type':'application/json', authorization:`Bearer ${session.accessToken}`, 'x-client-platform':'mobile' };
const tenantResponse = await fetch(`${site}/api/tenants`, { headers });
const tenantPayload = await tenantResponse.json();
const tenants = Array.isArray(tenantPayload.data) ? tenantPayload.data : [];
console.log('\nAvailable seller tenants:');
tenants.slice(0,30).forEach((tenant) => console.log(`- ${tenant.id} | ${tenant.name} | ${tenant.status}`));
console.log('\nCreate any accounts you need. Leave email blank to skip a role. Temporary passwords are returned once.');
const definitions = [
  { role:'admin', label:'Additional admin', needsTenant:false },
  { role:'farmer', label:'Farmer user', needsTenant:true },
  { role:'vendor', label:'Vendor / cooperative user', needsTenant:true },
  { role:'customer', label:'Customer user', needsTenant:false },
];
const credentials = [];
for (const definition of definitions) {
  const email = await ask(`${definition.label} email (blank = skip)`);
  if (!email) continue;
  const name = await ask(`${definition.label} full name`);
  const phone = await ask(`${definition.label} phone (optional)`);
  let tenantId;
  if (definition.needsTenant) tenantId = await ask('Seller tenant id');
  const response = await fetch(`${site}/api/admin/users`, { method:'POST', headers, body:JSON.stringify({name,email,phone,role:definition.role,tenantId,verified:true}) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${definition.label}: ${payload.error || 'creation failed'}`);
  credentials.push({ role:definition.role, email:payload.user.email, temporaryPassword:payload.temporaryPassword });
}
console.log('\nONE-TIME CREDENTIALS');
console.log('====================');
for (const item of credentials) console.log(`${item.role.padEnd(10)} ${item.email}  ${item.temporaryPassword}`);
console.log('\nCopy these now. The passwords are not recoverable from Hariyo Mart after this output.');
