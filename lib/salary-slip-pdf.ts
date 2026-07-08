import { NAMA_PT } from "@/lib/constants/perusahaan";

type SlipItem = {
  label: string;
  nominal: number;
};

type JsPdfCtor = new (options?: any) => any;
type AutoTableFn = (doc: any, options: any) => void;

type LokasiCode = "PJP" | "SP" | "PRIMA" | "CMS" | "CPD";

export type SalarySlipPayload = {
  employeeName: string;
  division: string;
  status: "Staff" | "Non-Staff";
  periodLabel: string;
  location?: LokasiCode | string;
  hariEfektif?: number;
  upahHarian?: number;
  gajiPokok: number;
  tunjangan?: SlipItem[];
  bonusItems: SlipItem[];
  potonganItems: SlipItem[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(value: number): string {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function calculateSummary(payload: SalarySlipPayload) {
  const totalTunjangan = (payload.tunjangan || []).reduce(
    (sum, item) => sum + Number(item.nominal || 0),
    0
  );
  const totalBonus = payload.bonusItems.reduce(
    (sum, item) => sum + Number(item.nominal || 0),
    0
  );
  const totalPotongan = payload.potonganItems.reduce(
    (sum, item) => sum + Number(item.nominal || 0),
    0
  );
  const totalPendapatan =
    Number(payload.gajiPokok || 0) + totalTunjangan + totalBonus;
  const gajiBersih = totalPendapatan - totalPotongan;

  return {
    totalTunjangan,
    totalBonus,
    totalPotongan,
    totalPendapatan,
    gajiBersih,
  };
}

function truncateText(value: string, maxLength: number): string {
  const clean = String(value || "").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1))}.`;
}

function getNominalByLabel(items: SlipItem[], targetLabel: string): number {
  const found = items.find(
    (item) => item.label.toLowerCase() === targetLabel.toLowerCase()
  );
  return Number(found?.nominal || 0);
}

function normalizeLokasi(value: unknown): LokasiCode {
  const raw = String(value || "")
    .toUpperCase()
    .trim();
  if (raw === "SP" || raw === "CPD") return "SP";
  if (raw === "PRIMA" || raw === "CMS") return "PRIMA";
  return "PJP";
}

function isChunkLoadLikeError(error: unknown): boolean {
  const name = String((error as any)?.name || "");
  const message = String((error as any)?.message || "");
  const combined = `${name} ${message}`.toLowerCase();
  return (
    combined.includes("chunkload") ||
    combined.includes("loading chunk") ||
    combined.includes("failed to fetch dynamically imported module")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let jsPdfCtorCache: JsPdfCtor | null = null;
let autoTableFnCache: AutoTableFn | null = null;

async function loadJsPdfCtor(): Promise<JsPdfCtor> {
  if (jsPdfCtorCache) return jsPdfCtorCache;

  try {
    const mod = await import("jspdf");
    const ctor = ((mod as any).default || (mod as any).jsPDF) as JsPdfCtor;
    if (!ctor) throw new Error("jsPDF constructor tidak ditemukan");
    jsPdfCtorCache = ctor;
    return ctor;
  } catch (error) {
    if (!isChunkLoadLikeError(error)) {
      throw error;
    }

    await sleep(180);

    try {
      const fallbackMod = await import("jspdf/dist/jspdf.umd.min.js");
      const ctor = ((fallbackMod as any).jsPDF || (fallbackMod as any).default) as JsPdfCtor;
      if (!ctor) throw new Error("Fallback jsPDF constructor tidak ditemukan");
      jsPdfCtorCache = ctor;
      return ctor;
    } catch (fallbackError) {
      const wrapped = new Error(
        "Gagal memuat modul PDF. Coba refresh halaman, lalu ulangi export slip."
      );
      (wrapped as any).cause = fallbackError;
      throw wrapped;
    }
  }
}

async function loadAutoTableFn(): Promise<AutoTableFn> {
  if (autoTableFnCache) return autoTableFnCache;

  try {
    const mod = await import("jspdf-autotable");
    const fn = ((mod as any).default || mod) as AutoTableFn;
    if (!fn) throw new Error("autoTable function tidak ditemukan");
    autoTableFnCache = fn;
    return fn;
  } catch (error) {
    if (!isChunkLoadLikeError(error)) {
      throw error;
    }

    await sleep(120);
    const retryMod = await import("jspdf-autotable");
    const retryFn = ((retryMod as any).default || retryMod) as AutoTableFn;
    if (!retryFn) {
      throw new Error("Gagal memuat autoTable untuk export PDF");
    }
    autoTableFnCache = retryFn;
    return retryFn;
  }
}

// ─── Logo cache & loader ──────────────────────────────────────────────────────

const logoDataUrlCache = new Map<string, string>();

async function loadLogoDataUrl(filePath: string): Promise<string | null> {
  if (logoDataUrlCache.has(filePath)) {
    return logoDataUrlCache.get(filePath) || null;
  }
  try {
    const response = await fetch(filePath);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Gagal membaca file logo"));
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    logoDataUrlCache.set(filePath, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Mengukur dimensi asli gambar dari dataUrl.
 * Digunakan agar logo tidak di-stretch — kita hitung rasio dan fit ke dalam kotak.
 */
function getImageNaturalSize(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

/**
 * Hitung dimensi gambar yang muat di dalam kotak (maxW x maxH)
 * tanpa meregangkan / memotong — letterbox / contain.
 */
function fitInBox(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const ratio = naturalW / naturalH;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}

// ─── Company profile ──────────────────────────────────────────────────────────

function companyProfileByLokasi(value: unknown): {
  companyName: string;
  lokasiLabel: "PJP" | "SP" | "PRIMA";
  logoPath: string;
  logoFormat: "PNG" | "JPEG";
} {
  const lokasi = normalizeLokasi(value);
  if (lokasi === "SP") {
    return {
      companyName: NAMA_PT.SP,
      lokasiLabel: "SP",
      logoPath: "/lago padud cipadung.png",
      logoFormat: "PNG",
    };
  }
  if (lokasi === "PRIMA") {
    return {
      companyName: NAMA_PT.PRIMA,
      lokasiLabel: "PRIMA",
      logoPath: "/logo padud ciamis.jpeg",
      logoFormat: "JPEG",
    };
  }
  return {
    companyName: NAMA_PT.PJP,
    lokasiLabel: "PJP",
    logoPath: "/png.png",
    logoFormat: "PNG",
  };
}

// ─── Layout constants — Staff Slip ────────────────────────────────────────────
//
//  Tujuan: muat 6 kolom × 2 baris = 12 slip per halaman landscape A4.
//  Setiap slip sangat ramping, font dikecilkan, padding dipersempit.
//
const S_PAD        = 1.8;  // mm — padding kiri/kanan dalam slip
const S_HDR_H      = 9.2;  // mm — tinggi area header (background abu)
const S_HDR_NAME_Y = 3.8;  // mm dari originY
const S_HDR_PER_Y  = 6.2;  // mm dari originY
const S_HDR_LOC_Y  = 8.4;  // mm dari originY
const S_BODY_START = 12.5; // mm dari originY — baris pertama body
const S_ROW_GAP    = 2.9;  // mm — jarak antar baris
const S_SEC_GAP    = 2.4;  // mm — gap setelah label section
const S_COLON_OFF  = 16;   // mm dari contentX — posisi titik dua ":"
const S_LOGO_BOX_W = 10;   // mm — lebar kotak logo (contain, tidak stretch)
const S_LOGO_BOX_H = 5.2;  // mm — tinggi kotak logo

// ─── Draw single Staff slip ───────────────────────────────────────────────────

async function drawSingleSlip(
  doc: any,
  payload: SalarySlipPayload,
  originX: number,
  originY: number,
  slipWidth: number,
  slipHeight: number
) {
  const { totalBonus, gajiBersih } = calculateSummary(payload);
  const profile = companyProfileByLokasi(payload.location);

  const pinjaman       = getNominalByLabel(payload.potonganItems, "Pinjaman");
  const sumbangan      = getNominalByLabel(payload.potonganItems, "Sumbangan");
  const bpjs           = getNominalByLabel(payload.potonganItems, "BPJS");
  const undangan       = getNominalByLabel(payload.potonganItems, "Undangan");
  const warung         = getNominalByLabel(payload.potonganItems, "Warung");
  const jumlahPotongan = pinjaman + sumbangan + bpjs + undangan;

  const contentX = originX + S_PAD;
  const rightX   = originX + slipWidth - S_PAD;

  // Border
  doc.setDrawColor(180, 186, 198);
  doc.setLineWidth(0.18);
  doc.roundedRect(originX, originY, slipWidth, slipHeight, 1, 1);

  // Header background
  doc.setFillColor(245, 247, 250);
  doc.rect(originX + 0.6, originY + 0.6, slipWidth - 1.2, S_HDR_H, "F");

  // Header — company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(30, 30, 30);
  doc.text(
    truncateText(profile.companyName.toUpperCase(), 20),
    contentX,
    originY + S_HDR_NAME_Y
  );

  // Header — period & lokasi
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.setTextColor(70, 70, 70);
  doc.text(
    truncateText(payload.periodLabel.toUpperCase(), 26),
    contentX,
    originY + S_HDR_PER_Y
  );
  doc.text(
    `Lok: ${profile.lokasiLabel}`,
    contentX,
    originY + S_HDR_LOC_Y
  );

  // Logo — contain, tidak stretch
  const logoDataUrl = await loadLogoDataUrl(profile.logoPath);
  if (logoDataUrl) {
    const natural = await getImageNaturalSize(logoDataUrl);
    const { w, h } = fitInBox(natural.width, natural.height, S_LOGO_BOX_W, S_LOGO_BOX_H);
    // rata kanan, vertikal di tengah kotak
    const logoX = rightX - w;
    const logoY = originY + 1.6 + (S_LOGO_BOX_H - h) / 2;
    doc.addImage(logoDataUrl, profile.logoFormat, logoX, logoY, w, h, undefined, "FAST");
  }

  // Body
  let rowY = originY + S_BODY_START;
  doc.setTextColor(20, 20, 20);

  const addRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 5.2 : 4.8);
    doc.text(label, contentX, rowY);
    doc.text(":", contentX + S_COLON_OFF, rowY);
    doc.text(value, rightX, rowY, { align: "right" });
    rowY += S_ROW_GAP;
  };

  addRow("Nama",       truncateText(payload.employeeName, 20));
  addRow("Absensi",    typeof payload.hariEfektif === "number" ? String(payload.hariEfektif) : "-");
  addRow("Gaji Pokok", formatRupiah(payload.gajiPokok || 0));
  addRow("Bonus",      formatRupiah(totalBonus));

  // Section label: Potongan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.0);
  doc.setTextColor(80, 80, 80);
  doc.text("Potongan", contentX, rowY);
  rowY += S_SEC_GAP;
  doc.setTextColor(20, 20, 20);

  addRow("_ Pinjaman",  formatRupiah(pinjaman));
  addRow("_ Sumbangan", formatRupiah(sumbangan));
  addRow("_ BPJS",      formatRupiah(bpjs));
  addRow("_ Undangan",  formatRupiah(undangan));
  addRow("Jumlah",      formatRupiah(jumlahPotongan));
  addRow("_ Warung",    formatRupiah(warung));

  // Garis pemisah
  doc.setDrawColor(180, 188, 200);
  doc.setLineWidth(0.15);
  doc.line(contentX, rowY - 1.2, rightX, rowY - 1.2);

  // Total
  addRow("TOTAL", formatRupiah(gajiBersih), true);
}

// ─── Export: Salary Slips PDF ─────────────────────────────────────────────────
//   6 kolom × 2 baris = 12 slip per halaman

export async function exportSalarySlipsPdf(
  payloads: SalarySlipPayload[],
  fileName: string
) {
  const jsPDF = await loadJsPdfCtor();
  const doc   = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const columns      = 6;
  const rows         = 2;
  const slipsPerPage = columns * rows;
  const startX       = 6;
  const startY       = 6;
  const gapX         = 2.2;
  const gapY         = 3.5;
  const pageWidth    = 297;
  const pageHeight   = 210;
  const slipWidth    = (pageWidth  - startX * 2 - gapX * (columns - 1)) / columns;
  const slipHeight   = (pageHeight - startY * 2 - gapY * (rows    - 1)) / rows;

  for (let i = 0; i < payloads.length; i++) {
    if (i > 0 && i % slipsPerPage === 0) doc.addPage();

    const slot    = i % slipsPerPage;
    const col     = slot % columns;
    const row     = Math.floor(slot / columns);
    const originX = startX + col * (slipWidth  + gapX);
    const originY = startY + row * (slipHeight + gapY);

    await drawSingleSlip(doc, payloads[i], originX, originY, slipWidth, slipHeight);
  }

  doc.save(fileName);
}

// ─── Export: Salary Recap PDF ─────────────────────────────────────────────────

export async function exportSalaryRecapPdf(
  recapRows: Array<{
    nama: string;
    divisi: string;
    hariEfektif?: number;
    upahHarian?: number;
    gajiPokok: number;
    totalBonus: number;
    totalPotongan: number;
    gajiBersih: number;
  }>,
  title: string,
  fileName: string
) {
  const jsPDF     = await loadJsPdfCtor();
  const autoTable = await loadAutoTableFn();
  const doc       = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 20);

  autoTable(doc, {
    startY: 24,
    head: [[
      "Nama", "Divisi", "Hari Efektif", "Upah Harian",
      "Gaji Pokok", "Total Bonus", "Total Potongan", "Gaji Bersih",
    ]],
    body: recapRows.map((row) => [
      row.nama,
      row.divisi,
      row.hariEfektif ?? "-",
      row.upahHarian ? formatRupiah(row.upahHarian) : "-",
      formatRupiah(row.gajiPokok),
      formatRupiah(row.totalBonus),
      formatRupiah(row.totalPotongan),
      formatRupiah(row.gajiBersih),
    ]),
    theme: "grid",
    styles:     { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] },
  });

  doc.save(fileName);
}

// ─── Non-Staff types ──────────────────────────────────────────────────────────

export type NonStaffSlipExportPayload = {
  companyLocation: LokasiCode | string;
  periodStart: string;
  periodEnd: string;
  nama: string;
  divisi: string;
  hariEfektif: number;
  upahHarian: number;
  gajiPokok: number;
  totalBonus: number;
  totalPotongan: number;
  gajiBersih: number;
  bonusItems: Array<{ judul: string; nominal: number }>;
  potonganItems: Array<{ judul: string; nominal: number }>;
};

function formatPeriodRangeLabel(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  return `${fmt(startDate)} s/d ${fmt(endDate)}`;
}

function safeItems(
  items: Array<{ judul: string; nominal: number }>
): Array<{ judul: string; nominal: number }> {
  return items
    .filter((item) => item.judul.trim())
    .map((item) => ({ judul: item.judul.trim(), nominal: Number(item.nominal || 0) }));
}

// ─── Layout constants — Non-Staff Slip ───────────────────────────────────────
//
//  Tujuan: muat 5 kolom × 3 baris = 15 slip per halaman landscape A4
//  (fleksibel tergantung jumlah baris bonus/potongan).
//
const NS_PAD      = 1.8;  // mm
const NS_LOGO_W   = 10;   // mm — lebar kotak logo (contain)
const NS_LOGO_H   = 5.0;  // mm — tinggi kotak logo
const NS_ROW_GAP  = 2.4;  // mm
const NS_SEC_GAP  = 2.0;  // mm
const NS_DIV_GAP  = 1.4;  // mm setelah divider

// ─── Draw single Non-Staff slip ───────────────────────────────────────────────

async function drawNonStaffSlip(
  doc: any,
  payload: NonStaffSlipExportPayload,
  x: number,
  y: number,
  width: number,
  height: number,
  maxBonusRows: number,
  maxPotonganRows: number
) {
  const profile       = companyProfileByLokasi(payload.companyLocation);
  const bonusItems    = safeItems(payload.bonusItems);
  const potonganItems = safeItems(payload.potonganItems);

  const leftX  = x + NS_PAD;
  const rightX = x + width - NS_PAD;

  // Border
  doc.setDrawColor(180, 186, 198);
  doc.setLineWidth(0.18);
  doc.rect(x, y, width, height);

  let cursorY = y + 3.0;

  // Logo — contain, tidak stretch
  const logoDataUrl = await loadLogoDataUrl(profile.logoPath);
  if (logoDataUrl) {
    const natural = await getImageNaturalSize(logoDataUrl);
    const { w, h } = fitInBox(natural.width, natural.height, NS_LOGO_W, NS_LOGO_H);
    const logoX = rightX - w;
    const logoY = y + 1.5 + (NS_LOGO_H - h) / 2;
    doc.addImage(logoDataUrl, profile.logoFormat, logoX, logoY, w, h, undefined, "FAST");
  }

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.setTextColor(30, 30, 30);
  doc.text(truncateText(profile.companyName, 22), leftX, cursorY);
  cursorY += 2.4;

  // Divider helper
  const divider = () => {
    doc.setDrawColor(200, 204, 212);
    doc.setLineWidth(0.12);
    doc.line(leftX, cursorY, rightX, cursorY);
    cursorY += NS_DIV_GAP;
  };

  divider();

  // Judul & periode
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.setTextColor(20, 20, 20);
  doc.text("SLIP GAJI NON-STAFF", leftX, cursorY);
  cursorY += 2.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Periode: ${formatPeriodRangeLabel(payload.periodStart, payload.periodEnd)}`,
    leftX,
    cursorY
  );
  cursorY += 2.0;
  divider();

  // Pair row helper
  const linePair = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 5.0 : 4.6);
    doc.setTextColor(20, 20, 20);
    doc.text(truncateText(label, 20), leftX, cursorY);
    doc.text(value, rightX, cursorY, { align: "right" });
    cursorY += NS_ROW_GAP;
  };

  linePair("Nama",   truncateText(payload.nama, 20));
  linePair("Divisi", truncateText(payload.divisi || "-", 18));
  linePair("Status", "Non-Staff");
  divider();

  linePair("Hari Efektif", String(payload.hariEfektif));
  linePair("Upah Harian",  formatRupiah(payload.upahHarian));
  divider();

  // Pendapatan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(60, 60, 60);
  doc.text("PENDAPATAN", leftX, cursorY);
  cursorY += NS_SEC_GAP;

  doc.setTextColor(20, 20, 20);
  linePair("Gaji Pokok", formatRupiah(payload.gajiPokok));
  for (let i = 0; i < maxBonusRows; i++) {
    const item = bonusItems[i];
    linePair(item ? truncateText(item.judul, 18) : "", item ? formatRupiah(item.nominal) : "");
  }
  linePair("Total", formatRupiah(payload.gajiPokok + payload.totalBonus), true);
  divider();

  // Potongan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(60, 60, 60);
  doc.text("POTONGAN", leftX, cursorY);
  cursorY += NS_SEC_GAP;

  doc.setTextColor(20, 20, 20);
  for (let i = 0; i < maxPotonganRows; i++) {
    const item = potonganItems[i];
    linePair(item ? truncateText(item.judul, 18) : "", item ? formatRupiah(item.nominal) : "");
  }
  linePair("Total", formatRupiah(payload.totalPotongan), true);
  divider();

  linePair("GAJI BERSIH", formatRupiah(payload.gajiBersih), true);
}

