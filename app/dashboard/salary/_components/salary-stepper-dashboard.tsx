"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { attendanceAPI, employeeAPI, generateSalaryAPI, salaryAPI, setAuthToken } from "@/lib/api";
import { exportSalaryRecapPdf, exportSalarySlipsPdf, type SalarySlipPayload } from "@/lib/salary-slip-pdf";

// Shared types and utilities
import {
  type PageType,
  type Step,
  type WorkflowStatus,
  type EmployeeRow,
  type SalaryRow,
  type AttendanceSummary,
  type SalaryItem,
  type SalaryInputState,
  type EstimatedRow,
  type CalculatedRow,
  fixedBonusTemplate,
  AUTO_BONUS_JUDUL,
  AUTO_BONUS_NOMINAL,
  fixedPotonganTemplate,
  monthOptions,
  toNumber,
  buildDefaultInputState,
} from "./salary-stepper-shared";
import { calcGajiBersih } from "@/lib/salary-utils";

// Extracted step / dialog components
import { StaffStep1Generate } from "./staff-step1-generate";
import { StaffStep2BonusPotongan } from "./staff-step2-bonus-potongan";
import { StaffStep3Export } from "./staff-step3-export";
import { StaffInputDialog } from "./staff-input-dialog";

/* ---------- Helper functions (stay in parent) ---------- */

function resolveEmployeeName(row: any): string {
  const directName = row?.karyawan?.namaLengkap || row?.karyawan?.nama_lengkap || row?.nama || row?.namaLengkap;
  if (typeof directName === "string" && directName.trim()) {
    return directName.trim();
  }

  const encryptedName = row?.karyawan?.namaLengkapEncrypted || row?.karyawan?.nama_lengkap_encrypted;
  if (typeof encryptedName === "string" && encryptedName.trim()) {
    try {
      const decoded = window.atob(encryptedName);
      if (decoded.trim()) {
        return decoded.trim();
      }
    } catch {
      // Ignore invalid base64 and keep fallback.
    }
  }

  return "-";
}

function isStaffEmployee(row: EmployeeRow): boolean {
  const status = (row.statusKaryawan || "").toLowerCase();
  const divisi = (row.departemen || "").toLowerCase();
  if (status.includes("staff")) return true;
  if (row.gajiPerBulan > 0 && row.gajiPerHari <= 0) return true;
  return divisi.includes("staff");
}

function monthLabel(monthPeriod: string): string {
  const [year, month] = monthPeriod.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function rangeFromMonth(monthPeriod: string) {
  const [year, month] = monthPeriod.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function parseIsoDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function hasFirstWeekDayInRange(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end || end < start) return false;

  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getDate() <= 7) return true;
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}

/* ---------- Main component ---------- */

