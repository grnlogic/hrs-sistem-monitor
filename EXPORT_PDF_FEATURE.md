# Fitur Export PDF Slip Gaji

## Deskripsi

Fitur ini memungkinkan pengguna untuk mengekspor data gaji karyawan dalam format PDF yang dapat dicetak. Satu halaman PDF dapat memuat hingga 9 slip gaji (3x3 grid) yang dapat dipotong menjadi slip gaji individual.

## Fitur Utama

### 1. Seleksi Data

- Checkbox untuk memilih data gaji yang akan di-export
- Checkbox "Select All" untuk memilih semua data yang ditampilkan
- Indikator jumlah data yang dipilih

### 2. Export Options

- **Download PDF**: Mengunduh file HTML yang dapat dibuka di browser
- **Print PDF**: Langsung membuka dialog print untuk mencetak

### 3. Template Slip Gaji

Setiap slip gaji berisi informasi:

- Header dengan logo "PJ" dan nama perusahaan "PADUD JAYA"
- Informasi karyawan (Tanggal, Nama, Absensi)
- Detail pendapatan (Gaji Pokok, Bonus, Jumlah)
- Detail potongan (Pinjaman, Sumbangan, BPJS, Undangan, Jumlah)
- Total gaji
- Footer dengan tanggal cetak

## Cara Penggunaan

1. **Pilih Data**: Centang checkbox pada data gaji yang ingin di-export
2. **Export**: Klik tombol "Download PDF" atau "Print PDF"
3. **Cetak**: Buka file HTML di browser dan gunakan Ctrl+P untuk mencetak
4. **Potong**: Setelah dicetak, potong slip gaji sesuai garis yang tersedia

## File yang Terlibat

### Frontend

- `app/dashboard/salary/page.tsx` - Halaman utama dengan fitur export
- `lib/utils.ts` - Fungsi utility untuk export PDF
- `lib/salary-template.ts` - Template HTML untuk slip gaji

### Template HTML

Template menggunakan CSS Grid untuk layout 3x3:

```css
.slip-gaji {
  width: calc(33.33% - 3.33mm);
  height: calc(33.33% - 3.33mm);
}
```

## Format Output

### File HTML

- Nama file: `slip-gaji-YYYY-MM-DD.html`
- Format: HTML dengan CSS untuk print
- Ukuran: A4 dengan margin 10mm

### Layout Print

- 9 slip gaji per halaman A4
- Border untuk memudahkan pemotongan
- Font size besar (12px) untuk kemudahan membaca
- Responsive untuk berbagai ukuran kertas

## Dependencies

- Browser dengan dukungan CSS Grid
- Printer atau PDF viewer untuk output

## Catatan Teknis

- Template menggunakan CSS `@media print` untuk optimasi cetak
- Data diambil dari API dan diformat menggunakan `formatCurrency`
- Export menggunakan Blob dan URL.createObjectURL untuk download
- Print menggunakan window.open untuk preview cetak
