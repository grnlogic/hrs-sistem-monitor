import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PKBDocxPayload } from "./pkb-docx"
import { NAMA_PT } from "@/lib/constants/perusahaan"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fungsi untuk format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

async function fetchPKBHTML(pkbData: PKBDocxPayload): Promise<string> {
  const res = await fetch("/api/pkb/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(pkbData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message = err?.error || `Gagal generate PKB (HTTP ${res.status})`;
    throw new Error(message);
  }

  return res.text();
}

async function waitForDocumentReady(doc: Document) {
  if (doc.readyState === "complete" || doc.readyState === "interactive") return;
  await new Promise<void>((resolve) => {
    doc.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

async function waitForImages(doc: Document) {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    })
  );
}

export async function printPKBPDF(pkbData: PKBDocxPayload): Promise<string> {
  if (typeof window === "undefined") {
    return fetchPKBHTML(pkbData);
  }

  const htmlPromise = fetchPKBHTML(pkbData);
  const printWindow = window.open("", "_blank");

  if (printWindow) {
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Menyiapkan PKB...</title></head><body style="font-family: sans-serif; padding: 24px; color: #475569;">
      <p>Menyiapkan dokumen PKB untuk ${pkbData.pihak2Nama}...</p>
    </body></html>`);
    printWindow.document.close();

    try {
      const html = await htmlPromise;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.document.title = `PKB - ${pkbData.pihak2Nama}`;

      await waitForDocumentReady(printWindow.document);
      await waitForImages(printWindow.document);

      printWindow.focus();
      printWindow.print();

      return html;
    } catch (error) {
      printWindow.close();
      throw error;
    }
  }

  // Fallback: hidden iframe when browser menolak pop-up
  const html = await htmlPromise;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error("Browser tidak mendukung mode print tersembunyi.");
    }

    doc.open();
    doc.write(html);
    doc.close();

    await waitForDocumentReady(doc);
    await waitForImages(doc);

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } finally {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  }

  return html;
}

export async function downloadPKBPDF(pkbData: PKBDocxPayload): Promise<string> {
  const html = await fetchPKBHTML(pkbData);
  if (typeof window === "undefined") return html;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const target = parsed.querySelector(".pkb-container") ?? parsed.body;

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = "-200vh";
  wrapper.style.opacity = "0";
  wrapper.style.pointerEvents = "none";
  wrapper.innerHTML = target.outerHTML;
  document.body.appendChild(wrapper);

  try {
    const element = wrapper.firstElementChild as HTMLElement;
    const html2pdfModule = await import("html2pdf.js");
    const html2pdfFactory = (html2pdfModule.default || html2pdfModule) as any;

    await html2pdfFactory()
      .set({
        margin: 10,
        filename: `PKB-${pkbData.pihak2Nama.replace(/\s+/g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }

  return html;
}

type SalaryLike = {
  karyawan?: { namaLengkap?: string; departemen?: string };
  gajiPokok?: number;
  bonus?: number;
  potongan?: number;
  totalGajiBersih?: number;
  periode?: string;
  periodeAwal?: string;
  periodeAkhir?: string;
};

async function buildSalaryPdf(data: SalaryLike[]) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.text(`Rekap Penggajian ${NAMA_PT.PJP}`, 14, 14);
  doc.setFontSize(9);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [["Nama", "Divisi", "Periode", "Gaji Pokok", "Bonus", "Potongan", "Gaji Bersih"]],
    body: data.map((row) => [
      row.karyawan?.namaLengkap || "-",
      row.karyawan?.departemen || "-",
      row.periode || `${row.periodeAwal || "-"} s/d ${row.periodeAkhir || "-"}`,
      formatCurrency(Number(row.gajiPokok || 0)),
      formatCurrency(Number(row.bonus || 0)),
      formatCurrency(Number(row.potongan || 0)),
      formatCurrency(Number(row.totalGajiBersih || 0)),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
    theme: "grid",
  });

  return doc;
}

export async function downloadSalaryPDF(data: SalaryLike[]) {
  const doc = await buildSalaryPdf(data);
  doc.save(`rekap-gaji-${Date.now()}.pdf`);
}

export async function printSalaryPDF(data: SalaryLike[]) {
  const doc = await buildSalaryPdf(data);
  const blobUrl = doc.output("bloburl");
  if (typeof window !== "undefined") {
    window.open(blobUrl, "_blank");
  }
}
