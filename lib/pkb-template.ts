/**
 * Template HTML untuk Perjanjian Kerja Bersama (PKB)
 * Berdasarkan format PT. PADUD JAYA PUTERA
 * Ketentuan upah berbeda per divisi (per pack, per kg, per hari)
 */

export type TipeUpahPKB = "per_pack" | "per_kg" | "per_hari";

export interface PKBData {
  // Pihak I (Perusahaan)
  pihak1Nama: string;
  pihak1Nik: string;
  pihak1Jabatan: string;
  pihak1TandaTangan: string;

  // Pihak II (Karyawan)
  pihak2Nama: string;
  pihak2Nik: string;
  pihak2Jabatan: string;
  pihak2Alamat: string;
  pihak2TandaTangan: string;

  // Ketentuan - tipe upah berdasarkan divisi
  tipeUpah: TipeUpahPKB;
  nominalUpah: number;
  bonusNominal?: number; // untuk per_pack
  catatanPembayaran?: string; // untuk per_hari, e.g. "dibayarkan setiap hari Sabtu"

  // Legacy (untuk backward compatibility)
  upahPerPack?: number;
  bonusPerPack?: number;

  // Tanggal
  tanggalPerjanjian: string;
}

const DEFAULT_PKB_DATA: Partial<PKBData> = {
  pihak1Nama: "Moch Syaeful Ikhsan",
  pihak1Nik: "3279011207160002",
  pihak1Jabatan: "Direktur",
  pihak1TandaTangan: "Moch Syaeful Ikhsan",
  tipeUpah: "per_pack",
  nominalUpah: 3000,
  bonusNominal: 250,
  upahPerPack: 3000,
  bonusPerPack: 250,
};

