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

    // Generate nama file PDF yang deskriptif
    const today = new Date().toISOString().split('T')[0];
    const employeeCount = salaryData.length;
    const fileName = `slip-gaji-${employeeCount}-karyawan-${today}.pdf`;

    // Render HTML slip ke wrapper agar bisa di-export sebagai PDF
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, "text/html");

    const wrapper = document.createElement("div");
    wrapper.id = "__salary-pdf-render";
    wrapper.style.cssText =
      "position:fixed;top:0;left:0;width:210mm;z-index:-9999;background:white;overflow:hidden;";

    parsed.querySelectorAll("style").forEach((el) => {
      const style = document.createElement("style");
      style.textContent = el.textContent;
      wrapper.appendChild(style);
    });

    const bodyDiv = document.createElement("div");
    bodyDiv.style.cssText = "margin:0;padding:0;background:white;color:#000;";
    bodyDiv.innerHTML = parsed.body.innerHTML;
    wrapper.appendChild(bodyDiv);
    document.body.appendChild(wrapper);

    await new Promise<void>((resolve) => {
      const imgs = wrapper.querySelectorAll("img");
      if (imgs.length === 0) {
        setTimeout(resolve, 300);
        return;
      }

      let loaded = 0;
      const check = () => {
        loaded++;
        if (loaded >= imgs.length) resolve();
      };

      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth > 0) check();
        else {
          img.addEventListener("load", check);
          img.addEventListener("error", check);
        }
      });

      setTimeout(resolve, 5000);
    });

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: [5, 5, 5, 5],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(wrapper)
      .save();

    document.body.removeChild(wrapper);

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

// Fungsi untuk preview PDF (buka tab baru tanpa auto print)
export async function previewSalaryPDF(salaryData: any[]): Promise<void> {
  try {
    if (!salaryData || salaryData.length === 0) {
      throw new Error("Data gaji tidak valid atau kosong");
    }

    const { generateSalarySlipHTML } = await import('./salary-template');
    const html = generateSalarySlipHTML(salaryData);

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      throw new Error("Gagal membuka preview. Pastikan popup tidak diblokir browser.");
    }

    previewWindow.document.write(html);
    previewWindow.document.close();
    previewWindow.document.title = `Preview Slip Gaji ${salaryData.length} Karyawan`;
  } catch (error) {
    console.error("Error previewing PDF:", error);
    throw new Error(`Gagal membuka preview PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// PKB (Perjanjian Kerja Bersama) - Print & Download menggunakan template DOCX
type PKBDocxPayload = import('./pkb-docx').PKBDocxPayload;

async function fetchPKBHTML(pkbData: PKBDocxPayload): Promise<string> {
  const res = await fetch("/api/pkb/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(pkbData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Gagal generate PKB (HTTP ${res.status})`);
  }

  return res.text();
}

export async function printPKBPDF(pkbData: PKBDocxPayload): Promise<void> {
  try {
    const html = await fetchPKBHTML(pkbData);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Gagal membuka tab PKB. Pastikan popup tidak diblokir browser.");
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = `PKB - ${pkbData.pihak2Nama}`;

    return new Promise((resolve, reject) => {
      const waitForImagesAndPrint = () => {
        try {
          if (printWindow.closed) { resolve(); return; }

          const imgs = printWindow.document.querySelectorAll("img");
          const imgPromises = Array.from(imgs).map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete && img.naturalWidth > 0) { res(); return; }
                img.addEventListener("load", () => res());
                img.addEventListener("error", () => res());
                setTimeout(res, 3000);
              })
          );

          Promise.all(imgPromises).then(() => {
            // Extra delay for fonts to settle
            setTimeout(() => {
              if (printWindow.closed) { resolve(); return; }
              try {
                printWindow.focus();
                printWindow.print();
                printWindow.onafterprint = () => {
                  printWindow.close();
                  resolve();
                };
              } catch (printError) {
                console.error("Error during print:", printError);
                printWindow.close();
                reject(new Error("Gagal mencetak PKB"));
              }
            }, 500);
          });
        } catch (err) {
          console.error("Error waiting for images:", err);
          printWindow.close();
          reject(new Error("Gagal mencetak PKB"));
        }
      };

      if (printWindow.document.readyState === "complete") {
        waitForImagesAndPrint();
      } else {
        printWindow.addEventListener("load", waitForImagesAndPrint);
      }

      setTimeout(() => {
        if (!printWindow.closed) resolve();
      }, 20000);
    });
  } catch (error) {
    console.error("Error printing PKB:", error);
    throw new Error(`Gagal print PKB: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function downloadPKBPDF(pkbData: PKBDocxPayload): Promise<void> {
  try {
    const html = await fetchPKBHTML(pkbData);
    const fileName = `PKB-${pkbData.pihak2Nama.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Parse the HTML to extract styles and body content
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, "text/html");

    // Create a visible wrapper (behind everything) so html2canvas can render it
    const wrapper = document.createElement("div");
    wrapper.id = "__pkb-pdf-render";
    wrapper.style.cssText =
      "position:fixed;top:0;left:0;width:210mm;z-index:-9999;background:white;overflow:hidden;";

    // Copy <style> from parsed HTML so all CSS rules apply
    parsed.querySelectorAll("style").forEach((el) => {
      const style = document.createElement("style");
      style.textContent = el.textContent;
      wrapper.appendChild(style);
    });

    // Create body-like div with the same inline styles the template uses on <body>
    const bodyDiv = document.createElement("div");
    bodyDiv.style.cssText =
      "font-family:'Times New Roman',Times,serif;margin:0;padding:24px;background:white;color:#000;font-size:12px;line-height:1.6;";
    bodyDiv.innerHTML = parsed.body.innerHTML;
    wrapper.appendChild(bodyDiv);

    document.body.appendChild(wrapper);

    // Wait for all images to load
    await new Promise<void>((resolve) => {
      const imgs = wrapper.querySelectorAll("img");
      if (imgs.length === 0) {
        setTimeout(resolve, 300);
        return;
      }
      let loaded = 0;
      const check = () => {
        loaded++;
        if (loaded >= imgs.length) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth > 0) check();
        else {
          img.addEventListener("load", check);
          img.addEventListener("error", check);
        }
      });
      setTimeout(resolve, 5000);
    });

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: [0, 0, 0, 0],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794, // ~210mm at 96 DPI
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(wrapper)
      .save();

    document.body.removeChild(wrapper);
  } catch (error) {
    console.error("Error downloading PKB:", error);
    throw new Error(`Gagal download PKB: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
