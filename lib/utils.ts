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
export function downloadSalaryPDF(salaryData: any[]): void {
  const { generateSalarySlipHTML } = require('./salary-template');
  const html = generateSalarySlipHTML(salaryData);
  
  // Buat blob dari HTML
  const blob = new Blob([html], { type: 'text/html' });
  
  // Buat URL untuk blob
  const url = URL.createObjectURL(blob);
  
  // Buat link untuk download
  const link = document.createElement('a');
  link.href = url;
  link.download = `slip-gaji-${new Date().toISOString().split('T')[0]}.html`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fungsi untuk print PDF
export function printSalaryPDF(salaryData: any[]): void {
  const { generateSalarySlipHTML } = require('./salary-template');
  const html = generateSalarySlipHTML(salaryData);
  
  // Buat window baru untuk print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Tunggu sebentar agar konten ter-load
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
}
