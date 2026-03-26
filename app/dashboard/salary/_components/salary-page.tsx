"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Badge } from "@/components/ui/display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  DollarSign,
  Gift,
  Scissors,
  ClipboardCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Printer,
  Download,
  Eye,
} from "lucide-react";
import {
  salaryAPI,
  getAllSalaries,
  getGajiByDateRangeDetailed,
  generateSalaryAPI,
  employeeAPI,
} from "@/lib/api";
import { downloadSalaryPDF, printSalaryPDF, previewSalaryPDF, formatCurrency } from "@/lib/utils";

type SalaryMode = "staff" | "nonstaff";

type SalaryPageProps = {
  mode: SalaryMode;
};

type SalaryStep = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1 as SalaryStep, title: "Proses Gaji", icon: DollarSign, desc: "Generate gaji" },
  { id: 2 as SalaryStep, title: "Bonus", icon: Gift, desc: "Tambah bonus" },
  { id: 3 as SalaryStep, title: "Potongan", icon: Scissors, desc: "Kelola potongan" },
  { id: 4 as SalaryStep, title: "Rekap & Bayar", icon: ClipboardCheck, desc: "Review & bayar" },
];

const STAFF_DEPARTMENTS = ["STAFF PJP", "STAFF CPD", "STAFF CMS"];
const NONSTAFF_DEPARTMENTS = [
  "BLANDING PJP",
  "PACKING PJP",
  "PACKING CPD",
  "PACKING CMS",
  "MARKET PJP",
  "MARKET CPD",
  "MARKET CMS",
];

const DEDUCTION_TYPES = [
  { value: "pph21", label: "PPh 21", api: "addPajakPph21", field: "pajakPph21" },
  { value: "keterlambatan", label: "Keterlambatan", api: "addPotonganKeterlambatan", field: "potonganKeterlambatan" },
  { value: "pinjaman", label: "Pinjaman", api: "addPotonganPinjaman", field: "potonganPinjaman" },
  { value: "sumbangan", label: "Sumbangan", api: "addPotonganSumbangan", field: "potonganSumbangan" },
  { value: "bpjs", label: "BPJS", api: "addPotonganBpjs", field: "potonganBpjs" },
  { value: "undangan", label: "Undangan", api: "addPotonganUndangan", field: "potonganUndangan" },
  { value: "custom", label: "Custom", api: "addPotonganCustom", field: "nominal" },
];

const isStaffDepartment = (dept?: string | null) =>
  (dept || "").toLowerCase().includes("staff");

function getDepartmentsForMode(mode: SalaryMode) {
  return mode === "staff" ? STAFF_DEPARTMENTS : NONSTAFF_DEPARTMENTS;
}

function getModeLabel(mode: SalaryMode) {
  return mode === "staff" ? "STAFF" : "Non-STAFF";
}

function normalizeSalaryItems(raw: any): Array<{ nama: string; nominal: number; createdAt?: string; linkedField?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const nama = String(item.nama || "").trim();
      const nominal = Number(item.nominal || 0);
      if (!nama || Number.isNaN(nominal)) return null;
      return {
        nama,
        nominal,
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
        linkedField: item.linkedField ? String(item.linkedField) : undefined,
      };
    })
    .filter(Boolean) as Array<{ nama: string; nominal: number; createdAt?: string; linkedField?: string }>;
}

