// src/models/User.ts
import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
  },
  { timestamps: true }
);

const User = models.User || model("User", UserSchema);
export default User;