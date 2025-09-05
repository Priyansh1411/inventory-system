// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const update = {
    name: String(body.name ?? "").trim(),
    category: String(body.category ?? "").trim(),
    price: Number(body.price),
    qty: Number(body.qty),
    status: body.status === "archived" ? "archived" : "active",
  };

  const doc = await Product.findOneAndUpdate({ _id: id, user: email }, update, {
    new: true,
  }).lean();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;
  await Product.deleteOne({ _id: id, user: email });
  return NextResponse.json({ ok: true });
}