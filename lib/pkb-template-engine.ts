import { Text } from "slate";
import type { Descendant } from "slate";
import type { PKBData } from "./pkb-template";
import { formatCurrency, formatDate, getClause2AndRole } from "./pkb-template";
import { NAMA_PT } from "@/lib/constants/perusahaan";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || NAMA_PT.PJP.toUpperCase();
const COMPANY_ADDRESS =
  process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
  "Lingkungan Jelat, No. 905, RT.03/04, Kel. Pataruman, Kec. Pataruman, Kota Banjar";
const COMPANY_PHONE = process.env.NEXT_PUBLIC_COMPANY_PHONE || "TLP. (0265) 741458";

const NON_ESCAPED_KEYS = new Set(["LOGO_IMAGE"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderChildren(children: Descendant[]): string {
  return children.map(serializeNode).join("");
}

function formatFieldLine(childrenHtml: string, align?: string): string | null {
  if (align && align !== "left") return null;

  // Align lines like "Nama : {{PIHAK_2_NAMA}}" using fixed columns, not manual spaces.
  const match = childrenHtml.match(/^([^<:\n]{1,40})\s*:\s*([\s\S]+)$/);
  if (!match) return null;

  const label = match[1].trim();
  const value = match[2].trim();
  if (!label || !value) return null;

  return `<p class="pkb-field-row"><span class="pkb-field-label">${label}</span><span class="pkb-field-sep">:</span><span class="pkb-field-value">${value}</span></p>`;
}

function serializeNode(node: Descendant): string {
  if (Text.isText(node)) {
    let text = node.text || "";
    text = escapeHtml(text);
    if (node.bold) text = `<strong>${text}</strong>`;
    if (node.italic) text = `<em>${text}</em>`;
    if (node.underline) text = `<u>${text}</u>`;
    if (node.code) text = `<code>${text}</code>`;
    return text;
  }

  const children = renderChildren(node.children);
  const alignStyle = node.align ? ` style="text-align:${node.align}"` : "";

  switch (node.type) {
    case "heading":
      return `<h2${alignStyle}>${children}</h2>`;
    case "subheading":
      return `<h3${alignStyle}>${children}</h3>`;
    case "quote":
      return `<blockquote${alignStyle}>${children}</blockquote>`;
    case "numbered-list":
      return `<ol>${children}</ol>`;
    case "bulleted-list":
      return `<ul>${children}</ul>`;
    case "list-item":
      return `<li>${children}</li>`;
    case "divider":
      return `<hr />`;
    case "image": {
      const src = node.src ? escapeHtml(node.src) : "";
      if (!src) return "";

      const width = Math.min(720, Math.max(40, Number(node.width) || 120));
      const align = node.align === "left" || node.align === "right" ? node.align : "center";
      const positionStyle =
        align === "left"
          ? "text-align:left;"
          : align === "right"
            ? "text-align:right;"
            : "text-align:center;";

      return `<p style="${positionStyle}"><img src="${src}" alt="${escapeHtml(node.alt || "PKB image")}" style="width:${width}px;max-width:100%;height:auto;display:inline-block;" /></p>`;
    }
    case "table": {
      const width = Math.min(100, Math.max(40, Number(node.width) || 100));
      const tableAlign = node.tableAlign || "center";
      const alignStyle =
        tableAlign === "left"
          ? "margin-left:0;margin-right:auto;"
          : tableAlign === "right"
            ? "margin-left:auto;margin-right:0;"
            : "margin-left:auto;margin-right:auto;";

      return `<table class="pkb-table" style="width:${width}%;${alignStyle}">${children}</table>`;
    }
    case "table-row":
      return `<tr>${children}</tr>`;
    case "table-cell": {
      const colspanAttr = node.colspan ? ` colspan="${node.colspan}"` : "";
      return `<td${colspanAttr}>${children}</td>`;
    }
    case "signature-container": {
      const width = Math.min(100, Math.max(40, Number(node.width) || 100));
      const align = node.containerAlign || "center";
      const alignStyle =
        align === "left"
          ? "margin-left:0;margin-right:auto;"
          : align === "right"
            ? "margin-left:auto;margin-right:0;"
            : "margin-left:auto;margin-right:auto;";

      return `<div class="pkb-signature-container" style="width:${width}%;${alignStyle}">${children}</div>`;
    }
    case "signature-box":
      return `<div class="pkb-signature-box">${children}</div>`;
    case "paragraph":
      {
        const fieldLine = formatFieldLine(children, node.align);
        if (fieldLine) return fieldLine;
      }
    default:
      return `<p${alignStyle}>${children}</p>`;
  }
}

export function serializeNodesToHtml(nodes: Descendant[]): string {
  return nodes.map(serializeNode).join("\n");
}

export type PlaceholderContext = Record<string, string>;

function divisionLabel(div?: string) {
  if (!div) return "-";
  const normalized = div.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function tipeUpahLabel(tipe?: string | null) {
  if (!tipe) return "-";
  switch (tipe) {
    case "per_pack":
      return "Per Pack";
    case "per_hari":
      return "Per Hari";
    case "per_bulan":
      return "Per Bulan";
    case "per_kg":
      return "Per Kilogram";
    default:
      return tipe.replace(/_/g, " ");
  }
}

function parseNominal(value: unknown): number {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  return raw ? Number(raw) : 0;
}

function toPlainNominal(value: unknown): string {
  const parsed = parseNominal(value);
  return String(parsed);
}

export function buildPlaceholderContext(data: PKBData, options?: { division?: string; logoDataUrl?: string }): PlaceholderContext {
  const { clause2, role } = getClause2AndRole(data);
  const catatan =
    data.catatanPembayaran?.trim() ||
    (data.tipeUpah === "per_bulan"
      ? "yang akan dibayarkan setiap akhir bulan"
      : "yang akan dibayarkan setiap hari Sabtu");
  const bpjs = data.bpjs?.trim() || "-";
  const bpjsKesehatan = parseNominal(data.bpjsKesehatanNominal);
  const bpjsKetenagakerjaan = parseNominal(data.bpjsKetenagakerjaanNominal);
  const nominalPotonganBpjs = bpjsKesehatan + bpjsKetenagakerjaan;

  const context: PlaceholderContext = {
    LOGO_IMAGE: options?.logoDataUrl ? `<img src="${options.logoDataUrl}" alt="Logo" class="pkb-logo" />` : "",
    PERUSAHAAN_NAMA: COMPANY_NAME,
    PERUSAHAAN_ALAMAT: COMPANY_ADDRESS,
    PERUSAHAAN_TELP: COMPANY_PHONE,
    PIHAK_1_NAMA: data.pihak1Nama || "",
    PIHAK_1_NIK: data.pihak1Nik || "",
    PIHAK_1_JABATAN: data.pihak1Jabatan || "",
    PIHAK_1_TTD: data.pihak1TandaTangan || data.pihak1Nama || "",
    PIHAK_2_NAMA: data.pihak2Nama || "",
    PIHAK_2_NIK: data.pihak2Nik || "",
    PIHAK_2_JABATAN: data.pihak2Jabatan || options?.division || "",
    PIHAK_2_ALAMAT: data.pihak2Alamat || "",
    PIHAK_2_TTD: data.pihak2TandaTangan || data.pihak2Nama || "",
    DIVISI: divisionLabel(options?.division || data.pihak2Jabatan),
    TIPE_UPAH_LABEL: tipeUpahLabel(data.tipeUpah),
    NOMINAL_UPAH: toPlainNominal(data.nominalUpah || 0),
    BONUS_NOMINAL: data.bonusNominal ? `Rp. ${formatCurrency(data.bonusNominal)}` : "-",
    CATATAN_PEMBAYARAN: catatan,
    BPJS: bpjs,
    BPJS_KESEHATAN_NOMINAL: `Rp. ${formatCurrency(bpjsKesehatan)}`,
    BPJS_KETENAGAKERJAAN_NOMINAL: `Rp. ${formatCurrency(bpjsKetenagakerjaan)}`,
    NOMINAL_POTONGAN_BPJS: `Rp. ${formatCurrency(nominalPotonganBpjs)}`,
    TANGGAL_PERJANJIAN: formatDate(data.tanggalPerjanjian),
    PERAN_KARYAWAN: data.peranKaryawan || role,
    PASAL_2: clause2,
    PASAL_3: `Pihak II akan menerima upah ${catatan}`,
  };

  return context;
}

export function applyPlaceholderContext(html: string, context: PlaceholderContext): string {
  return html.replace(/{{([a-zA-Z0-9_]+)}}/g, (_, rawKey: string) => {
    const key = rawKey.toUpperCase();
    const value = context[key];
    if (!value) return "";
    if (NON_ESCAPED_KEYS.has(key)) {
      return value;
    }
    return escapeHtml(value);
  });
}

function wrapDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Perjanjian Kerja Bersama</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 0;
      padding: 24px;
      background: #f5f5f5;
      color: #000;
      font-size: 12px;
      line-height: 1.6;
    }
    .pkb-container {
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      padding: 32px;
      border: 1px solid #dcdcdc;
      box-shadow: 0 10px 30px rgba(15, 17, 23, 0.08);
    }
    .pkb-container h2 { text-transform: uppercase; letter-spacing: 0.5px; margin: 8px 0; }
    .pkb-container p { margin: 4px 0; }
    .pkb-container p,
    .pkb-container li,
    .pkb-container blockquote,
    .pkb-container h2,
    .pkb-container h3 {
      white-space: pre-wrap;
    }
    .pkb-container blockquote {
      border-left: 3px solid #999;
      padding-left: 10px;
      margin-left: 0;
      color: #555;
    }
    .pkb-container ol { padding-left: 20px; }
    .pkb-field-row {
      display: grid;
      grid-template-columns: 120px 14px 1fr;
      column-gap: 0;
      align-items: baseline;
      margin: 4px 0;
    }
    .pkb-field-label {
      display: inline-block;
    }
    .pkb-field-sep {
      text-align: center;
    }
    .pkb-field-value {
      min-width: 0;
    }
    .pkb-logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
      border-radius: 50%;
      border: 1px solid #333;
      display: block;
      margin: 0 auto 12px;
    }
    .pkb-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    .pkb-table td {
      border: 1px solid #000;
      text-align: center;
      padding: 24px 8px;
      height: 80px;
    }
    .pkb-signature-container {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    .pkb-signature-box {
      border: 1px solid #000;
      border-radius: 4px;
      min-height: 130px;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }
    .pkb-signature-box p {
      margin: 4px 0;
    }
    hr { border: none; border-top: 2px solid #000; margin: 16px 0; }
    @media print {
      @page { size: A4; margin: 12mm; }
      body {
        background: #fff;
        padding: 0;
        line-height: 1.5;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .pkb-container {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 24px;
        border: none;
        box-shadow: none;
      }
      .pkb-container p { margin: 2px 0; }
      .pkb-container h2 { margin: 6px 0; }
      .pkb-container ol { margin: 6px 0; }
      .pkb-signature-container {
        margin-top: 16px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .pkb-signature-box {
        min-height: 110px;
        padding: 10px 10px;
      }
      hr { margin: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="pkb-container">
    ${body}
  </div>
</body>
</html>`;
}

export function renderPKBTemplate(nodes: Descendant[], data: PKBData, options?: { division?: string; logoDataUrl?: string }): string {
  const baseHtml = serializeNodesToHtml(nodes);
  const context = buildPlaceholderContext(data, options);
  const filled = applyPlaceholderContext(baseHtml, context);
  return wrapDocument(filled);
}
