import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google"; 
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // 🌐 Google SSO: ドメイン制限付き
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        // ドメインチェック（小文字に統一してチェック）
        if (!credentials.email.toLowerCase().endsWith("@jmc-ltd.co.jp")) {
            throw new Error("ACCESS_DENIED_DOMAIN");
        }

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        return { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          department: user.department 
        };
      }
    })
  ],
  callbacks: {
    // 🛡️ Google SSO 等のログインをドメインで制限
    async signIn({ user }) {
      if (user.email && user.email.toLowerCase().endsWith("@jmc-ltd.co.jp")) {
        return true;
      }
      return false; // 許可ドメイン以外は拒否
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
      }
      // プロフィール更新時にセッション情報を即座に反映させるため
      if (trigger === "update" && session?.department) {
        token.department = session.department;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).department = token.department;
      }
      return session;
    },
  }
};