"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { attendanceAPI, employeeAPI, generateSalaryAPI, salaryAPI, setAuthToken, type CompanyFilter } from "@/lib/api";
import {
  exportSalarySlipsPdf,
  exportStaffRekapPdf,
  getStaffRekapBlob,
  getStaffSlipGabunganBlob,
  type SalarySlipPayload,
} from "@/lib/salary-slip-pdf";
import { calcGajiBersih } from "@/lib/salary-utils";
import {
  getDefaultCurrentMonthRange,
  getMaxOneMonthEndDate,
  parseDateOnlyUtc,
} from "@/lib/staff-salary-utils";

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
  type CalculatedRow,
  fixedBonusTemplate,
  fixedPotonganTemplate,
  toNumber,
  buildDefaultInputState,
} from "./salary-stepper-shared";
import type { RekapPopupState } from "./nonstaff-salary-shared";

// Extracted step / dialog components
import { StaffStep1Generate } from "./staff-step1-generate";
import { StaffStep2BonusPotongan } from "./staff-step2-bonus-potongan";
import { StaffStep3Export } from "./staff-step3-export";
import { StaffInputDialog } from "./staff-input-dialog";
import { StaffSignatureDialog, type StaffSignatures } from "./staff-signature-dialog";
import { NonStaffPreviewPdfDialog } from "./nonstaff-preview-pdf-dialog";
import { NonStaffRekapPopup } from "./nonstaff-rekap-popup";

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

function formatStaffDateLabel(dateString: string): string {
  const parsed = parseDateOnlyUtc(dateString);
  if (!parsed) return dateString || "-";
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function normalizeJsonItems(raw: unknown): SalaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({
      id: item?.id ? String(item.id) : undefined,
      judul: String(item?.judul ?? item?.nama ?? item?.label ?? "").trim(),
      nominal: toNumber(item?.nominal),
      isDefault: Boolean(item?.isDefault),
    }))
    .filter((item) => item.judul.length > 0);
}

/* ---------- Main component ---------- */

