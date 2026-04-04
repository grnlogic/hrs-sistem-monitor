export type PKBPlaceholder = {
  key: string;
  label: string;
  description: string;
  sample?: string;
};

export const PKB_PLACEHOLDERS: PKBPlaceholder[] = [
  { key: "LOGO_IMAGE", label: "Logo Perusahaan", description: "Menampilkan logo perusahaan dalam bentuk tag img", sample: "<img src=... />" },
  { key: "PERUSAHAAN_NAMA", label: "Nama Perusahaan", description: "Nama pihak pertama" },
  { key: "PERUSAHAAN_ALAMAT", label: "Alamat Perusahaan", description: "Alamat lengkap kantor" },
  { key: "PERUSAHAAN_TELP", label: "Kontak Perusahaan", description: "Nomor telepon" },
  { key: "PIHAK_1_NAMA", label: "Nama Pihak I", description: "Nama penanggung jawab dari perusahaan" },
  { key: "PIHAK_1_NIK", label: "NIK Pihak I", description: "NIK penanggung jawab" },
  { key: "PIHAK_1_JABATAN", label: "Jabatan Pihak I", description: "Jabatan penanggung jawab" },
  { key: "PIHAK_2_NAMA", label: "Nama Pihak II", description: "Nama karyawan" },
  { key: "PIHAK_2_NIK", label: "NIK Pihak II", description: "NIK karyawan" },
  { key: "PIHAK_2_JABATAN", label: "Divisi Pihak II", description: "Divisi kerja karyawan" },
  { key: "PIHAK_2_ALAMAT", label: "Alamat Pihak II", description: "Alamat domisili karyawan" },
  { key: "PIHAK_1_TTD", label: "Nama Penandatangan Pihak I", description: "Nama yang muncul di blok tanda tangan perusahaan" },
  { key: "DIVISI", label: "Divisi", description: "Divisi/Bagian kerja" },
  { key: "TIPE_UPAH_LABEL", label: "Jenis Upah", description: "Format teks jenis upah" },
  { key: "NOMINAL_UPAH", label: "Nominal Upah", description: "Gaji pokok sesuai tipe upah" },
  { key: "BONUS_NOMINAL", label: "Bonus", description: "Bonus (opsional)" },
  { key: "BPJS", label: "BPJS", description: "Nomor BPJS manual karyawan (gabungan/format bebas)", sample: "{{bpjs}}" },
  { key: "BPJS_KESEHATAN_NOMINAL", label: "Nominal BPJS Kesehatan", description: "Potongan nominal BPJS kesehatan", sample: "{{bpjs_kesehatan_nominal}}" },
  { key: "BPJS_KETENAGAKERJAAN_NOMINAL", label: "Nominal BPJS Ketenagakerjaan", description: "Potongan nominal BPJS ketenagakerjaan", sample: "{{bpjs_ketenagakerjaan_nominal}}" },
  { key: "NOMINAL_POTONGAN_BPJS", label: "Total Potongan BPJS", description: "Total nominal potongan BPJS per bulan", sample: "{{nominal_potongan_bpjs}}" },
  { key: "CATATAN_PEMBAYARAN", label: "Catatan Pembayaran", description: "Catatan jadwal pembayaran" },
  { key: "TANGGAL_PERJANJIAN", label: "Tanggal Perjanjian", description: "Tanggal dibuatnya perjanjian" },
  { key: "PIHAK_2_TTD", label: "Nama Penandatangan Pihak II", description: "Nama untuk blok tanda tangan" },
  { key: "PERAN_KARYAWAN", label: "Peran Karyawan", description: "Narasi peran yang disesuaikan dengan tipe upah" },
  { key: "PASAL_2", label: "Isi Pasal 2", description: "Kalimat pada butir pasal kedua" },
  { key: "PASAL_3", label: "Isi Pasal 3", description: "Kalimat pada butir pasal ketiga" },
];
