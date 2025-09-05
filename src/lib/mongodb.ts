// src/lib/mongodb.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env.local");
}

// Reuse connection in dev
let cached = (global as any)._mongoose as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;

if (!cached) {
  cached = (global as any)._mongoose = { conn: null, promise: null };
}

export default async function dbConnect() {
  if (cached!.conn) return cached!.conn;
  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached!.conn = await cached!.promise;
  return cached!.conn;
}