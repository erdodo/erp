import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tenantId: string | null;
      isSuperAdmin: boolean;
      isAdmin: boolean;
      isActive: boolean;
      roleId: string | null;
      permissions: string[];
    };
  }

  interface User {
    id: string;
    tenantId: string | null;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isActive: boolean;
    roleId: string | null;
    permissions: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const { prisma } = await import("./prisma");
          const { compare } = await import("bcryptjs");

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              role: { include: { permissions: { include: { permission: true } } } },
            },
          });

          if (!user || !user.password) {
            console.error("[AUTH] User not found or no password");
            return null;
          }

          const isValid = await compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            console.error("[AUTH] Invalid password");
            return null;
          }

          const permissions = user.isSuperAdmin
            ? ["*:*"]
            : (user.role?.permissions ?? []).map(
                (rp) => `${rp.permission.module}:${rp.permission.action}`
              );

          console.log("[AUTH] Login successful:", user.email);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin,
            isAdmin: user.isAdmin,
            isActive: user.isActive,
            roleId: user.roleId,
            permissions,
          };
        } catch (error) {
          console.error("[AUTH] Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
        token["tenantId"] = user.tenantId;
        token["isSuperAdmin"] = user.isSuperAdmin;
        token["isAdmin"] = user.isAdmin;
        token["isActive"] = user.isActive;
        token["roleId"] = user.roleId;
        token["permissions"] = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token["id"] as string;
        session.user.tenantId = (token["tenantId"] as string | null) ?? null;
        session.user.isSuperAdmin = (token["isSuperAdmin"] as boolean) ?? false;
        session.user.isAdmin = (token["isAdmin"] as boolean) ?? false;
        session.user.isActive = (token["isActive"] as boolean) ?? true;
        session.user.roleId = (token["roleId"] as string | null) ?? null;
        session.user.permissions = (token["permissions"] as string[]) ?? [];
      }
      return session;
    },
  },
});
