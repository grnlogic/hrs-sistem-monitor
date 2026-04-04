import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { inferRoleFromUser } from "@/lib/auth/roles";

function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    const cleanUrl = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
    return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
  }
  return "http://localhost:8084/api";
}

type LoginResponse = {
  token: string;
  user: Record<string, unknown>;
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "ems-dev-secret-change-me",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) {
          return null;
        }

        const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as LoginResponse;
        if (!data?.token || !data?.user) {
          return null;
        }

        const role = inferRoleFromUser(data.user);
        const name =
          (typeof data.user.namaLengkap === "string" && data.user.namaLengkap) ||
          (typeof data.user.name === "string" && data.user.name) ||
          credentials.username;
        const email =
          (typeof data.user.email === "string" && data.user.email) ||
          credentials.username;

        return {
          id: String(data.user.id ?? email),
          name,
          email,
          role,
          accessToken: data.token,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as "HRD" | "AKUNTANSI") ?? "HRD";
      }
      session.accessToken = (token.accessToken as string | undefined) ?? "";
      return session;
    },
  },
};
