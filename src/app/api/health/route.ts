import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

export async function GET() {
  try {
    const conn = await dbConnect();

    return NextResponse.json({
      ok: true,
      message: "Connected successfully",
      dbName: conn?.connection?.db?.databaseName || "unknown",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e.message },
      { status: 500 }
    );
  }
}
