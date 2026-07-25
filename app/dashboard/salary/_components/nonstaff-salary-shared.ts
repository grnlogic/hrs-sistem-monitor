/**
 * Shared types, constants, and utility functions for NonStaffSalaryWorkflow
 * and its extracted sub-components.
 */

import { type LokasiCode } from "@/lib/api";

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

export type AttendanceSummary = {
  karyawanId: string;
  nama: string;
  divisi: string;
  lokasiSlip: LokasiCode | null;
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
};

/* ---------- Constants ---------- */

export const DEFAULT_BONUS: SalaryItem[] = [{ judul: "Bonus", nominal: 0 }];
export const DEFAULT_POTONGAN: SalaryItem[] = [
  { judul: "BPJS Kesehatan", nominal: 0, isDefault: true },
  { judul: "BPJS Ketenagakerjaan", nominal: 0, isDefault: true },
];

/* ---------- Utilities ---------- */

export function toNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildDefaultInputState(): InputState {
  return {
    bonusItems: DEFAULT_BONUS.map((item) => ({ ...item })),
    potonganItems: DEFAULT_POTONGAN.map((item) => ({ ...item })),
  };
}
