import { NextResponse } from "next/server";
import { generatePKBHTML } from "@/lib/pkb-template";
import type { PKBDocxPayload } from "@/lib/pkb-docx";
import type { TipeUpahPKB } from "@/lib/pkb-template";
import fs from "node:fs/promises";
import path from "node:path";

let cachedLogoBase64: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const logoPath = path.join(process.cwd(), "public", "png.png");
    const buffer = await fs.readFile(logoPath);
    cachedLogoBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
    return cachedLogoBase64;
  } catch {
    return "/png.png"; // fallback to URL if file read fails
  }
}

function divisionToTipeUpah(division: string): TipeUpahPKB {
  if (division === "sales") return "per_hari";
  if (division === "blending") return "per_kg";
  return "per_pack";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PKBDocxPayload;
    if (!body?.division) {
      return NextResponse.json({ error: "division wajib diisi" }, { status: 400 });
    }

    const tipeUpah = divisionToTipeUpah(body.division);
    const logoBase64 = await getLogoBase64();
    let html = generatePKBHTML({
      pihak1Nama: body.pihak1Nama,
      pihak1Nik: body.pihak1Nik,
      pihak1Jabatan: body.pihak1Jabatan,
      pihak1TandaTangan: body.pihak1TandaTangan,
      pihak2Nama: body.pihak2Nama,
      pihak2Nik: body.pihak2Nik,
      pihak2Jabatan: body.pihak2Jabatan,
      pihak2Alamat: body.pihak2Alamat ?? "",
      pihak2TandaTangan: body.pihak2TandaTangan,
      tipeUpah,
      nominalUpah: body.nominalUpah,
      bonusNominal: body.bonusNominal,
      catatanPembayaran: body.catatanPembayaran,
      tanggalPerjanjian: body.tanggalPerjanjian,
    });

    // Embed logo as base64 to avoid image loading issues in print/download
    html = html.replace(/src="\/png\.png"/g, `src="${logoBase64}"`);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("PKB generate error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal generate PKB" },
      { status: 500 }
    );
  }
}
