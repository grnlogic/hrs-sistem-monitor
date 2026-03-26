import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import type { TipeUpahPKB } from "./pkb-template";

export type PKBDivision = "sales" | "packing" | "blending";

export interface PKBDocxPayload {
  division: PKBDivision;
  pihak1Nama: string;
  pihak1Nik: string;
  pihak1Jabatan: string;
  pihak1TandaTangan: string;
  pihak2Nama: string;
  pihak2Nik: string;
  pihak2Jabatan: string;
  pihak2Alamat?: string;
  pihak2TandaTangan: string;
  tipeUpah: TipeUpahPKB;
  nominalUpah: number;
  bonusNominal?: number;
  catatanPembayaran?: string;
  tanggalPerjanjian: string;
}

const TEMPLATE_BY_DIVISION: Record<PKBDivision, string> = {
  sales: "pkb-sales.docx",
  packing: "pkb-packing.docx",
  blending: "pkb-blending.docx",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function replaceFirst(html: string, pattern: RegExp, replacement: string): string {
  return html.replace(pattern, replacement);
}

function replaceCommonFields(html: string, data: PKBDocxPayload): string {
  let output = html;
  output = replaceFirst(output, /Nama\s*:\s*Moch\s+Syaeful\s+Ikhsan/i, `Nama         : ${data.pihak1Nama}`);
  output = replaceFirst(output, /NIK:\s*[0-9\s.]+/i, `NIK: ${data.pihak1Nik}`);
  output = replaceFirst(output, /Jabatan\s*:\s*(Direktur|Pengelola)/i, `Jabatan         : ${data.pihak1Jabatan}`);

  output = replaceFirst(output, /Nama:\s*<\/p>/i, `Nama: ${data.pihak2Nama}</p>`);
  output = replaceFirst(output, /NIK\s*:\s*<\/p>/i, `NIK             : ${data.pihak2Nik}</p>`);
  output = replaceFirst(output, /Jabatan\s*:\s*<\/p>/i, `Jabatan                : ${data.pihak2Jabatan}</p>`);
  output = replaceFirst(output, /Alamat\s*:\s*<\/p>/i, `Alamat         : ${data.pihak2Alamat ?? ""}</p>`);

  // Tanda tangan blok bawah
  output = output.replace(/Moch\s+Syaeful\s+Ikhsan/gi, data.pihak1TandaTangan || data.pihak1Nama);
  output = output.replace(/Nani\s+Hermayani|Dede\s+Ati|Umar/gi, data.pihak2TandaTangan || data.pihak2Nama);

  // Tanggal
  output = replaceFirst(output, /Banjar,\s*[^<\n]+/i, `Banjar, ${formatDate(data.tanggalPerjanjian)}`);

  return output;
}

function replaceUpahSection(html: string, data: PKBDocxPayload): string {
  let output = html;
  const catatan = data.catatanPembayaran?.trim() || "di akhir minggu (sabtu).";

  if (data.division === "sales") {
    output = output.replace(/Rp\.\s*[0-9.]+\s*\/\s*hari/gi, `Rp. ${formatCurrency(data.nominalUpah)} / hari`);
    output = replaceFirst(
      output,
      /Pihak II akan menerima upah[^<]*<\/li>/i,
      `Pihak II akan menerima upah ${catatan}</li>`
    );
  }

  if (data.division === "packing") {
    output = output.replace(/Rp\.\s*[0-9.]+\s*\/\s*pack/gi, `Rp. ${formatCurrency(data.nominalUpah)} / pack`);
    const bonus = data.bonusNominal ?? 0;
    output = output.replace(/bonus tambahan sebesar\s*[0-9.]+\s*\/pack/gi, `bonus tambahan sebesar ${formatCurrency(bonus)}/pack`);
    output = replaceFirst(
      output,
      /Pihak II akan menerima upah[^<]*<\/li>/i,
      `Pihak II akan menerima upah ${catatan}</li>`
    );
  }

  if (data.division === "blending") {
    output = output.replace(/Rp\.\s*[0-9.]+\s*\/\s*kilogram/gi, `Rp. ${formatCurrency(data.nominalUpah)} / kilogram`);
    output = replaceFirst(
      output,
      /Pihak II akan menerima upah[^<]*<\/li>/i,
      `Pihak II akan menerima upah ${catatan}</li>`
    );
  }

  return output;
}

export async function generatePKBHTMLFromDocx(data: PKBDocxPayload): Promise<string> {
  const templateFile = TEMPLATE_BY_DIVISION[data.division];
  if (!templateFile) {
    throw new Error("Template PKB tidak ditemukan untuk divisi ini.");
  }

  const templatePath = path.join(process.cwd(), "templates", "pkb", templateFile);
  const buffer = await fs.readFile(templatePath);
  const { value: html } = await mammoth.convertToHtml({ buffer });

  const withCommon = replaceCommonFields(html, data);
  const withUpah = replaceUpahSection(withCommon, data);

  return withUpah;
}
