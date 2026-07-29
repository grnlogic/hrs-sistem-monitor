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
const S_PAD        = 5.0;  // mm — padding kiri/kanan dalam slip
const S_HDR_H      = 11.5; // mm — tinggi area header (background abu)
const S_HDR_NAME_Y = 3.8;  // mm dari originY
const S_HDR_PER_Y  = 7.0;  // mm dari originY
const S_HDR_LOC_Y  = 9.8;  // mm dari originY
const S_BODY_START = 16.5; // mm dari originY — baris pertama body
const S_ROW_GAP    = 4.4;  // mm — jarak antar baris
const S_SEC_GAP    = 3.5;  // mm — gap setelah label section
const S_COLON_OFF  = 30;   // mm dari contentX — posisi titik dua ":"
const S_LOGO_BOX_W = 16;   // mm — lebar kotak logo (contain, tidak stretch)
const S_LOGO_BOX_H = 7.0;  // mm — tinggi kotak logo

function calculateStaffSlipHeight(payload: SalarySlipPayload): number {
  const baseHeight = S_BODY_START;
  const bodyRows = 4; // Nama, Absensi, Gaji Pokok, Bonus
  const sectionGap = S_SEC_GAP;
  const potonganRows = 6; // Pinjaman, Sumbangan, BPJS, Undangan, Jumlah, Warung
  const totalRow = 1; // TOTAL
  const bottomPadding = 4.0;
  const computed = baseHeight + (bodyRows + potonganRows + totalRow) * S_ROW_GAP + sectionGap + bottomPadding;
  return Math.max(50.0, computed);
}

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
  doc.setFontSize(10.5);
  doc.setTextColor(30, 30, 30);
  doc.text(
    truncateText(profile.companyName.toUpperCase(), 32),
    contentX,
    originY + S_HDR_NAME_Y
  );

  // Header — period & lokasi
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.0);
  doc.setTextColor(70, 70, 70);
  doc.text(
    truncateText(payload.periodLabel.toUpperCase(), 36),
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
    const logoY = originY + 1.5 + (S_LOGO_BOX_H - h) / 2;
    doc.addImage(logoDataUrl, profile.logoFormat, logoX, logoY, w, h, undefined, "FAST");
  }

  // Body
  let rowY = originY + S_BODY_START;
  doc.setTextColor(20, 20, 20);

  const addRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 9.0 : 8.5);
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
  doc.setFontSize(9.0);
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

// ─── Measure slip width from content ─────────────────────────────────────────
//   doc.getTextWidth() depends on the currently set font/size.
//   We set font+size before measuring, then restore nothing (jsPDF is imperative).

function measureStaffSlipWidth(doc: any, payload: SalarySlipPayload): number {
  const PAD = S_PAD * 2; // left + right inner padding

  // Measure the widest possible label ("_ Sumbangan" is typically widest)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const labelCandidates = [
    "_ Pinjaman", "_ Sumbangan", "_ Undangan", "Gaji Pokok", "TOTAL",
    "Potongan",
  ];
  const maxLabelW = Math.max(...labelCandidates.map((l) => doc.getTextWidth(l)));

  // Measure the widest value — formatRupiah of the largest plausible salary
  // Use the actual payload values to get a realistic measurement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.0);
  const { totalBonus, totalPotongan, gajiBersih } = calculateSummary(payload);
  const valueCandidates = [
    formatRupiah(payload.gajiPokok || 0),
    formatRupiah(totalBonus),
    formatRupiah(totalPotongan),
    formatRupiah(gajiBersih),
  ];
  const maxValueW = Math.max(...valueCandidates.map((v) => doc.getTextWidth(v)));

  // Company name row (bold 10.5)
  const profile = companyProfileByLokasi(payload.location);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const companyNameW = doc.getTextWidth(truncateText(profile.companyName.toUpperCase(), 64));

  // Period label (normal 8.0)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.0);
  const periodW = doc.getTextWidth(truncateText(payload.periodLabel.toUpperCase(), 64));

  // The slip must be wide enough for:
  //   label column (S_COLON_OFF = 30mm fixed) + ":" gap (2mm) + value column (maxValueW)
  //   OR company name row
  //   OR period row
  const bodyW = S_COLON_OFF + 2 + maxValueW;
  const contentW = Math.max(bodyW, companyNameW, periodW);

  // Logo box width — reserve space on right for logo (it sits on same row as company name)
  const logoReserve = S_LOGO_BOX_W + 2;

  // Add left+right padding. Also ensure logo doesn't overlap: content must be wide enough
  // that logo fits to the right of company name without collision.
  const companyRowW = companyNameW + logoReserve + 4;
  const width = Math.max(contentW, companyRowW) + PAD;

  // Minimum sane width
  return Math.max(50.0, width);
}

