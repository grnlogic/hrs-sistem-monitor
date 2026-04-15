"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
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
import { attendanceAPI, employeeAPI, generateSalaryAPI, salaryAPI, setAuthToken } from "@/lib/api";
import { exportSalaryRecapPdf, exportSalarySlipsPdf, type SalarySlipPayload } from "@/lib/salary-slip-pdf";
import { formatCurrency } from "@/lib/utils";

type PageType = "staff" | "nonstaff";
type Step = 1 | 2 | 3;
type WorkflowStatus = "DRAFT" | "GENERATED" | "INPUT_DONE" | "EXPORTED";

type EmployeeRow = {
  id: string;
  namaLengkap: string;
  departemen: string;
  statusKaryawan: string;
  gajiPerBulan: number;
  gajiPerHari: number;
  bpjsGabunganNominal?: number;
  lokasiKerja?: string;
};

type SalaryRow = {
  id: string;
  karyawanId: string;
  nama: string;
  divisi: string;
  statusKaryawan: string;
  gajiPokok: number;
  lokasiKerja?: string;
};

type AttendanceSummary = {
  hadir: number;
  setengahHari: number;
  lembur: number;
  lokasiCount?: Record<"PJP" | "SP" | "PRIMA", number>;
};

type SalaryItem = {
  id?: string;
  judul: string;
  nominal: number;
  isDefault?: boolean;
};

type SalaryInputState = {
  bonusItems: SalaryItem[];
  potonganItems: SalaryItem[];
  // TODO: integrasi PKB akan ditambahkan
  bonusPKB: number | null;
};

const fixedBonusTemplate: SalaryItem[] = [{ judul: "Bonus", nominal: 0, isDefault: true }];

const fixedPotonganTemplate: SalaryItem[] = [
  { judul: "Pinjaman", nominal: 0, isDefault: true },
  { judul: "Sumbangan", nominal: 0, isDefault: true },
  { judul: "BPJS", nominal: 0, isDefault: true },
  { judul: "Undangan", nominal: 0, isDefault: true },
  { judul: "Warung", nominal: 0, isDefault: true },
];

function buildDefaultInputState(): SalaryInputState {
  return {
    bonusItems: fixedBonusTemplate.map((item) => ({ ...item })),
    potonganItems: fixedPotonganTemplate.map((item) => ({ ...item })),
    bonusPKB: null,
  };
}