// ─── Export: Non-Staff Slip PDF ───────────────────────────────────────────────
//   5 kolom × 3 baris = 15 slip per halaman (bisa lebih sedikit jika baris bonus banyak)

export async function exportNonStaffSlipGabunganPdf(
  payloads: NonStaffSlipExportPayload[],
  fileName: string
) {
  const jsPDF = await loadJsPdfCtor();
  const doc   = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const columns  = 5;
  const rows     = 3;
  const perPage  = columns * rows;
  const startX   = 5;
  const startY   = 5;
  const gapX     = 2.0;
  const gapY     = 2.5;
  const pageW    = 297;
  const pageH    = 210;
  const slipW    = (pageW - startX * 2 - gapX * (columns - 1)) / columns;
  const slipH    = (pageH - startY * 2 - gapY * (rows    - 1)) / rows;

  for (let offset = 0; offset < payloads.length; offset += perPage) {
    if (offset > 0) doc.addPage();

    const current       = payloads.slice(offset, offset + perPage);
    const maxBonusRows  = Math.max(1, ...current.map((p) => safeItems(p.bonusItems).length));
    const maxPotonganRows = Math.max(2, ...current.map((p) => safeItems(p.potonganItems).length));

    for (let index = 0; index < current.length; index++) {
      const payload = current[index];
      const col     = index % columns;
      const row     = Math.floor(index / columns);
      const sx      = startX + col * (slipW + gapX);
      const sy      = startY + row * (slipH + gapY);

      await drawNonStaffSlip(doc, payload, sx, sy, slipW, slipH, maxBonusRows, maxPotonganRows);

      // Garis potong putus-putus antar baris
      if (row < rows - 1) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(sx, sy + slipH + gapY / 2, sx + slipW, sy + slipH + gapY / 2);
        doc.setLineDashPattern([], 0);
      }
    }
  }

  doc.save(fileName);
}

