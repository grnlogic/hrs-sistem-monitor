/**
 * Shared types, constants, and utility functions for SalaryStepperDashboard
 * and its extracted sub-components.
 */

export type PageType = "staff" | "nonstaff";
export type Step = 1 | 2 | 3;
export type WorkflowStatus = "DRAFT" | "GENERATED" | "INPUT_DONE" | "EXPORTED";

export type EmployeeRow = {
  id: string;
  namaLengkap: string;
  departemen: string;
  statusKaryawan: string;
  gajiPerBulan: number;
  gajiPerHari: number;
  bpjsGabunganNominal?: number;
  lokasiKerja?: string;
};

export type SalaryRow = {
  id: string;
  karyawanId: string;
  nama: string;
  divisi: string;
  statusKaryawan: string;
  gajiPokok: number;
  lokasiKerja?: string;
};

export type AttendanceSummary = {
  hadir: number;
  setengahHari: number;
  lembur: number;
  lokasiCount?: Record<"PJP" | "SP" | "PRIMA", number>;
};

export type SalaryItem = {
  id?: string;
  judul: string;
  nominal: number;
  isDefault?: boolean;
};

export type SalaryInputState = {
  bonusItems: SalaryItem[];
  potonganItems: SalaryItem[];
  bonusPKB: number | null;
};

export type EstimatedRow = {
  karyawanId: string;
  nama: string;
  divisi: string;
  statusKaryawan?: string;
  gajiPokok: number;
  hadir?: number;
  setengahHari?: number;
  lembur?: number;
};

export type CalculatedRow = {
  hariEfektif: number | undefined;
  upahHarian: number | undefined;
  tunjanganItems: SalaryItem[];
  gajiPokok: number;
  totalBonus: number;
  totalPotongan: number;
  gajiBersih: number;
};

/* ---------- Constants ---------- */

export const fixedBonusTemplate: SalaryItem[] = [
  { judul: "Bonus", nominal: 0, isDefault: true },
];

export const fixedPotonganTemplate: SalaryItem[] = [
  { judul: "Pinjaman", nominal: 0, isDefault: true },
  { judul: "Sumbangan", nominal: 0, isDefault: true },
  { judul: "BPJS", nominal: 0, isDefault: true },
  { judul: "Undangan", nominal: 0, isDefault: true },
  { judul: "Warung", nominal: 0, isDefault: true },
];

export const monthOptions = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

/* ---------- Utilities ---------- */

export function buildDefaultInputState(): SalaryInputState {
  return {
    bonusItems: fixedBonusTemplate.map((item) => ({ ...item })),
    potonganItems: fixedPotonganTemplate.map((item) => ({ ...item })),
    bonusPKB: null,
  };
}

export function toNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