// ==================== STEPPER ====================
function StepNav({ current, onStepClick }: { current: SalaryStep; onStepClick: (s: SalaryStep) => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, idx) => {
        const isActive = current === step.id;
        const isCompleted = current > step.id;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1.5 flex-1 group"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${isCompleted ? "bg-green-500 border-green-500 text-white" : ""}
                  ${isActive ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" : ""}
                  ${!isActive && !isCompleted ? "bg-white border-slate-200 text-slate-400 group-hover:border-slate-300" : ""}
                `}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-slate-400"}`}>
                {step.title}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mt-[-18px] rounded-full ${current > step.id ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ==================== AGGREGATION HELPER ====================
function aggregateSalaryData(rawData: any[]): any[] {
  if (!rawData || rawData.length === 0) return [];

  const grouped = rawData.reduce((acc: any, item: any) => {
    const pAwalRaw = item.periodeAwal || item.tanggalGaji || item.periode?.split(" - ")[0];
    const pAkhirRaw = item.periodeAkhir || item.tanggalGaji || item.periode?.split(" - ")[1] || pAwalRaw;
    const periodeAwalKey = pAwalRaw ? new Date(pAwalRaw).toISOString().split("T")[0] : "";
    const periodeAkhirKey = pAkhirRaw ? new Date(pAkhirRaw).toISOString().split("T")[0] : periodeAwalKey;
    // Pisahkan per karyawan + status + periode agar tidak tercampur lintas batch generate.
    const key = `${item.karyawan?.id || "unknown"}_${item.statusPembayaran || "belum_dibayar"}_${periodeAwalKey}_${periodeAkhirKey}`;
    if (!acc[key]) {
      acc[key] = {
        ...item,
        periodeAwal: pAwalRaw ? new Date(pAwalRaw).toISOString().split("T")[0] : "",
        periodeAkhir: pAkhirRaw ? new Date(pAkhirRaw).toISOString().split("T")[0] : "",
        totalHari: 1,
        originalIds: [item.id],
        gajiPokok: Number(item.gajiPokok) || 0,
        bonus: Number(item.bonus) || 0,
        totalHariMasuk: Number(item.totalHariMasuk) || 0,
        totalHariSetengahHari: Number(item.totalHariSetengahHari) || 0,
        pajakPph21: Number(item.pajakPph21) || 0,
        potonganKeterlambatan: Number(item.potonganKeterlambatan) || 0,
        potonganPinjaman: Number(item.potonganPinjaman) || 0,
        potonganSumbangan: Number(item.potonganSumbangan) || 0,
        potonganBpjs: Number(item.potonganBpjs) || 0,
        potonganUndangan: Number(item.potonganUndangan) || 0,
        potongan: Number(item.potongan) || 0,
        bonusItems: normalizeSalaryItems(item.bonusItems),
        potonganItems: normalizeSalaryItems(item.potonganItems),
      };
    } else {
      const e = acc[key];
      const rawDate = item.periodeAwal || item.tanggalGaji || item.periode?.split(" - ")[0];
      const d = rawDate ? new Date(rawDate).toISOString().split("T")[0] : "";

      if (d && (!e.periodeAwal || d < e.periodeAwal)) e.periodeAwal = d;
      if (d && (!e.periodeAkhir || d > e.periodeAkhir)) e.periodeAkhir = d;
      e.totalHari += 1;
      e.originalIds.push(item.id);
      e.gajiPokok += Number(item.gajiPokok) || 0;
      e.bonus += Number(item.bonus) || 0;
      e.totalHariMasuk += Number(item.totalHariMasuk) || 0;
      e.totalHariSetengahHari += Number(item.totalHariSetengahHari) || 0;
      e.pajakPph21 += Number(item.pajakPph21) || 0;
      e.potonganKeterlambatan += Number(item.potonganKeterlambatan) || 0;
      e.potonganPinjaman += Number(item.potonganPinjaman) || 0;
      e.potonganSumbangan += Number(item.potonganSumbangan) || 0;
      e.potonganBpjs += Number(item.potonganBpjs) || 0;
      e.potonganUndangan += Number(item.potonganUndangan) || 0;
      e.potongan += Number(item.potongan) || 0;
      e.bonusItems = [...(e.bonusItems || []), ...normalizeSalaryItems(item.bonusItems)];
      e.potonganItems = [...(e.potonganItems || []), ...normalizeSalaryItems(item.potonganItems)];
    }
    return acc;
  }, {});

  return Object.values(grouped).map((item: any) => {
    const fallbackPotongan = item.pajakPph21 + item.potonganKeterlambatan + item.potonganPinjaman + item.potonganSumbangan + item.potonganBpjs + item.potonganUndangan;
    const totalPotongan = Number(item.potongan) > 0 ? Number(item.potongan) : fallbackPotongan;
    const gajiBersih = item.gajiPokok + item.bonus - totalPotongan;
    return {
      ...item,
      potongan: totalPotongan,
      gajiBersih,
      totalGajiBersih: gajiBersih,
      periode: item.periodeAwal === item.periodeAkhir ? item.periodeAwal : `${item.periodeAwal} - ${item.periodeAkhir}`,
      periodeDisplay: item.periodeAwal === item.periodeAkhir ? `${item.periodeAwal}` : `${item.periodeAwal} s/d ${item.periodeAkhir}`,
    };
  });
}

export default function SalaryPage({ mode }: SalaryPageProps) {
  const [step, setStep] = useState<SalaryStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<any[]>([]);

  // Date range for recap
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  });

  // Step 1: Generate
  const [staffPeriod, setStaffPeriod] = useState("");
  const [nonStaffStart, setNonStaffStart] = useState("");
  const [nonStaffEnd, setNonStaffEnd] = useState("");

  // Step 1b: Update Staff Salary
  const [staffEmployees, setStaffEmployees] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [newStaffSalary, setNewStaffSalary] = useState("");

  // Step 2: Bonus
  const [bonusDept, setBonusDept] = useState("");
  const [bonusType, setBonusType] = useState<"equal" | "different">("equal");
  const [bonusName, setBonusName] = useState("");
  const [saveBonusToMaster, setSaveBonusToMaster] = useState(false);
  const [bonusMasterItems, setBonusMasterItems] = useState<string[]>([]);
  const [equalBonus, setEqualBonus] = useState("");
  const [diffBonuses, setDiffBonuses] = useState<Record<string, string>>({});
  const [deptGaji, setDeptGaji] = useState<any[]>([]);
  const [selectedBonusTargets, setSelectedBonusTargets] = useState<string[]>([]);

  // Step 3: Deductions
  const [selectedGajiId, setSelectedGajiId] = useState("");
  const [deductionType, setDeductionType] = useState("");
  const [deductionName, setDeductionName] = useState("");
  const [saveDeductionToMaster, setSaveDeductionToMaster] = useState(false);
  const [deductionMasterItems, setDeductionMasterItems] = useState<string[]>([]);
  const [deductionAmount, setDeductionAmount] = useState("");

  // Step 4: Recap
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [dataTab, setDataTab] = useState<"unpaid" | "paid">("unpaid");

  // Preview for non-staff after generate
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRange, setPreviewRange] = useState<{ start: string; end: string } | null>(null);

  const departmentOptions = getDepartmentsForMode(mode);

  const loadSalaryItems = async () => {
    try {
      const [bonusItems, deductionItems] = await Promise.all([
        salaryAPI.getSalaryItems("BONUS"),
        salaryAPI.getSalaryItems("POTONGAN"),
      ]);
      setBonusMasterItems((bonusItems || []).map((item: any) => item.nama).filter(Boolean));
      setDeductionMasterItems((deductionItems || []).map((item: any) => item.nama).filter(Boolean));
    } catch {
      // Ignore errors to keep salary flow usable even if master list endpoint is unavailable.
    }
  };

  // ---- Load data ----
  const loadData = async () => {
    setLoading(true);
    try {
      let result;
      if (startDate && endDate) {
        result = await getGajiByDateRangeDetailed(startDate, endDate);
      } else {
        result = await getAllSalaries();
      }
      const aggregated = aggregateSalaryData(result || []);
      const filtered = aggregated.filter((item: any) => {
        const isStaff = isStaffDepartment(item.karyawan?.departemen);
        return mode === "staff" ? isStaff : !isStaff;
      });
      setData(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data gaji");
    } finally {
      setLoading(false);
    }
  };

  // Load staff employees for update salary dropdown
  const loadStaffEmployees = async () => {
    if (mode !== "staff") return;
    try {
      const all = await employeeAPI.getAll();
      const staff = (all || []).filter((e: any) =>
        (e.departemen || "").toLowerCase().includes("staff")
      );
      setStaffEmployees(staff);
    } catch (e) {
      console.error("Failed loading staff employees:", e);
    }
  };

  useEffect(() => {
    if (step === 4 || step === 2 || step === 3) loadData();
  }, [step, startDate, endDate]);

  useEffect(() => {
    if (step === 2 || step === 3) loadSalaryItems();
  }, [step]);

  useEffect(() => {
    if (step === 1) loadStaffEmployees();
  }, [step]);

  // Helper
  const showMsg = (type: "success" | "error", text: string) => {
    if (type === "success") { setSuccess(text); setError(""); setTimeout(() => setSuccess(""), 4000); }
    else { setError(text); setSuccess(""); }
  };

  const loadPreview = async (start: string, end: string) => {
    setPreviewLoading(true);
    try {
      const result = await getGajiByDateRangeDetailed(start, end);
      const aggregated = aggregateSalaryData(result || []);
      const filtered = aggregated.filter((item: any) => {
        const isStaff = isStaffDepartment(item.karyawan?.departemen);
        return mode === "staff" ? isStaff : !isStaff;
      });
      setPreviewData(filtered);
      setPreviewRange({ start, end });
    } catch (err) {
      setPreviewData([]);
      showMsg("error", err instanceof Error ? err.message : "Gagal memuat preview gaji");
    } finally {
      setPreviewLoading(false);
    }
  };

  const refreshPreviewIfAvailable = async () => {
    if (mode !== "nonstaff" || !previewRange) return;
    await loadPreview(previewRange.start, previewRange.end);
  };

  // ---- Step 1: Generate salary ----
  const handleGenerate = async (type: "staff" | "nonstaff") => {
    setLoading(true);
    try {
      if (type === "staff") {
        if (!staffPeriod) { showMsg("error", "Periode harus diisi (YYYY-MM)"); return; }
        const result = await generateSalaryAPI.generateStaffBulanan(staffPeriod);
        showMsg("success", typeof result === "string" ? result : "Gaji STAFF berhasil digenerate!");
        setStaffPeriod("");
      } else {
        if (!nonStaffStart || !nonStaffEnd) { showMsg("error", "Tanggal awal dan akhir harus diisi"); return; }
        const result = await generateSalaryAPI.generateNonStaffMingguan(nonStaffStart, nonStaffEnd);
        showMsg("success", typeof result === "string" ? result : "Gaji non-STAFF berhasil digenerate!");
        await loadPreview(nonStaffStart, nonStaffEnd);
      }
    } catch (err: any) {
      showMsg("error", err.message || "Gagal generate gaji");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaffSalary = async () => {
    if (!selectedStaffId || !newStaffSalary) { showMsg("error", "Pilih karyawan dan isi gaji baru"); return; }
    setLoading(true);
    try {
      const result = await generateSalaryAPI.updateStaffSalary(parseInt(selectedStaffId), parseFloat(newStaffSalary));
      showMsg("success", typeof result === "string" ? result : "Gaji STAFF berhasil diupdate!");
      setSelectedStaffId("");
      setNewStaffSalary("");
    } catch (err: any) {
      showMsg("error", err.message || "Gagal update gaji STAFF");
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: Bonus ----
  const loadDeptGaji = async (dept: string) => {
    const result = startDate && endDate
      ? await getGajiByDateRangeDetailed(startDate, endDate)
      : await getAllSalaries();

    const filtered = aggregateSalaryData(result || []).filter((item: any) => {
      const isStaff = isStaffDepartment(item.karyawan?.departemen);
      const deptMatch = (item.karyawan?.departemen || "") === dept;
      const isUnpaid = (item.statusPembayaran || "").toLowerCase() !== "dibayar";
      return (mode === "staff" ? isStaff : !isStaff) && deptMatch && isUnpaid;
    });

    setDeptGaji(filtered);
    setSelectedBonusTargets([]);
    setDiffBonuses({});
  };

  useEffect(() => {
    if (bonusDept && step === 2) loadDeptGaji(bonusDept);
  }, [bonusDept, step, startDate, endDate]);

  const toggleBonusTarget = (id: string) => {
    setSelectedBonusTargets((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const toggleAllBonusTargets = () => {
    if (selectedBonusTargets.length === deptGaji.length) {
      setSelectedBonusTargets([]);
      return;
    }
    setSelectedBonusTargets(deptGaji.map((item) => item.id));
  };

  useEffect(() => {
    if (!deductionType) return;
    const selected = DEDUCTION_TYPES.find((item) => item.value === deductionType);
    if (!selected) return;
    setDeductionName((prev) => prev || selected.label);
  }, [deductionType]);

  const handleAddBonus = async () => {
    if (!bonusDept) { showMsg("error", "Pilih departemen"); return; }
    if (!bonusName.trim()) { showMsg("error", "Nama bonus wajib diisi"); return; }
    setLoading(true);
    try {
      if (bonusType === "equal") {
        if (!equalBonus || Number(equalBonus) <= 0) { showMsg("error", "Nominal bonus harus diisi"); setLoading(false); return; }
        await salaryAPI.addBonusByDepartmentEqual({
          departemen: bonusDept,
          bonus: Number(equalBonus),
          itemName: bonusName.trim(),
          saveAsMaster: saveBonusToMaster,
        });
        showMsg("success", `Bonus ${bonusName.trim()} Rp ${Number(equalBonus).toLocaleString("id-ID")} ditambahkan ke ${bonusDept}`);
        setEqualBonus("");
      } else {
        const bonuses: Record<string, number> = {};
        selectedBonusTargets.forEach((gajiId) => {
          const val = diffBonuses[gajiId];
          if (val && Number(val) > 0) {
            bonuses[gajiId] = Number(val);
          }
        });
        if (selectedBonusTargets.length === 0) { showMsg("error", "Pilih karyawan yang akan diberi bonus"); setLoading(false); return; }
        if (Object.keys(bonuses).length === 0) { showMsg("error", "Isi nominal bonus untuk minimal 1 karyawan terpilih"); setLoading(false); return; }
        await salaryAPI.addBonusByDepartmentDifferent({
          departemen: bonusDept,
          bonuses,
          itemName: bonusName.trim(),
          saveAsMaster: saveBonusToMaster,
        });
        showMsg("success", `Bonus berbeda berhasil diterapkan ke ${Object.keys(bonuses).length} karyawan`);
        setSelectedBonusTargets([]);
        setDiffBonuses({});
      }
      if (saveBonusToMaster) await loadSalaryItems();
      setBonusName("");
      setSaveBonusToMaster(false);
      await loadDeptGaji(bonusDept);
      await refreshPreviewIfAvailable();
    } catch (err: any) {
      showMsg("error", err.message || "Gagal menambahkan bonus");
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 3: Deductions ----
  const handleAddDeduction = async () => {
    if (!selectedGajiId || !deductionType || !deductionAmount) { showMsg("error", "Lengkapi semua field"); return; }
    const deductInfo = DEDUCTION_TYPES.find((d) => d.value === deductionType);
    if (!deductInfo) return;
    const resolvedDeductionName = deductionName.trim() || deductInfo.label;
    if (!resolvedDeductionName) { showMsg("error", "Nama potongan wajib diisi"); return; }
    setLoading(true);
    try {
      const apiMethod = (salaryAPI as any)[deductInfo.api];
      await apiMethod({
        gajiId: selectedGajiId,
        [deductInfo.field]: Number(deductionAmount),
        itemName: resolvedDeductionName,
        saveAsMaster: saveDeductionToMaster,
      });
      showMsg("success", `Potongan ${resolvedDeductionName} berhasil ditambahkan`);
      setSelectedGajiId("");
      setDeductionType("");
      setDeductionName("");
      setSaveDeductionToMaster(false);
      setDeductionAmount("");
      if (saveDeductionToMaster) await loadSalaryItems();
      await loadData();
      await refreshPreviewIfAvailable();
    } catch (err: any) {
      showMsg("error", err.message || "Gagal menambahkan potongan");
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 4: Recap ----
  const unpaidData = data.filter((d) => (d.statusPembayaran || "").toLowerCase() !== "dibayar");
  const paidData = data.filter((d) => (d.statusPembayaran || "").toLowerCase() === "dibayar");
  const tabData = dataTab === "unpaid" ? unpaidData : paidData;

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedItems.length === tabData.length) setSelectedItems([]);
    else setSelectedItems(tabData.map((d) => d.id));
  };

  const handleBatchPay = async () => {
    if (selectedItems.length === 0) { showMsg("error", "Pilih minimal 1 karyawan"); return; }
    if (!confirm(`Bayar ${selectedItems.length} karyawan?`)) return;
    setBatchLoading(true);
    try {
      for (const aggId of selectedItems) {
        const item = tabData.find((d) => d.id === aggId);
        const ids = item?.originalIds || [aggId];
        for (const id of ids) {
          await salaryAPI.updateStatusPembayaran({ gajiId: id, statusPembayaran: "Dibayar" });
        }
      }

      // Auto-print slip gaji
      const selectedData = tabData.filter((d) => selectedItems.includes(d.id));
      if (selectedData.length > 0) {
        try { await printSalaryPDF(selectedData); } catch { /* ignore print error */ }
      }

      setSelectedItems([]);
      showMsg("success", `${selectedItems.length} gaji berhasil dibayar & slip dicetak!`);
      await loadData();
      await refreshPreviewIfAvailable();
    } catch (err: any) {
      showMsg("error", err.message || "Gagal memproses pembayaran");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleRevertPay = async () => {
    if (selectedItems.length === 0) { showMsg("error", "Pilih minimal 1 karyawan"); return; }
    if (!confirm(`Batalkan pembayaran ${selectedItems.length} karyawan?`)) return;
    setBatchLoading(true);
    try {
      for (const aggId of selectedItems) {
        const item = tabData.find((d) => d.id === aggId);
        const ids = item?.originalIds || [aggId];
        for (const id of ids) {
          await salaryAPI.updateStatusPembayaran({ gajiId: id, statusPembayaran: "belum_dibayar" });
        }
      }
      setSelectedItems([]);
      showMsg("success", "Pembayaran berhasil dibatalkan");
      await loadData();
      await refreshPreviewIfAvailable();
    } catch (err: any) {
      showMsg("error", err.message || "Gagal membatalkan pembayaran");
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Sistem Penggajian {getModeLabel(mode)}</h1>

      <StepNav current={step} onStepClick={setStep} />

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-200 bg-green-50"><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}

      {/* Loading overlay */}
      {batchLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <div>
              <p className="font-semibold">Memproses...</p>
              <p className="text-sm text-slate-500">Jangan tutup halaman ini</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 1: Generate Gaji ==================== */}
      {step === 1 && (
        <div className="space-y-5">
          {mode === "nonstaff" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Generate Gaji Non-STAFF (Per Minggu)</CardTitle>
                <CardDescription className="text-xs">Gaji dihitung per hari x hari hadir (Senin-Sabtu)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tanggal Awal</Label>
                    <Input type="date" value={nonStaffStart} onChange={(e) => setNonStaffStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tanggal Akhir</Label>
                    <Input type="date" value={nonStaffEnd} onChange={(e) => setNonStaffEnd(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => handleGenerate("nonstaff")} disabled={loading || !nonStaffStart || !nonStaffEnd} className="w-full">
                  {loading ? "Generating..." : "Generate Gaji Non-STAFF"}
                </Button>
              </CardContent>
            </Card>
          )}

          {mode === "staff" && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Generate Gaji STAFF (Per Bulan)</CardTitle>
                  <CardDescription className="text-xs">Gaji pokok tetap per bulan (Senin-Jumat)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Periode (YYYY-MM)</Label>
                    <Input type="month" value={staffPeriod} onChange={(e) => setStaffPeriod(e.target.value)} />
                  </div>
                  <Button onClick={() => handleGenerate("staff")} disabled={loading || !staffPeriod} variant="outline" className="w-full">
                    {loading ? "Generating..." : "Generate Gaji STAFF"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Update Gaji Bulanan STAFF</CardTitle>
                  <CardDescription className="text-xs">Ubah gaji pokok per bulan untuk karyawan STAFF</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Pilih Karyawan STAFF</Label>
                      <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                        <SelectContent>
                          {staffEmployees.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.namaLengkap || emp.name} — {emp.departemen}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Gaji Per Bulan Baru</Label>
                      <Input type="number" placeholder="5000000" value={newStaffSalary} onChange={(e) => setNewStaffSalary(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleUpdateStaffSalary} disabled={loading || !selectedStaffId || !newStaffSalary} variant="outline" className="w-full">
                    {loading ? "Updating..." : "Update Gaji STAFF"}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ==================== STEP 2: Bonus ==================== */}
      {step === 2 && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tambah Bonus per Departemen</CardTitle>
              <CardDescription className="text-xs">Pilih departemen, lalu tentukan bonus sama rata atau beda per karyawan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Departemen</Label>
                  <Select value={bonusDept} onValueChange={setBonusDept}>
                    <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipe Bonus</Label>
                  <Select value={bonusType} onValueChange={(v) => setBonusType(v as "equal" | "different")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equal">Sama Rata</SelectItem>
                      <SelectItem value="different">Beda per Karyawan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nama Bonus</Label>
                  <Input
                    list="bonus-master-list"
                    placeholder="Contoh: Bonus Target Produksi"
                    value={bonusName}
                    onChange={(e) => setBonusName(e.target.value)}
                  />
                  <datalist id="bonus-master-list">
                    {bonusMasterItems.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {bonusMasterItems.length > 0 && (
                    <p className="text-[11px] text-slate-500">Saran dari daftar tersimpan: {bonusMasterItems.slice(0, 5).join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Simpan ke Daftar Bonus</Label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveBonusToMaster}
                      onChange={(e) => setSaveBonusToMaster(e.target.checked)}
                    />
                    Simpan untuk pemakaian berikutnya
                  </label>
                  <p className="text-[11px] text-slate-500">Jika tidak dicentang, bonus ini dianggap sekali pakai.</p>
                </div>
              </div>

              {bonusType === "equal" && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Nominal Bonus</Label>
                  <Input type="number" placeholder="100000" value={equalBonus} onChange={(e) => setEqualBonus(e.target.value)} />
                </div>
              )}

              {bonusType === "different" && bonusDept && deptGaji.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBonusTargets.length > 0 && selectedBonusTargets.length === deptGaji.length}
                        onChange={toggleAllBonusTargets}
                      />
                      Pilih semua
                    </label>
                    <span className="text-xs text-slate-500">{selectedBonusTargets.length} dipilih</span>
                  </div>
                  {deptGaji.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedBonusTargets.includes(g.id)}
                          onChange={() => toggleBonusTarget(g.id)}
                        />
                        <span className="font-medium">{g.karyawan?.namaLengkap || `Karyawan #${g.karyawan?.id || g.id}`}</span>
                        <span className="text-slate-500 ml-2">({g.periodeDisplay || g.periode})</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="w-32"
                        disabled={!selectedBonusTargets.includes(g.id)}
                        value={diffBonuses[g.id] || ""}
                        onChange={(e) => setDiffBonuses((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}

              {bonusDept && deptGaji.length === 0 && (
                <p className="text-sm text-slate-500">Tidak ada data gaji untuk departemen ini di periode ini.</p>
              )}

              <Button onClick={handleAddBonus} disabled={loading || !bonusDept} className="w-full">
                {loading ? "Menyimpan..." : "Tambahkan Bonus"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== STEP 3: Deductions ==================== */}
      {step === 3 && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tambah Potongan</CardTitle>
              <CardDescription className="text-xs">Pilih karyawan, tipe potongan, dan nominal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Karyawan (Data Gaji)</Label>
                <Select value={selectedGajiId} onValueChange={setSelectedGajiId}>
                  <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                  <SelectContent>
                    {data.filter((d) => (d.statusPembayaran || "").toLowerCase() !== "dibayar").map((g: any) => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        {g.karyawan?.namaLengkap || "?"} — {g.karyawan?.departemen || "?"} ({g.periodeDisplay || g.periode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGajiId && (() => {
                const sel = data.find((d) => d.id.toString() === selectedGajiId);
                if (!sel) return null;
                return (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                    <p><span className="text-slate-500">Gaji Pokok:</span> <span className="font-medium">{formatCurrency(sel.gajiPokok)}</span></p>
                    <p><span className="text-slate-500">Bonus:</span> <span className="font-medium">{formatCurrency(sel.bonus)}</span></p>
                    <p><span className="text-slate-500">Potongan saat ini:</span> <span className="font-medium text-red-600">{formatCurrency(sel.potongan)}</span></p>
                    <p><span className="text-slate-500">Gaji Bersih:</span> <span className="font-bold">{formatCurrency(sel.gajiBersih)}</span></p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipe Potongan</Label>
                  <Select value={deductionType} onValueChange={setDeductionType}>
                    <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                    <SelectContent>
                      {DEDUCTION_TYPES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Nominal</Label>
                  <Input type="number" placeholder="50000" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nama Potongan</Label>
                  <Input
                    list="deduction-master-list"
                    placeholder="Contoh: Potongan Denda K3"
                    value={deductionName}
                    onChange={(e) => setDeductionName(e.target.value)}
                  />
                  <datalist id="deduction-master-list">
                    {deductionMasterItems.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {deductionMasterItems.length > 0 && (
                    <p className="text-[11px] text-slate-500">Saran dari daftar tersimpan: {deductionMasterItems.slice(0, 5).join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Simpan ke Daftar Potongan</Label>
                  <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveDeductionToMaster}
                      onChange={(e) => setSaveDeductionToMaster(e.target.checked)}
                    />
                    Simpan untuk pemakaian berikutnya
                  </label>
                  <p className="text-[11px] text-slate-500">Jika tidak dicentang, potongan ini dianggap sekali pakai.</p>
                </div>
              </div>

              <Button onClick={handleAddDeduction} disabled={loading || !selectedGajiId || !deductionType || !deductionAmount} className="w-full">
                {loading ? "Menyimpan..." : "Tambah Potongan"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== Preview Non-Staff ==================== */}
      {mode === "nonstaff" && step < 4 && previewRange && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview Gaji Non-STAFF</CardTitle>
              <CardDescription className="text-xs">
                Periode {previewRange.start} s/d {previewRange.end}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreview(previewRange.start, previewRange.end)}
                  disabled={previewLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${previewLoading ? "animate-spin" : ""}`} />
                  Refresh Preview
                </Button>
                <div className="text-xs text-slate-500">
                  Total data: {previewData.length}
                </div>
              </div>

              {previewLoading ? (
                <div className="text-center py-8 text-slate-500">Memuat preview gaji...</div>
              ) : previewData.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Belum ada data gaji untuk periode ini</div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Nama</TableHead>
                        <TableHead className="text-xs">Departemen</TableHead>
                        <TableHead className="text-xs">Periode</TableHead>
                        <TableHead className="text-xs text-right">Hadir</TableHead>
                        <TableHead className="text-xs text-right">Setengah Hari</TableHead>
                        <TableHead className="text-xs text-right">Gaji Pokok</TableHead>
                        <TableHead className="text-xs text-right">Gaji Bersih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">{item.karyawan?.namaLengkap || "-"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{item.karyawan?.departemen || "-"}</TableCell>
                          <TableCell className="text-xs">{item.periodeDisplay || item.periode || "-"}</TableCell>
                          <TableCell className="text-xs text-right">{item.totalHariMasuk || 0}</TableCell>
                          <TableCell className="text-xs text-right">{item.totalHariSetengahHari || 0}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(item.gajiPokok || 0)}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{formatCurrency(item.gajiBersih || item.totalGajiBersih || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== STEP 4: Rekap & Bayar ==================== */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Date filter */}
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Tanggal Mulai</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Tanggal Akhir</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={loadData} disabled={loading} className="w-full">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{data.length}</p>
                <p className="text-xs text-slate-500">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{unpaidData.length}</p>
                <p className="text-xs text-slate-500">Belum Bayar</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-green-600">{paidData.length}</p>
                <p className="text-xs text-slate-500">Sudah Bayar</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{selectedItems.length}</p>
                <p className="text-xs text-slate-500">Dipilih</p>
              </CardContent>
            </Card>
          </div>

          {/* Tab: Unpaid / Paid */}
          <div className="flex gap-2">
            <Button variant={dataTab === "unpaid" ? "default" : "outline"} size="sm" onClick={() => { setDataTab("unpaid"); setSelectedItems([]); }}>
              Belum Dibayar ({unpaidData.length})
            </Button>
            <Button variant={dataTab === "paid" ? "default" : "outline"} size="sm" onClick={() => { setDataTab("paid"); setSelectedItems([]); }}>
              Sudah Dibayar ({paidData.length})
            </Button>
          </div>

          {/* Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-blue-700">{selectedItems.length} dipilih</span>
              <div className="ml-auto flex gap-2">
                {dataTab === "unpaid" && (
                  <Button size="sm" onClick={handleBatchPay} disabled={batchLoading}>
                    <Printer className="h-4 w-4 mr-1" /> Bayar & Print Slip
                  </Button>
                )}
                {dataTab === "paid" && (
                  <Button size="sm" variant="outline" onClick={handleRevertPay} disabled={batchLoading}>
                    Batalkan Pembayaran
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={async () => {
                  const sel = tabData.filter((d) => selectedItems.includes(d.id));
                  if (sel.length > 0) await downloadSalaryPDF(sel);
                }}>
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  const sel = tabData.filter((d) => selectedItems.includes(d.id));
                  if (sel.length > 0) await previewSalaryPDF(sel);
                }}>
                  <Eye className="h-4 w-4 mr-1" /> Preview PDF
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">Memuat data gaji...</div>
          ) : tabData.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Tidak ada data gaji untuk periode ini</div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10">
                      <input type="checkbox" checked={selectedItems.length === tabData.length && tabData.length > 0} onChange={toggleAll} className="rounded" />
                    </TableHead>
                    <TableHead className="text-xs">Nama</TableHead>
                    <TableHead className="text-xs">Departemen</TableHead>
                    <TableHead className="text-xs">Periode</TableHead>
                    <TableHead className="text-xs text-right">Gaji Pokok</TableHead>
                    <TableHead className="text-xs text-right">Bonus</TableHead>
                    <TableHead className="text-xs text-right">Potongan</TableHead>
                    <TableHead className="text-xs text-right">Gaji Bersih</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabData.map((item: any) => (
                    <TableRow key={item.id} className={selectedItems.includes(item.id) ? "bg-blue-50" : ""}>
                      <TableCell>
                        <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{item.karyawan?.namaLengkap || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.karyawan?.departemen || "-"}</TableCell>
                      <TableCell className="text-xs">{item.periodeDisplay || item.periode || "-"}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(item.gajiPokok || 0)}</TableCell>
                      <TableCell className="text-xs text-right text-green-600">{item.bonus > 0 ? `+${formatCurrency(item.bonus)}` : "-"}</TableCell>
                      <TableCell className="text-xs text-right text-red-600">{item.potongan > 0 ? `-${formatCurrency(item.potongan)}` : "-"}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{formatCurrency(item.gajiBersih || item.totalGajiBersih || 0)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={(item.statusPembayaran || "").toLowerCase() === "dibayar" ? "default" : "secondary"} className="text-[10px]">
                          {(item.statusPembayaran || "belum_dibayar").replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ==================== Navigation ==================== */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((step - 1) as SalaryStep)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
          )}
        </div>
        <div>
          {step < 4 && (
            <Button onClick={() => setStep((step + 1) as SalaryStep)}>
              {step === 1 ? "Lanjut ke Bonus" : step === 2 ? "Lanjut ke Potongan" : "Lanjut ke Rekap"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
