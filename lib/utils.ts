import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { generateSalarySlipHTML } from './salary-template';

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

// Fungsi untuk download PDF
export async function downloadSalaryPDF(salaryData: any[]): Promise<void> {
  try {
    if (!salaryData || salaryData.length === 0) {
      throw new Error("Data gaji tidak valid atau kosong");
    }

    const { generateSalarySlipHTML } = await import('./salary-template');
    const html = generateSalarySlipHTML(salaryData);
    
    // Buat blob dari HTML
    const blob = new Blob([html], { type: 'text/html' });
    
    // Buat URL untuk blob
    const url = URL.createObjectURL(blob);
    
    // Generate nama file yang lebih deskriptif
    const today = new Date().toISOString().split('T')[0];
    const employeeCount = salaryData.length;
    const fileName = `slip-gaji-${employeeCount}-karyawan-${today}.html`;
    
    // Buat link untuk download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Successfully downloaded ${fileName}`);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw new Error(`Gagal download PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Fungsi untuk print PDF
export async function printSalaryPDF(salaryData: any[]): Promise<void> {
  try {
    if (!salaryData || salaryData.length === 0) {
      throw new Error("Data gaji tidak valid atau kosong");
    }

    const { generateSalarySlipHTML } = await import('./salary-template');
    const html = generateSalarySlipHTML(salaryData);
    
    // Buat window baru untuk print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error("Gagal membuka window print. Pastikan popup tidak diblokir browser.");
    }

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Set title untuk window print
    printWindow.document.title = `Slip Gaji ${salaryData.length} Karyawan - ${new Date().toLocaleDateString('id-ID')}`;
    
    // Tunggu sebentar agar konten ter-load, lalu print
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          printWindow.print();
          console.log(`Successfully printed salary slips for ${salaryData.length} employees`);
          resolve();
        } catch (printError) {
          console.error("Error during print:", printError);
          printWindow.close();
          reject(new Error("Gagal mencetak PDF"));
        }
      }, 1000);
    });
  } catch (error) {
    console.error("Error printing PDF:", error);
    throw new Error(`Gagal print PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
