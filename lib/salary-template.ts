import { formatCurrency } from './utils';

function hasValue(value: any): boolean {
    const numValue = Number(value);
    return !isNaN(numValue) && numValue > 0;
}

function normalizeItems(raw: any): Array<{ nama: string; nominal: number; linkedField?: string }> {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const nama = String(item.nama || '').trim();
            const nominal = Number(item.nominal || 0);
            if (!nama || !hasValue(nominal)) return null;
            return {
                nama,
                nominal,
                linkedField: item.linkedField ? String(item.linkedField) : undefined,
            };
        })
        .filter(Boolean) as Array<{ nama: string; nominal: number; linkedField?: string }>;
}

function groupItemsByName(items: Array<{ nama: string; nominal: number }>): Array<{ nama: string; nominal: number }> {
    const grouped = new Map<string, number>();
    items.forEach((item) => {
        grouped.set(item.nama, (grouped.get(item.nama) || 0) + Number(item.nominal || 0));
    });
    return Array.from(grouped.entries()).map(([nama, nominal]) => ({ nama, nominal }));
}

function calculateTotalPotongan(gaji: any): number {
    if (hasValue(gaji.potongan)) return Number(gaji.potongan || 0);
    const dynamicItems = normalizeItems(gaji.potonganItems);
    if (dynamicItems.length > 0) return dynamicItems.reduce((sum, item) => sum + Number(item.nominal || 0), 0);
    return (gaji.pajakPph21 || 0) + (gaji.potonganKeterlambatan || 0) + (gaji.potonganPinjaman || 0) +
        (gaji.potonganSumbangan || 0) + (gaji.potonganBpjs || 0) + (gaji.potonganUndangan || 0);
}

function calculateTotalPendapatan(gaji: any): number {
    return (gaji.gajiPokok || 0) + (gaji.bonus || 0);
}

function calculateGajiBersih(gaji: any): number {
    return calculateTotalPendapatan(gaji) - calculateTotalPotongan(gaji);
}

function generatePotonganHTML(gaji: any): string {
    const dynamicItems = groupItemsByName(normalizeItems(gaji.potonganItems));
    if (dynamicItems.length > 0) {
        return dynamicItems.map(item => `
        <div class="info-row">
            <span class="label">${item.nama}:</span>
            <span class="value">- ${formatCurrency(item.nominal)}</span>
        </div>`).join('');
    }

    const potonganItems = [
        { label: 'PPh 21', value: gaji.pajakPph21 },
        { label: 'Terlambat', value: gaji.potonganKeterlambatan },
        { label: 'Pinjaman', value: gaji.potonganPinjaman },
        { label: 'Sumbangan', value: gaji.potonganSumbangan },
        { label: 'BPJS', value: gaji.potonganBpjs },
        { label: 'Undangan', value: gaji.potonganUndangan }
    ];

    const activePotongan = potonganItems.filter(item => hasValue(item.value));
    if (activePotongan.length === 0) return `<div class="no-data">Tidak ada potongan</div>`;

    return activePotongan.map(item => `
    <div class="info-row">
        <span class="label">${item.label}:</span>
        <span class="value">- ${formatCurrency(item.value)}</span>
    </div>`).join('');
}

function generateBonusHTML(gaji: any): string {
    const dynamicBonusItems = groupItemsByName(normalizeItems(gaji.bonusItems));
    if (dynamicBonusItems.length > 0) {
        return dynamicBonusItems.map(item => `
        <div class="info-row">
            <span class="label">${item.nama}:</span>
            <span class="value">${formatCurrency(item.nominal)}</span>
        </div>`).join('');
    }
    if (!hasValue(gaji.bonus)) return '';
    return `
    <div class="info-row">
        <span class="label">Bonus:</span>
        <span class="value">${formatCurrency(gaji.bonus)}</span>
    </div>`;
}

function getSlipDate(gaji: any): string {
    if (gaji?.periodeAkhir) return String(gaji.periodeAkhir).split('T')[0];
    if (gaji?.periodeAwal) return String(gaji.periodeAwal).split('T')[0];
    if (gaji?.tanggalGaji) return String(gaji.tanggalGaji).split('T')[0];
    return '-';
}