export function getDefaultPKBData(): Partial<PKBData> {
  return { ...DEFAULT_PKB_DATA };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function getClause2AndRole(data: PKBData): { clause2: string; role: string } {
  const nominal = data.nominalUpah ?? data.upahPerPack ?? 3000;
  const upahFormatted = formatCurrency(nominal);

  switch (data.tipeUpah) {
    case "per_kg": {
      return {
        role: "Karyawan Borongan (Pengolahan Tembakau)",
        clause2: `Bahwa Pihak II menerima upah kerja + tunjangan bpjs kesehatan dan ketenagakerjaan sebesar Rp. ${upahFormatted} / kilogram.`,
      };
    }
    case "per_hari": {
      const catatan = data.catatanPembayaran?.trim() || "yang akan dibayarkan setiap hari Sabtu";
      return {
        role: "Pemasaran",
        clause2: `Bahwa Pihak II menerima upah kerja + tunjangan bpjs kesehatan dan ketenagakerjaan + tunjangan perjalanan sebesar Rp. ${upahFormatted}/hari.`,
      };
    }
    case "per_pack":
    default: {
      const bonus = data.bonusNominal ?? data.bonusPerPack ?? 250;
      const bonusFormatted = formatCurrency(bonus);
      return {
        role: "Karyawan Borongan (Packing)",
        clause2: `Bahwa Pihak II menerima upah kerja + tunjangan bpjs kesehatan dan ketenagakerjaan sebesar Rp. ${upahFormatted} / pack serta bonus sebesar ${bonusFormatted}/pack apabila target terlampaui.`,
      };
    }
  }
}

export function generatePKBHTML(data: PKBData): string {
  const { clause2, role } = getClause2AndRole(data);
  const tanggalFormatted = formatDate(data.tanggalPerjanjian);
  const catatanPembayaran = data.catatanPembayaran?.trim() || "di akhir minggu (sabtu).";

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perjanjian Kerja Bersama - ${data.pihak2Nama}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            margin: 0;
            padding: 24px;
            background: white;
            color: #000;
            font-size: 12px;
            line-height: 1.6;
        }
        
        .pkb-container {
            max-width: 210mm;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #000;
        }
        
        .header-logo {
            width: 70px;
            height: 70px;
            flex-shrink: 0;
            border: 1px solid #333;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            text-align: center;
            padding: 4px;
            line-height: 1.2;
        }
        
        .header-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        
        .company-address {
            font-size: 11px;
            margin-bottom: 2px;
        }
        
        .company-phone {
            font-size: 11px;
            margin-bottom: 0;
        }
        
        .document-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin: 20px 0 24px 0;
            letter-spacing: 1px;
        }
        
        .parties-section {
            margin: 0 0 20px 0;
        }
        
        .party-block {
            margin-bottom: 16px;
        }
        
        .party-row {
            margin-bottom: 4px;
            line-height: 1.5;
        }
        
        .party-row .label {
            display: inline-block;
            width: 100px;
        }
        
        .party-footer {
            font-size: 11px;
            margin-top: 4px;
            margin-left: 104px;
        }
        
        .terms-intro {
            font-weight: bold;
            margin-bottom: 12px;
        }
        
        .term-item {
            margin-bottom: 10px;
            text-align: justify;
        }
        
        .term-item ol, .term-item ul {
            margin: 4px 0 0 0;
            padding-left: 20px;
        }
        
        .closing-statement {
            margin: 24px 0 16px 0;
            text-align: justify;
        }
        
        .signature-section {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            gap: 60px;
        }
        
        .signature-block {
            flex: 1;
            text-align: center;
            border: 1px solid #000;
            padding: 16px 24px;
            min-height: 100px;
        }
        
        .signature-block-title {
            font-weight: bold;
            margin-bottom: 12px;
            font-size: 12px;
        }
        
        .signature-line {
            height: 50px;
            margin-bottom: 8px;
            border-bottom: 1px solid #000;
        }
        
        .signature-name {
            font-size: 11px;
            font-weight: bold;
        }
        
        .date-block {
            margin-top: 20px;
            text-align: right;
            font-size: 11px;
        }
        
        @media print {
            @page {
                size: A4;
                margin: 15mm;
            }

            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                padding: 0;
                margin: 0;
            }
            
            .pkb-container {
                max-width: 100%;
                padding: 0;
            }

            .header {
                display: flex !important;
                -webkit-flex-direction: row !important;
                flex-direction: row !important;
            }

            .signature-section {
                display: flex !important;
                -webkit-flex-direction: row !important;
                flex-direction: row !important;
                page-break-inside: avoid;
            }

            .signature-block {
                flex: 1 !important;
            }

            .term-item, .closing-statement, .date-block, .parties-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="pkb-container">
        <div class="header">
            <div class="header-logo"><img src="/png.png" alt="PT. Padud Jaya Putera" style="width:100%;height:100%;object-fit:contain;" /></div>
            <div class="header-info">
                <div class="company-name">PT. PADUD JAYA PUTERA</div>
                <div class="company-address">Lingkungan Jelat, No. 905, RT.03/04, Kel. Pataruman, Kec. Pataruman, Kota Banjar</div>
                <div class="company-phone">TLP. (0265) 741458</div>
            </div>
        </div>

        <div class="document-title">Perjanjian Kerja Bersama</div>

        <div class="parties-section">
            <div class="party-block">
                <div class="party-row"><span class="label">Nama</span> : ${data.pihak1Nama}</div>
                <div class="party-row"><span class="label">NIK</span> : ${data.pihak1Nik}</div>
                <div class="party-row"><span class="label">Jabatan</span> : ${data.pihak1Jabatan}</div>
                <div class="party-footer">Selanjutnya disebut Pihak I</div>
            </div>

            <div class="party-block">
                <div class="party-row"><span class="label">Nama</span> : ${data.pihak2Nama}</div>
                <div class="party-row"><span class="label">NIK</span> : ${data.pihak2Nik}</div>
                <div class="party-row"><span class="label">Jabatan</span> : ${data.pihak2Jabatan}</div>
                <div class="party-row"><span class="label">Alamat</span> : ${data.pihak2Alamat || "-"}</div>
                <div class="party-footer">Selanjutnya disebut Pihak II</div>
            </div>
        </div>

        <div class="terms-intro">Telah bersepakat:</div>
        <div class="term-item">
            1. Bahwa Pihak II menerima pekerjaan sebagai ${role} di PT. Padud Jaya Putera yang dikelola Pihak I.
        </div>
        <div class="term-item">
            2. ${clause2}
        </div>
        <div class="term-item">
            3. Pihak II akan menerima upah ${catatanPembayaran}
        </div>
        <div class="term-item">
            4. Pihak II bersedia mematuhi Peraturan Perusahaan PT. Padud Jaya Putera.
        </div>
        <div class="term-item">
            5. Segala bentuk permasalahan akan diselesaikan secara kekeluargaan dan sesuai dengan peraturan.
        </div>

        <div class="closing-statement">
            Demikian perjanjian kerja bersama ini kami buat dengan sebenarnya tanpa ada paksaan dari pihak manapun. Terhitung sejak Perjanjian Kerjasama ini dibuat.
        </div>

        <div class="date-block">Banjar, ${tanggalFormatted}</div>

        <div class="signature-section">
            <div class="signature-block">
                <div class="signature-block-title">Pihak I</div>
                <div class="signature-line"></div>
                <div class="signature-name">${data.pihak1TandaTangan}</div>
            </div>
            <div class="signature-block">
                <div class="signature-block-title">Pihak II</div>
                <div class="signature-line"></div>
                <div class="signature-name">${data.pihak2TandaTangan}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
}
