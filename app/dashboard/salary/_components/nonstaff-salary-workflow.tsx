"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import {
  attendanceAPI,
  employeeAPI,
  generateSalaryAPI,
  salaryAPI,
  setAuthToken,
  type LokasiCode,
  type CompanyFilter,
} from "@/lib/api";
import {
  exportNonStaffRekapPdf,
  exportNonStaffSlipGabunganPdf,
  type NonStaffSlipExportPayload,
} from "@/lib/salary-slip-pdf";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// Shared types and utilities
import {
  type Step,
  type SalaryItem,
  type EmployeeRow,
  type AttendanceSummary,
  type SnapshotRow,
  type GajiPeriodIndex,
  type InputState,
  type RekapPopupState,
  type CalculatedSnapshot,
  DEFAULT_POTONGAN,
  toNumber,
  buildDefaultInputState,
} from "./nonstaff-salary-shared";
import { AUTO_BONUS_JUDUL, AUTO_BONUS_NOMINAL } from "./salary-stepper-shared";
import { calcGajiBersih } from "@/lib/salary-utils";

// Extracted step / dialog / popup components
import { NonStaffStep1Review } from "./nonstaff-step1-review";
import { NonStaffStep2BonusPotongan } from "./nonstaff-step2-bonus-potongan";
import { NonStaffStep3Export } from "./nonstaff-step3-export";
import { NonStaffInputDialog } from "./nonstaff-input-dialog";
import { NonStaffRekapPopup } from "./nonstaff-rekap-popup";
import { NonStaffSignatureDialog } from "./nonstaff-signature-dialog";

/* ---------- Helper functions (stay in parent) ---------- */

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

type LokasiBreakdownItem = {
  lokasi: LokasiCode;
  hariHadir: number;
  setengahHari: number;
  lembur: number;
  hariEfektif: number;
};

