export type UserRole = "HRD" | "AKUNTANSI";

type RawUser = Record<string, unknown>;

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRole(role: unknown): UserRole {
  const raw = toString(role).toUpperCase();
  if (raw === "AKUNTANSI" || raw === "ACCOUNTING") {
    return "AKUNTANSI";
  }
  return "HRD";
}

export function inferRoleFromUser(user: RawUser): UserRole {
  const explicitRole =
    user.role ?? user.userRole ?? user.otoritas ?? user.authority ?? user.jabatan;

  if (explicitRole) {
    return normalizeRole(explicitRole);
  }

  const email = toString(user.email).toLowerCase();
  const username = toString(user.username).toLowerCase();

  if (email.includes("akuntansi") || username.includes("akuntansi")) {
    return "AKUNTANSI";
  }

  return "HRD";
}

export function isSalaryPath(pathname: string): boolean {
  return (
    pathname === "/penggajian" ||
    pathname.startsWith("/penggajian/") ||
    pathname.startsWith("/dashboard/salary")
  );
}
