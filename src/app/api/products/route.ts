// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function toNum(v: string | null, fallback: number) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ items: [], page: 1, pageSize: 10, total: 0 });
  }

  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || "all";
  const min = toNum(searchParams.get("min"), NaN);
  const max = toNum(searchParams.get("max"), NaN);
  const sortBy = (searchParams.get("sortBy") ||
    "createdAt") as "createdAt" | "price" | "qty" | "name";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const page = Math.max(1, toNum(searchParams.get("page"), 1));
  const pageSize = Math.min(1000, Math.max(1, toNum(searchParams.get("pageSize"), 10)));

  const where: any = { user: email };
  if (q) {
    where.$or = [
      { name: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
    ];
  }
  if (status !== "all") where.status = status;
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    where.price = {};
    if (!Number.isNaN(min)) where.price.$gte = min;
    if (!Number.isNaN(max)) where.price.$lte = max;
  }

  const sort: any = { [sortBy]: sortDir === "asc" ? 1 : -1 };

  const total = await Product.countDocuments(where);
  const items = await Product.find(where)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return NextResponse.json({ items, page, pageSize, total });
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const doc = await Product.create({
    name: String(body.name ?? "").trim(),
    category: String(body.category ?? "").trim(),
    price: Number(body.price),
    qty: Number(body.qty),
    status: body.status === "archived" ? "archived" : "active",
    user: email,
  });

  return NextResponse.json(doc, { status: 201 });
}