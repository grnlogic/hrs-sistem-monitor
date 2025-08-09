import { formatCurrency } from './utils';

// Helper function untuk mengecek apakah field memiliki nilai
function hasValue(value: any): boolean {
    // Convert to number and check if it's a valid positive number
    const numValue = Number(value);
    return !isNaN(numValue) && numValue > 0;
}

// Helper function untuk menghitung total potongan
function calculateTotalPotongan(gaji: any): number {
    return (gaji.pajakPph21 || 0) +
        (gaji.potonganKeterlambatan || 0) +
        (gaji.potonganPinjaman || 0) +
        (gaji.potonganSumbangan || 0) +
        (gaji.potonganBpjs || 0) +
        (gaji.potonganUndangan || 0);
}

// Helper function untuk menghitung gaji bersih yang benar
function calculateGajiBersih(gaji: any): number {
    const totalPendapatan = (gaji.gajiPokok || 0) + (gaji.bonus || 0);
    const totalPotongan = calculateTotalPotongan(gaji);
    
    // Debug log untuk memastikan perhitungan benar
    console.log('Menghitung gaji bersih untuk:', gaji.karyawan?.namaLengkap, {
        gajiPokok: gaji.gajiPokok,
        bonus: gaji.bonus,
        totalPendapatan,
        totalPotongan,
        gajiBersihHitung: totalPendapatan - totalPotongan,
        gajiBersihAsli: gaji.gajiBersih || gaji.totalGajiBersih
    });
    
    return totalPendapatan - totalPotongan;
}

// Helper function untuk generate potongan HTML
function generatePotonganHTML(gaji: any): string {
    const potonganItems = [
        { label: 'PPH21', value: gaji.pajakPph21 },
        { label: 'Terlambat', value: gaji.potonganKeterlambatan },
        { label: 'Pinjaman', value: gaji.potonganPinjaman },
        { label: 'Sumbangan', value: gaji.potonganSumbangan },
        { label: 'BPJS', value: gaji.potonganBpjs },
        { label: 'Undangan', value: gaji.potonganUndangan }
    ];

    // Debug: Log data potongan yang diterima
    console.log('Data potongan untuk PDF:', {
        karyawan: gaji.karyawan?.namaLengkap,
        potonganItems: potonganItems.map(item => ({ label: item.label, value: item.value, hasValue: hasValue(item.value) }))
    });

    // Tampilkan semua potongan yang memiliki nilai > 0
    const activePotongan = potonganItems.filter(item => hasValue(item.value));

    if (activePotongan.length === 0) {
        return `
      <div class="no-data">Tidak ada potongan</div>
    `;
    }

    // Tambahan: jika semua potongan 0 tapi ada potongan di data, tampilkan semua
    const totalPotongan = potonganItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    if (totalPotongan > 0 && activePotongan.length < potonganItems.length) {
        // Ada potongan total tapi tidak semua ter-detect, tampilkan semua yang ada nilainya
        console.log('Warning: Total potongan > 0 tapi tidak semua ter-detect, showing all non-zero items');
    }

    return activePotongan.map(item => `
    <div class="info-row">
      <span class="label">${item.label}:</span>
      <span class="value">${formatCurrency(item.value)}</span>
    </div>
  `).join('');
}