// ─── Export: Non-Staff Rekap PDF ──────────────────────────────────────────────

export async function exportNonStaffRekapPdf(
  rows: Array<{
    nama: string;
    divisi: string;
    hariEfektif: number;
    upahHarian: number;
    gajiPokok: number;
    totalBonus: number;
    totalPotongan: number;
    gajiBersih: number;
    bonusItems: Array<{ judul: string; nominal: number }>;
    potonganItems: Array<{ judul: string; nominal: number }>;
  }>,
  meta: { location: LokasiCode | string; periodLabel: string },
  fileName: string
) {
  const jsPDF     = await loadJsPdfCtor();
  const autoTable = await loadAutoTableFn();
  const doc       = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const profile = companyProfileByLokasi(meta.location);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`REKAP GAJI NON-STAFF - ${profile.companyName}`, 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periode: ${meta.periodLabel}`, 14, 19);
  doc.text(`Lokasi: ${normalizeLokasi(meta.location)}`, 14, 24);

  autoTable(doc, {
    startY: 28,
    head: [[
      "Nama",
      "Divisi",
      "Hari Efektif",
      "Upah Harian",
      "Gaji Pokok",
      "Bonus (Rincian)",
      "Potongan (Rincian)",
      "Gaji Bersih",
    ]],
    body: rows.map((row) => {
      const bonusDetail    = safeItems(row.bonusItems)
        .map((i) => `${i.judul}: ${formatRupiah(i.nominal)}`)
        .join("; ");
      const potonganDetail = safeItems(row.potonganItems)
        .map((i) => `${i.judul}: ${formatRupiah(i.nominal)}`)
        .join("; ");
      return [
        row.nama,
        row.divisi,
        String(row.hariEfektif),
        formatRupiah(row.upahHarian),
        formatRupiah(row.gajiPokok),
        bonusDetail || "-",
        potonganDetail || "-",
        formatRupiah(row.gajiBersih),
      ];
    }),
    styles:     { fontSize: 7.4, cellPadding: 1.4, valign: "top" },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] },
    theme: "grid",
  });

  const byDivision = new Map<string, number>();
  for (const row of rows) {
    byDivision.set(row.divisi, (byDivision.get(row.divisi) || 0) + row.gajiBersih);
  }

  const summaryStartY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Summary Total per Divisi", 14, summaryStartY);

  autoTable(doc, {
    startY: summaryStartY + 3,
    head: [["Divisi", "Total"]],
    body: Array.from(byDivision.entries()).map(([divisi, total]) => [
      divisi,
      formatRupiah(total),
    ]),
    styles:     { fontSize: 8.2, cellPadding: 1.8 },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] },
    theme: "grid",
    tableWidth: 120,
  });

  doc.save(fileName);
}