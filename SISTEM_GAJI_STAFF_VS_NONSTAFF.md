# Sistem Gaji STAFF vs Non-STAFF

## 📋 **Overview**

Sistem ini mengimplementasikan dua jenis perhitungan gaji yang berbeda berdasarkan departemen karyawan:

- **Karyawan STAFF**: Gaji per bulan (tetap)
- **Karyawan Non-STAFF**: Gaji per hari (berdasarkan absensi)

## 🏗️ **Perubahan Backend**

### 1. **Model Karyawan (Karyawan.java)**

```java
// Field baru untuk gaji per bulan
@Column(name = "gaji_per_bulan", precision = 12, scale = 2)
private BigDecimal gajiPerBulan;

// Field gaji per hari menjadi nullable
@Column(name = "gaji_per_hari", precision = 10, scale = 2)
private BigDecimal gajiPerHari;
```

### 2. **Service Gaji (GajiService.java)**

#### **Scheduled Jobs:**

- **STAFF**: `@Scheduled(cron = "0 0 0 1 * ?")` - Setiap tanggal 1 bulan berikutnya
- **Non-STAFF**: `@Scheduled(cron = "0 0 0 ? * SAT")` - Setiap Sabtu

#### **Method Manual Generate:**

```java
// Generate gaji STAFF per bulan
public void generateGajiStaffBulanan(LocalDate awal, LocalDate akhir)

// Generate gaji non-STAFF per minggu
public void generateGajiNonStaffMingguan(LocalDate awal, LocalDate akhir)
```

#### **Filter Departemen:**

```java
// STAFF: departemen mengandung kata "STAFF"
.filter(k -> k.getDepartemen() != null && k.getDepartemen().toLowerCase().contains("staff"))

// Non-STAFF: departemen tidak mengandung kata "STAFF"
.filter(k -> k.getDepartemen() == null || !k.getDepartemen().toLowerCase().contains("staff"))
```

### 3. **Controller Gaji (GajiController.java)**

```java
// Generate gaji STAFF per bulan
@PostMapping("/generate-staff-bulanan")
public ResponseEntity<String> generateGajiStaffBulanan(@RequestParam String periode)

// Generate gaji non-STAFF per minggu
@PostMapping("/generate-nonstaff-mingguan")
public ResponseEntity<String> generateGajiNonStaffMingguan(@RequestParam String periodeAwal, @RequestParam String periodeAkhir)
```

## 🎨 **Perubahan Frontend**

### 1. **API Client (api.ts)**

```typescript
export const generateSalaryAPI = {
  // Generate gaji STAFF per bulan
  generateStaffBulanan: async (periode: string) => { ... },

  // Generate gaji non-STAFF per minggu
  generateNonStaffMingguan: async (periodeAwal: string, periodeAkhir: string) => { ... }
}
```

### 2. **Halaman Proses Gaji (/dashboard/salary/process)**

- **Tab STAFF**: Form untuk generate gaji per bulan
- **Tab Non-STAFF**: Form untuk generate gaji per minggu
- **Validasi input**: Memastikan data yang dimasukkan valid
- **Feedback UI**: Alert success/error

### 3. **Sidebar Navigation**

- **Submenu Gaji**: Rekap Gaji, Proses Gaji, Tambah Bonus, Kelola Potongan
- **Active state**: Menunjukkan halaman yang sedang aktif
- **Collapsible**: Submenu muncul saat menu Gaji aktif

## 📊 **Perbedaan Perhitungan**

### **Karyawan STAFF:**

- **Gaji**: Per bulan tetap (tidak tergantung absensi harian)
- **Absensi**: Dihitung Senin-Jumat (untuk tracking saja)
- **Generate**: Otomatis setiap tanggal 1 bulan berikutnya
- **Formula**: `totalGaji = gajiPerBulan`

### **Karyawan Non-STAFF:**

- **Gaji**: Per hari × jumlah hari masuk
- **Absensi**: Dihitung Senin-Sabtu
- **Generate**: Otomatis setiap Sabtu
- **Formula**: `totalGaji = gajiPerHari × totalHariMasuk`

## 🔧 **Cara Penggunaan**

### **1. Setup Database**

```sql
-- Jalankan script untuk menambah kolom gaji_per_bulan
ALTER TABLE karyawan ADD COLUMN gaji_per_bulan DECIMAL(12,2) NULL;
ALTER TABLE karyawan MODIFY COLUMN gaji_per_hari DECIMAL(10,2) NULL;
```

### **2. Update Data Karyawan**

```sql
-- Set gaji per bulan untuk STAFF
UPDATE karyawan SET gaji_per_bulan = 5000000 WHERE departemen LIKE '%STAFF%';

-- Set gaji per hari untuk non-STAFF
UPDATE karyawan SET gaji_per_hari = 150000 WHERE departemen NOT LIKE '%STAFF%' OR departemen IS NULL;
```

### **3. Generate Gaji Manual**

1. Buka halaman **Proses Gaji** (`/dashboard/salary/process`)
2. Pilih tab **STAFF** atau **Non-STAFF**
3. Masukkan periode yang diinginkan
4. Klik tombol **Generate Gaji**

### **4. Monitor Otomatis**

- **STAFF**: Gaji akan di-generate otomatis setiap tanggal 1
- **Non-STAFF**: Gaji akan di-generate otomatis setiap Sabtu

## 🚀 **Fitur yang Tersedia**

### **Generate Otomatis:**

- ✅ STAFF: Setiap tanggal 1 bulan berikutnya
- ✅ Non-STAFF: Setiap Sabtu

### **Generate Manual:**

- ✅ STAFF: Periode bulan tertentu
- ✅ Non-STAFF: Periode minggu tertentu

### **Validasi:**

- ✅ Mencegah generate gaji ganda untuk periode yang sama
- ✅ Validasi input periode
- ✅ Feedback success/error

### **UI/UX:**

- ✅ Tab terpisah untuk STAFF dan non-STAFF
- ✅ Informasi perbedaan sistem gaji
- ✅ Submenu navigasi yang intuitif
- ✅ Loading state dan feedback

## 📝 **Endpoint API**

### **Generate Gaji STAFF:**

```
POST /api/gaji/generate-staff-bulanan
Body: periode=2024-01
```

### **Generate Gaji Non-STAFF:**

```
POST /api/gaji/generate-nonstaff-mingguan
Body: periodeAwal=2024-01-01&periodeAkhir=2024-01-07
```

## 🔍 **Monitoring & Debugging**

### **Log Scheduled Jobs:**

- Monitor log aplikasi untuk melihat scheduled job berjalan
- Cek apakah generate otomatis berjalan sesuai jadwal

### **Validasi Data:**

- Pastikan karyawan STAFF memiliki `gaji_per_bulan`
- Pastikan karyawan non-STAFF memiliki `gaji_per_hari`
- Cek departemen karyawan untuk filter yang benar

### **Testing:**

1. Test generate manual untuk periode yang sudah ada
2. Test generate manual untuk periode baru
3. Monitor scheduled job berjalan otomatis

## 🎯 **Kesimpulan**

Sistem ini berhasil mengimplementasikan dua jenis perhitungan gaji yang berbeda dengan:

- **Backend**: Scheduled jobs, manual generate, filter departemen
- **Frontend**: Interface yang user-friendly, validasi, feedback
- **Database**: Struktur yang mendukung kedua jenis gaji
- **API**: Endpoint yang terpisah untuk masing-masing jenis

Sistem siap digunakan untuk mengelola gaji karyawan STAFF dan non-STAFF dengan efisien! 🎉
