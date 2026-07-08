import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSetting } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputPassword = String(body?.password ?? "").trim();

    if (!inputPassword) {
      return NextResponse.json(
        { success: false, message: "Password wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil hash dari SQLite database
    const storedHash = getSetting("sensitive_access_password_hash");

    if (!storedHash) {
      // Hash belum di-seed ke database
      return NextResponse.json(
        { success: false, message: "Konfigurasi password belum diatur" },
        { status: 500 }
      );
    }

    // Verifikasi password dengan bcrypt (timing-safe secara otomatis)
    const isValid = await bcrypt.compare(inputPassword, storedHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Password tidak valid" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Permintaan tidak valid" },
      { status: 400 }
    );
  }
}