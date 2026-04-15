"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/display/card";
import { Input } from "@/components/ui/form/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  attendanceAPI,
  employeeAPI,
  generateSalaryAPI,
  salaryAPI,
  setAuthToken,
  type LokasiCode,
} from "@/lib/api";
import {
  exportNonStaffRekapPdf,
  exportNonStaffSlipGabunganPdf,
  type NonStaffSlipExportPayload,
} from "@/lib/salary-slip-pdf";
import { formatCurrency } from "@/lib/utils";

type Step = 1 | 2 | 3;

type SalaryItem = {
  id?: string;
  judul: string;
  nominal: number;
  isDefault?: boolean;
};

type EmployeeRow = {
  id: string;
  namaLengkap: string;
  departemen: string;
  statusKaryawan: string;
  gajiPerHari: number;
  lokasiDefault: LokasiCode | null;
  lokasiKerja: string;
};

type LokasiBreakdownItem = {
  lokasi: LokasiCode;
  hariHadir: number;
  setengahHari: number;
  lembur: number;
  hariEfektif: number;
};

type AttendanceSummary = {
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

type SnapshotRow = {
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
};

type GajiPeriodIndex = Record<string, { id: string; periodeAwal: string; periodeAkhir: string }>;

type InputState = {
  bonusItems: SalaryItem[];
  potonganItems: SalaryItem[];
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type RekapPopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "loading" | "success" | "error";
};

const DEFAULT_BONUS: SalaryItem[] = [{ judul: "Bonus", nominal: 0 }];
const DEFAULT_POTONGAN: SalaryItem[] = [
  { judul: "BPJS Kesehatan", nominal: 0, isDefault: true },
  { judul: "BPJS Ketenagakerjaan", nominal: 0, isDefault: true },
];

function toNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatPeriod(startDate: string, endDate: string): string {
  const format = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  return `${format(startDate)} s/d ${format(endDate)}`;
}

function toApiDate(value: string): string {
  if (!value) return value;
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function toPeriodKey(karyawanId: string, periodeAwal: string, periodeAkhir: string): string {
  return `${karyawanId}|${toApiDate(periodeAwal)}|${toApiDate(periodeAkhir)}`;
}

function isNonStaff(employee: EmployeeRow): boolean {
  const status = employee.statusKaryawan.toLowerCase();
  const divisi = employee.departemen.toLowerCase();
  if (status.includes("non")) return true;
  return !status.includes("staff") && !divisi.includes("staff");
}

function isNonStaffByLabels(statusKaryawan: string, departemen: string): boolean {
  const status = statusKaryawan.toLowerCase();
  const divisi = departemen.toLowerCase();
  if (status.includes("non")) return true;
  return !status.includes("staff") && !divisi.includes("staff");
}

function normalizeLokasi(value: unknown): LokasiCode | null {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "PJP" || raw === "SP" || raw === "PRIMA") {
    return raw;
  }
  return null;
}

function employeeInLokasi(employee: EmployeeRow, userLokasi: LokasiCode): boolean {
  if (employee.lokasiDefault) {
    return employee.lokasiDefault === userLokasi;
  }

  const lokasiKerja = normalizeLokasi(employee.lokasiKerja);
  if (lokasiKerja) {
    return lokasiKerja === userLokasi;
  }

  return true;
}

function buildDefaultInputState(): InputState {
  return {
    bonusItems: DEFAULT_BONUS.map((item) => ({ ...item })),
    potonganItems: DEFAULT_POTONGAN.map((item) => ({ ...item })),
  };
}

function buildAttendanceSummary(
  employees: EmployeeRow[],
  attendanceRows: any[],
  startDate: string,
  endDate: string
): AttendanceSummary[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const byEmployee = new Map<string, AttendanceSummary>();
  const breakdownByEmployeeLokasi = new Map<string, LokasiBreakdownItem>();
  const latestAttendanceTimestampByEmployee = new Map<string, number>();

  for (const employee of employees) {
    byEmployee.set(employee.id, {
      karyawanId: employee.id,
      nama: employee.namaLengkap,
      divisi: employee.departemen || "-",
      lokasiSlip: employee.lokasiDefault || normalizeLokasi(employee.lokasiKerja),
      lokasiBreakdown: [],
      hariHadir: 0,
      setengahHari: 0,
      lembur: 0,
      hariEfektif: 0,
      upahHarian: employee.gajiPerHari,
    });
  }

  for (const row of attendanceRows) {
    const tanggal = new Date(row.tanggal || row.date);
    if (Number.isNaN(tanggal.getTime()) || tanggal < start || tanggal > end) {
      continue;
    }

    const karyawanId = String(row.karyawanId || row.karyawan?.id || "");
    if (!karyawanId || !byEmployee.has(karyawanId)) {
      continue;
    }

    const summary = byEmployee.get(karyawanId)!;
    const rowLokasi = normalizeLokasi(row.lokasi || row.location) || summary.lokasiSlip || "PJP";
    const status = String(row.status || "").toUpperCase();
    const breakdownKey = `${karyawanId}|${rowLokasi}`;
    const currentBreakdown = breakdownByEmployeeLokasi.get(breakdownKey) || {
      lokasi: rowLokasi,
      hariHadir: 0,
      setengahHari: 0,
      lembur: 0,
      hariEfektif: 0,
    };

    // Ikuti kebijakan: lokasi slip ditentukan dari lokasi absensi terakhir dalam periode.
    const currentTimestamp = tanggal.getTime();
    const prevTimestamp = latestAttendanceTimestampByEmployee.get(karyawanId) ?? Number.NEGATIVE_INFINITY;
    if (rowLokasi && currentTimestamp >= prevTimestamp) {
      summary.lokasiSlip = rowLokasi;
      latestAttendanceTimestampByEmployee.set(karyawanId, currentTimestamp);
    }

    if (status === "HADIR") {
      summary.hariHadir += 1;
      currentBreakdown.hariHadir += 1;
    }
    if (status === "SETENGAH_HARI") {
      summary.setengahHari += 1;
      currentBreakdown.setengahHari += 1;
    }
    if (Boolean(row.isLembur)) {
      summary.lembur += 1;
      currentBreakdown.lembur += 1;
    }

    const hariEfektifDb = toNumber(row.hariEfektif);
    if (hariEfektifDb > 0) {
      summary.hariEfektif += hariEfektifDb;
      currentBreakdown.hariEfektif += hariEfektifDb;
      breakdownByEmployeeLokasi.set(breakdownKey, currentBreakdown);
      continue;
    }

    const normalizedStatus = String(row.status || "").toUpperCase().replace(/\s+/g, "_");
    const isLembur = Boolean(row.isLembur);
    let hariEfektifCalculated = 0;

    if (normalizedStatus === "HADIR") {
      hariEfektifCalculated = 1;
    } else if (normalizedStatus === "SETENGAH_HARI") {
      hariEfektifCalculated = 0.5;
    }

    if (isLembur) {
      hariEfektifCalculated += 1;
    }

    summary.hariEfektif += hariEfektifCalculated;
    currentBreakdown.hariEfektif += hariEfektifCalculated;
    breakdownByEmployeeLokasi.set(breakdownKey, currentBreakdown);
  }

  return Array.from(byEmployee.values()).map((summary) => {
    const lokasiBreakdown = Array.from(breakdownByEmployeeLokasi.entries())
      .filter(([key]) => key.startsWith(`${summary.karyawanId}|`))
      .map(([, value]) => value)
      .sort((a, b) => b.hariEfektif - a.hariEfektif);

    return {
      ...summary,
      lokasiBreakdown,
    };
  });
}

export function NonStaffSalaryWorkflow() {
  const { data: session, status } = useSession();
  const role = session?.user?.role || "HRD";
  const userLokasi = normalizeLokasi(session?.user?.lokasi) || "PJP";

  const now = new Date();
  const [startDate, setStartDate] = useState(normalizeDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [endDate, setEndDate] = useState(normalizeDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [reviewRows, setReviewRows] = useState<AttendanceSummary[]>([]);
  const [manualHariEfektif, setManualHariEfektif] = useState<Record<string, number>>({});
  const [savedHariEfektifByKaryawanId, setSavedHariEfektifByKaryawanId] = useState<Record<string, number>>({});
  const [reviewGajiIdByKaryawanId, setReviewGajiIdByKaryawanId] = useState<Record<string, string>>({});
  const [savingHariEfektifByKaryawanId, setSavingHariEfektifByKaryawanId] = useState<Record<string, boolean>>({});
  const [snapshotRows, setSnapshotRows] = useState<SnapshotRow[]>([]);
  const [gajiByEmployeePeriod, setGajiByEmployeePeriod] = useState<GajiPeriodIndex>({});

  const [selectedSalaryId, setSelectedSalaryId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [inputsBySalaryId, setInputsBySalaryId] = useState<Record<string, InputState>>({});
  const [doneBySalaryId, setDoneBySalaryId] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const simpanRekapanInFlight = useRef(false);
  const [rekapPopup, setRekapPopup] = useState<RekapPopupState>({
    open: false,
    title: "",
    message: "",
    type: "loading",
  });

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      setAuthToken(session.accessToken);
    }
  }, [session?.accessToken, status]);

  const canAccessPage = role === "AKUNTANSI" || role === "HRD";
  const isPreviewOnly = role === "HRD";
  const canEditSalary = role === "AKUNTANSI";

  const effectiveReviewRows = useMemo(() => {
    return reviewRows.map((row) => {
      const override = manualHariEfektif[row.karyawanId];
      const hariEfektif = override ?? row.hariEfektif;
      return {
        ...row,
        hariEfektif,
        gajiPokok: Math.round(hariEfektif * row.upahHarian),
      };
    });
  }, [reviewRows, manualHariEfektif]);

  const selectedSnapshot = useMemo(
    () => snapshotRows.find((row) => row.gajiId === selectedSalaryId),
    [snapshotRows, selectedSalaryId]
  );

  function calculatedForSnapshot(row: SnapshotRow) {
    const input = inputsBySalaryId[row.gajiId] || buildDefaultInputState();
    const totalBonus = input.bonusItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const totalPotongan = input.potonganItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const gajiBersih = row.gajiPokok + totalBonus - totalPotongan;
    return {
      totalBonus,
      totalPotongan,
      gajiBersih,
    };
  }

  const allDone = snapshotRows.length > 0 && snapshotRows.every((row) => doneBySalaryId[row.gajiId]);

  const completedStep = useMemo(() => {
    if (step === 3) return 3;
    if (allDone && snapshotRows.length > 0) return 2;
    if (snapshotRows.length > 0) return 1;
    return 0;
  }, [step, allDone, snapshotRows.length]);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, message: text });
    window.setTimeout(() => {
      setToast((current) => (current?.message === text ? null : current));
    }, 2200);
  }

  function getErrorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error || "");
  }

  async function updateStatusForSnapshotRows(rows: SnapshotRow[]) {
    const latestGaji = await salaryAPI.getGajiByDateRange(startDate, endDate);
    const latestRows = Array.isArray(latestGaji) ? latestGaji : [];
    const selectedStart = toApiDate(startDate);
    const selectedEnd = toApiDate(endDate);

    const rowsByKaryawanId: Record<string, Array<{ id: string; periodeAwal: string; periodeAkhir: string }>> = {};
    latestRows.forEach((item: any) => {
      const karyawanId = String(item?.karyawan?.id || item?.karyawanId || "");
      const rowStart = toApiDate(String(item?.periodeAwal || item?.periode_awal || ""));
      const rowEnd = toApiDate(String(item?.periodeAkhir || item?.periode_akhir || ""));
      if (!karyawanId || !rowStart || !rowEnd) return;
      if (rowStart < selectedStart || rowEnd > selectedEnd) return;

      if (!rowsByKaryawanId[karyawanId]) {
        rowsByKaryawanId[karyawanId] = [];
      }
      rowsByKaryawanId[karyawanId].push({
        id: String(item.id),
        periodeAwal: rowStart,
        periodeAkhir: rowEnd,
      });
    });

    const unresolvedNames = new Set<string>();
    const skippedCrossNames = new Set<string>();
    const tasks: Array<{ name: string; promise: Promise<any> }> = [];
    const usedTaskKeys = new Set<string>();

    for (const row of rows) {
      // Jika lintas lokasi, lewatkan agar tidak gagal total (403) saat AKUNTANSI simpan.
      if (canEditSalary && row.lokasiSlip && row.lokasiSlip !== userLokasi) {
        skippedCrossNames.add(row.nama);
        continue;
      }

      const matches = rowsByKaryawanId[row.karyawanId] || [];
      if (matches.length === 0) {
        unresolvedNames.add(row.nama);
        continue;
      }

      for (const match of matches) {
        const taskKey = `${match.id}|${match.periodeAwal}|${match.periodeAkhir}`;
        if (usedTaskKeys.has(taskKey)) continue;
        usedTaskKeys.add(taskKey);

        tasks.push({
          name: row.nama,
          promise: salaryAPI.updateStatusPembayaranWithPeriod({
            gajiId: match.id,
            statusPembayaran: "Dibayar",
            periodeAwal: match.periodeAwal,
            periodeAkhir: match.periodeAkhir,
          }),
        });
      }
    }

    const settled = await Promise.allSettled(tasks.map((item) => item.promise));
    let successCount = 0;
    let forbiddenCount = 0;
    let conflictCount = 0;
    let otherErrorCount = 0;

    settled.forEach((result) => {
      if (result.status === "fulfilled") {
        successCount += 1;
        return;
      }

      const errorText = getErrorText(result.reason).toLowerCase();
      if (errorText.includes("lintas lokasi") || errorText.includes("akses ditolak")) {
        forbiddenCount += 1;
      } else if (errorText.includes("periode awal tidak cocok") || errorText.includes("periode akhir tidak cocok")) {
        conflictCount += 1;
      } else {
        otherErrorCount += 1;
      }
    });

    return {
      successCount,
      forbiddenCount,
      conflictCount,
      otherErrorCount,
      unresolvedCount: unresolvedNames.size,
      skippedCrossCount: skippedCrossNames.size,
    };
  }

  async function handleHariEfektifBlur(row: AttendanceSummary) {
    const newHariEfektif = manualHariEfektif[row.karyawanId] ?? row.hariEfektif;
    const oldHariEfektif = savedHariEfektifByKaryawanId[row.karyawanId] ?? row.hariEfektif;

    if (newHariEfektif === oldHariEfektif) {
      return;
    }

    if (newHariEfektif < 0) {
      setManualHariEfektif((prev) => ({
        ...prev,
        [row.karyawanId]: oldHariEfektif,
      }));
      showToast("error", "Hari efektif tidak boleh negatif");
      return;
    }

    const gajiId = reviewGajiIdByKaryawanId[row.karyawanId];
    if (!gajiId) {
      setManualHariEfektif((prev) => ({
        ...prev,
        [row.karyawanId]: oldHariEfektif,
      }));
      showToast("error", "Data gaji periode ini belum tersedia");
      return;
    }

    const gajiPokokBaru = Math.round(newHariEfektif * row.upahHarian);

    setSavingHariEfektifByKaryawanId((prev) => ({ ...prev, [row.karyawanId]: true }));
    try {
      await salaryAPI.koreksiHariEfektifNonStaff({
        gaji_id: gajiId,
        karyawan_id: row.karyawanId,
        total_hari_efektif: newHariEfektif,
        gaji_pokok: gajiPokokBaru,
      });

      setSavedHariEfektifByKaryawanId((prev) => ({
        ...prev,
        [row.karyawanId]: newHariEfektif,
      }));

      setReviewRows((prev) =>
        prev.map((item) =>
          item.karyawanId === row.karyawanId
            ? {
                ...item,
                hariEfektif: newHariEfektif,
              }
            : item
        )
      );

      showToast("success", "Koreksi disimpan");
    } catch (saveErr) {
      console.error(saveErr);
      setManualHariEfektif((prev) => ({
        ...prev,
        [row.karyawanId]: oldHariEfektif,
      }));
      showToast("error", "Gagal menyimpan koreksi");
    } finally {
      setSavingHariEfektifByKaryawanId((prev) => ({ ...prev, [row.karyawanId]: false }));
    }
  }

  async function handleShowData() {
    setError("");
    setMessage("");

    if (!startDate || !endDate) {
      setError("Tanggal mulai dan tanggal akhir wajib diisi.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai.");
      return;
    }

    try {
      setLoading(true);
      const [employeeRes, attendanceRes, gajiRes] = await Promise.all([
        employeeAPI.getAll(),
        attendanceAPI.getAll(),
        salaryAPI.getGajiByDateRange(startDate, endDate),
      ]);

      const employees: EmployeeRow[] = (Array.isArray(employeeRes) ? employeeRes : [])
        .map((row: any) => ({
          id: String(row.id),
          namaLengkap: String(row.namaLengkap || row.nama_lengkap || "-"),
          departemen: String(row.departemen || "-"),
          statusKaryawan: String(row.statusKaryawan || row.status_karyawan || "-"),
          gajiPerHari: toNumber(row.gajiPerHari ?? row.gaji_per_hari),
          lokasiDefault: normalizeLokasi(row.lokasiDefault || row.lokasi_default),
          lokasiKerja: String(row.lokasiKerja || row.lokasi_kerja || ""),
        }))
        .filter((employee) => isNonStaff(employee))
        .filter((employee) => employeeInLokasi(employee, userLokasi));

      const summary = buildAttendanceSummary(
        employees,
        Array.isArray(attendanceRes) ? attendanceRes : [],
        startDate,
        endDate
      );

      const gajiByKaryawanId: Record<string, string> = {};
      const gajiByPeriodIndex: GajiPeriodIndex = {};
      const totalHariEfektifByKaryawanId: Record<string, number> = {};
      const gajiCountByKaryawanId: Record<string, number> = {};

      (Array.isArray(gajiRes) ? gajiRes : []).forEach((item: any) => {
        const karyawanId = String(item?.karyawan?.id || item?.karyawanId || "");
        const departemen = String(item?.karyawan?.departemen || "-").toLowerCase();
        const statusKaryawan = String(item?.karyawan?.statusKaryawan || item?.karyawan?.status_karyawan || "-").toLowerCase();

        const isNonStaffRecord = isNonStaffByLabels(statusKaryawan, departemen);
        if (!karyawanId || !isNonStaffRecord) {
          return;
        }

        const rowStart = toApiDate(String(item?.periodeAwal || item?.periode_awal || ""));
        const rowEnd = toApiDate(String(item?.periodeAkhir || item?.periode_akhir || ""));
        if (rowStart && rowEnd) {
          gajiByPeriodIndex[toPeriodKey(karyawanId, rowStart, rowEnd)] = {
            id: String(item.id),
            periodeAwal: rowStart,
            periodeAkhir: rowEnd,
          };
        }

        gajiCountByKaryawanId[karyawanId] = (gajiCountByKaryawanId[karyawanId] || 0) + 1;

        // Simpan gajiId pertama sebagai fallback untuk proses fase berikutnya.
        if (!gajiByKaryawanId[karyawanId]) {
          gajiByKaryawanId[karyawanId] = String(item.id);
        }

        // Akumulasi hari efektif dari seluruh row dalam periode.
        totalHariEfektifByKaryawanId[karyawanId] =
          (totalHariEfektifByKaryawanId[karyawanId] || 0) +
          toNumber(item.totalHariEfektif ?? item.total_hari_efektif ?? item.totalHariMasuk ?? item.total_hari_masuk);
      });

      const summaryWithSavedValue = summary.map((item) => {
        // Jika ada banyak row gaji (model harian), pakai hasil agregasi absensi fase review.
        // Nilai tersimpan hanya dipakai saat benar-benar 1 row per karyawan untuk periode ini.
        if ((gajiCountByKaryawanId[item.karyawanId] || 0) !== 1) {
          return item;
        }

        const savedValue = totalHariEfektifByKaryawanId[item.karyawanId];
        if (Number.isFinite(savedValue) && savedValue >= 0) {
          return {
            ...item,
            hariEfektif: savedValue,
          };
        }
        return item;
      });

      const savedMap: Record<string, number> = {};
      summaryWithSavedValue.forEach((item) => {
        savedMap[item.karyawanId] = item.hariEfektif;
      });

      setReviewRows(summaryWithSavedValue);
      setManualHariEfektif({});
      setSavedHariEfektifByKaryawanId(savedMap);
      setReviewGajiIdByKaryawanId(gajiByKaryawanId);
      setGajiByEmployeePeriod(gajiByPeriodIndex);
      setSavingHariEfektifByKaryawanId({});
      setStep(1);
      setMessage(`Data Non-Staff lokasi ${userLokasi} berhasil ditampilkan.`);
    } catch (loadErr) {
      console.error(loadErr);
      setError("Gagal memuat data review absensi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAndContinue() {
    setError("");
    setMessage("");

    if (effectiveReviewRows.length === 0) {
      setError("Belum ada data untuk dikonfirmasi.");
      return;
    }

    try {
      setSubmitting(true);

      // Draft dibuat/di-refresh saat konfirmasi agar flow tidak bergantung tombol terpisah.
      await generateSalaryAPI.generateNonStaffMingguan(startDate, endDate);

      const generated = await salaryAPI.getGajiByDateRange(startDate, endDate);
      const generatedRows = Array.isArray(generated) ? generated : [];
      const selectedStart = toApiDate(startDate);
      const selectedEnd = toApiDate(endDate);

      const exactRowByKaryawanId: Record<string, { id: string; periodeAwal: string; periodeAkhir: string }> = {};
      const fallbackRowByKaryawanId: Record<string, { id: string; periodeAwal: string; periodeAkhir: string }> = {};
      generatedRows.forEach((row: any) => {
        const karyawanId = String(row.karyawan?.id || row.karyawanId || "");
        const departemen = String(row.karyawan?.departemen || "-");
        const statusKaryawan = String(row.karyawan?.statusKaryawan || row.karyawan?.status_karyawan || "-");
        const isNonStaffRow = isNonStaffByLabels(statusKaryawan, departemen);
        if (!karyawanId || !isNonStaffRow) return;

        const rowStart = toApiDate(String(row.periodeAwal || row.periode_awal || ""));
        const rowEnd = toApiDate(String(row.periodeAkhir || row.periode_akhir || ""));
        const isWithinSelectedRange = rowStart >= selectedStart && rowEnd <= selectedEnd;
        const isExactRange = rowStart === selectedStart && rowEnd === selectedEnd;
        if (isExactRange) {
          exactRowByKaryawanId[karyawanId] = {
            id: String(row.id),
            periodeAwal: rowStart,
            periodeAkhir: rowEnd,
          };
          return;
        }

        if (!isWithinSelectedRange) {
          return;
        }

        const existing = fallbackRowByKaryawanId[karyawanId];
        if (!existing || rowEnd > existing.periodeAkhir || (rowEnd === existing.periodeAkhir && rowStart > existing.periodeAwal)) {
          fallbackRowByKaryawanId[karyawanId] = {
            id: String(row.id),
            periodeAwal: rowStart,
            periodeAkhir: rowEnd,
          };
        }
      });

      const missingEmployees: string[] = [];
      let fallbackUsedCount = 0;
      const normalizedSnapshots: SnapshotRow[] = effectiveReviewRows
        .map((review) => {
          const matchedRow = exactRowByKaryawanId[review.karyawanId] || fallbackRowByKaryawanId[review.karyawanId];

          if (!matchedRow) {
            missingEmployees.push(review.nama);
            return null;
          }

          if (!exactRowByKaryawanId[review.karyawanId] && fallbackRowByKaryawanId[review.karyawanId]) {
            fallbackUsedCount += 1;
          }

          const gajiPokok = Math.round(review.hariEfektif * review.upahHarian);

          return {
            gajiId: matchedRow.id,
            karyawanId: review.karyawanId,
            nama: review.nama,
            divisi: review.divisi,
            lokasiSlip: review.lokasiSlip,
            lokasiBreakdown: review.lokasiBreakdown,
            periodeAwal: matchedRow.periodeAwal,
            periodeAkhir: matchedRow.periodeAkhir,
            hariHadir: review.hariHadir,
            setengahHari: review.setengahHari,
            lembur: review.lembur,
            hariEfektif: review.hariEfektif,
            upahHarian: review.upahHarian,
            gajiPokok,
          } satisfies SnapshotRow;
        })
        .filter((row): row is SnapshotRow => Boolean(row));

      if (normalizedSnapshots.length === 0) {
        setError("Data gaji periode ini belum tersedia setelah proses generate draft otomatis.");
        return;
      }

      setSnapshotRows(normalizedSnapshots);
      setDoneBySalaryId({});
      setInputsBySalaryId({});
      setStep(2);

      if (missingEmployees.length > 0) {
        setMessage(`Snapshot tersimpan untuk ${normalizedSnapshots.length} karyawan. ${missingEmployees.length} karyawan belum punya data gaji periode ini.`);
      } else if (fallbackUsedCount > 0) {
        setMessage(`Snapshot periode tersimpan. ${fallbackUsedCount} karyawan menggunakan data gaji model harian pada rentang periode terpilih.`);
      } else {
        setMessage("Snapshot periode tersimpan. Lanjut ke input bonus/potongan.");
      }
    } catch (confirmErr) {
      console.error(confirmErr);
      const messageText = confirmErr instanceof Error ? confirmErr.message : "Gagal konfirmasi data.";
      setError(messageText);
    } finally {
      setSubmitting(false);
    }
  }

  async function openInputDialog(row: SnapshotRow) {
    setSelectedSalaryId(row.gajiId);
    setDialogOpen(true);

    if (inputsBySalaryId[row.gajiId]) {
      return;
    }

    try {
      const detail = await salaryAPI.getBonusPotonganDetail(row.gajiId);
      const bonusFromApi: SalaryItem[] = Array.isArray(detail?.bonusItems)
        ? detail.bonusItems.map((item: any) => ({
            id: item.id ? String(item.id) : undefined,
            judul: String(item.judul || ""),
            nominal: toNumber(item.nominal),
          }))
        : [];

      const potonganFromApi: SalaryItem[] = Array.isArray(detail?.potonganItems)
        ? detail.potonganItems.map((item: any) => ({
            id: item.id ? String(item.id) : undefined,
            judul: String(item.judul || ""),
            nominal: toNumber(item.nominal),
            isDefault: Boolean(item.isDefault),
          }))
        : [];

      const normalizedBonus = bonusFromApi.length > 0 ? bonusFromApi : buildDefaultInputState().bonusItems;
      const normalizedPotongan = [...DEFAULT_POTONGAN.map((item) => ({ ...item }))];

      for (const potongan of potonganFromApi) {
        const targetIndex = normalizedPotongan.findIndex(
          (base) => base.judul.toLowerCase() === potongan.judul.toLowerCase()
        );
        if (targetIndex >= 0) {
          normalizedPotongan[targetIndex] = {
            ...normalizedPotongan[targetIndex],
            id: potongan.id,
            nominal: potongan.nominal,
            isDefault: true,
          };
        } else {
          normalizedPotongan.push({ ...potongan, isDefault: false });
        }
      }

      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.gajiId]: {
          bonusItems: normalizedBonus,
          potonganItems: normalizedPotongan,
        },
      }));

      if (bonusFromApi.length > 0 || potonganFromApi.length > 0) {
        setDoneBySalaryId((prev) => ({ ...prev, [row.gajiId]: true }));
      }
    } catch (detailErr) {
      console.error(detailErr);
      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.gajiId]: buildDefaultInputState(),
      }));
    }
  }

  function updateItem(
    salaryId: string,
    key: "bonusItems" | "potonganItems",
    index: number,
    field: "judul" | "nominal",
    value: string
  ) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      const list = [...current[key]];
      const updated = { ...list[index] };

      if (field === "judul") {
        updated.judul = value;
      } else {
        updated.nominal = toNumber(value);
      }

      list[index] = updated;
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [key]: list,
        },
      };
    });
  }

  function addItem(salaryId: string, key: "bonusItems" | "potonganItems") {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [key]: [...current[key], { judul: "", nominal: 0 }],
        },
      };
    });
  }

  function deleteItem(salaryId: string, key: "bonusItems" | "potonganItems", index: number) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      const target = current[key][index];
      if (target?.isDefault) {
        return prev;
      }

      return {
        ...prev,
        [salaryId]: {
          ...current,
          [key]: current[key].filter((_, rowIndex) => rowIndex !== index),
        },
      };
    });
  }

  async function saveInputSalary() {
    if (!selectedSnapshot) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const inputState = inputsBySalaryId[selectedSnapshot.gajiId] || buildDefaultInputState();

      await salaryAPI.saveBonusPotongan({
        gajiId: selectedSnapshot.gajiId,
        karyawanId: selectedSnapshot.karyawanId,
        bonusItems: inputState.bonusItems.filter((item) => item.judul.trim()),
        potonganItems: inputState.potonganItems.filter((item) => item.judul.trim()),
      });

      setDoneBySalaryId((prev) => ({ ...prev, [selectedSnapshot.gajiId]: true }));
      setDialogOpen(false);
      setMessage(`Input ${selectedSnapshot.nama} berhasil disimpan.`);
    } catch (saveErr) {
      console.error(saveErr);
      setError("Gagal menyimpan bonus dan potongan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExportSlipGabungan() {
    try {
      setSubmitting(true);
      setError("");

      const payload: NonStaffSlipExportPayload[] = [];
      let lintasLokasiSplitCount = 0;

      snapshotRows.forEach((row) => {
        const input = inputsBySalaryId[row.gajiId] || buildDefaultInputState();
        const calc = calculatedForSnapshot(row);
        const breakdown = (row.lokasiBreakdown || []).filter((item) => item.hariEfektif > 0);

        if (breakdown.length <= 1 || row.hariEfektif <= 0) {
          payload.push({
            companyLocation: row.lokasiSlip || userLokasi,
            periodStart: startDate,
            periodEnd: endDate,
            nama: row.nama,
            divisi: row.divisi,
            hariEfektif: row.hariEfektif,
            upahHarian: row.upahHarian,
            gajiPokok: row.gajiPokok,
            totalBonus: calc.totalBonus,
            totalPotongan: calc.totalPotongan,
            gajiBersih: calc.gajiBersih,
            bonusItems: input.bonusItems,
            potonganItems: input.potonganItems,
          });
          return;
        }

        lintasLokasiSplitCount += 1;
        let usedGajiPokok = 0;
        let usedBonus = 0;
        let usedPotongan = 0;

        breakdown.forEach((part, index) => {
          const ratio = part.hariEfektif / row.hariEfektif;
          const isLast = index === breakdown.length - 1;
          const partGajiPokok = isLast ? row.gajiPokok - usedGajiPokok : Math.round(row.gajiPokok * ratio);
          const partBonus = isLast ? calc.totalBonus - usedBonus : Math.round(calc.totalBonus * ratio);
          const partPotongan = isLast ? calc.totalPotongan - usedPotongan : Math.round(calc.totalPotongan * ratio);

          usedGajiPokok += partGajiPokok;
          usedBonus += partBonus;
          usedPotongan += partPotongan;

          payload.push({
            companyLocation: part.lokasi,
            periodStart: startDate,
            periodEnd: endDate,
            nama: `${row.nama} (${part.lokasi})`,
            divisi: row.divisi,
            hariEfektif: Number(part.hariEfektif.toFixed(2)),
            upahHarian: row.upahHarian,
            gajiPokok: partGajiPokok,
            totalBonus: partBonus,
            totalPotongan: partPotongan,
            gajiBersih: partGajiPokok + partBonus - partPotongan,
            bonusItems: input.bonusItems,
            potonganItems: input.potonganItems,
          });
        });
      });

      await exportNonStaffSlipGabunganPdf(payload, `slip-gaji-nonstaff-${startDate}_${endDate}.pdf`);
      if (lintasLokasiSplitCount > 0) {
        setMessage(`Export slip gabungan selesai. ${lintasLokasiSplitCount} karyawan lintas lokasi dipecah jadi slip per lokasi.`);
      } else {
        setMessage("Export slip gabungan selesai.");
      }
    } catch (exportErr) {
      console.error(exportErr);
      const message = String((exportErr as any)?.message || "");
      if (message.toLowerCase().includes("modul pdf") || message.toLowerCase().includes("chunk")) {
        setError("Gagal export slip gabungan karena modul PDF belum siap. Refresh halaman lalu coba lagi.");
      } else {
        setError("Gagal export slip gabungan.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExportRekapSemua() {
    try {
      setSubmitting(true);
      setError("");

      const rows = snapshotRows.map((row) => {
        const input = inputsBySalaryId[row.gajiId] || buildDefaultInputState();
        const calc = calculatedForSnapshot(row);
        return {
          nama: row.nama,
          divisi: row.divisi,
          hariEfektif: row.hariEfektif,
          upahHarian: row.upahHarian,
          gajiPokok: row.gajiPokok,
          totalBonus: calc.totalBonus,
          totalPotongan: calc.totalPotongan,
          gajiBersih: calc.gajiBersih,
          bonusItems: input.bonusItems,
          potonganItems: input.potonganItems,
        };
      });

      await exportNonStaffRekapPdf(
        rows,
        {
          location: userLokasi,
          periodLabel: formatPeriod(startDate, endDate),
        },
        `rekap-gaji-nonstaff-${startDate}_${endDate}.pdf`
      );

      const result = await updateStatusForSnapshotRows(snapshotRows);
      setMessage(
        `Export rekap selesai. Berhasil: ${result.successCount}, ` +
          `Dilewati lintas lokasi: ${result.skippedCrossCount + result.forbiddenCount}, ` +
          `Mismatch periode: ${result.unresolvedCount + result.conflictCount}, ` +
          `Error lain: ${result.otherErrorCount}.`
      );
    } catch (exportErr) {
      console.error(exportErr);
      setError("Gagal export rekap semua.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimpanRekapan() {
    if (simpanRekapanInFlight.current || submitting) {
      return;
    }

    simpanRekapanInFlight.current = true;

    try {
      setSubmitting(true);
      setError("");
      setRekapPopup({
        open: true,
        title: "Menyimpan Rekapan",
        message: "Sedang memperbarui status pembayaran periode ini. Mohon tunggu...",
        type: "loading",
      });

      const result = await updateStatusForSnapshotRows(snapshotRows);

      setMessage(
        `Rekapan diproses. Berhasil: ${result.successCount}, ` +
          `Dilewati lintas lokasi: ${result.skippedCrossCount + result.forbiddenCount}, ` +
          `Mismatch periode: ${result.unresolvedCount + result.conflictCount}, ` +
          `Error lain: ${result.otherErrorCount}.`
      );
      setRekapPopup({
        open: true,
        title: "Berhasil",
        message:
          `Status pembayaran berhasil diperbarui untuk ${result.successCount} data. ` +
          `Lintas lokasi dilewati: ${result.skippedCrossCount + result.forbiddenCount}. ` +
          `Mismatch periode: ${result.unresolvedCount + result.conflictCount}.`,
        type: "success",
      });
    } catch (saveErr) {
      console.error(saveErr);
      setError("Gagal menyimpan rekapan periode.");
      setRekapPopup({
        open: true,
        title: "Gagal Menyimpan",
        message: "Terjadi kendala saat update status pembayaran. Silakan coba lagi.",
        type: "error",
      });
    } finally {
      simpanRekapanInFlight.current = false;
      setSubmitting(false);
    }
  }

  const divisionSummary = useMemo(() => {
    const summary = new Map<string, number>();
    for (const row of snapshotRows) {
      const calc = calculatedForSnapshot(row);
      summary.set(row.divisi, (summary.get(row.divisi) || 0) + calc.gajiBersih);
    }
    return Array.from(summary.entries()).map(([divisi, total]) => ({ divisi, total }));
  }, [snapshotRows, inputsBySalaryId]);

  if (status === "loading") {
    return <div className="p-6 text-sm">Memuat sesi...</div>;
  }

  if (!canAccessPage) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Halaman ini hanya untuk role HRD dan AKUNTANSI.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gaji Non-Staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Lokasi akun aktif: <span className="font-semibold text-foreground">{userLokasi}</span></p>
          <p>Periode aktif: <span className="font-semibold text-foreground">{formatPeriod(startDate, endDate)}</span></p>
          {isPreviewOnly ? (
            <p className="text-amber-700">
              Mode HRD (Preview): hanya lihat data. Edit koreksi, bonus/potongan, dan finalisasi tetap oleh AKUNTANSI.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => {
              const active = step === item;
              const done = completedStep >= item;
              return (
                <button
                  key={item}
                  type="button"
                  className="border-b pb-2 text-left"
                  onClick={() => {
                    if (isPreviewOnly && item !== 1) return;
                    setStep(item as Step);
                  }}
                >
                  <p className={active ? "font-bold" : "font-semibold text-muted-foreground"}>
                    {done ? "✓" : `${item}.`} {item === 1 ? "Review Data" : item === 2 ? "Input Bonus & Potongan" : "Export"}
                  </p>
                  {active ? <div className="mt-2 h-0.5 w-24 bg-primary" /> : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {toast ? (
        <div className="fixed right-5 top-5 z-50">
          <div
            className={`rounded-md border px-4 py-2 text-sm shadow-sm ${
              toast.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {rekapPopup.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">{rekapPopup.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{rekapPopup.message}</p>

            {rekapPopup.type === "loading" ? (
              <div className="mt-4 inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                Memproses update status pembayaran...
              </div>
            ) : (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() =>
                    setRekapPopup({
                      open: false,
                      title: "",
                      message: "",
                      type: "loading",
                    })
                  }
                >
                  Tutup
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Fase 1. Review & Konfirmasi Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm">Dari tanggal</label>
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm">Sampai tanggal</label>
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleShowData} disabled={loading}>
                  {loading ? "Memuat..." : "Tampilkan Data"}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Hari Hadir</TableHead>
                    <TableHead>Setengah Hari</TableHead>
                    <TableHead>Lembur</TableHead>
                    <TableHead>Hari Efektif</TableHead>
                    <TableHead>Upah Harian</TableHead>
                    <TableHead>Estimasi Gaji Pokok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {effectiveReviewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>Belum ada data review.</TableCell>
                    </TableRow>
                  ) : (
                    effectiveReviewRows.map((row) => {
                      const value = manualHariEfektif[row.karyawanId] ?? row.hariEfektif;
                      const gajiPokok = Math.round(value * row.upahHarian);
                      return (
                        <TableRow key={row.karyawanId}>
                          <TableCell>{row.nama}</TableCell>
                          <TableCell>{row.divisi}</TableCell>
                          <TableCell>{row.hariHadir}</TableCell>
                          <TableCell>{row.setengahHari}</TableCell>
                          <TableCell>{row.lembur}</TableCell>
                          <TableCell>
                            {canEditSalary ? (
                              <>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.5"
                                  value={value}
                                  disabled={Boolean(savingHariEfektifByKaryawanId[row.karyawanId])}
                                  onChange={(event) =>
                                    setManualHariEfektif((prev) => ({
                                      ...prev,
                                      [row.karyawanId]: toNumber(event.target.value),
                                    }))
                                  }
                                  onBlur={() => {
                                    void handleHariEfektifBlur(row);
                                  }}
                                  className="h-8 w-24"
                                />
                                {savingHariEfektifByKaryawanId[row.karyawanId] ? (
                                  <p className="mt-1 text-xs text-muted-foreground">Menyimpan...</p>
                                ) : null}
                              </>
                            ) : (
                              <span className="font-medium">{value}</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(row.upahHarian)}</TableCell>
                          <TableCell>{formatCurrency(gajiPokok)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {canEditSalary ? (
              <div className="flex justify-end">
                <Button onClick={handleConfirmAndContinue} disabled={submitting || effectiveReviewRows.length === 0}>
                  {submitting ? "Memproses Draft & Menyimpan..." : "Konfirmasi & Lanjut ke Input Bonus/Potongan"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Preview selesai. Untuk lanjut input bonus/potongan gunakan akun AKUNTANSI.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && canEditSalary ? (
        <Card>
          <CardHeader>
            <CardTitle>Fase 2. Input Bonus & Potongan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Hari Efektif</TableHead>
                    <TableHead>Upah Harian</TableHead>
                    <TableHead>Total dari Hari</TableHead>
                    <TableHead>Total Bonus</TableHead>
                    <TableHead>Total Potongan</TableHead>
                    <TableHead>Gaji Akhir</TableHead>
                    <TableHead>Detail Bonus</TableHead>
                    <TableHead>Detail Potongan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshotRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>Belum ada snapshot data.</TableCell>
                    </TableRow>
                  ) : (
                    snapshotRows.map((row) => {
                      const input = inputsBySalaryId[row.gajiId] || buildDefaultInputState();
                      const calc = calculatedForSnapshot(row);
                      const totalDariHari = Math.round(row.hariEfektif * row.upahHarian);

                      const bonusDetails = input.bonusItems.filter(
                        (item) => item.judul.trim() && toNumber(item.nominal) !== 0
                      );
                      const potonganDetails = input.potonganItems.filter(
                        (item) => item.judul.trim() && toNumber(item.nominal) !== 0
                      );

                      return (
                        <TableRow key={row.gajiId}>
                          <TableCell>{row.nama}</TableCell>
                          <TableCell>{row.divisi}</TableCell>
                          <TableCell>{row.hariEfektif}</TableCell>
                          <TableCell>{formatCurrency(row.upahHarian)}</TableCell>
                          <TableCell>{formatCurrency(totalDariHari)}</TableCell>
                          <TableCell>{formatCurrency(calc.totalBonus)}</TableCell>
                          <TableCell>{formatCurrency(calc.totalPotongan)}</TableCell>
                          <TableCell>{formatCurrency(calc.gajiBersih)}</TableCell>
                          <TableCell>
                            {bonusDetails.length === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <div className="space-y-1 text-xs">
                                {bonusDetails.map((item, idx) => (
                                  <p key={`bonus-detail-${row.gajiId}-${idx}`}>
                                    {item.judul}: <span className="font-medium">{formatCurrency(toNumber(item.nominal))}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {potonganDetails.length === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <div className="space-y-1 text-xs">
                                {potonganDetails.map((item, idx) => (
                                  <p key={`potongan-detail-${row.gajiId}-${idx}`}>
                                    {item.judul}: <span className="font-medium">{formatCurrency(toNumber(item.nominal))}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {doneBySalaryId[row.gajiId] ? <Badge>Selesai</Badge> : <Badge variant="secondary">Belum</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => openInputDialog(row)}>
                              Input
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {allDone ? (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Lanjut ke Export
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && canEditSalary ? (
        <Card>
          <CardHeader>
            <CardTitle>Fase 3. Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Hari Efektif</TableHead>
                    <TableHead>Upah Harian</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Total Bonus</TableHead>
                    <TableHead>Total Potongan</TableHead>
                    <TableHead>Gaji Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshotRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>Belum ada data untuk export.</TableCell>
                    </TableRow>
                  ) : (
                    snapshotRows.map((row) => {
                      const calc = calculatedForSnapshot(row);
                      return (
                        <TableRow key={`rekap-${row.gajiId}`}>
                          <TableCell>{row.nama}</TableCell>
                          <TableCell>{row.divisi}</TableCell>
                          <TableCell>{row.hariEfektif}</TableCell>
                          <TableCell>{formatCurrency(row.upahHarian)}</TableCell>
                          <TableCell>{formatCurrency(row.gajiPokok)}</TableCell>
                          <TableCell>{formatCurrency(calc.totalBonus)}</TableCell>
                          <TableCell>{formatCurrency(calc.totalPotongan)}</TableCell>
                          <TableCell>{formatCurrency(calc.gajiBersih)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {divisionSummary.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">Belum ada summary divisi.</CardContent>
                </Card>
              ) : (
                divisionSummary.map((item) => (
                  <Card key={item.divisi}>
                    <CardContent className="space-y-1 pt-6">
                      <p className="text-sm font-semibold">{item.divisi}</p>
                      <p className="text-sm">Total: <span className="font-semibold">{formatCurrency(item.total)}</span></p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportSlipGabungan} disabled={submitting || snapshotRows.length === 0}>
                Export Slip Gabungan
              </Button>
              <Button variant="outline" onClick={handleExportRekapSemua} disabled={submitting || snapshotRows.length === 0}>
                Export Rekap Semua
              </Button>
              <Button variant="secondary" onClick={handleSimpanRekapan} disabled={submitting || snapshotRows.length === 0}>
                Simpan Rekapan (Set Terbayar)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSnapshot?.nama} - {selectedSnapshot?.divisi} - {formatPeriod(startDate, endDate)}
            </DialogTitle>
            <DialogDescription>Input bonus dan potongan untuk karyawan ini.</DialogDescription>
          </DialogHeader>

          {selectedSnapshot ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-2 text-sm font-semibold">Ringkasan Kehadiran</p>
                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                    <p>Hari Hadir: <span className="font-semibold">{selectedSnapshot.hariHadir}</span></p>
                    <p>Setengah Hari: <span className="font-semibold">{selectedSnapshot.setengahHari}</span></p>
                    <p>Lembur: <span className="font-semibold">{selectedSnapshot.lembur}</span></p>
                    <p>Hari Efektif: <span className="font-semibold">{selectedSnapshot.hariEfektif}</span></p>
                    <p>Upah Harian: <span className="font-semibold">{formatCurrency(selectedSnapshot.upahHarian)}</span></p>
                    <p>Gaji Pokok: <span className="font-semibold">{formatCurrency(selectedSnapshot.gajiPokok)}</span></p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bonus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul Bonus</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Hapus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(inputsBySalaryId[selectedSnapshot.gajiId]?.bonusItems || []).map((item, index) => (
                        <TableRow key={`bonus-${index}`}>
                          <TableCell>
                            <Input
                              value={item.judul}
                              disabled={!canEditSalary}
                              onChange={(event) =>
                                updateItem(selectedSnapshot.gajiId, "bonusItems", index, "judul", event.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={toNumber(item.nominal) === 0 ? "" : item.nominal}
                              disabled={!canEditSalary}
                              onChange={(event) =>
                                updateItem(selectedSnapshot.gajiId, "bonusItems", index, "nominal", event.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canEditSalary}
                              onClick={() => deleteItem(selectedSnapshot.gajiId, "bonusItems", index)}
                            >
                              Hapus
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" disabled={!canEditSalary} onClick={() => addItem(selectedSnapshot.gajiId, "bonusItems")}>
                    + Tambah Bonus
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Potongan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul Potongan</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Hapus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(inputsBySalaryId[selectedSnapshot.gajiId]?.potonganItems || []).map((item, index) => (
                        <TableRow key={`potongan-${index}`}>
                          <TableCell>
                            <Input
                              value={item.judul}
                              disabled={item.isDefault}
                              onChange={(event) =>
                                updateItem(selectedSnapshot.gajiId, "potonganItems", index, "judul", event.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={toNumber(item.nominal) === 0 ? "" : item.nominal}
                              disabled={!canEditSalary}
                              onChange={(event) =>
                                updateItem(selectedSnapshot.gajiId, "potonganItems", index, "nominal", event.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={item.isDefault}
                              onClick={() => deleteItem(selectedSnapshot.gajiId, "potonganItems", index)}
                            >
                              Hapus
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" onClick={() => addItem(selectedSnapshot.gajiId, "potonganItems")}>
                    + Tambah Potongan
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview Slip Live</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Gaji Pokok</span>
                    <span>{formatCurrency(selectedSnapshot.gajiPokok)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bonus</span>
                    <span>{formatCurrency(calculatedForSnapshot(selectedSnapshot).totalBonus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Potongan</span>
                    <span>{formatCurrency(calculatedForSnapshot(selectedSnapshot).totalPotongan)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Gaji Bersih</span>
                    <span>{formatCurrency(calculatedForSnapshot(selectedSnapshot).gajiBersih)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={saveInputSalary} disabled={submitting || !canEditSalary}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
