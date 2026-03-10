import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

// SessionとUserの型を上書き（拡張）する
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
  }
}

// JWTの型も拡張する
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}