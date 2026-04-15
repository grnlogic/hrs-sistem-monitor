"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card";
import { Input } from "@/components/ui/form/input";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
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
  lokasiKerja?: string;
};

type SalaryRow = {
  id: string;
  karyawanId: string;
  nama: string;
  divisi: string;
  statusKaryawan: string;
  gajiPokok: number;
  periodeAwal?: string;
  periodeAkhir?: string;
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
  // TODO: akan diisi dari data PKB nanti (tabel pkb)
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

function isStaffEmployee(row: EmployeeRow): boolean {
  const status = (row.statusKaryawan || "").toLowerCase();
  const divisi = (row.departemen || "").toLowerCase();
  if (status.includes("staff")) return true;
  if (row.gajiPerBulan > 0 && row.gajiPerHari <= 0) return true;
  return divisi.includes("staff");
}

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

function monthToRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function monthLabel(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function stepTitle(step: Step): string {
  if (step === 1) return "Fase 1 - Generate";
  if (step === 2) return "Fase 2 - Input Bonus & Potongan";
  return "Fase 3 - Export PDF";
}

export function SalaryStepperPage({ pageType }: { pageType: PageType }) {
  const { data: session, status } = useSession();
  const role = session?.user?.role || "HRD";
  const [activeStep, setActiveStep] = useState<Step>(1);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("DRAFT");
  const [monthPeriod, setMonthPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [generatedRows, setGeneratedRows] = useState<SalaryRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceSummary>>({});
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceSummary>>({});
  const [inputsBySalaryId, setInputsBySalaryId] = useState<Record<string, SalaryInputState>>({});
  const [inputDoneBySalaryId, setInputDoneBySalaryId] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSalaryId, setSelectedSalaryId] = useState<string>("");

  const selectedSalary = useMemo(
    () => generatedRows.find((row) => row.id === selectedSalaryId),
    [generatedRows, selectedSalaryId]
  );

  const candidateEmployees = useMemo(() => {
    return employees.filter((row) => {
      const isStaff = isStaffEmployee(row);
      return pageType === "staff" ? isStaff : !isStaff;
    });
  }, [employees, pageType]);

  const phase2ReadOnly = role === "HRD";
  const canGenerate = role === "HRD";
  const canEditPhase2 = role === "AKUNTANSI";
  const canExport = role === "AKUNTANSI";

  const periodRange = useMemo(() => monthToRange(monthPeriod), [monthPeriod]);

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      setAuthToken(session.accessToken);
    }
  }, [session?.accessToken, status]);

  const effectiveAttendanceFor = (karyawanId: string): AttendanceSummary => {
    return attendanceOverrides[karyawanId] || attendanceMap[karyawanId] || { hadir: 0, setengahHari: 0, lembur: 0 };
  };

  const lokasiForSalary = (row: SalaryRow): "PJP" | "SP" | "PRIMA" => {
    const fromAttendance = effectiveAttendanceFor(row.karyawanId).lokasiCount;
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
  };

  const nonStaffGajiPokok = (employee: EmployeeRow): number => {
    const summary = effectiveAttendanceFor(employee.id);
    const hariEfektif = summary.hadir + summary.setengahHari * 0.5 + summary.lembur;
    return Math.round(hariEfektif * employee.gajiPerHari);
  };

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
      const summary = effectiveAttendanceFor(employee.id);
      return {
        karyawanId: employee.id,
        nama: employee.namaLengkap,
        divisi: employee.departemen,
        statusKaryawan: employee.statusKaryawan,
        gajiPokok: nonStaffGajiPokok(employee),
        hadir: summary.hadir,
        setengahHari: summary.setengahHari,
        lembur: summary.lembur,
      };
    });
  }, [candidateEmployees, pageType, attendanceOverrides, attendanceMap]);

  async function loadEmployeesAndAttendance() {
    setLoading(true);
    setError("");

    try {
      // Tabel Prisma yang dipakai via API backend:
      // - `karyawan`: master karyawan + departemen + status_karyawan + gaji_per_bulan/gaji_per_hari + lokasi_kerja
      // - `absensi`: sumber hitung hadir/setengah_hari/lembur untuk non-staff
      const employeeRes = await employeeAPI.getAll();
      const mappedEmployees: EmployeeRow[] = (Array.isArray(employeeRes) ? employeeRes : []).map((row: any) => ({
        id: String(row.id),
        namaLengkap: row.namaLengkap || row.nama_lengkap || "-",
        departemen: row.departemen || "-",
        statusKaryawan: row.statusKaryawan || row.status_karyawan || "-",
        gajiPerBulan: toNumber(row.gajiPerBulan ?? row.gaji_per_bulan),
        gajiPerHari: toNumber(row.gajiPerHari ?? row.gaji_per_hari),
        lokasiKerja: row.lokasiKerja || row.lokasi_kerja || "",
      }));
      setEmployees(mappedEmployees);

      if (pageType === "nonstaff") {
        const attendanceRes = await attendanceAPI.getAll();
        const rangeStart = new Date(periodRange.startDate);
        const rangeEnd = new Date(periodRange.endDate);

        const summary: Record<string, AttendanceSummary> = {};

        (Array.isArray(attendanceRes) ? attendanceRes : []).forEach((row: any) => {
          const tanggal = new Date(row.tanggal || row.date);
          if (tanggal < rangeStart || tanggal > rangeEnd) return;

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
    } catch (loadErr) {
      setError("Gagal memuat data karyawan/absensi.");
      console.error(loadErr);
    } finally {
      setLoading(false);
    }
  }

  async function loadGeneratedRows() {
    try {
      // Tabel Prisma yang dipakai via API backend:
      // - `gaji`: data periode gaji hasil generate
      // - `gaji_bonus` & `gaji_potongan`: dipakai di fase input detail
      const rows = await salaryAPI.getGajiByDateRange(periodRange.startDate, periodRange.endDate);
      const mapped: SalaryRow[] = (Array.isArray(rows) ? rows : [])
        .filter((row: any) => {
          const departemen = String(row.karyawan?.departemen || "").toLowerCase();
          const status = String(row.karyawan?.statusKaryawan || row.karyawan?.status_karyawan || "").toLowerCase();
          if (pageType === "staff") {
            return departemen.includes("staff") || status.includes("staff");
          }
          return !departemen.includes("staff") && !status.includes("staff");
        })
        .map((row: any) => ({
          id: String(row.id),
          karyawanId: String(row.karyawan?.id || row.karyawanId),
          nama: resolveEmployeeName(row),
          divisi: row.karyawan?.departemen || "-",
          statusKaryawan: row.karyawan?.statusKaryawan || row.karyawan?.status_karyawan || "-",
          gajiPokok: toNumber(row.gajiPokok || row.gaji_pokok),
          periodeAwal: row.periodeAwal,
          periodeAkhir: row.periodeAkhir,
          lokasiKerja: row.karyawan?.lokasiKerja || row.karyawan?.lokasi_kerja || "",
        }));

      setGeneratedRows(mapped);

      if (mapped.length > 0) {
        setWorkflowStatus((current) => (current === "EXPORTED" ? "EXPORTED" : "GENERATED"));
        if (role === "AKUNTANSI") {
          setActiveStep(2);
        }
      } else {
        setWorkflowStatus("DRAFT");
        setActiveStep(1);
      }
    } catch (loadErr) {
      console.error(loadErr);
      setError("Gagal memuat data generate gaji.");
    }
  }

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      loadEmployeesAndAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken, monthPeriod, pageType]);

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      loadGeneratedRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken, monthPeriod, pageType, role]);

  async function handleGenerate() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (!canGenerate) {
        throw new Error("Hanya HRD yang bisa generate.");
      }

      if (pageType === "staff") {
        await generateSalaryAPI.generateStaffBulanan(monthPeriod);
      } else {
        await generateSalaryAPI.generateNonStaffMingguan(periodRange.startDate, periodRange.endDate);
      }

      await loadGeneratedRows();
      setWorkflowStatus("GENERATED");
      setActiveStep(2);
      setMessage(`Generate ${pageType === "staff" ? "Gaji Staff" : "Gaji Non-Staff"} berhasil.`);
    } catch (generateErr) {
      const msg = generateErr instanceof Error ? generateErr.message : "Generate gagal.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function openInputDialog(row: SalaryRow) {
    setSelectedSalaryId(row.id);
    setDialogOpen(true);
    setError("");

    if (inputsBySalaryId[row.id]) return;

    try {
      const detail = await salaryAPI.getBonusPotonganDetail(row.id);
      const bonusFromApi: SalaryItem[] = Array.isArray(detail?.bonusItems)
        ? detail.bonusItems.map((item: any) => ({
            id: item.id ? String(item.id) : undefined,
            judul: item.judul || "Bonus",
            nominal: toNumber(item.nominal),
          }))
        : [];

      const potonganFromApi: SalaryItem[] = Array.isArray(detail?.potonganItems)
        ? detail.potonganItems.map((item: any) => ({
            id: item.id ? String(item.id) : undefined,
            judul: item.judul || "Potongan",
            nominal: toNumber(item.nominal),
          }))
        : [];

      const normalizedBonus = fixedBonusTemplate.map((base) => {
        const existing = bonusFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
        return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
      });

      const normalizedPotongan = fixedPotonganTemplate.map((base) => {
        const existing = potonganFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
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

      if (bonusFromApi.length > 0 || potonganFromApi.length > 0) {
        setInputDoneBySalaryId((prev) => ({ ...prev, [row.id]: true }));
      }
    } catch (detailErr) {
      console.error(detailErr);
      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.id]: buildDefaultInputState(),
      }));
    }
  }

  function updateItem(
    salaryId: string,
    type: "bonusItems" | "potonganItems",
    index: number,
    key: "judul" | "nominal",
    value: string
  ) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      const nextList = [...current[type]];
      const nextItem = { ...nextList[index] };
      if (key === "judul") {
        nextItem.judul = value;
      } else {
        nextItem.nominal = toNumber(value);
      }
      nextList[index] = nextItem;
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [type]: nextList,
        },
      };
    });
  }

  function addItem(salaryId: string, type: "bonusItems" | "potonganItems") {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [type]: [...current[type], { judul: "", nominal: 0, isDefault: false }],
        },
      };
    });
  }

  function removeItem(salaryId: string, type: "bonusItems" | "potonganItems", index: number) {
    setInputsBySalaryId((prev) => {
      const current = prev[salaryId] || buildDefaultInputState();
      if (type === "potonganItems" && current.potonganItems[index]?.isDefault) {
        return prev;
      }
      const next = current[type].filter((_, idx) => idx !== index);
      return {
        ...prev,
        [salaryId]: {
          ...current,
          [type]: next,
        },
      };
    });
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
      setMessage(`Input bonus & potongan tersimpan untuk ${selectedSalary.nama}.`);

      const allDone = generatedRows.every((row) => row.id === selectedSalary.id || inputDoneBySalaryId[row.id]);
      if (allDone) {
        setWorkflowStatus("INPUT_DONE");
      }
    } catch (saveErr) {
      console.error(saveErr);
      setError("Gagal menyimpan bonus dan potongan.");
    } finally {
      setSubmitting(false);
    }
  }

  function getCalculatedRow(row: SalaryRow) {
    const inputState = inputsBySalaryId[row.id] || buildDefaultInputState();
    const totalBonus = inputState.bonusItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const totalPotongan = inputState.potonganItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);

    if (pageType === "staff") {
      const gajiBersih = row.gajiPokok + totalBonus - totalPotongan;
      return {
        gajiPokok: row.gajiPokok,
        totalBonus,
        totalPotongan,
        gajiBersih,
        hariEfektif: undefined as number | undefined,
        upahHarian: undefined as number | undefined,
        tunjanganItems: [] as SalaryItem[],
      };
    }

    const employee = employees.find((emp) => emp.id === row.karyawanId);
    const attendance = effectiveAttendanceFor(row.karyawanId);
    const hariEfektif = attendance.hadir + attendance.setengahHari * 0.5 + attendance.lembur;
    const upahHarian = toNumber(employee?.gajiPerHari);
    const gajiPokok = Math.round(hariEfektif * upahHarian);
    const blending = (employee?.departemen || "").toLowerCase().includes("blending")
      ? attendance.hadir * 3000
      : 0;

    const tunjanganItems: SalaryItem[] = blending > 0 ? [{ judul: "Tunjangan Blending", nominal: blending }] : [];
    const gajiBersih = gajiPokok + blending + totalBonus - totalPotongan;

    return {
      gajiPokok,
      totalBonus,
      totalPotongan,
      gajiBersih,
      hariEfektif,
      upahHarian,
      tunjanganItems,
    };
  }

  async function exportSingle(row: SalaryRow) {
    const detail = inputsBySalaryId[row.id] || buildDefaultInputState();
    const calc = getCalculatedRow(row);

    const payload: SalarySlipPayload = {
      employeeName: row.nama,
      division: row.divisi,
      status: pageType === "staff" ? "Staff" : "Non-Staff",
      periodLabel: monthLabel(monthPeriod),
      location: lokasiForSalary(row),
      hariEfektif: calc.hariEfektif,
      upahHarian: calc.upahHarian,
      gajiPokok: calc.gajiPokok,
      tunjangan: calc.tunjanganItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
      bonusItems: detail.bonusItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
      potonganItems: detail.potonganItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
    };

    await exportSalarySlipsPdf([payload], `slip-${pageType}-${row.nama.replace(/\s+/g, "-")}-${monthPeriod}.pdf`);
    setWorkflowStatus("EXPORTED");
  }

  async function exportAll() {
    const payloads: SalarySlipPayload[] = generatedRows.map((row) => {
      const detail = inputsBySalaryId[row.id] || buildDefaultInputState();
      const calc = getCalculatedRow(row);
      return {
        employeeName: row.nama,
        division: row.divisi,
        status: pageType === "staff" ? "Staff" : "Non-Staff",
        periodLabel: monthLabel(monthPeriod),
        location: lokasiForSalary(row),
        hariEfektif: calc.hariEfektif,
        upahHarian: calc.upahHarian,
        gajiPokok: calc.gajiPokok,
        tunjangan: calc.tunjanganItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
        bonusItems: detail.bonusItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
        potonganItems: detail.potonganItems.map((item) => ({ label: item.judul, nominal: item.nominal })),
      };
    });

    await exportSalarySlipsPdf(payloads, `slip-${pageType}-${monthPeriod}.pdf`);

    const recapRows = generatedRows.map((row) => {
      const calc = getCalculatedRow(row);
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
      recapRows,
      `Rekap Gaji ${pageType === "staff" ? "Staff" : "Non-Staff"} - ${monthLabel(monthPeriod)}`,
      `rekap-${pageType}-${monthPeriod}.pdf`
    );

    setWorkflowStatus("EXPORTED");
    setMessage("Export slip dan rekap selesai.");
  }

  const allInputDone = generatedRows.length > 0 && generatedRows.every((row) => inputDoneBySalaryId[row.id]);

  useEffect(() => {
    if (workflowStatus === "INPUT_DONE" && canExport) {
      setActiveStep(3);
    }
  }, [workflowStatus, canExport]);

  if (status === "loading") {
    return <div className="p-6">Memuat sesi...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {pageType === "staff" ? "Penggajian Staff" : "Penggajian Non-Staff"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Status periode: <span className="font-semibold">{workflowStatus}</span> | Periode: <span className="font-semibold">{monthLabel(monthPeriod)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Role aktif: {role}. Fase 1 hanya HRD, fase 2 dan 3 hanya Akuntansi (HRD tetap bisa melihat read-only).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stepper 3 Fase</CardTitle>
          <CardDescription>{stepTitle(activeStep)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`rounded-md border p-3 text-sm ${activeStep === step ? "border-primary bg-primary/10" : "border-border"}`}
              >
                <p className="font-semibold">Fase {step}</p>
                <p className="text-muted-foreground">
                  {step === 1 ? "Generate" : step === 2 ? "Input Bonus & Potongan" : "Export PDF"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fase 1 - Generate ({pageType === "staff" ? "HRD" : "HRD + Koreksi Absensi"})</CardTitle>
          <CardDescription>
            Pilih bulan dan tahun, cek data kandidat, lalu generate untuk membuka fase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <label className="mb-2 block text-sm">Periode Bulan/Tahun</label>
            <Input type="month" value={monthPeriod} onChange={(e) => setMonthPeriod(e.target.value)} />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Divisi</TableHead>
                {pageType === "staff" ? (
                  <>
                    <TableHead>Status</TableHead>
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
                  <TableCell colSpan={pageType === "staff" ? 4 : 8}>Tidak ada data karyawan untuk kategori ini.</TableCell>
                </TableRow>
              )}
              {!loading &&
                estimatedRows.map((row) => {
                  if (pageType === "staff") {
                    return (
                      <TableRow key={row.karyawanId}>
                        <TableCell>{row.nama}</TableCell>
                        <TableCell>{row.divisi}</TableCell>
                        <TableCell>{row.statusKaryawan}</TableCell>
                        <TableCell>{formatCurrency(row.gajiPokok)}</TableCell>
                      </TableRow>
                    );
                  }

                  const employee = employees.find((item) => item.id === row.karyawanId);
                  const summary = effectiveAttendanceFor(row.karyawanId);
                  const canEditCorrection = role === "HRD" && workflowStatus === "DRAFT";

                  return (
                    <TableRow key={row.karyawanId}>
                      <TableCell>{row.nama}</TableCell>
                      <TableCell>{row.divisi}</TableCell>
                      <TableCell>{formatCurrency(toNumber(employee?.gajiPerHari))}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEditCorrection}
                          value={summary.hadir}
                          onChange={(e) =>
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [row.karyawanId]: {
                                ...summary,
                                hadir: toNumber(e.target.value),
                              },
                            }))
                          }
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEditCorrection}
                          value={summary.setengahHari}
                          onChange={(e) =>
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [row.karyawanId]: {
                                ...summary,
                                setengahHari: toNumber(e.target.value),
                              },
                            }))
                          }
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEditCorrection}
                          value={summary.lembur}
                          onChange={(e) =>
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [row.karyawanId]: {
                                ...summary,
                                lembur: toNumber(e.target.value),
                              },
                            }))
                          }
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(toNumber(row.gajiPokok))}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          <div className="flex items-center gap-3">
            <Button disabled={!canGenerate || submitting} onClick={handleGenerate}>
              {submitting ? "Memproses..." : pageType === "staff" ? "Generate Gaji Staff" : "Generate Gaji Non-Staff"}
            </Button>
            {!canGenerate && <p className="text-xs text-muted-foreground">Hanya HRD yang dapat generate.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fase 2 - Input Bonus & Potongan (Akuntansi)</CardTitle>
          <CardDescription>
            Akuntansi melakukan input per karyawan. HRD tetap dapat melihat dalam mode read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                const calc = getCalculatedRow(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.nama}</TableCell>
                    <TableCell>{row.divisi}</TableCell>
                    <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                    <TableCell>
                      {inputDoneBySalaryId[row.id] ? <Badge>Sudah Diinput</Badge> : <Badge variant="secondary">Belum</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInputDialog(row)}
                      >
                        {phase2ReadOnly ? "Lihat" : "Input"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {allInputDone && canExport && (
            <Button onClick={() => setActiveStep(3)}>Lanjut ke Export</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fase 3 - Export PDF</CardTitle>
          <CardDescription>
              Export slip gabungan (15 per halaman, horizontal auto-fit) dan rekap semua data periode aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={pageType === "staff" ? 7 : 9}>Belum ada data untuk diexport.</TableCell>
                </TableRow>
              )}
              {generatedRows.map((row) => {
                const calc = getCalculatedRow(row);
                return (
                  <TableRow key={`export-${row.id}`}>
                    <TableCell>{row.nama}</TableCell>
                    <TableCell>{row.divisi}</TableCell>
                    {pageType === "nonstaff" && <TableCell>{calc.hariEfektif ?? "-"}</TableCell>}
                    {pageType === "nonstaff" && <TableCell>{calc.upahHarian ? formatCurrency(calc.upahHarian) : "-"}</TableCell>}
                    <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                    <TableCell>{formatCurrency(calc.totalBonus)}</TableCell>
                    <TableCell>{formatCurrency(calc.totalPotongan)}</TableCell>
                    <TableCell>{formatCurrency(calc.gajiBersih)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => exportSingle(row)} disabled={!canExport}>
                        Export Slip Gabungan (15 per halaman)
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Button onClick={exportAll} disabled={!canExport || generatedRows.length === 0}>
            Export Rekap Semua
          </Button>
          {!canExport && <p className="text-xs text-muted-foreground">Fase export hanya untuk Akuntansi.</p>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Input Bonus & Potongan</DialogTitle>
            <DialogDescription>
              {selectedSalary?.nama} - {selectedSalary?.divisi} - {monthLabel(monthPeriod)}
            </DialogDescription>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Nama</p>
                  <p className="font-semibold">{selectedSalary.nama}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Divisi</p>
                  <p className="font-semibold">{selectedSalary.divisi}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Periode</p>
                  <p className="font-semibold">{monthLabel(monthPeriod)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gaji Pokok</p>
                  <p className="font-semibold">{formatCurrency(getCalculatedRow(selectedSalary).gajiPokok)}</p>
                </div>
              </div>

              {pageType === "nonstaff" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ringkasan Absensi Non-Staff</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Hari Hadir</p>
                      <p className="font-semibold">{effectiveAttendanceFor(selectedSalary.karyawanId).hadir}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Setengah Hari</p>
                      <p className="font-semibold">{effectiveAttendanceFor(selectedSalary.karyawanId).setengahHari}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lembur</p>
                      <p className="font-semibold">{effectiveAttendanceFor(selectedSalary.karyawanId).lembur}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hari Efektif</p>
                      <p className="font-semibold">{getCalculatedRow(selectedSalary).hariEfektif ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Upah Harian</p>
                      <p className="font-semibold">{formatCurrency(getCalculatedRow(selectedSalary).upahHarian || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tunjangan Blending</p>
                      <p className="font-semibold">
                        {formatCurrency(
                          getCalculatedRow(selectedSalary).tunjanganItems.reduce((sum, item) => sum + item.nominal, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bonus PKB</p>
                      <Input value="Segera Hadir" disabled />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bonus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Potongan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Komponen</TableHead>
                        <TableHead>Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(inputsBySalaryId[selectedSalary.id]?.potonganItems || []).map((item, index) => (
                        <TableRow key={`pot-${index}`}>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview Slip Live (Template Fixed)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                    <div className="border-b border-slate-200 pb-2 text-center">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Slip Gaji</p>
                      <p className="text-base font-semibold text-slate-900">{selectedSalary.nama}</p>
                      <p className="text-xs text-slate-500">{monthLabel(monthPeriod)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1 text-xs sm:text-sm">
                      <span className="text-slate-600">Nama</span>
                      <span className="text-right font-medium">{selectedSalary.nama}</span>
                      <span className="text-slate-600">Absensi</span>
                      <span className="text-right font-medium">-</span>
                      <span className="text-slate-600">Gaji Pokok</span>
                      <span className="text-right font-medium">{formatCurrency(getCalculatedRow(selectedSalary).gajiPokok)}</span>
                      <span className="text-slate-600">Bonus</span>
                      <span className="text-right font-medium">{formatCurrency(getCalculatedRow(selectedSalary).totalBonus)}</span>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Potongan</p>
                      <div className="space-y-1 text-xs sm:text-sm">
                        {(inputsBySalaryId[selectedSalary.id]?.potonganItems || []).map((item) => (
                          <div key={item.judul} className="flex items-center justify-between">
                            <span className="text-slate-600">{item.judul}</span>
                            <span className="font-medium text-slate-800">{formatCurrency(item.nominal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
                        <span>Jumlah Potongan</span>
                        <span>{formatCurrency(getCalculatedRow(selectedSalary).totalPotongan)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                      <span>TOTAL</span>
                      <span>{formatCurrency(getCalculatedRow(selectedSalary).gajiBersih)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Tutup
            </Button>
            <Button disabled={!canEditPhase2 || submitting} onClick={saveInputSalary}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
