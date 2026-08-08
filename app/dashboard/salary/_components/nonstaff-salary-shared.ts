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
};

export type SnapshotRow = {
  gajiId: string;
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
};

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

export const DEFAULT_BONUS: SalaryItem[] = [{ judul: "Bonus", nominal: 0 }];
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