export function generateSalarySlipHTML(salaryData: any[]): string {
    // Debug: Log data yang akan diproses untuk PDF
    console.log('=== GENERATING PDF TEMPLATE ===');
    console.log('Total data items:', salaryData.length);
    salaryData.forEach((item, index) => {
        console.log(`Data ${index + 1}:`, {
            nama: item.karyawan?.namaLengkap,
            periodeDisplay: item.periodeDisplay,
            periodeAwal: item.periodeAwal,
            periodeAkhir: item.periodeAkhir,
            totalHari: item.totalHari,
            pajakPph21: item.pajakPph21,
            potonganKeterlambatan: item.potonganKeterlambatan,
            potonganPinjaman: item.potonganPinjaman,
            potonganSumbangan: item.potonganSumbangan,
            potonganBpjs: item.potonganBpjs,
            potonganUndangan: item.potonganUndangan,
            totalPotongan: (item.pajakPph21 || 0) + (item.potonganKeterlambatan || 0) + (item.potonganPinjaman || 0) + (item.potonganSumbangan || 0) + (item.potonganBpjs || 0) + (item.potonganUndangan || 0)
        });
    });
    console.log('=== END DEBUG ===');

    const template = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Slip Gaji Export PDF</title>
    <style>
        @page {
            size: A4;
            margin: 10mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
        }
        
        .page-container {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 10mm;
            padding: 5mm;
            box-sizing: border-box;
        }
        
        .slip-gaji {
            width: calc(33.33% - 7mm);
            min-height: 350px;
            border: 2px solid black;
            padding: 8px;
            box-sizing: border-box;
            background: white;
            font-size: 11px;
            line-height: 1.3;
            display: flex;
            flex-direction: column;
            margin-bottom: 10mm;
        }
        
        .slip-header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }
        
        .logo {
            width: 30px;
            height: 30px;
            margin: 0 auto 4px auto;
            display: block;
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .company-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .slip-title {
            font-size: 10px;
            font-weight: bold;
        }
        
        .employee-info {
            margin-bottom: 8px;
            border-bottom: 1px solid black;
            padding-bottom: 6px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            align-items: flex-start;
        }
        
        .label {
            font-weight: bold;
            width: 50%;
            font-size: 10px;
        }
        
        .value {
            text-align: right;
            width: 50%;
            font-size: 10px;
            word-wrap: break-word;
        }
        
        .salary-details {
            flex: 1;
            font-size: 10px;
        }
        
        .section {
            margin-bottom: 8px;
            border: 1px solid black;
            padding: 4px;
        }
        
        .section-title {
            font-weight: bold;
            border-bottom: 1px solid black;
            margin-bottom: 4px;
            padding-bottom: 2px;
            font-size: 11px;
            text-align: center;
            text-transform: uppercase;
        }
        
        .total-row {
            border-top: 1px solid black;
            padding-top: 3px;
            margin-top: 4px;
            font-weight: bold;
        }
        
        .grand-total {
            border: 2px solid black;
            padding: 4px;
            margin-top: 8px;
            font-weight: bold;
            text-align: center;
            font-size: 11px;
        }
        
        .footer {
            margin-top: auto;
            font-size: 8px;
            text-align: center;
            border-top: 1px solid black;
            padding-top: 4px;
            font-style: italic;
            position: relative;
        }
        
        .footer::after {
            content: '';
            display: block;
            width: 5cm;
            height: 1px;
            background-color: black;
            margin: 3px auto 0 auto;
        }
        
        .period-info {
            border: 1px solid black;
            padding: 4px;
            margin-bottom: 6px;
            text-align: center;
            font-size: 9px;
        }
        
        .no-data {
            font-style: italic;
            text-align: center;
            padding: 2px;
            font-size: 9px;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .page-container {
                min-height: 100vh;
            }
            
            .slip-gaji {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        ${salaryData.map((gaji, index) => {
        // Hitung ulang total potongan dan gaji bersih
        const totalPotongan = calculateTotalPotongan(gaji);
        const gajiBersih = calculateGajiBersih(gaji);

        return `
        <!-- Slip Gaji ${index + 1} -->
        <div class="slip-gaji">
            <div class="slip-header">
                <div class="logo">
                    <img src="/png.png" alt="Logo" onerror="this.style.display='none'" />
                </div>
                <div class="company-name">PT. PADUD JAYA</div>
                <div class="slip-title">SLIP GAJI KARYAWAN</div>
            </div>
            
            <div class="employee-info">
                <div class="info-row">
                    <span class="label">Nama:</span>
                    <span class="value">${gaji.karyawan?.namaLengkap || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">ID Karyawan:</span>
                    <span class="value">${gaji.karyawan?.id || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Dept:</span>
                    <span class="value">${gaji.karyawan?.departemen || '-'}</span>
                </div>
            </div>
            
            <div class="period-info">
                <strong>Detail Kehadiran:</strong><br>
                ${(() => {
                    // Debug log untuk melihat data yang diterima
                    console.log('Template PDF - Data periode untuk', gaji.karyawan?.namaLengkap, {
                        periodeDisplay: gaji.periodeDisplay,
                        periodeAwal: gaji.periodeAwal,
                        periodeAkhir: gaji.periodeAkhir,
                        totalHari: gaji.totalHari,
                        totalHariMasuk: gaji.totalHariMasuk,
                        totalHariSetengahHari: gaji.totalHariSetengahHari
                    });
                    
                    // PERBAIKAN: Gunakan periodeDisplay yang sudah benar dari halaman utama
                    // Jika periodeDisplay tersedia, gunakan itu. Jika tidak, buat dari data periode
                    if (gaji.periodeDisplay) {
                        return gaji.periodeDisplay;
                    }
                    
                    // Fallback: buat format yang sama dengan halaman utama
                    const totalHari = gaji.totalHari || 1;
                    
                    if (gaji.periodeAwal === gaji.periodeAkhir || !gaji.periodeAkhir) {
                        return `${gaji.periodeAwal || '-'} (1 hari)`;
                    } else {
                        return `${gaji.periodeAwal || '-'} - ${gaji.periodeAkhir || '-'} (${totalHari} hari)`;
                    }
                })()}
            </div>
            
            <div class="salary-details">
                <div class="section">
                    <div class="section-title">PENDAPATAN</div>
                    <div class="info-row">
                        <span class="label">Gaji Pokok:</span>
                        <span class="value">${formatCurrency(gaji.gajiPokok || 0)}</span>
                    </div>
                    ${hasValue(gaji.bonus) ? `
                    <div class="info-row">
                        <span class="label">Bonus:</span>
                        <span class="value">${formatCurrency(gaji.bonus)}</span>
                    </div>
                    ` : ''}
                    <div class="info-row total-row">
                        <span class="label">Jumlah:</span>
                        <span class="value">${formatCurrency((gaji.gajiPokok || 0) + (gaji.bonus || 0))}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">POTONGAN</div>
                    ${generatePotonganHTML(gaji)}
                    <div class="info-row total-row">
                        <span class="label">Jumlah:</span>
                        <span class="value">${formatCurrency(totalPotongan)}</span>
                    </div>
                </div>
                
                <div class="grand-total">
                    <div class="info-row">
                        <span class="label">GAJI BERSIH:</span>
                        <span class="value">${formatCurrency(gajiBersih)}</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                Dicetak: ${new Date().toLocaleDateString('id-ID')} | ${new Date().toLocaleTimeString('id-ID')}
            </div>
        </div>
        `}).join('')}
    </div>
</body>
</html>`;

    return template;
} 