// src/schemas/product.ts
import { z } from "zod";

export const productStatusSchema = z.enum(["active", "archived"]);

export const productCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.number().nonnegative("Price must be >= 0"),
  qty: z.number().int("Qty must be an integer").nonnegative("Qty must be >= 0"),
  status: productStatusSchema.default("active"),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;