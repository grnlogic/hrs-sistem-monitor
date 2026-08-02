/**
 * Utility pembulatan gaji: take-home (gaji bersih) dibulatkan ke ATAS ke
 * kelipatan 100 terdekat. Nilai asli sebelum pembulatan tetap disimpan
 * (gajiBersihSebelumBulat) untuk badge "dibulatkan dari Rp X".
 *
 * Contoh: 241.380 → 241.400; 241.400 → 241.400 (tidak ditambah lagi).
 */

export function roundUpToHundred(value: number): number {
  const v = Number(value || 0);
  return Math.ceil(v / 100) * 100;
}

export type GajiBersihResult = {
  /** Nilai final yang dibulatkan (dipakai untuk simpan ke DB & tampil). */
  gajiBersih: number;
  /** Nilai asli sebelum pembulatan (untuk badge/indikator). */
  gajiBersihSebelumBulat: number;
};

export function calcGajiBersih(
  pendapatan: number,
  potongan: number
): GajiBersihResult {
  const gajiBersihSebelumBulat = Math.max(0, pendapatan - potongan);
  return {
    gajiBersihSebelumBulat,
    gajiBersih: roundUpToHundred(gajiBersihSebelumBulat),
  };
}