function measureNonStaffSlipWidth(doc: any, payload: NonStaffSlipExportPayload): number {
  const PAD = NS_PAD * 2; // left + right inner padding
  const VALUE_OFFSET = 30; // fixed left column for values (matches valueX = leftX + 30 in drawNonStaffSlip)

  // Label column widths
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  const labelCandidates = [
    "Hari Efektif", "Upah Harian", "Gaji Pokok", "GAJI BERSIH",
    "PENDAPATAN", "POTONGAN",
  ];
  // Also include bonus & potongan item labels
  const bonusLabels  = safeItems(payload.bonusItems).map((i) => truncateText(i.judul, 18));
  const potonganLabels = safeItems(payload.potonganItems).map((i) => truncateText(i.judul, 18));
  const allLabels = [...labelCandidates, ...bonusLabels, ...potonganLabels];

  // Value column widths — measure actual rupiah strings
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.0);
  const valueCandidates = [
    formatRupiah(payload.gajiPokok),
    formatRupiah(payload.totalBonus),
    formatRupiah(payload.totalPotongan),
    formatRupiah(payload.gajiBersih),
    formatRupiah(payload.upahHarian),
    String(payload.hariEfektif),
    ...safeItems(payload.bonusItems).map((i) => formatRupiah(i.nominal)),
    ...safeItems(payload.potonganItems).map((i) => formatRupiah(i.nominal)),
  ];
  const maxValueW = Math.max(2, ...valueCandidates.map((v) => doc.getTextWidth(v)));

  // Company name row (bold 8.5)
  const profile = companyProfileByLokasi(payload.companyLocation);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const companyNameW = doc.getTextWidth(truncateText(profile.companyName, 64));

  // Period row (normal 7.5)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const periodStr = `Periode: ${formatPeriodRangeLabel(payload.periodStart, payload.periodEnd)}`;
  const periodW = doc.getTextWidth(periodStr);

  // Nama (normal 7.8)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  const maxLabelW = Math.max(2, ...allLabels.map((l) => doc.getTextWidth(l)));

  // Body width: label column up to VALUE_OFFSET + value width
  const bodyW = VALUE_OFFSET + maxValueW;

  // Logo reserve for company name row
  const logoReserve = NS_LOGO_W + 2;
  const companyRowW = companyNameW + logoReserve + 4;

  const contentW = Math.max(bodyW, companyRowW, periodW, maxLabelW);
  const width = contentW + PAD;

  return Math.max(45.0, width);
}

// ─── Export: Salary Slips PDF ─────────────────────────────────────────────────
//   columns dynamic based on content width

export async function exportSalarySlipsPdf(
  payloads: SalarySlipPayload[],
  fileName: string
) {
  const jsPDF = await loadJsPdfCtor();
  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const gapX         = 4.0;
  const gapY         = 4.0;
  const startX       = 0.5;
  const startY       = 0.5;
  const pageWidth    = 210.0;
  const pageHeight   = 297.0;
  const bottomMargin = 0.5;

  // ── Compute global slip width from the widest payload ──────────────────────
  const slipWidth = Math.max(...payloads.map((p) => measureStaffSlipWidth(doc, p)));

  // ── Compute columns dynamically: how many slips fit in the printable width ─
  const printableWidth = pageWidth - startX * 2;
  const columns = Math.max(1, Math.floor((printableWidth + gapX) / (slipWidth + gapX)));

  // Chunk payloads into rows of `columns`
  const rowsPayloads: SalarySlipPayload[][] = [];
  for (let i = 0; i < payloads.length; i += columns) {
    rowsPayloads.push(payloads.slice(i, i + columns));
  }

  let cursorY = startY;

  for (let rIdx = 0; rIdx < rowsPayloads.length; rIdx++) {
    const rowItems = rowsPayloads[rIdx];
    const slipHeights = rowItems.map((p) => calculateStaffSlipHeight(p));
    const rowHeight = Math.max(...slipHeights);

    // If this row exceeds the page boundary, and we have already drawn something on this page, create a new page
    if (cursorY + rowHeight > pageHeight - bottomMargin && cursorY > startY) {
      doc.addPage();
      cursorY = startY;
    }

    const sy = cursorY;

    // Draw the slips of the current row
    for (let col = 0; col < rowItems.length; col++) {
      const payload = rowItems[col];
      const sx = startX + col * (slipWidth + gapX);

      await drawSingleSlip(doc, payload, sx, sy, slipWidth, rowHeight);

      // Vertical separator line
      if (col < rowItems.length - 1) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(sx + slipWidth + gapX / 2, sy, sx + slipWidth + gapX / 2, sy + rowHeight);
        doc.setLineDashPattern([], 0);
      }

      // Horizontal separator line (draws above the current row, between this row and the previous row on the same page)
      if (sy > startY) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(sx, sy - gapY / 2, sx + slipWidth, sy - gapY / 2);
        doc.setLineDashPattern([], 0);
      }
    }

    // Move to the next row position
    cursorY += rowHeight + gapY;
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
const NS_PAD      = 5.0;  // mm
const NS_LOGO_W   = 16;   // mm — lebar kotak logo (contain)
const NS_LOGO_H   = 8.0;  // mm — tinggi kotak logo
const NS_ROW_GAP  = 3.4;  // mm
const NS_SEC_GAP  = 2.5;  // mm
const NS_DIV_GAP  = 1.5;  // mm setelah divider