const monthOptions = [
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

function toNumber(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

export function SalaryStepperDashboard({ pageType }: { pageType: PageType }) {
  const { data: session, status } = useSession();
  const role = session?.user?.role || "HRD";

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

  const canGenerate = role === "HRD";
  const canPhase2Action = role === "AKUNTANSI";
  const canPhase3Action = role === "AKUNTANSI";
  const phase2ReadOnly = role === "HRD";

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
      const mappedEmployees: EmployeeRow[] = (Array.isArray(employeeRes) ? employeeRes : []).map((row: any) => ({
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
      }));
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
        if (role === "AKUNTANSI") setActiveStep(3);
      } else {
        setWorkflowStatus("GENERATED");
        if (role === "AKUNTANSI") {
          setActiveStep(2);
        }
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
  }, [status, session?.accessToken, pageType, periodDependency, role, inputDoneBySalaryId]);

  async function handleGenerate() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (!canGenerate) {
        throw new Error("Hanya role HRD yang bisa generate.");
      }

      if (pageType === "staff") {
        await generateSalaryAPI.generateStaffBulanan(monthPeriod);
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

      const normalizedBonus = fixedBonusTemplate.map((base) => {
        const existing = bonusItemsFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
        return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
      });

      const normalizedPotongan = fixedPotonganTemplate.map((base) => {
        const existing = potonganItemsFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
        return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
      });

      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.id]: {
          bonusItems: normalizedBonus,
          potonganItems: normalizedPotongan,
          bonusPKB: null,
        },
      }));

      if (bonusItemsFromApi.length > 0 || potonganItemsFromApi.length > 0) {
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

  function calculatedRow(row: SalaryRow) {
    const inputState = inputsBySalaryId[row.id] || buildDefaultInputState();
    const totalBonus = inputState.bonusItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const totalPotongan = inputState.potonganItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);

    if (pageType === "staff") {
      const gajiBersih = row.gajiPokok + totalBonus - totalPotongan;
      return {
        hariEfektif: undefined as number | undefined,
        upahHarian: undefined as number | undefined,
        tunjanganItems: [] as SalaryItem[],
        gajiPokok: row.gajiPokok,
        totalBonus,
        totalPotongan,
        gajiBersih,
      };
    }

    const employee = employees.find((item) => item.id === row.karyawanId);
    const summary = attendanceFor(row.karyawanId);
    const hariEfektif = summary.hadir + summary.setengahHari * 0.5 + summary.lembur;
    const upahHarian = toNumber(employee?.gajiPerHari);
    const gajiPokok = Math.round(hariEfektif * upahHarian);
    const blending = (employee?.departemen || "").toLowerCase().includes("blending") ? summary.hadir * 3000 : 0;
    const tunjanganItems: SalaryItem[] = blending > 0 ? [{ judul: "Tunjangan Blending", nominal: blending }] : [];
    const gajiBersih = gajiPokok + blending + totalBonus - totalPotongan;

    return {
      hariEfektif,
      upahHarian,
      tunjanganItems,
      gajiPokok,
      totalBonus,
      totalPotongan,
      gajiBersih,
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
    if (workflowStatus === "INPUT_DONE" && role === "AKUNTANSI") {
      setActiveStep(3);
    }
  }, [workflowStatus, role]);

  if (status === "loading") {
    return <div className="p-6 text-sm">Memuat sesi...</div>;
  }

  return (
    <div className="space-y-6 p-6 text-slate-900">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold">
          {pageType === "staff" ? "Gaji Staff" : "Gaji Non-Staff"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Status periode: <span className="font-semibold">{workflowStatus}</span> | Periode: <span className="font-semibold">{periodLabel}</span>
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[1, 2, 3].map((step) => {
            const done = activeStep > step || (step === 3 && workflowStatus === "EXPORTED");
            const active = activeStep === step;
            return (
              <button
                key={step}
                type="button"
                className="border-b border-slate-200 pb-2 text-left"
                onClick={() => setActiveStep(step as Step)}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className={active ? "font-bold" : "font-medium text-slate-600"}>
                    {done ? "✓" : `${step}.`} {step === 1 ? "Generate" : step === 2 ? "Input Bonus & Potongan" : "Export"}
                  </span>
                </div>
                {active && <div className="mt-1 h-0.5 w-24 bg-slate-900" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</div>}

      {activeStep === 1 && (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Fase 1. Generate</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {pageType === "staff" ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Bulan</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Tahun</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Dari Tanggal</label>
                <Input
                  type="date"
                  value={nonStaffStartDate}
                  onChange={(e) => setNonStaffStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Sampai Tanggal</label>
                <Input
                  type="date"
                  value={nonStaffEndDate}
                  onChange={(e) => setNonStaffEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Divisi</TableHead>
                {pageType === "staff" ? (
                  <>
                    <TableHead>Status Karyawan</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Upah Harian</TableHead>
                    <TableHead>Hari Hadir</TableHead>
                    <TableHead>Setengah Hari</TableHead>
                    <TableHead>Lembur</TableHead>
                    <TableHead>Estimasi Gaji</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={pageType === "staff" ? 4 : 8}>Memuat data...</TableCell>
                </TableRow>
              )}
              {!loading && estimatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={pageType === "staff" ? 4 : 8}>Tidak ada data karyawan.</TableCell>
                </TableRow>
              )}
              {!loading &&
                estimatedRows.map((row) => {
                  if (pageType === "staff") {
                    return (
                      <TableRow key={row.karyawanId}>
                        <TableCell>{row.nama}</TableCell>
                        <TableCell>{row.divisi}</TableCell>
                        <TableCell>{"statusKaryawan" in row ? row.statusKaryawan : "-"}</TableCell>
                        <TableCell>{formatCurrency(row.gajiPokok)}</TableCell>
                      </TableRow>
                    );
                  }

                  const employee = employees.find((item) => item.id === row.karyawanId);
                  const summary = attendanceFor(row.karyawanId);
                  const canEdit = role === "HRD" && workflowStatus === "DRAFT";

                  return (
                    <TableRow key={row.karyawanId}>
                      <TableCell>{row.nama}</TableCell>
                      <TableCell>{row.divisi}</TableCell>
                      <TableCell>{formatCurrency(toNumber(employee?.gajiPerHari))}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          className="h-8 w-20"
                          value={summary.hadir}
                          onChange={(e) =>
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [row.karyawanId]: { ...summary, hadir: toNumber(e.target.value) },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          className="h-8 w-20"
                          value={summary.setengahHari}
                          onChange={(e) =>
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [row.karyawanId]: { ...summary, setengahHari: toNumber(e.target.value) },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          className="h-8 w-20"
                          value={summary.lembur}
                          onChange={(e) =>
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [row.karyawanId]: { ...summary, lembur: toNumber(e.target.value) },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(toNumber(row.gajiPokok))}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleGenerate} disabled={!canGenerate || submitting}>
            {submitting ? "Memproses..." : "Generate"}
          </Button>
        </div>
      </section>
      )}

      {activeStep === 2 && (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Fase 2. Input Bonus & Potongan</h2>

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Divisi</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Status Input</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>Belum ada data generate untuk periode ini.</TableCell>
                </TableRow>
              )}
              {generatedRows.map((row) => {
                const calc = calculatedRow(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.nama}</TableCell>
                    <TableCell>{row.divisi}</TableCell>
                    <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                    <TableCell>
                      {inputDoneBySalaryId[row.id] ? <Badge>Selesai</Badge> : <Badge variant="secondary">Belum</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openInputDialog(row)}>
                        {phase2ReadOnly ? "Lihat" : "Input"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {allInputDone && (
          <div className="mt-4">
            <Button variant="outline" disabled={!canPhase2Action} onClick={() => setActiveStep(3)}>
              Lanjut ke Export
            </Button>
          </div>
        )}
      </section>
      )}

      {activeStep === 3 && (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Fase 3. Export PDF</h2>

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Divisi</TableHead>
                {pageType === "nonstaff" && <TableHead>Hari Efektif</TableHead>}
                {pageType === "nonstaff" && <TableHead>Upah Harian</TableHead>}
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Total Bonus</TableHead>
                <TableHead>Total Potongan</TableHead>
                <TableHead>Gaji Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={pageType === "staff" ? 6 : 8}>Belum ada data untuk export.</TableCell>
                </TableRow>
              )}
              {generatedRows.map((row) => {
                const calc = calculatedRow(row);
                return (
                  <TableRow key={`rekap-${row.id}`}>
                    <TableCell>{row.nama}</TableCell>
                    <TableCell>{row.divisi}</TableCell>
                    {pageType === "nonstaff" && <TableCell>{calc.hariEfektif ?? "-"}</TableCell>}
                    {pageType === "nonstaff" && <TableCell>{calc.upahHarian ? formatCurrency(calc.upahHarian) : "-"}</TableCell>}
                    <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                    <TableCell>{formatCurrency(calc.totalBonus)}</TableCell>
                    <TableCell>{formatCurrency(calc.totalPotongan)}</TableCell>
                    <TableCell>{formatCurrency(calc.gajiBersih)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" disabled={!canPhase3Action || generatedRows.length === 0} onClick={exportSlipsPerKaryawan}>
            Export Slip Gabungan (15 per halaman)
          </Button>
          <Button variant="outline" disabled={!canPhase3Action || generatedRows.length === 0} onClick={exportRekapSemua}>
            Export Rekap Semua
          </Button>
        </div>
      </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSalary?.nama} - {selectedSalary?.divisi} - {periodLabel}
            </DialogTitle>
            <DialogDescription>Input bonus dan potongan.</DialogDescription>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-4">
              {pageType === "nonstaff" && (
                <div className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium">Ringkasan Kehadiran</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                    <p>Hari Hadir: <span className="font-semibold">{attendanceFor(selectedSalary.karyawanId).hadir}</span></p>
                    <p>Setengah Hari: <span className="font-semibold">{attendanceFor(selectedSalary.karyawanId).setengahHari}</span></p>
                    <p>Lembur: <span className="font-semibold">{attendanceFor(selectedSalary.karyawanId).lembur}</span></p>
                    <p>Hari Efektif: <span className="font-semibold">{calculatedRow(selectedSalary).hariEfektif ?? 0}</span></p>
                    <p>Upah Harian: <span className="font-semibold">{formatCurrency(calculatedRow(selectedSalary).upahHarian || 0)}</span></p>
                    <p>Gaji Pokok: <span className="font-semibold">{formatCurrency(calculatedRow(selectedSalary).gajiPokok)}</span></p>
                    {(selectedSalary.divisi || "").toLowerCase().includes("blending") && (
                      <p>
                        Tunjangan Blending: <span className="font-semibold">
                          {formatCurrency(
                            calculatedRow(selectedSalary).tunjanganItems.reduce((sum, item) => sum + item.nominal, 0)
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 block text-sm text-slate-700">Bonus PKB (Segera Hadir)</label>
                    <Input disabled value="-" />
                  </div>
                </div>
              )}

              <div className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium">Bonus</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen</TableHead>
                      <TableHead>Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inputsBySalaryId[selectedSalary.id]?.bonusItems || []).map((item, index) => (
                      <TableRow key={`bonus-${index}`}>
                        <TableCell>
                          <p className="font-medium text-slate-700">{item.judul}</p>
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={phase2ReadOnly}
                            type="number"
                            min={0}
                            value={item.nominal}
                            onChange={(e) => updateItem(selectedSalary.id, "bonusItems", index, "nominal", e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium">Potongan</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen</TableHead>
                      <TableHead>Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inputsBySalaryId[selectedSalary.id]?.potonganItems || []).map((item, index) => (
                      <TableRow key={`potongan-${index}`}>
                        <TableCell>
                          <p className="font-medium text-slate-700">{item.judul}</p>
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={phase2ReadOnly}
                            type="number"
                            min={0}
                            value={item.nominal}
                            onChange={(e) => updateItem(selectedSalary.id, "potonganItems", index, "nominal", e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-medium">Preview Slip</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Gaji Pokok</span>
                    <span>{formatCurrency(calculatedRow(selectedSalary).gajiPokok)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bonus</span>
                    <span>{formatCurrency(calculatedRow(selectedSalary).totalBonus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Potongan</span>
                    <span>{formatCurrency(calculatedRow(selectedSalary).totalPotongan)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span>Gaji Bersih</span>
                    <span>{formatCurrency(calculatedRow(selectedSalary).gajiBersih)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={saveInputSalary} disabled={!canPhase2Action || submitting}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
