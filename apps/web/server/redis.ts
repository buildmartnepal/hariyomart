import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

type RedisMode = 'upstash-rest' | 'redis-url' | 'disabled';
declare global {
  var __hariyoRedisTcp: Redis | undefined;
  var __hariyoRedisRest: UpstashRedis | undefined;
}
export function redisMode(): RedisMode {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    return 'upstash-rest';
  if (process.env.REDIS_URL) return 'redis-url';
  return 'disabled';
}
export function redisConfigured() {
  return redisMode() !== 'disabled';
}
function rest() {
  if (redisMode() !== 'upstash-rest') return null;
  if (!globalThis.__hariyoRedisRest)
    globalThis.__hariyoRedisRest = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  return globalThis.__hariyoRedisRest;
}
function tcp() {
  if (redisMode() !== 'redis-url') return null;
  if (globalThis.__hariyoRedisTcp) return globalThis.__hariyoRedisTcp;
  const client = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 4000,
    tls: process.env.REDIS_URL!.startsWith('rediss://') ? {} : undefined,
  });
  client.on('error', () => {});
  globalThis.__hariyoRedisTcp = client;
  return client;
}
async function tcpReady(client: Redis) {
  if (client.status === 'wait') await client.connect();
  return client;
}
async function get(key: string) {
  const r = rest();
  if (r) return r.get<string>(key);
  const t = tcp();
  if (t) {
    await tcpReady(t);
    return t.get(key);
  }
  return null;
}
async function setEx(key: string, value: string, ttl: number) {
  const r = rest();
  if (r) {
    await r.set(key, value, { ex: ttl });
    return;
  }
  const t = tcp();
  if (t) {
    await tcpReady(t);
    await t.set(key, value, 'EX', ttl);
  }
}
async function del(key: string) {
  const r = rest();
  if (r) {
    await r.del(key);
    return;
  }
  const t = tcp();
  if (t) {
    await tcpReady(t);
    await t.del(key);
  }
}
async function incr(key: string) {
  const r = rest();
  if (r) return Number(await r.incr(key));
  const t = tcp();
  if (t) {
    await tcpReady(t);
    return Number(await t.incr(key));
  }
  return 0;
}
async function ttl(key: string) {
  const r = rest();
  if (r) return Number(await r.ttl(key));
  const t = tcp();
  if (t) {
    await tcpReady(t);
    return Number(await t.ttl(key));
  }
  return -1;
}
async function expire(key: string, seconds: number) {
  const r = rest();
  if (r) {
    await r.expire(key, seconds);
    return;
  }
  const t = tcp();
  if (t) {
    await tcpReady(t);
    await t.expire(key, seconds);
  }
}
export async function redisHealth() {
  if (!redisConfigured()) return { mode: redisMode(), status: 'not_configured' };
  try {
    const marker = `hm:health:${Date.now()}`;
    await setEx(marker, '1', 5);
    const ok = await get(marker);
    await del(marker);
    return { mode: redisMode(), status: String(ok) === '1' ? 'connected' : 'error' };
  } catch {
    return { mode: redisMode(), status: 'error' };
  }
}
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  if (!redisConfigured()) return { allowed: true, remaining: limit, source: 'disabled' };
  try {
    const count = await incr(key),
      left = await ttl(key);
    if (count === 1 || left < 0) await expire(key, windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), source: redisMode() };
  } catch {
    return { allowed: true, remaining: limit, source: 'degraded' };
  }
}
export async function storeRefreshSession(jti: string, userId: string, ttlSeconds: number) {
  if (!redisConfigured()) return;
  try {
    await setEx(`hm:refresh:${jti}`, userId, ttlSeconds);
  } catch {}
}
export async function rotateRefreshSession(
  oldJti: string,
  userId: string,
  newJti: string,
  ttlSeconds: number,
) {
  if (!redisConfigured()) return true;
  try {
    const existing = await get(`hm:refresh:${oldJti}`);
    if (String(existing) !== userId) return false;
    await del(`hm:refresh:${oldJti}`);
    await setEx(`hm:refresh:${newJti}`, userId, ttlSeconds);
    return true;
  } catch {
    return false;
  }
}
export async function revokeRefreshSession(jti: string) {
  if (!redisConfigured()) return;
  try {
    await del(`hm:refresh:${jti}`);
  } catch {}
}
