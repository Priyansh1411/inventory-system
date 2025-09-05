// src/types/product.ts

export type ProductRow = {
  _id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  status: "active" | "archived";
  createdAt: string; // ISO string
};