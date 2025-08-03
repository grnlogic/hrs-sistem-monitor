import { formatCurrency } from './utils';

// Helper function untuk mengecek apakah field memiliki nilai
function hasValue(value: any): boolean {
  return value && value > 0;
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

  const activePotongan = potonganItems.filter(item => hasValue(item.value));
  
  if (activePotongan.length === 0) {
    return `
      <div class="no-data">Tidak ada potongan</div>
    `;
  }

  return activePotongan.map(item => `
    <div class="info-row">
      <span class="label">${item.label}:</span>
      <span class="value">${formatCurrency(item.value)}</span>
    </div>
  `).join('');
}

export function generateSalarySlipHTML(salaryData: any[]): string {
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
        ${salaryData.map((gaji, index) => `
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
                    <span class="label">NIK:</span>
                    <span class="value">${gaji.karyawan?.nik || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Dept:</span>
                    <span class="value">${gaji.karyawan?.departemen || '-'}</span>
                </div>
            </div>
            
            <div class="period-info">
                <strong>Periode:</strong> ${gaji.periodeAwal || '-'} s/d ${gaji.periodeAkhir || '-'}<br>
                <strong>Kehadiran:</strong> ${gaji.totalHariMasuk || 0} hari${gaji.totalHariSetengahHari ? ` (+ ${gaji.totalHariSetengahHari} setengah hari)` : ''}
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
                        <span class="value">${formatCurrency(gaji.potongan || 0)}</span>
                    </div>
                </div>
                
                <div class="grand-total">
                    <div class="info-row">
                        <span class="label">GAJI BERSIH:</span>
                        <span class="value">${formatCurrency(gaji.totalGajiBersih || gaji.totalGaji || 0)}</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                Dicetak: ${new Date().toLocaleDateString('id-ID')} | ${new Date().toLocaleTimeString('id-ID')}
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>`;

  return template;
} 