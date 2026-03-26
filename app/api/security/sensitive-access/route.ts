import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const FALLBACK_PASSWORD = "padud@key202";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputPassword = String(body?.password ?? "");
    const configuredPassword =
      process.env.SENSITIVE_DATA_PASSWORD || FALLBACK_PASSWORD;

    const inputBuffer = Buffer.from(inputPassword, "utf8");
    const configuredBuffer = Buffer.from(configuredPassword, "utf8");

    const isValid =
      inputBuffer.length === configuredBuffer.length &&
      crypto.timingSafeEqual(inputBuffer, configuredBuffer);

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