// src/app/api/products/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { z } from "zod";
import { productCreateSchema, productStatusSchema } from "@/schemas/product";

const ok = (data: unknown, init: number = 200) =>
  NextResponse.json(data, { status: init });

const badRequest = (msg: unknown) =>
  NextResponse.json({ error: msg }, { status: 400 });

/**
 * DELETE /api/products/bulk
 * Body: { ids: string[] }
 * Deletes many products at once
 */
export async function DELETE(req: NextRequest) {
  await dbConnect();

  const body = await req.json().catch(() => null);
  const schema = z.object({
    ids: z.array(z.string().min(1)).min(1),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

  const res = await Product.deleteMany({ _id: { $in: parsed.data.ids } });
  // Mongoose 7: result has 'deletedCount'
  return ok({ deleted: res.deletedCount ?? 0 });
}

/**
 * PATCH /api/products/bulk
 * Body: { ids: string[]; status: "active" | "archived" }
 * Bulk status update
 */
export async function PATCH(req: NextRequest) {
  await dbConnect();

  const body = await req.json().catch(() => null);
  const schema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    status: productStatusSchema,
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

  const res = await Product.updateMany(
    { _id: { $in: parsed.data.ids } },
    { $set: { status: parsed.data.status } }
  );

  // Mongoose 7 returns { acknowledged, matchedCount, modifiedCount }
  return ok({
    matched: (res as any).matchedCount ?? 0,
    modified: (res as any).modifiedCount ?? 0,
  });
}

/**
 * POST /api/products/bulk
 * Body: { items: ProductCreateInput[] }
 * Bulk create products
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  const body = await req.json().catch(() => null);

  const schema = z.object({
    items: z.array(productCreateSchema).min(1),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

  const docs = await Product.insertMany(parsed.data.items, { ordered: false });

  return ok({
    inserted: docs.length,
    ids: docs.map((d) => String(d._id)),
  });
}