export function SalaryStepperDashboard({ pageType }: { pageType: PageType }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      setAuthToken(session.accessToken);
    }
  }, [session?.accessToken, status]);

  const now = new Date();
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDayCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [nonStaffStartDate, setNonStaffStartDate] = useState(firstDayCurrentMonth);
  const [nonStaffEndDate, setNonStaffEndDate] = useState(lastDayCurrentMonth);
  const monthPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const periodRange = useMemo(() => {
    if (pageType === "nonstaff") {
      return {
        startDate: nonStaffStartDate,
        endDate: nonStaffEndDate,
      };
    }

    return rangeFromMonth(monthPeriod);
  }, [pageType, monthPeriod, nonStaffStartDate, nonStaffEndDate]);

  const periodLabel = useMemo(() => {
    if (pageType === "nonstaff") {
      return `${nonStaffStartDate} s/d ${nonStaffEndDate}`;
    }

    return monthLabel(monthPeriod);
  }, [pageType, monthPeriod, nonStaffStartDate, nonStaffEndDate]);

  const periodSlug = useMemo(() => {
    if (pageType === "nonstaff") {
      return `${nonStaffStartDate}_${nonStaffEndDate}`;
    }

    return monthPeriod;
  }, [pageType, monthPeriod, nonStaffStartDate, nonStaffEndDate]);

  const periodDependency = pageType === "staff" ? monthPeriod : `${nonStaffStartDate}|${nonStaffEndDate}`;
  const shouldApplyBpjsThisPeriod = useMemo(
    () => pageType === "nonstaff" && hasFirstWeekDayInRange(nonStaffStartDate, nonStaffEndDate),
    [pageType, nonStaffStartDate, nonStaffEndDate]
  );

  const [activeStep, setActiveStep] = useState<Step>(1);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("DRAFT");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [generatedRows, setGeneratedRows] = useState<SalaryRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceSummary>>({});
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceSummary>>({});

  const [inputsBySalaryId, setInputsBySalaryId] = useState<Record<string, SalaryInputState>>({});
  const [inputDoneBySalaryId, setInputDoneBySalaryId] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSalaryId, setSelectedSalaryId] = useState("");

  const canGenerate = true;
  const canPhase2Action = true;
  const canPhase3Action = true;
  const phase2ReadOnly = false;

  const selectedSalary = useMemo(
    () => generatedRows.find((row) => row.id === selectedSalaryId),
    [generatedRows, selectedSalaryId]
  );

  const candidateEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const isStaff = isStaffEmployee(employee);
      return pageType === "staff" ? isStaff : !isStaff;
    });
  }, [employees, pageType]);

  const years = useMemo(() => {
    const start = now.getFullYear() - 2;
    return Array.from({ length: 6 }, (_, i) => start + i);
  }, [now]);

  function attendanceFor(karyawanId: string): AttendanceSummary {
    return attendanceOverrides[karyawanId] || attendanceMap[karyawanId] || { hadir: 0, setengahHari: 0, lembur: 0 };
  }

  function lokasiForSalary(row: SalaryRow): "PJP" | "SP" | "PRIMA" {
    const fromAttendance = attendanceFor(row.karyawanId).lokasiCount;
    if (fromAttendance) {
      const ranked = (Object.entries(fromAttendance) as Array<["PJP" | "SP" | "PRIMA", number]>).sort(
        (a, b) => b[1] - a[1]
      );
      if (ranked[0] && ranked[0][1] > 0) return ranked[0][0];
    }

    const fromRow = String(row.lokasiKerja || "").toUpperCase();
    if (fromRow === "SP" || fromRow === "PRIMA" || fromRow === "PJP") {
      return fromRow as "PJP" | "SP" | "PRIMA";
    }

    const fromSession = String(session?.user?.lokasi || "").toUpperCase();
    if (fromSession === "SP" || fromSession === "PRIMA" || fromSession === "PJP") {
      return fromSession as "PJP" | "SP" | "PRIMA";
    }

    return "PJP";
  }

  function nonStaffBaseSalary(employee: EmployeeRow): number {
    const summary = attendanceFor(employee.id);
    const hariEfektif = summary.hadir + summary.setengahHari * 0.5 + summary.lembur;
    return Math.round(hariEfektif * employee.gajiPerHari);
  }

  const estimatedRows = useMemo(() => {
    if (pageType === "staff") {
      return candidateEmployees.map((employee) => ({
        karyawanId: employee.id,
        nama: employee.namaLengkap,
        divisi: employee.departemen,
        statusKaryawan: employee.statusKaryawan,
        gajiPokok: employee.gajiPerBulan,
      }));
    }

    return candidateEmployees.map((employee) => {
      const summary = attendanceFor(employee.id);
      return {
        karyawanId: employee.id,
        nama: employee.namaLengkap,
        divisi: employee.departemen,
        gajiPokok: nonStaffBaseSalary(employee),
        hadir: summary.hadir,
        setengahHari: summary.setengahHari,
        lembur: summary.lembur,
      };
    });
  }, [candidateEmployees, pageType, attendanceMap, attendanceOverrides]);

  async function loadEmployeesAndAttendance() {
    setLoading(true);
    setError("");

    try {
      const employeeRes = await employeeAPI.getAll();
      const mappedEmployees: EmployeeRow[] = (Array.isArray(employeeRes) ? employeeRes : [])
        .map((row: any) => ({
          id: String(row.id),
          namaLengkap: row.namaLengkap || row.nama_lengkap || "-",
          departemen: row.departemen || "-",
          statusKaryawan: row.statusKaryawan || row.status_karyawan || "-",
          gajiPerBulan: toNumber(row.gajiPerBulan ?? row.gaji_per_bulan),
          gajiPerHari: toNumber(row.gajiPerHari ?? row.gaji_per_hari),
          bpjsGabunganNominal:
            toNumber(row.bpjsKesehatan ?? row.bpjs_kesehatan) +
            toNumber(row.bpjsKetenagakerjaan ?? row.bpjs_ketenagakerjaan),
          lokasiKerja: row.lokasiKerja || row.lokasi_kerja || "",
        }))
        .filter((emp) => emp.statusKaryawan !== "NON_AKTIF" && emp.statusKaryawan !== "TIDAK_AKTIF" && emp.statusKaryawan !== "NONAKTIF");
      setEmployees(mappedEmployees);

      if (pageType === "nonstaff") {
        const attendanceRes = await attendanceAPI.getAll();
        const start = new Date(periodRange.startDate);
        const end = new Date(periodRange.endDate);
        const summary: Record<string, AttendanceSummary> = {};

        (Array.isArray(attendanceRes) ? attendanceRes : []).forEach((row: any) => {
          const tanggal = new Date(row.tanggal || row.date);
          if (tanggal < start || tanggal > end) return;

          const karyawanId = String(row.karyawanId || row.karyawan?.id || "");
          if (!karyawanId) return;

          if (!summary[karyawanId]) {
            summary[karyawanId] = {
              hadir: 0,
              setengahHari: 0,
              lembur: 0,
              lokasiCount: { PJP: 0, SP: 0, PRIMA: 0 },
            };
          }

          const lokasiRaw = String(row.lokasi || row.location || "").toUpperCase();
          if (lokasiRaw === "PJP" || lokasiRaw === "SP" || lokasiRaw === "PRIMA") {
            summary[karyawanId].lokasiCount![lokasiRaw] += 1;
          }

          const normalizedStatus = String(row.status || "").toUpperCase();
          if (normalizedStatus === "SETENGAH_HARI") {
            summary[karyawanId].setengahHari += 1;
          } else if (normalizedStatus === "HADIR") {
            summary[karyawanId].hadir += 1;
          }

          if (Boolean(row.isLembur)) {
            summary[karyawanId].lembur += 1;
          }
        });

        setAttendanceMap(summary);
      }
    } catch (err) {
      setError("Gagal memuat data karyawan/absensi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGeneratedRows() {
    try {
      const rows = await salaryAPI.getGajiByDateRange(periodRange.startDate, periodRange.endDate);
      const mapped: SalaryRow[] = (Array.isArray(rows) ? rows : [])
        .filter((row: any) => {
          const departemen = String(row.karyawan?.departemen || "").toLowerCase();
          const statusKaryawan = String(row.karyawan?.statusKaryawan || row.karyawan?.status_karyawan || "").toLowerCase();
          if (pageType === "staff") {
            return departemen.includes("staff") || statusKaryawan.includes("staff");
          }
          return !departemen.includes("staff") && !statusKaryawan.includes("staff");
        })
        .map((row: any) => ({
          id: String(row.id),
          karyawanId: String(row.karyawan?.id || row.karyawanId),
          nama: resolveEmployeeName(row),
          divisi: row.karyawan?.departemen || "-",
          statusKaryawan: row.karyawan?.statusKaryawan || row.karyawan?.status_karyawan || "-",
          gajiPokok: toNumber(row.gajiPokok || row.gaji_pokok),
          lokasiKerja: row.karyawan?.lokasiKerja || row.karyawan?.lokasi_kerja || "",
        }));

      setGeneratedRows(mapped);

      if (mapped.length === 0) {
        setWorkflowStatus("DRAFT");
        setActiveStep(1);
        return;
      }

      const allDone = mapped.length > 0 && mapped.every((row) => inputDoneBySalaryId[row.id]);
      if (allDone) {
        setWorkflowStatus("INPUT_DONE");
        setActiveStep(3);
      } else {
        setWorkflowStatus("GENERATED");
        setActiveStep(2);
      }
    } catch (err) {
      setError("Gagal memuat data generate gaji.");
      console.error(err);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      loadEmployeesAndAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken, pageType, periodDependency]);

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      loadGeneratedRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken, pageType, periodDependency, inputDoneBySalaryId]);

  async function handleGenerate(selectedDivisions?: string[]) {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (pageType === "staff") {
        await generateSalaryAPI.generateStaffBulanan(monthPeriod, selectedDivisions);
      } else {
        if (!nonStaffStartDate || !nonStaffEndDate) {
          throw new Error("Tanggal mulai dan tanggal akhir wajib diisi.");
        }

        if (new Date(nonStaffEndDate) < new Date(nonStaffStartDate)) {
          throw new Error("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai.");
        }

        await generateSalaryAPI.generateNonStaffMingguan(periodRange.startDate, periodRange.endDate);
      }

      setWorkflowStatus("GENERATED");
      setActiveStep(2);
      setMessage("Generate berhasil. Periode berpindah ke GENERATED.");
      await loadGeneratedRows();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Generate gagal.";
      setError(text);
    } finally {
      setSubmitting(false);
    }
  }

  async function openInputDialog(row: SalaryRow) {
    setSelectedSalaryId(row.id);
    setDialogOpen(true);

    if (inputsBySalaryId[row.id]) return;

    try {
      const detail = await salaryAPI.getBonusPotonganDetail(row.id);

      const bonusItemsFromApi: SalaryItem[] = Array.isArray(detail?.bonusItems)
        ? detail.bonusItems.map((item: any) => ({
            id: item.id ? String(item.id) : undefined,
            judul: item.judul || "",
            nominal: toNumber(item.nominal),
          }))
        : [];

      const potonganItemsFromApi: SalaryItem[] = Array.isArray(detail?.potonganItems)
        ? detail.potonganItems.map((item: any) => ({
            id: item.id ? String(item.id) : undefined,
            judul: item.judul || "",
            nominal: toNumber(item.nominal),
            isDefault: Boolean(item.isDefault),
          }))
        : [];

      const templateBonusNames = fixedBonusTemplate.map((base) => base.judul.toLowerCase());
      const normalizedBonus = [
        ...fixedBonusTemplate.map((base) => {
          const existing = bonusItemsFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
          return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
        }),
        ...bonusItemsFromApi.filter((item) => !templateBonusNames.includes(item.judul.toLowerCase())),
      ];

      const templatePotonganNames = fixedPotonganTemplate.map((base) => base.judul.toLowerCase());
      const normalizedPotongan = [
        ...fixedPotonganTemplate.map((base) => {
          const existing = potonganItemsFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
          return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
        }),
        ...potonganItemsFromApi.filter((item) => !templatePotonganNames.includes(item.judul.toLowerCase())),
      ];

      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.id]: {
          bonusItems: normalizedBonus,
          potonganItems: normalizedPotongan,
          bonusPKB: null,
          sisaPiutang: detail?.sisaPiutang !== undefined ? detail.sisaPiutang : null,
        },
      }));

      if (bonusItemsFromApi.length > 0 || potonganItemsFromApi.length > 0 || (detail?.sisaPiutang !== undefined && detail.sisaPiutang !== null)) {
        setInputDoneBySalaryId((prev) => ({ ...prev, [row.id]: true }));
      }
    } catch (err) {
      console.error(err);
      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.id]: buildDefaultInputState(),
      }));
    }
  }

  function updateItem(
    salaryId: string,
    kind: "bonusItems" | "potonganItems",
    index: number,
    key: "judul" | "nominal",
    value: string
  ) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      const list = [...current[kind]];
      const updated = { ...list[index] };
      if (key === "judul") {
        updated.judul = value;
      } else {
        updated.nominal = toNumber(value);
      }
      list[index] = updated;

      return {
        ...prev,
        [salaryId]: {
          ...current,
          [kind]: list,
        },
      };
    });
  }

  function addItem(salaryId: string, kind: "bonusItems" | "potonganItems") {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [kind]: [...current[kind], { judul: "", nominal: 0 }],
        },
      };
    });
  }

  function deleteItem(salaryId: string, kind: "bonusItems" | "potonganItems", index: number) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      const list = current[kind].filter((_, i) => i !== index);
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [kind]: list,
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

  function updateSisaPiutang(salaryId: string, value: number | null) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          sisaPiutang: value,
        },
      };
    });
  }

  function calculatedRow(row: SalaryRow): CalculatedRow {
    const inputState = inputsBySalaryId[row.id] || buildDefaultInputState();
    const totalBonus = inputState.bonusItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const totalPotongan = inputState.potonganItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);

    if (pageType === "staff") {
      const { gajiBersih, gajiBersihSebelumBulat } = calcGajiBersih(
        row.gajiPokok + totalBonus,
        totalPotongan
      );
      return {
        hariEfektif: undefined as number | undefined,
        upahHarian: undefined as number | undefined,
        tunjanganItems: [] as SalaryItem[],
        gajiPokok: row.gajiPokok,
        totalBonus,
        totalPotongan,
        gajiBersih,
        gajiBersihSebelumBulat,
      };
    }

    const employee = employees.find((item) => item.id === row.karyawanId);
    const summary = attendanceFor(row.karyawanId);
    const hariEfektif = summary.hadir + summary.setengahHari * 0.5 + summary.lembur;
    const upahHarian = toNumber(employee?.gajiPerHari);
    const gajiPokok = Math.round(hariEfektif * upahHarian);
    const blending = (employee?.departemen || "").toLowerCase().includes("blending") ? summary.hadir * 3000 : 0;
    const tunjanganItems: SalaryItem[] = blending > 0 ? [{ judul: "Tunjangan Blending", nominal: blending }] : [];
    const { gajiBersih, gajiBersihSebelumBulat } = calcGajiBersih(
      gajiPokok + blending + totalBonus,
      totalPotongan
    );

    return {
      hariEfektif,
      upahHarian,
      tunjanganItems,
      gajiPokok,
      totalBonus,
      totalPotongan,
      gajiBersih,
      gajiBersihSebelumBulat,
    };
  }

  async function saveInputSalary() {
    if (!selectedSalary) return;

    try {
      setSubmitting(true);
      const detail = inputsBySalaryId[selectedSalary.id];
      if (!detail) return;

      await salaryAPI.saveBonusPotongan({
        gajiId: selectedSalary.id,
        karyawanId: selectedSalary.karyawanId,
        bonusItems: detail.bonusItems.filter((item) => item.judul.trim()),
        potonganItems: detail.potonganItems.filter((item) => item.judul.trim()),
        sisaPiutang: detail.sisaPiutang,
      });

      setInputDoneBySalaryId((prev) => ({ ...prev, [selectedSalary.id]: true }));
      setMessage(`Input untuk ${selectedSalary.nama} tersimpan.`);

      const allDone = generatedRows.every((row) => row.id === selectedSalary.id || inputDoneBySalaryId[row.id]);
      if (allDone) {
        setWorkflowStatus("INPUT_DONE");
      }

      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan input bonus dan potongan.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleMarkAllDone() {
    const nextDoneMap: Record<string, boolean> = {};
    generatedRows.forEach((row) => {
      nextDoneMap[row.id] = true;
    });
    setInputDoneBySalaryId(nextDoneMap);
    setWorkflowStatus("INPUT_DONE");
  }

  async function exportSlipsPerKaryawan() {
    if (!canPhase3Action) return;

    const payloads: SalarySlipPayload[] = generatedRows.map((row) => {
      const detail = inputsBySalaryId[row.id] || buildDefaultInputState();
      const calc = calculatedRow(row);
      return {
        employeeName: row.nama,
        division: row.divisi,
        status: pageType === "staff" ? "Staff" : "Non-Staff",
        periodLabel,
        location: lokasiForSalary(row),
        hariEfektif: calc.hariEfektif,
        upahHarian: calc.upahHarian,
        gajiPokok: calc.gajiPokok,
        tunjangan: calc.tunjanganItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
        bonusItems: detail.bonusItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
        potonganItems: detail.potonganItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
        sisaPiutang: detail.sisaPiutang,
      };
    });

    await exportSalarySlipsPdf(payloads, `slip-${pageType}-${periodSlug}.pdf`);
    setWorkflowStatus("EXPORTED");
    setMessage("Export slip gabungan selesai (15 per halaman, horizontal auto-fit).");
  }

  async function exportRekapSemua() {
    if (!canPhase3Action) return;

    const rows = generatedRows.map((row) => {
      const calc = calculatedRow(row);
      return {
        nama: row.nama,
        divisi: row.divisi,
        hariEfektif: calc.hariEfektif,
        upahHarian: calc.upahHarian,
        gajiPokok: calc.gajiPokok,
        totalBonus: calc.totalBonus,
        totalPotongan: calc.totalPotongan,
        gajiBersih: calc.gajiBersih,
      };
    });

    await exportSalaryRecapPdf(
      rows,
      `Rekap Gaji ${pageType === "staff" ? "Staff" : "Non-Staff"} - ${periodLabel}`,
      `rekap-${pageType}-${periodSlug}.pdf`
    );

    setWorkflowStatus("EXPORTED");
    setMessage("Export rekap semua selesai.");
  }

  const allInputDone = generatedRows.length > 0 && generatedRows.every((row) => inputDoneBySalaryId[row.id]);

  useEffect(() => {
    if (workflowStatus === "INPUT_DONE") {
      setActiveStep(3);
    }
  }, [workflowStatus]);

  if (status === "loading") {
    return <div className="p-6 text-sm">Memuat sesi...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg border bg-card p-4">
        <h1 className="text-xl font-semibold">
          {pageType === "staff" ? "Gaji Staff" : "Gaji Non-Staff"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status periode: <span className="font-semibold">{workflowStatus}</span> | Periode: <span className="font-semibold">{periodLabel}</span>
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {[
            { id: 1, label: "Generate", desc: "Tarik data absensi" },
            { id: 2, label: "Input Bonus & Potongan", desc: "Sesuaikan gaji" },
            { id: 3, label: "Export PDF", desc: "Cetak slip & rekap" }
          ].map((s, i, arr) => {
            const stepId = s.id as Step;
            const done = activeStep > stepId || (stepId === 3 && workflowStatus === "EXPORTED");
            const active = activeStep === stepId;
            const clickable = done || active;
            return (
              <div key={s.id} className="flex items-center w-full">
                <button
                  type="button"
                  onClick={() => { if (clickable) setActiveStep(stepId); }}
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
                  <ArrowRight className="hidden md:block mx-2 text-muted-foreground/40 w-5 h-5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <div className="rounded-lg border bg-card p-3 text-sm text-destructive">{error}</div>}
      {message && <div className="rounded-lg border bg-card p-3 text-sm text-foreground">{message}</div>}

      {activeStep === 1 && (
        <StaffStep1Generate
          pageType={pageType}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          nonStaffStartDate={nonStaffStartDate}
          setNonStaffStartDate={setNonStaffStartDate}
          nonStaffEndDate={nonStaffEndDate}
          setNonStaffEndDate={setNonStaffEndDate}
          years={years}
          loading={loading}
          estimatedRows={estimatedRows}
          employees={employees}
          attendanceFor={attendanceFor}
          setAttendanceOverrides={setAttendanceOverrides}
          workflowStatus={workflowStatus}
          canGenerate={canGenerate}
          submitting={submitting}
          handleGenerate={handleGenerate}
        />
      )}

      {activeStep === 2 && (
        <StaffStep2BonusPotongan
          generatedRows={generatedRows}
          inputDoneBySalaryId={inputDoneBySalaryId}
          calculatedRow={calculatedRow}
          openInputDialog={openInputDialog}
          phase2ReadOnly={phase2ReadOnly}
          canPhase2Action={canPhase2Action}
          allInputDone={allInputDone}
          setActiveStep={setActiveStep}
          onMarkAllDone={handleMarkAllDone}
        />
      )}

      {activeStep === 3 && (
        <StaffStep3Export
          pageType={pageType}
          generatedRows={generatedRows}
          calculatedRow={calculatedRow}
          canPhase3Action={canPhase3Action}
          exportSlipsPerKaryawan={exportSlipsPerKaryawan}
          exportRekapSemua={exportRekapSemua}
        />
      )}

      <StaffInputDialog
        pageType={pageType}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedSalary={selectedSalary}
        periodLabel={periodLabel}
        inputsBySalaryId={inputsBySalaryId}
        attendanceFor={attendanceFor}
        calculatedRow={calculatedRow}
        updateItem={updateItem}
        addItem={addItem}
        deleteItem={deleteItem}
        addKikipingItem={addKikipingItem}
        updateSisaPiutang={updateSisaPiutang}
        phase2ReadOnly={phase2ReadOnly}
        canPhase2Action={canPhase2Action}
        submitting={submitting}
        saveInputSalary={saveInputSalary}
      />
    </div>
  );
}
