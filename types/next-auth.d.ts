import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    user: {
      role: "HRD" | "AKUNTANSI";
      lokasi?: "PJP" | "SP" | "PRIMA" | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: "HRD" | "AKUNTANSI";
    lokasi?: "PJP" | "SP" | "PRIMA" | null;
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "HRD" | "AKUNTANSI";
    lokasi?: "PJP" | "SP" | "PRIMA" | null;
    accessToken?: string;
  }
}
