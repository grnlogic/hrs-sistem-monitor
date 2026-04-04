type SlipItem = {
  label: string;
  nominal: number;
};

export type SalarySlipPayload = {
  employeeName: string;
  division: string;
  status: "Staff" | "Non-Staff";
  periodLabel: string;
  location?: string;
  hariEfektif?: number;
  upahHarian?: number;
  gajiPokok: number;
  tunjangan?: SlipItem[];
  bonusItems: SlipItem[];
  potonganItems: SlipItem[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  const totalPendapatan = Number(payload.gajiPokok || 0) + totalTunjangan + totalBonus;
  const gajiBersih = totalPendapatan - totalPotongan;

  return { totalTunjangan, totalBonus, totalPotongan, totalPendapatan, gajiBersih };
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

// ─── Spacing constants ───────────────────────────────────────────────────────

const SLIP_PADDING      = 3;    // mm — kiri & kanan dalam slip
const HEADER_HEIGHT     = 11;   // mm — tinggi area header (background abu)
const HEADER_TITLE_Y    = 4.5;  // mm dari originY — "PADUD JAYA"
const HEADER_PERIOD_Y   = 7.5;  // mm dari originY — periodLabel
const HEADER_LOKASI_Y   = 10.4; // mm dari originY — Lokasi
const BODY_START_OFFSET = 15;   // mm dari originY — mulai baris pertama
const ROW_GAP           = 3.6;  // mm — jarak antar baris normal
const SECTION_GAP       = 3.2;  // mm — jarak setelah label section "Potongan"
const COLON_OFFSET      = 19;   // mm dari contentX — posisi titik dua ":"

// ─── Draw single slip ────────────────────────────────────────────────────────

async function drawSingleSlip(
  doc: any,
  payload: SalarySlipPayload,
  originX: number,
  originY: number,
  slipWidth: number,
  slipHeight: number
) {
  const { totalBonus, gajiBersih } = calculateSummary(payload);

  const pinjaman      = getNominalByLabel(payload.potonganItems, "Pinjaman");
  const sumbangan     = getNominalByLabel(payload.potonganItems, "Sumbangan");
  const bpjs          = getNominalByLabel(payload.potonganItems, "BPJS");
  const undangan      = getNominalByLabel(payload.potonganItems, "Undangan");
  const warung        = getNominalByLabel(payload.potonganItems, "Warung");
  const jumlahPotongan = pinjaman + sumbangan + bpjs + undangan;

  const contentX = originX + SLIP_PADDING;
  const rightX   = originX + slipWidth - SLIP_PADDING;

  // ── Border slip ──
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.22);
  doc.roundedRect(originX, originY, slipWidth, slipHeight, 1.2, 1.2);

  // ── Header background ──
  doc.setFillColor(248, 250, 252);
  doc.rect(originX + 0.8, originY + 0.8, slipWidth - 1.6, HEADER_HEIGHT, "F");

  // ── Header text ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.text("PADUD JAYA", contentX, originY + HEADER_TITLE_Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text(payload.periodLabel.toUpperCase(), contentX, originY + HEADER_PERIOD_Y);
  doc.text(
    `Lokasi: ${truncateText(payload.location || "-", 18)}`,
    contentX,
    originY + HEADER_LOKASI_Y
  );

  // ── Body rows ──
  let rowY = originY + BODY_START_OFFSET;

  const addRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 6 : 5.5);
    doc.text(label, contentX, rowY);
    doc.text(":", contentX + COLON_OFFSET, rowY);
    doc.text(value, rightX, rowY, { align: "right" });
    rowY += ROW_GAP;
  };

  addRow("Nama",       truncateText(payload.employeeName, 18));
  addRow("Absensi",    typeof payload.hariEfektif === "number" ? String(payload.hariEfektif) : "-");
  addRow("Gaji Pokok", formatRupiah(payload.gajiPokok || 0));
  addRow("Bonus",      formatRupiah(totalBonus));

  // ── Section label: Potongan ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.9);
  doc.text("Potongan", contentX, rowY);
  rowY += SECTION_GAP;

  addRow("_ Pinjaman",  formatRupiah(pinjaman));
  addRow("_ Sumbangan", formatRupiah(sumbangan));
  addRow("_ BPJS",      formatRupiah(bpjs));
  addRow("_ Undangan",  formatRupiah(undangan));
  addRow("Jumlah",      formatRupiah(jumlahPotongan));
  addRow("_ Warung",    formatRupiah(warung));

  // ── Garis pemisah ──
  doc.setDrawColor(148, 163, 184);
  doc.line(contentX, rowY - 1.5, rightX, rowY - 1.5);

  // ── TOTAL ──
  addRow("TOTAL", formatRupiah(gajiBersih), true);
}

// ─── Export: Salary Slips PDF ────────────────────────────────────────────────

export async function exportSalarySlipsPdf(
  payloads: SalarySlipPayload[],
  fileName: string
) {
  const jsPDF = (await import("jspdf")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const columns      = 5;
  const rows         = 2;
  const slipsPerPage = columns * rows;
  const startX       = 8;
  const startY       = 8;
  const gapX         = 2.8;
  const gapY         = 4;
  const pageWidth    = 297;
  const pageHeight   = 210;
  const slipWidth    = (pageWidth  - startX * 2 - gapX * (columns - 1)) / columns;
  const slipHeight   = (pageHeight - startY * 2 - gapY * (rows    - 1)) / rows;

  for (let i = 0; i < payloads.length; i += 1) {
    if (i > 0 && i % slipsPerPage === 0) {
      doc.addPage();
    }

    const slot    = i % slipsPerPage;
    const col     = slot % columns;
    const row     = Math.floor(slot / columns);
    const originX = startX + col * (slipWidth  + gapX);
    const originY = startY + row * (slipHeight + gapY);

    await drawSingleSlip(doc, payloads[i], originX, originY, slipWidth, slipHeight);
  }

  doc.save(fileName);
}

// ─── Export: Salary Recap PDF ────────────────────────────────────────────────

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
  const jsPDF      = (await import("jspdf")).default;
  const autoTable  = (await import("jspdf-autotable")).default;
  const doc        = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

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