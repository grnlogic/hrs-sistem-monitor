import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isSalaryPath } from "@/lib/auth/roles";

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isAccessTokenExpired = (token?: string): boolean => {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return false;

  return Date.now() >= exp * 1000;
};

const clearSessionCookies = (response: NextResponse) => {
  response.cookies.delete("next-auth.session-token");
  response.cookies.delete("__Secure-next-auth.session-token");
  response.cookies.delete("next-auth.csrf-token");
  response.cookies.delete("__Host-next-auth.csrf-token");
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "ems-dev-secret-change-me",
  });
  const accessToken = typeof token?.accessToken === "string" ? token.accessToken : "";
  const hasValidSession = Boolean(token) && !isAccessTokenExpired(accessToken);
  const role = token?.role as "HRD" | "AKUNTANSI" | undefined;
  const lokasi =
    typeof token?.lokasi === "string" && ["PJP", "SP", "PRIMA"].includes(token.lokasi)
      ? (token.lokasi as "PJP" | "SP" | "PRIMA")
      : null;

  if (pathname === "/") {
    if (!hasValidSession) return NextResponse.next();
    const redirectPath = role === "AKUNTANSI" ? "/penggajian/gaji-staff" : "/dashboard";
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  if (!hasValidSession) {
    const response = NextResponse.redirect(new URL("/", req.url));
    clearSessionCookies(response);
    return response;
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/penggajian")) {
    if (role === "AKUNTANSI" && !lokasi) {
      const response = NextResponse.redirect(new URL("/", req.url));
      clearSessionCookies(response);
      return response;
    }

    if (role === "AKUNTANSI" && !isSalaryPath(pathname)) {
      return NextResponse.redirect(new URL("/penggajian", req.url));
    }
  }

  const response = NextResponse.next();
  if (role === "AKUNTANSI") {
    response.headers.set("x-user-lokasi", lokasi || "MISSING");
  }
  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/penggajian/:path*"],
};
