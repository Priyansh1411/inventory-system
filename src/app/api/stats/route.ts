import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

// Extend the Session type to include 'id' on user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const [products, stock, value, low] = await Promise.all([
    Product.countDocuments({ userId: session.user.id }),
    Product.aggregate([{ $match: { userId: session.user.id } }, { $group: { _id: null, s: { $sum: "$qty" } } }]),
    Product.aggregate([
      { $match: { userId: session.user.id } },
      { $project: { v: { $multiply: ["$qty", "$price"] } } },
      { $group: { _id: null, t: { $sum: "$v" } } },
    ]),
    Product.countDocuments({ userId: session.user.id, qty: { $lt: 20 } }),
  ]);

  return NextResponse.json({
    totalProducts: products,
    totalStock: stock[0]?.s ?? 0,
    totalValue: value[0]?.t ?? 0,
    lowStock: low,
  });
}