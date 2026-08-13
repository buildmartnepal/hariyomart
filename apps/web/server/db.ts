import mongoose from 'mongoose';

type MongoCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
declare global {
  var __hariyoMongo: MongoCache | undefined;
}
const cache = globalThis.__hariyoMongo ?? { conn: null, promise: null };
globalThis.__hariyoMongo = cache;

export function mongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}
export async function connectMongo() {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error('MONGODB_URI is not configured'), { status: 503 });
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 6000,
        socketTimeoutMS: 30000,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
export function mongoState() {
  return (
    ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ||
    String(mongoose.connection.readyState)
  );
}
