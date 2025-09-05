// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// What a user document looks like once we read it from Mongo (via .lean()).
type UserDoc = {
  _id: string;
  name: string;
  email: string;
  password: string; // hashed
};

export const authOptions: NextAuthOptions = {
  // We use stateless JWTs so we can protect API routes easily.
  session: { strategy: "jwt" },
  // Your custom sign-in page
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Called on POST /api/auth/callbacks/credentials
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        await dbConnect();

        // Find user and make TS aware of the shape.
        const user = (await User.findOne({ email: creds.email }).lean()) as UserDoc | null;
        if (!user) return null;

        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;

        // What becomes token.user / session.user
        return { id: String(user._id), name: user.name, email: user.email };
      },
    }),
  ],

  callbacks: {
    // Put our user object into the JWT
    async jwt({ token, user }) {
      if (user) token.user = user; // runs on sign in
      return token;
    },
    // And expose it on the session
    async session({ session, token }) {
      if (token?.user) (session as any).user = token.user;
      return session;
    },
  },
};