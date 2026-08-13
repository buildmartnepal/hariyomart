import { randomBytes } from 'crypto';
const secret = () => randomBytes(48).toString('base64url');
console.log(`JWT_SECRET=${secret()}`);
console.log(`JWT_REFRESH_SECRET=${secret()}`);
console.log(`ADMIN_BOOTSTRAP_KEY=${secret()}`);
