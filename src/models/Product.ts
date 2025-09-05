// src/models/Product.ts
import { Schema, model, models } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    // Tie inventory rows to the signed-in user (by email)
    user: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

const Product = models.Product || model("Product", ProductSchema);
export default Product;