export function generateSalarySlipHTML(salaryData: any[]): string {
    // 12 slip per page (3 col x 4 row)
    const pageChunks: any[][] = [];
    for (let i = 0; i < salaryData.length; i += 12) {
        pageChunks.push(salaryData.slice(i, i + 12));
    }

    const template = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Slip Gaji</title>
    <style>
        @page {
            size: A4;
            margin: 8mm;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: Arial, sans-serif;
            background: white;
            color: #000;
            font-size: 9px;
        }

        .print-page {
            width: 194mm;
            min-height: 281mm;
            margin: 0 auto 8mm auto;
            page-break-after: always;
            break-after: page;
        }

        .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
        }

        /* 3 kolom x 4 baris = 12 slip per halaman A4 */
        .slip-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3mm;
            width: 100%;
        }

        /* ─── SLIP CARD ──────────────────────────── */
        .slip-gaji {
            border: 1.5px solid #000;
            padding: 5px 6px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            /* Tinggi tetap agar mudah digunting */
            min-height: 66mm;
            max-height: 66mm;
            overflow: hidden;
        }

        /* ─── HEADER ─────────────────────────────── */
        .slip-header {
            display: flex;
            align-items: center;
            gap: 5px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 3px;
        }

        .slip-header img {
            width: 20px;
            height: 20px;
            object-fit: contain;
        }

        .header-text .company-name {
            font-weight: bold;
            font-size: 9px;
            line-height: 1.2;
        }

        .header-text .slip-title {
            font-size: 7.5px;
            color: #333;
        }

        /* ─── EMPLOYEE INFO ──────────────────────── */
        .employee-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px 4px;
            font-size: 8px;
            border-bottom: 1px dashed #666;
            padding-bottom: 3px;
        }

        .emp-field {
            display: flex;
            gap: 3px;
        }

        .emp-field .lbl { font-weight: bold; white-space: nowrap; }
        .emp-field .val { color: #000; }

        /* ─── PERIOD ─────────────────────────────── */
        .period-bar {
            font-size: 7.5px;
            text-align: center;
            border: 1px solid #ccc;
            padding: 1px 3px;
            background: #f5f5f5;
        }

        /* ─── RINCIAN GAJI ───────────────────────── */
        .rincian {
            border: 1px solid #000;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .rincian-title {
            font-weight: bold;
            text-align: center;
            font-size: 8.5px;
            border-bottom: 1px solid #000;
            padding: 1px 0;
            background: #f0f0f0;
            letter-spacing: 0.3px;
        }

        .rincian-body {
            padding: 2px 5px;
            display: flex;
            flex-direction: column;
            gap: 1px;
            flex: 1;
        }

        .section-label {
            font-weight: bold;
            font-size: 8px;
            margin-top: 2px;
            border-bottom: 1px dotted #999;
            padding-bottom: 1px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            line-height: 1.3;
        }

        .info-row .label { font-weight: normal; }
        .info-row .value { text-align: right; }

        /* Subtotal baris */
        .subtotal-row {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            font-weight: bold;
            border-top: 1px solid #999;
            padding-top: 1px;
            margin-top: 1px;
        }

        /* Grand total */
        .grand-total {
            border-top: 1.5px solid #000;
            margin-top: 2px;
            padding: 2px 5px;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 9px;
            background: #f0f0f0;
        }

        .no-data {
            font-style: italic;
            font-size: 7.5px;
            color: #666;
            text-align: center;
            padding: 1px 0;
        }

        /* ─── FOOTER ─────────────────────────────── */
        .slip-footer {
            font-size: 7px;
            color: #555;
            text-align: center;
            border-top: 1px dotted #999;
            padding-top: 2px;
            font-style: italic;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-page { width: 100%; margin: 0; }
        }
    </style>
</head>
<body>
<div class="page-container">
    ${pageChunks.map((chunk, pageIndex) => `
    <div class="print-page">
        <div class="slip-grid">
            ${chunk.map((gaji, indexInPage) => {
                const totalPendapatan = calculateTotalPendapatan(gaji);
                const totalPotongan   = calculateTotalPotongan(gaji);
                const gajiBersih      = calculateGajiBersih(gaji);

                const periodeText = gaji.periodeDisplay
                    ? gaji.periodeDisplay
                    : (gaji.periodeAwal === gaji.periodeAkhir || !gaji.periodeAkhir)
                        ? `${gaji.periodeAwal || '-'} (1 hari)`
                        : `${gaji.periodeAwal || '-'} s/d ${gaji.periodeAkhir || '-'} (${gaji.totalHari || 1} hari)`;

                return `
        <div class="slip-gaji">

            <!-- HEADER -->
            <div class="slip-header">
                <img src="/png.png" alt="Logo" onerror="this.style.display='none'" />
                <div class="header-text">
                    <div class="company-name">PT. PADUD JAYA</div>
                    <div class="slip-title">SLIP GAJI KARYAWAN</div>
                </div>
            </div>

            <!-- EMPLOYEE INFO -->
            <div class="employee-info">
                <div class="emp-field">
                    <span class="lbl">Nama:</span>
                    <span class="val">${gaji.karyawan?.namaLengkap || '-'}</span>
                </div>
                <div class="emp-field">
                    <span class="lbl">Tgl:</span>
                    <span class="val">${getSlipDate(gaji)}</span>
                </div>
                <div class="emp-field">
                    <span class="lbl">Divisi:</span>
                    <span class="val">${gaji.karyawan?.departemen || '-'}</span>
                </div>
            </div>

            <!-- PERIODE -->
            <div class="period-bar">${periodeText}</div>

            <!-- RINCIAN GAJI -->
            <div class="rincian">
                <div class="rincian-title">RINCIAN GAJI</div>
                <div class="rincian-body">

                    <!-- PENDAPATAN -->
                    <div class="section-label">Pendapatan</div>
                    <div class="info-row">
                        <span class="label">Gaji Pokok</span>
                        <span class="value">${formatCurrency(gaji.gajiPokok || 0)}</span>
                    </div>
                    ${generateBonusHTML(gaji)}
                    <div class="subtotal-row">
                        <span>Subtotal Pendapatan</span>
                        <span>${formatCurrency(totalPendapatan)}</span>
                    </div>

                    <!-- POTONGAN -->
                    <div class="section-label">Potongan</div>
                    ${generatePotonganHTML(gaji)}
                    <div class="subtotal-row">
                        <span>Subtotal Potongan</span>
                        <span>- ${formatCurrency(totalPotongan)}</span>
                    </div>

                </div>

                <!-- TOTAL DITERIMA -->
                <div class="grand-total">
                    <span>Total Diterima</span>
                    <span>${formatCurrency(gajiBersih)}</span>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="slip-footer">
                Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}
            </div>

        </div>`;
            }).join('')}
        </div>
    </div>`).join('')}
</div>
</body>
</html>`;

    return template;
}