import { formatCurrency } from './utils';

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
        }
        
        .page-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-wrap: wrap;
            gap: 5mm;
            padding: 5mm;
            box-sizing: border-box;
        }
        
        .slip-gaji {
            width: calc(33.33% - 3.33mm);
            height: calc(33.33% - 3.33mm);
            border: 2px solid #333;
            padding: 10px;
            box-sizing: border-box;
            background: white;
            font-size: 12px;
            line-height: 1.3;
            display: flex;
            flex-direction: column;
        }
        
        .slip-header {
            display: flex;
            align-items: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 5px;
        }
        
        .logo {
            width: 35px;
            height: 35px;
            margin-right: 10px;
            border-radius: 4px;
        }
        
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .slip-title {
            font-size: 11px;
            color: #666;
        }
        
        .employee-info {
            margin-bottom: 8px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        
        .label {
            font-weight: bold;
            width: 50%;
        }
        
        .value {
            text-align: right;
            width: 50%;
        }
        
        .salary-details {
            flex: 1;
            font-size: 11px;
        }
        
        .section {
            margin-bottom: 6px;
        }
        
        .section-title {
            font-weight: bold;
            border-bottom: 1px solid #eee;
            margin-bottom: 4px;
            font-size: 12px;
            color: #333;
        }
        
        .total-row {
            border-top: 1px solid #333;
            padding-top: 3px;
            margin-top: 3px;
            font-weight: bold;
        }
        
        .footer {
            margin-top: auto;
            font-size: 10px;
            text-align: center;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 4px;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .page-container {
                height: 100vh;
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
                    <img src="/png.png" alt="Logo Padud Jaya" style="width: 35px; height: 35px; object-fit: contain;" />
                </div>
                <div class="company-info">
                    <div class="company-name">PADUD JAYA</div>
                    <div class="slip-title">SLIP GAJI KARYAWAN</div>
                </div>
            </div>
            
            <div class="employee-info">
                <div class="info-row">
                    <span class="label">Tanggal:</span>
                    <span class="value">${new Date().toLocaleDateString('id-ID')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Nama:</span>
                    <span class="value">${gaji.karyawan?.namaLengkap || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Absensi:</span>
                    <span class="value">${gaji.totalHariMasuk || 0} hari</span>
                </div>
            </div>
            
            <div class="salary-details">
                <div class="section">
                    <div class="section-title">PENDAPATAN</div>
                    <div class="info-row">
                        <span class="label">Gaji Pokok:</span>
                        <span class="value">${formatCurrency(gaji.gajiPokok || 0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Bonus:</span>
                        <span class="value">${formatCurrency(gaji.bonus || 0)}</span>
                    </div>
                    <div class="info-row total-row">
                        <span class="label">Jumlah:</span>
                        <span class="value">${formatCurrency((gaji.gajiPokok || 0) + (gaji.bonus || 0))}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">POTONGAN</div>
                    <div class="info-row">
                        <span class="label">Pinjaman:</span>
                        <span class="value">${formatCurrency(0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Sumbangan:</span>
                        <span class="value">${formatCurrency(0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">BPJS:</span>
                        <span class="value">${formatCurrency(0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Undangan:</span>
                        <span class="value">${formatCurrency(0)}</span>
                    </div>
                    <div class="info-row total-row">
                        <span class="label">Jumlah:</span>
                        <span class="value">${formatCurrency(0)}</span>
                    </div>
                </div>
                
                <div class="info-row total-row">
                    <span class="label">TOTAL:</span>
                    <span class="value">${formatCurrency(gaji.totalGaji || 0)}</span>
                </div>
            </div>
            
            <div class="footer">
                Dicetak: ${new Date().toLocaleDateString('id-ID')}
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>`;

  return template;
} 