function calculateNonStaffSlipHeight(payload: NonStaffSlipExportPayload): number {
  const bonusItems = safeItems(payload.bonusItems);
  const potonganItems = safeItems(payload.potonganItems);

  let height = 4.0; // top padding
  height += 4.0; // company name
  height += 3.2; // period

  // Info: Nama, Divisi, Status
  height += 1.5; // section gap
  height += 3 * NS_ROW_GAP;

  // Attendance: Hari Efektif, Upah Harian
  height += 1.5; // section gap
  height += 2 * NS_ROW_GAP;

  // Pendapatan
  height += NS_SEC_GAP; // section label
  height += NS_ROW_GAP; // Gaji Pokok
  height += bonusItems.length * NS_ROW_GAP;
  height += NS_ROW_GAP; // Total

  // Potongan
  height += NS_SEC_GAP; // section label
  height += potonganItems.length * NS_ROW_GAP;
  height += NS_ROW_GAP; // Total

  // Gaji bersih + divider above it
  height += 1.0; // thin divider gap
  height += NS_ROW_GAP;

  // Bottom padding
  height += 4.0;

  return Math.max(50.0, height);
}

// ─── Draw single Non-Staff slip ───────────────────────────────────────────────

async function drawNonStaffSlip(
  doc: any,
  payload: NonStaffSlipExportPayload,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const profile       = companyProfileByLokasi(payload.companyLocation);
  const bonusItems    = safeItems(payload.bonusItems);
  const potonganItems = safeItems(payload.potonganItems);

  const leftX    = x + NS_PAD;
  // Value column starts at a fixed offset from leftX (compact layout)
  const valueX   = leftX + 30; // mm — fixed left offset for values (not right-aligned)
  const rightEdge = x + width - NS_PAD;

  // Border
  doc.setDrawColor(180, 186, 198);
  doc.setLineWidth(0.18);
  doc.rect(x, y, width, height);

  let cursorY = y + 4.0;

  // Logo — contain, tidak stretch
  const logoDataUrl = await loadLogoDataUrl(profile.logoPath);
  if (logoDataUrl) {
    const natural = await getImageNaturalSize(logoDataUrl);
    const { w, h } = fitInBox(natural.width, natural.height, NS_LOGO_W, NS_LOGO_H);
    const logoX = rightEdge - w;
    const logoY = y + 2.0 + (NS_LOGO_H - h) / 2;
    doc.addImage(logoDataUrl, profile.logoFormat, logoX, logoY, w, h, undefined, "FAST");
  }

  // Company name — smaller font
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(truncateText(profile.companyName, 34), leftX, cursorY);
  cursorY += 4.0;

  // Period
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Periode: ${formatPeriodRangeLabel(payload.periodStart, payload.periodEnd)}`,
    leftX,
    cursorY
  );
  cursorY += 3.2;

  // Compact row helper: label at leftX, value at fixed valueX
  const linePair = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 8.0 : 7.8);
    doc.setTextColor(20, 20, 20);
    doc.text(truncateText(label, 22), leftX, cursorY);
    doc.text(value, valueX, cursorY);
    cursorY += NS_ROW_GAP;
  };

  // Info section
  cursorY += 1.5; // small gap before info block
  linePair("Nama",   truncateText(payload.nama, 22));
  linePair("Divisi", truncateText(payload.divisi || "-", 20));
  linePair("Status", "Non-Staff");

  // Attendance section
  cursorY += 1.5; // small gap before attendance block
  linePair("Hari Efektif", String(payload.hariEfektif));
  linePair("Upah Harian",  formatRupiah(payload.upahHarian));

  // Pendapatan
  cursorY += NS_SEC_GAP;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.0);
  doc.setTextColor(60, 60, 60);
  doc.text("PENDAPATAN", leftX, cursorY);
  cursorY += NS_SEC_GAP;

  doc.setTextColor(20, 20, 20);
  linePair("Gaji Pokok", formatRupiah(payload.gajiPokok));
  for (const item of bonusItems) {
    linePair(truncateText(item.judul, 18), formatRupiah(item.nominal));
  }
  linePair("Total", formatRupiah(payload.gajiPokok + payload.totalBonus), true);

  // Potongan
  cursorY += NS_SEC_GAP;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.0);
  doc.setTextColor(60, 60, 60);
  doc.text("POTONGAN", leftX, cursorY);
  cursorY += NS_SEC_GAP;

  doc.setTextColor(20, 20, 20);
  for (const item of potonganItems) {
    linePair(truncateText(item.judul, 18), formatRupiah(item.nominal));
  }
  linePair("Total", formatRupiah(payload.totalPotongan), true);

  // Thin divider before GAJI BERSIH
  cursorY += 1.0;
  doc.setDrawColor(180, 188, 200);
  doc.setLineWidth(0.15);
  doc.line(leftX, cursorY - 0.5, rightEdge, cursorY - 0.5);

  linePair("GAJI BERSIH", formatRupiah(payload.gajiBersih), true);
}

// ─── Export: Non-Staff Slip PDF ───────────────────────────────────────────────
//   5 kolom × 3 baris = 15 slip per halaman (bisa lebih sedikit jika baris bonus banyak)

export async function exportNonStaffSlipGabunganPdf(
  payloads: NonStaffSlipExportPayload[],
  fileName: string
) {
  const jsPDF = await loadJsPdfCtor();
  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const gapX         = 4.0;
  const gapY         = 4.0;
  const startX       = 0.5;
  const startY       = 0.5;
  const pageWidth    = 210.0;
  const pageHeight   = 297.0;
  const bottomMargin = 0.5;

  // ── Compute global slip width from the widest payload ──────────────────────
  const slipW = Math.max(...payloads.map((p) => measureNonStaffSlipWidth(doc, p)));

  // ── Compute columns dynamically: how many slips fit in the printable width ─
  const printableWidth = pageWidth - startX * 2;
  const columns = Math.max(1, Math.floor((printableWidth + gapX) / (slipW + gapX)));

  // Chunk payloads into rows of `columns`
  const rowsPayloads: NonStaffSlipExportPayload[][] = [];
  for (let i = 0; i < payloads.length; i += columns) {
    rowsPayloads.push(payloads.slice(i, i + columns));
  }

  let cursorY = startY;

  for (let rIdx = 0; rIdx < rowsPayloads.length; rIdx++) {
    const rowItems = rowsPayloads[rIdx];
    const slipHeights = rowItems.map((p) => calculateNonStaffSlipHeight(p));
    const rowHeight = Math.max(...slipHeights);

    // If this row exceeds the page boundary, and we have already drawn something on this page, create a new page
    if (cursorY + rowHeight > pageHeight - bottomMargin && cursorY > startY) {
      doc.addPage();
      cursorY = startY;
    }

    const sy = cursorY;

    // Draw the slips of the current row
    for (let col = 0; col < rowItems.length; col++) {
      const payload = rowItems[col];
      const sx = startX + col * (slipW + gapX);

      await drawNonStaffSlip(doc, payload, sx, sy, slipW, rowHeight);

      // Vertical separator line
      if (col < rowItems.length - 1) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(sx + slipW + gapX / 2, sy, sx + slipW + gapX / 2, sy + rowHeight);
        doc.setLineDashPattern([], 0);
      }

      // Horizontal separator line (draws above the current row, between this row and the previous row on the same page)
      if (sy > startY) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(sx, sy - gapY / 2, sx + slipW, sy - gapY / 2);
        doc.setLineDashPattern([], 0);
      }
    }

    // Move to the next row position
    cursorY += rowHeight + gapY;
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