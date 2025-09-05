import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

function escapeCsv(value: any) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if contains comma, quote, or newline
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const statusFilter = (searchParams.get("status") || "all").toLowerCase(); // all | active | archived
  const minPrice = Number(searchParams.get("minPrice") || "0");
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

  const sort = (searchParams.get("sort") || "createdAt") as
    | "name"
    | "price"
    | "qty"
    | "createdAt";
  const dir = (searchParams.get("dir") || "desc").toLowerCase() === "asc" ? 1 : -1;

  const filter: any = { deletedAt: null };

  if (statusFilter === "active" || statusFilter === "archived") {
    filter.status = statusFilter;
  }

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { category: rx }];
  }

  if (isFinite(minPrice) || isFinite(maxPrice ?? NaN)) {
    filter.price = {};
    if (isFinite(minPrice)) filter.price.$gte = minPrice;
    if (isFinite(maxPrice ?? NaN)) filter.price.$lte = maxPrice;
  }

  const sortSpec: any = { [sort]: dir };

  const rows = await Product.find(filter).sort(sortSpec).lean();

  // Build CSV
  const header = [
    "name",
    "category",
    "price",
    "qty",
    "status",
    "createdAt",
    "updatedAt",
  ];
  const csvLines = [
    header.join(","), // header row
    ...rows.map((r: any) =>
      [
        escapeCsv(r.name),
        escapeCsv(r.category),
        escapeCsv(r.price),
        escapeCsv(r.qty),
        escapeCsv(r.status),
        escapeCsv(r.createdAt?.toISOString?.() ?? r.createdAt),
        escapeCsv(r.updatedAt?.toISOString?.() ?? r.updatedAt),
      ].join(","),
    ),
  ];

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products_export_${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}