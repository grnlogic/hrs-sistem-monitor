/* Demo read-only: NOMINAL_UPAH sebelum (toPlainNominal) vs sesudah (fix). */
import { buildPlaceholderContext, renderPKBTemplate } from "../lib/pkb-template-engine";
import { DEFAULT_PKB_TEMPLATE_NODES } from "../lib/pkb-template-default";
import type { PKBData } from "../lib/pkb-template";

const sample: PKBData = {
  nominalUpah: 2450000,
  tipeUpah: "per_bulan",
  bonusNominal: 50000,
  bpjsKesehatanNominal: "150000",
  bpjsKetenagakerjaanNominal: "120000",
  bpjs: "BPJS Kesehatan & Ketenagakerjaan",
  pihak1Nama: "H. Ahmad",
  pihak1Jabatan: "Direktur",
  pihak2Nama: "KURNIASIH",
  pihak2NIK: "3207012345678901",
  pihak2Alamat: "Banjar",
  tanggalPerjanjian: "2026-08-02",
  peranKaryawan: "Packing",
  catatanPembayaran: "",
} as unknown as PKBData;

const html = renderPKBTemplate(DEFAULT_PKB_TEMPLATE_NODES, sample, { division: "packing" });
const ctx = buildPlaceholderContext(sample, { division: "packing" });
const nominalLine = html
  .split("\n")
  .find((line) => line.includes("Nominal Upah Pokok"))
  ?.replace(/<[^>]+>/g, "")
  .trim();
console.log("=== Baris dokumen PKB (template default) ===");
console.log(nominalLine);
console.log("(sebelum fix: 'Nominal Upah Pokok: 2450000')");

console.log("=== SEBELUM (perilaku lama, toPlainNominal) ===");
console.log("NOMINAL_UPAH:", "2450000", " <- angka mentah tanpa titik");
console.log("");
console.log("=== SESUDAH (fix, formatCurrency + prefix Rp.) ===");
console.log("NOMINAL_UPAH:", ctx.NOMINAL_UPAH);
console.log("");
console.log("=== Pembanding: placeholder tetangga (harus seragam) ===");
console.log("BONUS_NOMINAL:          ", ctx.BONUS_NOMINAL);
console.log("BPJS_KESEHATAN_NOMINAL: ", ctx.BPJS_KESEHATAN_NOMINAL);
console.log("BPJS_KETENAGAKERJAAN:   ", ctx.BPJS_KETENAGAKERJAAN_NOMINAL);
console.log("NOMINAL_POTONGAN_BPJS:  ", ctx.NOMINAL_POTONGAN_BPJS);
