import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    sample: process.env.MONGODB_URI ? process.env.MONGODB_URI.slice(0, 40) + "..." : null,
  });
}