function buildAttendanceSummary(
  employees: EmployeeRow[],
  attendanceRows: any[],
  startDate: string,
  endDate: string,
  companyFilter: CompanyFilter
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
    // Scope: HANYA record absensi yang lokasinya cocok dengan company terpilih
    // (selaras dengan BE generate-nonstaff-mingguan yang filter lokasi di record absensi).
    if (companyFilter && rowLokasi !== companyFilter) {
      continue;
    }
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

  return Array.from(byEmployee.values())
    // Exclude karyawan tanpa hari kerja sama sekali di company terpilih
    // (selaras dgn BE generate yang meng-exclude 0-hari dari output).
    .filter((summary) => summary.hariEfektif > 0)
    .map((summary) => {
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

/* ---------- Main component ---------- */

export function NonStaffSalaryWorkflow() {
  const { data: session, status } = useSession();

  const now = new Date();
  const [startDate, setStartDate] = useState(normalizeDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [endDate, setEndDate] = useState(normalizeDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [company, setCompany] = useState<CompanyFilter>("");

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
  const [selectedKaryawanIds, setSelectedKaryawanIds] = useState<string[]>([]);
  const [manualUpahHarian, setManualUpahHarian] = useState<Record<string, number>>({});
  const [snapshotRows, setSnapshotRows] = useState<SnapshotRow[]>([]);
  const [gajiByEmployeePeriod, setGajiByEmployeePeriod] = useState<GajiPeriodIndex>({});

  const [selectedSalaryId, setSelectedSalaryId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [inputsBySalaryId, setInputsBySalaryId] = useState<Record<string, InputState>>({});
  const [doneBySalaryId, setDoneBySalaryId] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const simpanRekapanInFlight = useRef(false);
  const [rekapPopup, setRekapPopup] = useState<RekapPopupState>({
    open: false,
    title: "",
    message: "",
    type: "loading",
  });

  const [signatures, setSignatures] = useState({
    diketahuiOleh: "SELVIE GUSTIARINI",
    dibuatOleh: "SUCI",
    catatan: "",
  });
  const [signatureSubmitted, setSignatureSubmitted] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      setAuthToken(session.accessToken);
    }
  }, [session?.accessToken, status]);

  useEffect(() => {
    if (step === 3 && !signatureSubmitted) {
      const loadSavedRekap = async () => {
        try {
          const res = await salaryAPI.getNonStaffRekap({
            periodeAwal: toApiDate(startDate),
            periodeAkhir: toApiDate(endDate),
            lokasi: company,
          });
          if (res) {
            setSignatures({
              diketahuiOleh: res.diketahuiOleh || "SELVIE GUSTIARINI",
              dibuatOleh: res.dibuatOleh || "SUCI",
              catatan: res.catatan || "",
            });
            setSignatureSubmitted(true);
          } else {
            setIsSignatureDialogOpen(true);
          }
        } catch (err) {
          console.error("Gagal memuat data rekap", err);
          setIsSignatureDialogOpen(true);
        }
      };
      loadSavedRekap();
    }
  }, [step, signatureSubmitted, startDate, endDate, company]);

  // Reset seleksi checkbox karyawan + filter divisi SETIAP kali admin berpindah
  // step (maju ke step berikutnya MAUPUN kembali ke step sebelumnya). State ini
  // hidup di parent (workflow), jadi tanpa reset ini centangan/filter dari step 1
  // masih kebawa saat admin kembali dari step 2. Reset dilakukan setelah render
  // berikutnya — seleksi yang dikonsumsi handleConfirmAndContinue (generate draft)
  // sudah terbaca sebelum setStep(2) dipanggil, jadi aman.
  // doneBySalaryId/inputsBySalaryId sengaja TIDAK direset (progress per karyawan).
  const isFirstStepRender = useRef(true);
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    setSelectedKaryawanIds([]);
    setSelectedDivisions([]);
  }, [step, setSelectedKaryawanIds, setSelectedDivisions]);

  const canEditSalary = true;

  const effectiveReviewRows = useMemo(() => {
    return reviewRows.map((row) => {
      const override = manualHariEfektif[row.karyawanId];
      const hariEfektif = override ?? row.hariEfektif;
      const upahOverride = manualUpahHarian[row.karyawanId];
      const upahHarian = upahOverride ?? row.upahHarian;
      return {
        ...row,
        hariEfektif,
        upahHarian,
        gajiPokok: Math.round(hariEfektif * upahHarian),
      };
    });
  }, [reviewRows, manualHariEfektif, manualUpahHarian]);

  const selectedSnapshot = useMemo(
    () => snapshotRows.find((row) => row.gajiId === selectedSalaryId),
    [snapshotRows, selectedSalaryId]
  );

  function calculatedForSnapshot(row: SnapshotRow): CalculatedSnapshot {
    const input = inputsBySalaryId[row.gajiId] || buildDefaultInputState();
    const totalBonus = input.bonusItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const totalPotongan = input.potonganItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const { gajiBersih, gajiBersihSebelumBulat } = calcGajiBersih(
      row.gajiPokok + totalBonus,
      totalPotongan
    );
    return {
      totalBonus,
      totalPotongan,
      gajiBersih,
      gajiBersihSebelumBulat,
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
    const latestGaji = await salaryAPI.getGajiByDateRange(startDate, endDate, undefined, undefined, company);
    const latestRows = Array.isArray(latestGaji) ? latestGaji : [];
    const selectedStart = toApiDate(startDate);
    const selectedEnd = toApiDate(endDate);

    const rowsByKaryawanId: Record<string, Array<{ id: string; periodeAwal: string; periodeAkhir: string; statusPembayaran?: string }>> = {};
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
        statusPembayaran: item.statusPembayaran || item.status_pembayaran || "",
      });
    });

    const unresolvedNames = new Set<string>();
    const skippedNoAbsensiNames = new Set<string>();
    const tasks: Array<{ name: string; promise: Promise<any> }> = [];
    const usedTaskKeys = new Set<string>();

    for (const row of rows) {
      const matches = rowsByKaryawanId[row.karyawanId] || [];
      if (matches.length === 0) {
        unresolvedNames.add(row.nama);
        continue;
      }

      for (const match of matches) {
        if (match.statusPembayaran === "Tidak Ada Absensi") {
          skippedNoAbsensiNames.add(row.nama);
          continue;
        }

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
      skippedNoAbsensiCount: skippedNoAbsensiNames.size,
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
    setSelectedKaryawanIds([]);
    setManualUpahHarian({});

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
        // Karyawan TIDAK lagi di-scope lokasiDefault (selaras dgn BE generate yang
        // memfilter di record absensi, bukan di karyawan). Exclude 0-hari dilakukan
        // di buildAttendanceSummary.
        employeeAPI.getAll(),
        attendanceAPI.getAll(company),
        salaryAPI.getGajiByDateRange(startDate, endDate, undefined, undefined, company),
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
        .filter((employee) => employee.statusKaryawan !== "NON_AKTIF" && employee.statusKaryawan !== "TIDAK_AKTIF" && employee.statusKaryawan !== "NONAKTIF")
        .filter((employee) => isNonStaff(employee))
        .filter((employee) => selectedDivisions.length === 0 || selectedDivisions.includes(employee.departemen));

      const summary = buildAttendanceSummary(
        employees,
        Array.isArray(attendanceRes) ? attendanceRes : [],
        startDate,
        endDate,
        company
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
      setMessage(`Data Non-Staff berhasil ditampilkan.`);
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
      const resText = await generateSalaryAPI.generateNonStaffMingguan(
        startDate,
        endDate,
        selectedDivisions,
        selectedKaryawanIds,
        manualUpahHarian,
        company
      );
      showToast("success", resText);

      const generated = await salaryAPI.getGajiByDateRange(startDate, endDate, undefined, undefined, company);
      const generatedRows = Array.isArray(generated) ? generated : [];
      const selectedStart = toApiDate(startDate);
      const selectedEnd = toApiDate(endDate);

      const exactRowByKaryawanId: Record<string, { id: string; periodeAwal: string; periodeAkhir: string; statusPembayaran?: string }> = {};
      const fallbackRowByKaryawanId: Record<string, { id: string; periodeAwal: string; periodeAkhir: string; statusPembayaran?: string }> = {};
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
        const statusPembayaran = row.statusPembayaran || row.status_pembayaran || "";
        if (isExactRange) {
          exactRowByKaryawanId[karyawanId] = {
            id: String(row.id),
            periodeAwal: rowStart,
            periodeAkhir: rowEnd,
            statusPembayaran,
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
            statusPembayaran,
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
            statusPembayaran: matchedRow.statusPembayaran || undefined,
          } as SnapshotRow;
        })
        .filter((row): row is SnapshotRow => row !== null);

      if (normalizedSnapshots.length === 0) {
        setError("Data gaji periode ini belum tersedia setelah proses generate draft otomatis.");
        return;
      }

      setSnapshotRows(normalizedSnapshots);
      setDoneBySalaryId({});
      setInputsBySalaryId({});
      setStep(2);

      const noAbsensiCount = normalizedSnapshots.filter((row) => row.statusPembayaran === "Tidak Ada Absensi").length;
      const normalCount = normalizedSnapshots.length - noAbsensiCount;

      let msg = `Snapshot periode tersimpan untuk ${normalCount} karyawan.`;
      if (noAbsensiCount > 0) {
        msg += ` ${noAbsensiCount} karyawan dengan status "Tidak Ada Absensi" terdeteksi (perlu dicek).`;
      }
      if (missingEmployees.length > 0) {
        msg += ` ${missingEmployees.length} karyawan belum punya data gaji periode ini.`;
      } else if (fallbackUsedCount > 0) {
        msg += ` ${fallbackUsedCount} karyawan menggunakan data gaji model harian.`;
      }
      setMessage(msg);
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
          sisaPiutang: detail?.sisaPiutang !== undefined ? detail.sisaPiutang : null,
          bayarMingguIni: detail?.piutangPlan?.bayarMingguIni ?? true,
          nominalCicilan:
            detail?.cicilanNominal != null
              ? Number(detail.cicilanNominal)
              : detail?.piutangPlan?.nominalCicilan != null
                ? Number(detail.piutangPlan.nominalCicilan)
                : detail?.piutang?.jumlahCicilan != null
                  ? Number(detail.piutang.jumlahCicilan)
                  : null,
          pakaiUangPribadi:
            detail?.piutangPlan?.pakaiUangPribadi ?? (detail?.pakaiUangPribadi || false),
          piutangInfo: detail?.piutang || null,
          piutangKonflik: Boolean(detail?.piutangKonflik),
          piutangAktifCount: Number(detail?.piutangAktifCount || 0),
        },
      }));

      if (
        bonusFromApi.length > 0 ||
        potonganFromApi.length > 0 ||
        (detail?.sisaPiutang !== undefined && detail.sisaPiutang !== null) ||
        detail?.piutang
      ) {
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

  function updatePakaiUangPribadi(salaryId: string, value: boolean) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          pakaiUangPribadi: value,
        },
      };
    });
  }

  function updateBayarMingguIni(salaryId: string, value: boolean) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          bayarMingguIni: value,
          // Skip minggu ini → reset override agar tidak nyangkut.
          nominalCicilan: value ? current.nominalCicilan : null,
        },
      };
    });
  }

  function updateNominalCicilan(salaryId: string, value: number | null) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          nominalCicilan: value,
        },
      };
    });
  }

  /** Sinkronkan item potongan "Pinjaman" dengan kontrol panel piutang:
   *  bayar + nominal > 0 → set/upsert item (nilai override, clamp di dialog),
   *  skip → hapus item. Dipakai dialog via useEffect agar tabel & preview
   *  slip selalu konsisten dengan kontrol, tidak menunggu save. */
  const upsertPinjamanItem = useCallback(
    (salaryId: string, nominal: number, present: boolean) => {
      setInputsBySalaryId((prev) => {
        const current = prev[salaryId] || buildDefaultInputState();
        const idx = current.potonganItems.findIndex(
          (i) => i.judul.toLowerCase() === "pinjaman"
        );
        let list = [...current.potonganItems];
        if (!present) {
          if (idx >= 0) list = list.filter((_, k) => k !== idx);
        } else if (idx >= 0) {
          list[idx] = { ...list[idx], nominal };
        } else {
          list = [...list, { judul: "Pinjaman", nominal }];
        }
        return {
          ...prev,
          [salaryId]: { ...current, potonganItems: list },
        };
      });
    },
    []
  );

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

  /** Tambah 1 baris bonus "kikiping" (10.000) bila belum ada; idempotent. */
  function addKikipingItem(salaryId: string) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      const exists = current.bonusItems.some(
        (item) => item.judul.toLowerCase() === AUTO_BONUS_JUDUL
      );
      if (exists) return prev;
      return {
        ...prev,
        [salaryId]: {
          ...current,
          bonusItems: [
            ...current.bonusItems,
            { judul: AUTO_BONUS_JUDUL, nominal: AUTO_BONUS_NOMINAL },
          ],
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
        sisaPiutang: inputState.sisaPiutang,
        pakaiUangPribadi: inputState.pakaiUangPribadi,
        bayarMingguIni: inputState.bayarMingguIni !== false,
        nominalCicilan: inputState.nominalCicilan ?? null,
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

  function handleMarkAllDone() {
    const nextDoneMap: Record<string, boolean> = {};
    snapshotRows.forEach((row) => {
      nextDoneMap[row.gajiId] = true;
    });
    setDoneBySalaryId(nextDoneMap);
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
            companyLocation: row.lokasiSlip || company,
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
            sisaPiutang: input.sisaPiutang,
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
            sisaPiutang: input.sisaPiutang,
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

      const activeBonusCols = new Set<string>();
      const activePotonganCols = new Set<string>();
      snapshotRows.forEach((row) => {
        const input = inputsBySalaryId[row.gajiId];
        input?.bonusItems?.forEach((item) => {
          if (item.judul.trim() && toNumber(item.nominal) > 0) activeBonusCols.add(item.judul.trim());
        });
        input?.potonganItems?.forEach((item) => {
          if (item.judul.trim() && toNumber(item.nominal) > 0) activePotonganCols.add(item.judul.trim());
        });
      });

      await exportNonStaffRekapPdf(
        rows,
        {
          location: company,
          periodLabel: formatPeriod(startDate, endDate),
          bonusColumns: Array.from(activeBonusCols),
          potonganColumns: Array.from(activePotonganCols),
          diketahuiOleh: signatures.diketahuiOleh,
          dibuatOleh: signatures.dibuatOleh,
          catatan: signatures.catatan,
        },
        `rekap-gaji-nonstaff-${startDate}_${endDate}.pdf`
      );

      const result = await salaryAPI.saveNonStaffRekap({
        periodeAwal: toApiDate(startDate),
        periodeAkhir: toApiDate(endDate),
        lokasi: company,
        diketahuiOleh: signatures.diketahuiOleh,
        dibuatOleh: signatures.dibuatOleh,
        catatan: signatures.catatan,
        gajiIds: snapshotRows.map((r) => r.gajiId),
      });

      let msg = `Export rekap selesai. Berhasil: ${result.successCount}, `;
      if (result.skippedNoAbsensiCount > 0) {
        msg += `Tanpa Absensi dilewati: ${result.skippedNoAbsensiCount}, `;
      }
      setMessage(msg);
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

    if (!window.confirm("Apakah Anda yakin ingin memproses rekapan dan menandai gaji periode ini sebagai Terbayar? Tindakan ini akan memotong piutang aktif secara permanen dan tidak dapat dibatalkan.")) {
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

      const result = await salaryAPI.saveNonStaffRekap({
        periodeAwal: toApiDate(startDate),
        periodeAkhir: toApiDate(endDate),
        lokasi: company,
        diketahuiOleh: signatures.diketahuiOleh,
        dibuatOleh: signatures.dibuatOleh,
        catatan: signatures.catatan,
        gajiIds: snapshotRows.map((r) => r.gajiId),
        // Plan cicilan piutang per karyawan (override nominal, skip, uang
        // pribadi) dari dialog Fase 2 — dieksekusi FINAL di endpoint rekap.
        piutangPlans: snapshotRows.map((r) => {
          const input = inputsBySalaryId[r.gajiId] || buildDefaultInputState();
          return {
            gajiId: r.gajiId,
            bayarMingguIni: input.bayarMingguIni !== false,
            nominalCicilan: input.nominalCicilan ?? null,
            pakaiUangPribadi: Boolean(input.pakaiUangPribadi),
          };
        }),
      });

      let msg = `Status pembayaran berhasil diperbarui untuk ${result.successCount} data. `;
      if (result.skippedNoAbsensiCount > 0) {
        msg += `${result.skippedNoAbsensiCount} data dengan status "Tidak Ada Absensi" dilewati. `;
      }
      if (result.totalPinjamanDipotong != null && result.totalPinjamanDipotong > 0) {
        msg += `Potongan pinjaman periode ini: ${formatCurrency(result.totalPinjamanDipotong)}. `;
      }

      setMessage(
        `Rekapan diproses. Berhasil: ${result.successCount}, ` +
          (result.skippedNoAbsensiCount > 0 ? `Tanpa Absensi dilewati: ${result.skippedNoAbsensiCount}` : "")
      );
      setSnapshotRows((prev) =>
        prev.map((row) => {
          if ((row.statusPembayaran || "").toLowerCase() !== "tidak ada absensi") {
            return { ...row, statusPembayaran: "Dibayar" };
          }
          return row;
        })
      );
      setRekapPopup({
        open: true,
        title: "Berhasil",
        message: msg,
        type: "success",
      });
    } catch (saveErr) {
      console.error(saveErr);
      const detailMsg = getErrorText(saveErr);
      setError(detailMsg);
      setRekapPopup({
        open: true,
        title: "Gagal Menyimpan",
        message: detailMsg || "Terjadi kendala saat update status pembayaran. Silakan coba lagi.",
        type: "error",
      });
    } finally {
      simpanRekapanInFlight.current = false;
      setSubmitting(false);
    }
  }

  const divisionSummary = useMemo(() => {
    const summaryMap = new Map<string, number>();
    for (const row of snapshotRows) {
      const calc = calculatedForSnapshot(row);
      summaryMap.set(row.divisi, (summaryMap.get(row.divisi) || 0) + calc.gajiBersih);
    }
    return Array.from(summaryMap.entries()).map(([divisi, total]) => ({ divisi, total }));
  }, [snapshotRows, inputsBySalaryId]);

  if (status === "loading") {
    return <div className="p-6 text-sm">Memuat sesi...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gaji Non-Staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Periode aktif: <span className="font-semibold text-foreground">{formatPeriod(startDate, endDate)}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {[
              { id: 1, label: "Review Data", desc: "Periksa absensi" },
              { id: 2, label: "Input Bonus & Potongan", desc: "Sesuaikan gaji" },
              { id: 3, label: "Finalisasi & Export", desc: "Simpan & cetak" }
            ].map((s, i, arr) => {
              const active = step === s.id;
              const done = completedStep >= s.id;
              const clickable = done || active;
              
              return (
                <div key={s.id} className="flex items-center w-full">
                  <button
                    type="button"
                    onClick={() => {
                      if (!clickable) return;
                      setStep(s.id as Step);
                    }}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 ${
                      active ? "bg-primary/10 border border-primary/20 shadow-sm" : 
                      done ? "hover:bg-accent border border-transparent cursor-pointer" : 
                      "opacity-50 cursor-not-allowed border border-transparent"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${
                      active ? "bg-primary text-primary-foreground shadow-sm" :
                      done ? "bg-success text-success-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {done && !active ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>{s.label}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{s.desc}</p>
                    </div>
                  </button>
                  {i < arr.length - 1 && (
                    <ArrowRight className="hidden md:block mx-2 text-muted-foreground/30 w-5 h-5 shrink-0" />
                  )}
                </div>
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
                ? "bg-secondary text-secondary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <NonStaffRekapPopup rekapPopup={rekapPopup} setRekapPopup={setRekapPopup} />

      {step === 1 && (
        <NonStaffStep1Review
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          selectedDivisions={selectedDivisions}
          setSelectedDivisions={setSelectedDivisions}
          loading={loading}
          effectiveReviewRows={effectiveReviewRows}
          manualHariEfektif={manualHariEfektif}
          setManualHariEfektif={setManualHariEfektif}
          selectedKaryawanIds={selectedKaryawanIds}
          setSelectedKaryawanIds={setSelectedKaryawanIds}
          manualUpahHarian={manualUpahHarian}
          setManualUpahHarian={setManualUpahHarian}
          savingHariEfektifByKaryawanId={savingHariEfektifByKaryawanId}
          canEditSalary={canEditSalary}
          submitting={submitting}
          company={company}
          onCompanyChange={setCompany}
          handleShowData={handleShowData}
          handleHariEfektifBlur={handleHariEfektifBlur}
          handleConfirmAndContinue={handleConfirmAndContinue}
        />
      )}

      {step === 2 ? (
        <NonStaffStep2BonusPotongan
          snapshotRows={snapshotRows}
          inputsBySalaryId={inputsBySalaryId}
          doneBySalaryId={doneBySalaryId}
          calculatedForSnapshot={calculatedForSnapshot}
          openInputDialog={openInputDialog}
          allDone={allDone}
          setStep={setStep}
          onMarkAllDone={handleMarkAllDone}
        />
      ) : null}

      {step === 3 ? (
        <NonStaffStep3Export
          snapshotRows={snapshotRows}
          calculatedForSnapshot={calculatedForSnapshot}
          divisionSummary={divisionSummary}
          submitting={submitting}
          handleExportSlipGabungan={handleExportSlipGabungan}
          handleExportRekapSemua={handleExportRekapSemua}
          handleSimpanRekapan={handleSimpanRekapan}
          signatures={signatures}
          onEditSignatures={() => setIsSignatureDialogOpen(true)}
          inputsBySalaryId={inputsBySalaryId}
        />
      ) : null}

      <NonStaffInputDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedSnapshot={selectedSnapshot}
        startDate={startDate}
        endDate={endDate}
        inputsBySalaryId={inputsBySalaryId}
        canEditSalary={canEditSalary}
        calculatedForSnapshot={calculatedForSnapshot}
        updateItem={updateItem}
        updatePakaiUangPribadi={updatePakaiUangPribadi}
        updateBayarMingguIni={updateBayarMingguIni}
        updateNominalCicilan={updateNominalCicilan}
        upsertPinjamanItem={upsertPinjamanItem}
        addItem={addItem}
        deleteItem={deleteItem}
        addKikipingItem={addKikipingItem}
        submitting={submitting}
        saveInputSalary={saveInputSalary}
      />

      <NonStaffSignatureDialog
        isOpen={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        signatures={signatures}
        onSave={(vals) => {
          setSignatures(vals);
          setSignatureSubmitted(true);
        }}
        onCancel={() => {
          setIsSignatureDialogOpen(false);
          setStep(2);
        }}
      />

    </div>
  );
}
