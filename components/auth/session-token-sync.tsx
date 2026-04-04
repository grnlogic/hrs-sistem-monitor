"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { removeAuthToken, setAuthToken } from "@/lib/api";
import { signOut } from "next-auth/react";

export function SessionTokenSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      const tokenExpiry = getJwtExpMs(session.accessToken);
      if (tokenExpiry && Date.now() >= tokenExpiry) {
        removeAuthToken();
        void signOut({ callbackUrl: "/", redirect: true });
        return;
      }

      setAuthToken(session.accessToken);
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: session.user?.name,
          email: session.user?.email,
          role: session.user?.role,
        })
      );
      return;
    }

    if (status === "unauthenticated") {
      removeAuthToken();
    }
  }, [session, status]);

  return null;
}

const getJwtExpMs = (token: string): number | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
};
