import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

export function isDbConfigured(): boolean {
  return Boolean(MONGODB_URI);
}

type MongooseConnection = typeof mongoose;
type Cached = {
  conn: MongooseConnection | null;
  promise: Promise<MongooseConnection> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongoose: Cached | undefined;
}

const cached: Cached = global.mongoose ?? { conn: null, promise: null };
if (process.env.NODE_ENV !== "production") global.mongoose = cached;

export async function dbConnect(): Promise<MongooseConnection | null> {
  if (!MONGODB_URI) return null;
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
