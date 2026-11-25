/**
 * Shared types, constants, and utility functions for NonStaffSalaryWorkflow
 * and its extracted sub-components.
 */

import { type LokasiCode } from "@/lib/api";
import { LOKASI_PT, NAMA_PT } from "@/lib/constants/perusahaan";
import { Badge } from "@/components/ui/display/badge";

export type Step = 1 | 2 | 3;

export type SalaryItem = {
  id?: string;
  judul: string;
  nominal: number;
  isDefault?: boolean;
};

export type EmployeeRow = {
  id: string;
  namaLengkap: string;
  departemen: string;
  statusKaryawan: string;
  gajiPerHari: number;
  lokasiDefault: LokasiCode | null;
  lokasiKerja: string;
};

export type LokasiBreakdownItem = {
  lokasi: LokasiCode;
  hariHadir: number;
  setengahHari: number;
  lembur: number;
  hariEfektif: number;
};

/** Format breakdown lokasi kerja → "3 hari CPD, 1 hari Jelat". Kosong → "-". */
export function formatLokasiBreakdown(
  items: LokasiBreakdownItem[] | undefined | null
): string {
  if (!items || items.length === 0) return "-";
  const parts = items
    .filter((b) => b.hariHadir > 0)
    .map((b) => `${b.hariHadir} hari ${LOKASI_PT[b.lokasi] ?? b.lokasi}`);
  return parts.length > 0 ? parts.join(", ") : "-";
}

export type AttendanceSummary = {
  karyawanId: string;
  nama: string;
  divisi: string;
  lokasiSlip: LokasiCode | null;
  lokasiDefault?: LokasiCode | null;
  lokasiBreakdown: LokasiBreakdownItem[];
  hariHadir: number;
  setengahHari: number;
  lembur: number;
  hariEfektif: number;
  upahHarian: number;
  statusPembayaran?: string;
};

export type SnapshotRow = {
  gajiId: string;
  gajiIds?: string[];
  karyawanId: string;
  nama: string;
  divisi: string;
  lokasiSlip: LokasiCode | null;
  lokasiDefault?: LokasiCode | null;
  lokasiBreakdown: LokasiBreakdownItem[];
  periodeAwal: string;
  periodeAkhir: string;
  hariHadir: number;
  setengahHari: number;
  lembur: number;
  hariEfektif: number;
  upahHarian: number;
  gajiPokok: number;
  statusPembayaran?: string;
};

export type GajiPeriodIndex = Record<
  string,
  { id: string; periodeAwal: string; periodeAkhir: string }
>;

export type InputState = {
  bonusItems: SalaryItem[];
  potonganItems: SalaryItem[];
  sisaPiutang?: number | null;
  pakaiUangPribadi?: boolean;
  /** Default true: cicilan piutang dipotong minggu ini. Uncheck = skip minggu ini. */
  bayarMingguIni?: boolean;
  /** Nominal cicilan minggu ini (bisa di-override; null = pakai jumlahCicilan). */
  nominalCicilan?: number | null;
  /** Nominal gaji bersih pembulatan manual (null/undefined = tidak dibulatkan). */
  manualGajiBersih?: number | null;
  piutangInfo?: {
    id: string;
    saldoAwal: number;
    jumlahCicilan: number;
    sisaSaldo: number;
    aktif: boolean;
  } | null;
  /** Data tidak sehat: karyawan punya >1 piutang aktif (rekap akan ditolak BE). */
  piutangKonflik?: boolean;
  piutangAktifCount?: number;
  /** Flag penanda jika draft bonus/potongan sudah pernah disimpan oleh user */
  isDraftSaved?: boolean;
  isBonusSaved?: boolean;
  /** Info jika cicilan piutang minggu ini sudah dibayar di lokasi lain (lintas lokasi) */
  sudahBayarDiLokasiLain?: boolean;
  infoCicilanLain?: {
    lokasi: string;
    jumlahDipotong: number;
    tanggal?: string | null;
  } | null;
};

/**
 * Menentukan apakah seorang karyawan memiliki piutang aktif, potongan pinjaman,
 * atau sedang mencicil (termasuk via uang pribadi).
 */
export function hasActiveOrPresentPiutang(input?: InputState | null): boolean {
  if (!input) return false;

  // Jika sudah bayar di lokasi lain pada minggu ini, jangan centang di lokasi ini
  if (input.sudahBayarDiLokasiLain) return false;

  // Jika bayarMingguIni secara eksplisit diset false (skip cicilan minggu ini)
  if (input.bayarMingguIni === false) return false;

  // 1. Cek dari piutangInfo aktif dan sisaSaldo > 0
  if (input.piutangInfo && input.piutangInfo.aktif !== false) {
    const sisa = Number(input.piutangInfo.sisaSaldo || 0);
    if (sisa > 0) return true;
  }

  // 2. Cek apakah ada potongan item bernama Pinjaman / Piutang dengan nominal > 0
  if (Array.isArray(input.potonganItems)) {
    const hasPinjaman = input.potonganItems.some(
      (item) =>
        (item.judul.toLowerCase() === "pinjaman" || item.judul.toLowerCase() === "piutang") &&
        Number(item.nominal || 0) > 0
    );
    if (hasPinjaman) return true;
  }

  // 3. Cek jika pakai uang pribadi dan ada nominal cicilan > 0
  if (input.pakaiUangPribadi) {
    const cicilan =
      input.nominalCicilan != null
        ? Number(input.nominalCicilan)
        : Number(input.piutangInfo?.jumlahCicilan || 0);
    if (cicilan > 0) return true;
  }

  // 4. Cek sisaPiutang numeric > 0
  if (input.sisaPiutang != null && Number(input.sisaPiutang) > 0) return true;

  return false;
}

/**
 * Menentukan nilai centang efektif di Fase 3:
 * - Jika admin sudah pernah mengubahnya secara manual (ada di showSisaPiutangMap), pakai nilai admin.
 * - Jika belum pernah diubah manual (undefined), default otomatis TRUE jika karyawan punya piutang aktif / cicilan.
 */
export function isPiutangCheckedInStep3(
  gajiId: string,
  input: InputState | undefined,
  showSisaPiutangMap: Record<string, boolean>
): boolean {
  if (showSisaPiutangMap[gajiId] !== undefined) {
    return showSisaPiutangMap[gajiId];
  }
  return hasActiveOrPresentPiutang(input);
}

export type RekapPopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "loading" | "success" | "error";
};

export type CalculatedSnapshot = {
  totalBonus: number;
  totalPotongan: number;
  gajiBersih: number;
  /** Nilai take-home sebelum dibulatkan (untuk badge). */
  gajiBersihSebelumBulat: number;
};

/* ---------- Constants ---------- */

export const DEFAULT_BONUS: SalaryItem[] = [];
export const DEFAULT_POTONGAN: SalaryItem[] = [];

/* ---------- Utilities ---------- */

export function toNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildDefaultInputState(): InputState {
  return {
    bonusItems: DEFAULT_BONUS.map((item) => ({ ...item })),
    potonganItems: DEFAULT_POTONGAN.map((item) => ({ ...item })),
    bayarMingguIni: true,
    nominalCicilan: null,
    manualGajiBersih: null,
  };
}

export { CompanyBadge } from "./company-badge";