export function SalaryStepperDashboard({ pageType }: { pageType: PageType }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      setAuthToken(session.accessToken);
    }
  }, [session?.accessToken, status]);

  const defaultMonthRange = useMemo(() => getDefaultCurrentMonthRange(), []);
  const [staffStartDate, setStaffStartDate] = useState(defaultMonthRange.startDate);
  const [staffEndDate, setStaffEndDate] = useState(defaultMonthRange.endDate);
  const [nonStaffStartDate, setNonStaffStartDate] = useState(defaultMonthRange.startDate);
  const [nonStaffEndDate, setNonStaffEndDate] = useState(defaultMonthRange.endDate);
  const [company, setCompany] = useState<CompanyFilter>("");

  const periodRange = useMemo(() => {
    if (pageType === "nonstaff") {
      return {
        startDate: nonStaffStartDate,
        endDate: nonStaffEndDate,
      };
    }

    return {
      startDate: staffStartDate,
      endDate: staffEndDate,
    };
  }, [pageType, staffStartDate, staffEndDate, nonStaffStartDate, nonStaffEndDate]);

  const periodLabel = useMemo(() => {
    if (pageType === "nonstaff") {
      return `${nonStaffStartDate} s/d ${nonStaffEndDate}`;
    }

    return `${formatStaffDateLabel(staffStartDate)} s/d ${formatStaffDateLabel(staffEndDate)}`;
  }, [pageType, staffStartDate, staffEndDate, nonStaffStartDate, nonStaffEndDate]);

  const periodSlug = useMemo(() => {
    if (pageType === "nonstaff") {
      return `${nonStaffStartDate}_${nonStaffEndDate}`;
    }

    return `${staffStartDate}_${staffEndDate}`;
  }, [pageType, staffStartDate, staffEndDate, nonStaffStartDate, nonStaffEndDate]);

  const periodDependency =
    pageType === "staff"
      ? `${staffStartDate}|${staffEndDate}`
      : `${nonStaffStartDate}|${nonStaffEndDate}`;

  const [activeStep, setActiveStep] = useState<Step>(1);
  const activeStepRef = useRef<Step>(1);
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

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
  const detailLoadedBySalaryIdRef = useRef<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSalaryId, setSelectedSalaryId] = useState("");
  const [loadingDialogDetail, setLoadingDialogDetail] = useState(false);
  const [masterItemsVersion, setMasterItemsVersion] = useState(0);

  // Fase 3 Finalisasi & Preview state (mengikuti alur Non-Staff khusus Staff)
  const [signatures, setSignatures] = useState<StaffSignatures>({
    diketahuiOleh: "SELVIE GUSTIARINI",
    dibuatOleh: "SUCI",
    catatan: "",
  });
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [rekapPopup, setRekapPopup] = useState<RekapPopupState>({
    open: false,
    title: "",
    message: "",
    type: "loading",
  });
  const finalizeInFlightRef = useRef(false);

  const canGenerate = true;
  const canPhase2Action = true;
  const canPhase3Action = true;
  const phase2ReadOnly = false;

  const selectedSalary = useMemo(
    () => generatedRows.find((row) => row.id === selectedSalaryId),
    [generatedRows, selectedSalaryId]
  );

  const isSelectedPaid =
    (selectedSalary?.statusPembayaran || "").toLowerCase() === "dibayar";

  const candidateEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const isStaff = isStaffEmployee(employee);
      return pageType === "staff" ? isStaff : !isStaff;
    });
  }, [employees, pageType]);

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
      return candidateEmployees.map((employee) => {
        const existingGaji = generatedRows.find(
          (row) => row.karyawanId === employee.id
        );
        return {
          karyawanId: employee.id,
          nama: employee.namaLengkap,
          divisi: employee.departemen,
          statusKaryawan: employee.statusKaryawan,
          statusPembayaran: existingGaji?.statusPembayaran,
          gajiPokok: employee.gajiPerBulan,
        };
      });
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
  }, [candidateEmployees, pageType, generatedRows, attendanceMap, attendanceOverrides]);

  async function loadEmployeesAndAttendance() {
    setLoading(true);
    setError("");

    try {
      const employeeRes = await employeeAPI.getAll(company);
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
        const attendanceRes = await attendanceAPI.getAll(company);
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

  async function loadGeneratedRows(options?: { autoAdvance?: boolean }) {
    setGeneratedRows([]);
    setInputsBySalaryId({});
    setInputDoneBySalaryId({});
    detailLoadedBySalaryIdRef.current = {};

    const startParsed = parseDateOnlyUtc(periodRange.startDate);
    const endParsed = parseDateOnlyUtc(periodRange.endDate);
    if (!startParsed || !endParsed || endParsed.getTime() < startParsed.getTime()) {
      setWorkflowStatus("DRAFT");
      return;
    }

    try {
      const rows = await salaryAPI.getGajiByDateRange(
        periodRange.startDate,
        periodRange.endDate,
        undefined,
        undefined,
        company
      );
      const rawList = Array.isArray(rows) ? rows : [];
      const mapped: SalaryRow[] = rawList
        .filter((row: any) => {
          const departemen = String(row.karyawan?.departemen || "").toLowerCase();
          const statusKaryawan = String(row.karyawan?.statusKaryawan || row.karyawan?.status_karyawan || "").toLowerCase();
          if (pageType === "staff") {
            const isStaff = departemen.includes("staff") || statusKaryawan.includes("staff");
            if (!isStaff) return false;
            // Filter ketat lokasi Staff agar absensi lintas lokasi di endpoint bersama /api/gaji/filter tidak menarik karyawan perusahaan lain
            if (company) {
              const rowLokasi = String(row.lokasi || row.karyawan?.lokasiDefault || "")
                .toUpperCase()
                .trim();
              return rowLokasi === company;
            }
            return true;
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
          lokasiKerja: row.lokasi || row.karyawan?.lokasiDefault || row.karyawan?.lokasiKerja || row.karyawan?.lokasi_kerja || "",
          statusPembayaran: row.statusPembayaran || row.status_pembayaran || "Belum Dibayar",
        }));

      setGeneratedRows(mapped);

      if (mapped.length === 0) {
        setWorkflowStatus("DRAFT");
        if (options?.autoAdvance ?? (isInitialLoadRef.current || activeStepRef.current !== 1)) {
          setActiveStep(1);
        }
        isInitialLoadRef.current = false;
        return;
      }

      const initialDone: Record<string, boolean> = {};
      const hydratedInputs: Record<string, SalaryInputState> = {};

      mapped.forEach((row) => {
        const rawRow = rawList.find((r: any) => String(r.id) === row.id);
        const isRowPaid = (row.statusPembayaran || "").toLowerCase() === "dibayar";
        const hasSaved = Boolean(
          isRowPaid ||
          (rawRow && (
            (rawRow.bonusItems != null && Array.isArray(rawRow.bonusItems) && rawRow.bonusItems.length > 0) ||
            rawRow.potonganItems != null ||
            toNumber(rawRow.bonus) > 0 ||
            toNumber(rawRow.potongan) > 0
          ))
        );
        if (hasSaved) {
          initialDone[row.id] = true;
          const bonusFromRow = normalizeJsonItems(rawRow?.bonusItems);
          const potonganFromRow = normalizeJsonItems(rawRow?.potonganItems);
          if (Array.isArray(rawRow?.bonusItems) || Array.isArray(rawRow?.potonganItems)) {
            hydratedInputs[row.id] = {
              bonusItems: bonusFromRow,
              potonganItems: potonganFromRow,
              bonusPKB: null,
              sisaPiutang:
                rawRow?.sisaPiutang !== undefined && rawRow?.sisaPiutang !== null
                  ? toNumber(rawRow.sisaPiutang)
                  : null,
            };
          }
        }
      });

      setInputsBySalaryId(hydratedInputs);
      setInputDoneBySalaryId(initialDone);

      const allPaid = mapped.length > 0 && mapped.every((row) => (row.statusPembayaran || "").toLowerCase() === "dibayar");
      const allDone = mapped.length > 0 && mapped.every((row) => initialDone[row.id]);
      const shouldAdvance =
        options?.autoAdvance ?? (isInitialLoadRef.current || activeStepRef.current !== 1);

      if (allPaid) {
        setWorkflowStatus("EXPORTED");
        if (shouldAdvance) setActiveStep(3);
      } else if (allDone) {
        setWorkflowStatus("INPUT_DONE");
        if (shouldAdvance) setActiveStep(3);
      } else {
        setWorkflowStatus("GENERATED");
        if (shouldAdvance) setActiveStep(2);
      }
      isInitialLoadRef.current = false;
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
  }, [status, session?.accessToken, pageType, periodDependency, company]);

  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      loadGeneratedRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken, pageType, periodDependency, company]);

  async function handleGenerate(selectedDivisions?: string[]) {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (pageType === "staff") {
        if (!staffStartDate || !staffEndDate) {
          throw new Error("Tanggal mulai dan tanggal akhir wajib diisi.");
        }
        const start = parseDateOnlyUtc(staffStartDate);
        const end = parseDateOnlyUtc(staffEndDate);
        if (!start || !end) {
          throw new Error("Format tanggal periode tidak valid.");
        }
        if (end.getTime() < start.getTime()) {
          throw new Error("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai.");
        }
        const maxEnd = getMaxOneMonthEndDate(start);
        if (end.getTime() > maxEnd.getTime()) {
          throw new Error("Rentang periode gaji Staff maksimal 1 bulan.");
        }

        await generateSalaryAPI.generateStaffBulanan(
          { periodeAwal: staffStartDate, periodeAkhir: staffEndDate },
          selectedDivisions,
          company
        );
      } else {
        if (!nonStaffStartDate || !nonStaffEndDate) {
          throw new Error("Tanggal mulai dan tanggal akhir wajib diisi.");
        }

        if (new Date(nonStaffEndDate) < new Date(nonStaffStartDate)) {
          throw new Error("Tanggal akhir tidak boleh lebih kecil dari tanggal mulai.");
        }

        await generateSalaryAPI.generateNonStaffMingguan(periodRange.startDate, periodRange.endDate, undefined, undefined, undefined, company);
      }

      setMessage("Generate berhasil. Periode berpindah ke GENERATED.");
      await loadGeneratedRows({ autoAdvance: true });
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

    if (detailLoadedBySalaryIdRef.current[row.id]) return;

    try {
      setLoadingDialogDetail(true);
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

      let finalBonus: SalaryItem[];
      let finalPotongan: SalaryItem[];

      if (detail?.isDraftSaved || pageType === "staff") {
        finalBonus = bonusItemsFromApi;
        finalPotongan = potonganItemsFromApi;
      } else {
        const templateBonusNames = fixedBonusTemplate.map((base) => base.judul.toLowerCase());
        finalBonus = [
          ...fixedBonusTemplate.map((base) => {
            const existing = bonusItemsFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
            return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
          }),
          ...bonusItemsFromApi.filter((item) => !templateBonusNames.includes(item.judul.toLowerCase())),
        ];

        const templatePotonganNames = fixedPotonganTemplate.map((base) => base.judul.toLowerCase());
        finalPotongan = [
          ...fixedPotonganTemplate.map((base) => {
            const existing = potonganItemsFromApi.find((item) => item.judul.toLowerCase() === base.judul.toLowerCase());
            return existing ? { ...base, id: existing.id, nominal: existing.nominal } : { ...base };
          }),
          ...potonganItemsFromApi.filter((item) => !templatePotonganNames.includes(item.judul.toLowerCase())),
        ];
      }

      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.id]: {
          bonusItems: finalBonus,
          potonganItems: finalPotongan,
          bonusPKB: null,
          sisaPiutang: detail?.sisaPiutang !== undefined ? detail.sisaPiutang : null,
        },
      }));
      detailLoadedBySalaryIdRef.current[row.id] = true;

      if (
        detail?.isDraftSaved ||
        bonusItemsFromApi.length > 0 ||
        potonganItemsFromApi.length > 0 ||
        (detail?.sisaPiutang !== undefined && detail.sisaPiutang !== null)
      ) {
        setInputDoneBySalaryId((prev) => ({ ...prev, [row.id]: true }));
      }
    } catch (err) {
      console.error(err);
      setInputsBySalaryId((prev) => ({
        ...prev,
        [row.id]:
          prev[row.id] ||
          (pageType === "staff"
            ? { bonusItems: [], potonganItems: [], bonusPKB: null, sisaPiutang: null }
            : buildDefaultInputState()),
      }));
    } finally {
      setLoadingDialogDetail(false);
    }
  }

  const defaultInputStateForPage = useCallback((): SalaryInputState => {
    if (pageType === "staff") {
      return { bonusItems: [], potonganItems: [], bonusPKB: null, sisaPiutang: null };
    }
    return buildDefaultInputState();
  }, [pageType]);

  const calculatedRow = useCallback(
    (row: SalaryRow): CalculatedRow => {
      const inputState = inputsBySalaryId[row.id] || defaultInputStateForPage();
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputsBySalaryId, defaultInputStateForPage, pageType, employees, attendanceMap, attendanceOverrides]
  );

  async function saveInputSalary(salaryId: string, finalState: SalaryInputState) {
    const target = generatedRows.find((row) => row.id === salaryId);
    if (!target) return;

    try {
      setSubmitting(true);
      const cleanState: SalaryInputState = {
        bonusItems: finalState.bonusItems.filter((item) => item.judul.trim()),
        potonganItems: finalState.potonganItems.filter((item) => item.judul.trim()),
        bonusPKB: finalState.bonusPKB ?? null,
        sisaPiutang: finalState.sisaPiutang ?? null,
      };

      await salaryAPI.saveBonusPotongan({
        gajiId: target.id,
        karyawanId: target.karyawanId,
        bonusItems: cleanState.bonusItems,
        potonganItems: cleanState.potonganItems,
        sisaPiutang: cleanState.sisaPiutang,
      });

      setInputsBySalaryId((prev) => ({
        ...prev,
        [target.id]: cleanState,
      }));
      detailLoadedBySalaryIdRef.current[target.id] = true;
      setInputDoneBySalaryId((prev) => ({ ...prev, [target.id]: true }));
      setMessage(`Input untuk ${target.nama} tersimpan.`);

      const allDone = generatedRows.every((row) => row.id === target.id || inputDoneBySalaryId[row.id]);
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
    setActiveStep(3);
  }

  const prepareSlipExportPayload = useCallback((): SalarySlipPayload[] => {
    return generatedRows.map((row) => {
      const detail = inputsBySalaryId[row.id] || defaultInputStateForPage();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedRows, inputsBySalaryId, defaultInputStateForPage, calculatedRow, pageType, periodLabel]);

  const prepareRekapExportData = useCallback(() => {
    const rows = generatedRows.map((row) => {
      const detail = inputsBySalaryId[row.id] || defaultInputStateForPage();
      const calc = calculatedRow(row);
      return {
        nama: row.nama,
        divisi: row.divisi,
        gajiPokok: calc.gajiPokok,
        totalBonus: calc.totalBonus,
        totalPotongan: calc.totalPotongan,
        gajiBersih: calc.gajiBersih,
        bonusItems: detail.bonusItems,
        potonganItems: detail.potonganItems,
      };
    });

    const activeBonusCols = new Set<string>();
    const activePotonganCols = new Set<string>();
    generatedRows.forEach((row) => {
      const input = inputsBySalaryId[row.id];
      input?.bonusItems?.forEach((item) => {
        if (item.judul.trim() && toNumber(item.nominal) > 0) activeBonusCols.add(item.judul.trim());
      });
      input?.potonganItems?.forEach((item) => {
        if (item.judul.trim() && toNumber(item.nominal) > 0) activePotonganCols.add(item.judul.trim());
      });
    });

    const meta = {
      location: company,
      periodLabel,
      bonusColumns: Array.from(activeBonusCols),
      potonganColumns: Array.from(activePotonganCols),
      diketahuiOleh: signatures.diketahuiOleh,
      dibuatOleh: signatures.dibuatOleh,
      catatan: signatures.catatan,
    };

    return { rows, meta };
  }, [generatedRows, inputsBySalaryId, defaultInputStateForPage, calculatedRow, company, periodLabel, signatures]);

  const handleGenerateSlipBlob = useCallback(async () => {
    const payload = prepareSlipExportPayload();
    return await getStaffSlipGabunganBlob(payload);
  }, [prepareSlipExportPayload]);

  const handleGenerateRekapBlob = useCallback(async () => {
    const { rows, meta } = prepareRekapExportData();
    return await getStaffRekapBlob(rows, meta);
  }, [prepareRekapExportData]);

  async function downloadKeduaPdf() {
    const slipPayload = prepareSlipExportPayload();
    const { rows, meta } = prepareRekapExportData();
    const slipFileName = `slip-gaji-${pageType}-${periodSlug}.pdf`;
    const rekapFileName = `rekap-gaji-${pageType}-${periodSlug}.pdf`;

    await exportSalarySlipsPdf(slipPayload, slipFileName);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await exportStaffRekapPdf(rows, meta, rekapFileName);
  }

  async function handleDownloadKeduaPdfOnly() {
    try {
      setSubmitting(true);
      setError("");
      await downloadKeduaPdf();
      setMessage("Kedua file PDF (Slip dan Rekap) berhasil diunduh ulang.");
    } catch (err) {
      console.error("Gagal mengunduh ulang PDF:", err);
      setError("Gagal mengunduh ulang PDF. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEksekusiSimpanBayarkan() {
    if (finalizeInFlightRef.current || submitting || generatedRows.length === 0) {
      return;
    }

    setPreviewDialogOpen(false);
    finalizeInFlightRef.current = true;

    try {
      setSubmitting(true);
      setError("");
      setRekapPopup({
        open: true,
        title: "Menyimpan & Memfinalisasi Gaji Staff",
        message: "Sedang memperbarui status pembayaran karyawan Staff ke Dibayar. Mohon tunggu...",
        type: "loading",
      });

      const result = await salaryAPI.saveStaffRekap({
        periodeAwal: periodRange.startDate,
        periodeAkhir: periodRange.endDate,
        lokasi: company,
        diketahuiOleh: signatures.diketahuiOleh,
        dibuatOleh: signatures.dibuatOleh,
        catatan: signatures.catatan,
        gajiIds: generatedRows.map((row) => row.id),
      });

      setGeneratedRows((prev) =>
        prev.map((row) => ({
          ...row,
          statusPembayaran: "Dibayar",
        }))
      );
      setWorkflowStatus("EXPORTED");

      try {
        await downloadKeduaPdf();
      } catch (dlErr) {
        console.error("Unduhan otomatis PDF tertahan peramban:", dlErr);
      }

      const successMsg = `Status gaji berhasil diubah menjadi Dibayar untuk ${result.successCount} karyawan Staff (dan diperbarui pada Data Karyawan). Berkas Slip & Rekap sedang diunduh otomatis.`;
      setMessage(successMsg);
      setRekapPopup({
        open: true,
        title: "Berhasil Disimpan & Dibayarkan",
        message: successMsg,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      const text = err instanceof Error ? err.message : "Gagal memfinalisasi status pembayaran gaji Staff.";
      setError(text);
      setRekapPopup({
        open: true,
        title: "Gagal Memfinalisasi",
        message: text,
        type: "error",
      });
    } finally {
      finalizeInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  const divisionSummary = useMemo(() => {
    const summaryMap = new Map<string, number>();
    for (const row of generatedRows) {
      const calc = calculatedRow(row);
      summaryMap.set(row.divisi, (summaryMap.get(row.divisi) || 0) + calc.gajiBersih);
    }
    return Array.from(summaryMap.entries()).map(([divisi, total]) => ({ divisi, total }));
  }, [generatedRows, calculatedRow]);

  const allInputDone = generatedRows.length > 0 && generatedRows.every((row) => inputDoneBySalaryId[row.id]);

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
            { id: 1, label: "Generate", desc: pageType === "staff" ? "Pilih periode & divisi" : "Tarik data absensi" },
            { id: 2, label: "Input Bonus & Potongan", desc: "Sesuaikan gaji" },
            { id: 3, label: "Finalisasi & Export", desc: "Simpan & cetak PDF" }
          ].map((s, i, arr) => {
            const stepId = s.id as Step;
            const stepAccessible =
              stepId === 1 ||
              (stepId === 2 && generatedRows.length > 0) ||
              (stepId === 3 &&
                generatedRows.length > 0 &&
                (allInputDone ||
                  workflowStatus === "INPUT_DONE" ||
                  workflowStatus === "EXPORTED"));
            const done =
              activeStep > stepId ||
              (stepId === 2 && generatedRows.length > 0 && activeStep === 1) ||
              (stepId === 3 && workflowStatus === "EXPORTED");
            const active = activeStep === stepId;
            const clickable = stepAccessible || active;
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

      <NonStaffRekapPopup rekapPopup={rekapPopup} setRekapPopup={setRekapPopup} />

      {activeStep === 1 && (
        <StaffStep1Generate
          pageType={pageType}
          staffStartDate={staffStartDate}
          setStaffStartDate={setStaffStartDate}
          staffEndDate={staffEndDate}
          setStaffEndDate={setStaffEndDate}
          nonStaffStartDate={nonStaffStartDate}
          setNonStaffStartDate={setNonStaffStartDate}
          nonStaffEndDate={nonStaffEndDate}
          setNonStaffEndDate={setNonStaffEndDate}
          loading={loading}
          estimatedRows={estimatedRows}
          employees={employees}
          attendanceFor={attendanceFor}
          setAttendanceOverrides={setAttendanceOverrides}
          workflowStatus={workflowStatus}
          canGenerate={canGenerate}
          submitting={submitting}
          handleGenerate={handleGenerate}
          company={company}
          onCompanyChange={setCompany}
          hasGeneratedRows={generatedRows.length > 0}
          onGoToStep2={() => setActiveStep(2)}
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
          onDataFixUpdated={() => setMasterItemsVersion((v) => v + 1)}
        />
      )}

      {activeStep === 3 && (
        <StaffStep3Export
          pageType={pageType}
          generatedRows={generatedRows}
          calculatedRow={calculatedRow}
          inputsBySalaryId={inputsBySalaryId}
          divisionSummary={divisionSummary}
          signatures={signatures}
          onEditSignatures={() => setIsSignatureDialogOpen(true)}
          canPhase3Action={canPhase3Action}
          submitting={submitting}
          handleSimpanRekapan={() => setPreviewDialogOpen(true)}
          handleDownloadKeduaPdfOnly={handleDownloadKeduaPdfOnly}
        />
      )}

      <StaffInputDialog
        pageType={pageType}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedSalary={selectedSalary}
        periodLabel={periodLabel}
        inputsBySalaryId={inputsBySalaryId}
        loadingDetail={loadingDialogDetail}
        masterItemsVersion={masterItemsVersion}
        attendanceFor={attendanceFor}
        calculatedRow={calculatedRow}
        phase2ReadOnly={phase2ReadOnly || isSelectedPaid}
        canPhase2Action={canPhase2Action && !isSelectedPaid}
        submitting={submitting}
        saveInputSalary={saveInputSalary}
      />

      <StaffSignatureDialog
        isOpen={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        signatures={signatures}
        onSave={setSignatures}
      />

      <NonStaffPreviewPdfDialog
        isOpen={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        onConfirmBayar={handleEksekusiSimpanBayarkan}
        onGenerateSlipBlob={handleGenerateSlipBlob}
        onGenerateRekapBlob={handleGenerateRekapBlob}
        submitting={submitting}
      />
    </div>
  );
}
