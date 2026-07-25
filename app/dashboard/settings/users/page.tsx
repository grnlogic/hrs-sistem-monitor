"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  LokasiCode,
  SystemRole,
  SystemUser,
  attendanceAPI,
  employeeAPI,
  leaveAPI,
  salaryAPI,
  userManagementAPI,
} from "@/lib/api";

import { UserFormCard } from "./_components/user-form-card";
import { UserTable } from "./_components/user-table";
import { ImportExcelCard } from "./_components/import-excel-card";
import { DangerZoneCard } from "./_components/danger-zone-card";
import { LeaveQuotaCard } from "./_components/leave-quota-card";
import { ImportLoadingDialog } from "./_components/import-loading-dialog";
import type { ImportErrorRow, ImportSummary } from "./_components/types";

const IMPORT_HEADERS = [
  "nik",
  "namaLengkap",
  "departemen",
  "jabatan",
  "statusKaryawan",
  "lokasiDefault",
  "gajiPerHari",
  "gajiPerBulan",
  "bpjsKesehatan",
  "alamat",
  "tanggalMasuk",
] as const;

const DEPARTEMEN_OPTIONS = ["Blending", "Packing", "Sales", "Staff", "Linting"] as const;
const ROLE_OPTIONS = ["Karyawan", "Supervisor", "Manager"] as const;
const STATUS_KARYAWAN_OPTIONS = ["TETAP", "KONTRAK"] as const;
const LOKASI_OPTIONS = ["PJP", "SP", "PRIMA"] as const;

type ImportTemplateRow = Record<(typeof IMPORT_HEADERS)[number], string | number>;

const toUpperTrim = (value: unknown) => String(value ?? "").trim().toUpperCase();

const toTitleTrim = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
};

const toPositiveNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value > 0 ? value : null;
  let str = String(value).trim();
  if (!str) return null;
  str = str.replace(/^(rp|idr)\.?\s*/i, "").replace(/[,.]00$/, "").replace(/[.,\s]/g, "");
  const num = Number(str);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const normalizeDate = (value: unknown) => {
  if (!value) return new Date().toISOString().slice(0, 10);

  if (typeof value === "number") {
    if (value >= 1900 && value <= 2100) return `${value}-01-01`;
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }

  const str = String(value).trim();
  if (!str) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}$/.test(str)) return `${str}-01-01`;
  const parsedDate = new Date(str);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsedDate.toISOString().slice(0, 10);
};

const initialForm = {
  username: "",
  namaLengkap: "",
  email: "",
  password: "",
  role: "HRD" as SystemRole,
  lokasi: null as LokasiCode | null,
};

export default function UserManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importErrors, setImportErrors] = useState<ImportErrorRow[]>([]);
  const [dangerLoading, setDangerLoading] = useState<"absensi" | "karyawan" | "gaji" | null>(null);
  const [isResettingLeaveQuota, setIsResettingLeaveQuota] = useState(false);
  const [resetDraftPeriodeAwal, setResetDraftPeriodeAwal] = useState(new Date().toISOString().slice(0, 10));
  const [resetDraftPeriodeAkhir, setResetDraftPeriodeAkhir] = useState(new Date().toISOString().slice(0, 10));
  const [resetDraftKaryawanId, setResetDraftKaryawanId] = useState("");

  const isHRD = session?.user?.role === "HRD";
  const isNewYearWindow = new Date().getMonth() === 0;

  const title = useMemo(
    () => (editingId ? "Edit User" : "Tambah User Baru"),
    [editingId]
  );

  useEffect(() => {
    if (session?.user?.role === "AKUNTANSI") {
      router.push("/dashboard/salary/staff");
      return;
    }

    if (session?.user?.role === "HRD") {
      loadUsers();
    }
  }, [session, router]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await userManagementAPI.getAll();
      setUsers(Array.isArray(result) ? result : []);
    } catch (e) {
      setError("Gagal memuat daftar user. Pastikan endpoint /users tersedia.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (form.role === "AKUNTANSI" && !form.lokasi) {
      setSaving(false);
      setError("Akun Akuntansi wajib memiliki lokasi");
      return;
    }

    try {
      if (editingId) {
        await userManagementAPI.update(editingId, {
          username: form.username,
          namaLengkap: form.namaLengkap,
          email: form.email || "",
          role: form.role,
          lokasi: form.role === "AKUNTANSI" ? form.lokasi : null,
          ...(form.password ? { password: form.password } : {}),
        });
        setMessage("User berhasil diperbarui.");
      } else {
        await userManagementAPI.create({
          ...form,
          lokasi: form.role === "AKUNTANSI" ? form.lokasi : null,
        });
        setMessage("User berhasil dibuat.");
      }

      resetForm();
      await loadUsers();
    } catch (e) {
      setError("Gagal menyimpan user.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      namaLengkap: user.namaLengkap,
      email: user.email || "",
      password: "",
      role: user.role,
      lokasi: user.lokasi || null,
    });
  };

  const handleDeactivate = async (id: string) => {
    setError("");
    setMessage("");
    try {
      await userManagementAPI.deactivate(id);
      setMessage("User berhasil dinonaktifkan.");
      await loadUsers();
    } catch (e) {
      setError("Gagal menonaktifkan user.");
    }
  };

  const downloadTemplateExcel = () => {
    const sampleRow: ImportTemplateRow = {
      nik: "3276010203040001",
      namaLengkap: "Contoh Karyawan",
      departemen: "Blending",
      jabatan: "Karyawan",
      statusKaryawan: "KONTRAK",
      lokasiDefault: "PJP",
      gajiPerHari: 95000,
      gajiPerBulan: "",
      bpjsKesehatan: 120000,
      alamat: "Dusun Cikadu RT 03/RW 05",
      tanggalMasuk: new Date().toISOString().slice(0, 10),
    };

    const templateSheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: [...IMPORT_HEADERS],
      skipHeader: false,
    });

    const panduanRows = [
      { kolom: "departemen", aturan: "Blending, Packing, Sales, Staff, Linting" },
      { kolom: "jabatan", aturan: "Karyawan, Supervisor, Manager" },
      { kolom: "statusKaryawan", aturan: "TETAP atau KONTRAK" },
      { kolom: "lokasiDefault", aturan: "PJP, SP, atau PRIMA" },
      {
        kolom: "gajiPerBulan / gajiPerHari",
        aturan:
          "Boleh dikosongkan (opsional) jika data belum diketahui. Non-Staff (seperti Sales/motoris) juga bisa diisi gajiPerBulan jika sistem pembayarannya bulanan.",
      },
      {
        kolom: "tanggalMasuk",
        aturan: "Format tanggal YYYY-MM-DD. Jika dikosongkan akan otomatis diisi tanggal hari ini.",
      },
    ];
    const panduanSheet = XLSX.utils.json_to_sheet(panduanRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");
    XLSX.utils.book_append_sheet(workbook, panduanSheet, "Panduan");
    XLSX.writeFile(workbook, "template-karyawan-padud.xlsx");
  };

  const parseAndValidateRow = (row: Record<string, unknown>, rowNumber: number) => {
    const nik = String(row.nik ?? "").trim();
    const namaLengkap = String(row.namaLengkap ?? "").trim();
    const departemenRaw = toTitleTrim(row.departemen);
    const jabatanRaw = toTitleTrim(row.jabatan);
    const statusKaryawanRaw = toUpperTrim(row.statusKaryawan);
    const lokasiDefaultRaw = toUpperTrim(row.lokasiDefault);
    const gajiPerHari = toPositiveNumber(row.gajiPerHari);
    const gajiPerBulan = toPositiveNumber(row.gajiPerBulan);
    const alamat = String(row.alamat ?? "").trim();
    const tanggalMasuk = normalizeDate(row.tanggalMasuk);
    const bpjsKesehatanValue = row.bpjsKesehatan;
    const bpjsRaw = String(row.bpjsKesehatan ?? "").trim();
    const bpjsClean = bpjsRaw.replace(/^(rp|idr)\.?\s*/i, "").replace(/[,.]00$/, "").replace(/[.,\s]/g, "");
    const bpjsKesehatan = bpjsClean || "0";

    const errors: string[] = [];

    let finalNik = nik;
    if (!finalNik) {
      // Buatkan NIK sementara jika kosong agar tetap bisa diproses
      finalNik = `TEMP-${Math.floor(Math.random() * 10000)}-${rowNumber}`;
    }

    const finalNama = namaLengkap || `Tanpa Nama (Baris ${rowNumber})`;

    if (departemenRaw && !DEPARTEMEN_OPTIONS.includes(departemenRaw as (typeof DEPARTEMEN_OPTIONS)[number])) {
      errors.push("Divisi harus Blending, Packing, Sales, Staff, atau Linting");
    }
    if (jabatanRaw && !ROLE_OPTIONS.includes(jabatanRaw as (typeof ROLE_OPTIONS)[number])) {
      errors.push("Role harus Karyawan, Supervisor, atau Manager");
    }
    if (statusKaryawanRaw && !STATUS_KARYAWAN_OPTIONS.includes(statusKaryawanRaw as (typeof STATUS_KARYAWAN_OPTIONS)[number])) {
      errors.push("Status harus TETAP atau KONTRAK");
    }
    if (lokasiDefaultRaw && !LOKASI_OPTIONS.includes(lokasiDefaultRaw as (typeof LOKASI_OPTIONS)[number])) {
      errors.push("Lokasi harus PJP, SP, atau PRIMA");
    }

    // Gaji tidak lagi diwajibkan untuk diisi saat import, bisa menyusul


    if (errors.length > 0) {
      return {
        ok: false as const,
        error: {
          row: rowNumber,
          nama: namaLengkap || "-",
          error: errors.join("; "),
        },
      };
    }

    const departemenMap: Record<(typeof DEPARTEMEN_OPTIONS)[number], string> = {
      Blending: "BLENDING",
      Packing: "PACKING",
      Sales: "SALES",
      Staff: "STAFF",
      Linting: "LINTING",
    };

    return {
      ok: true as const,
      data: {
        nik: finalNik,
        namaLengkap: finalNama,
        departemen: departemenMap[departemenRaw as (typeof DEPARTEMEN_OPTIONS)[number]] || departemenRaw || null,
        jabatan: jabatanRaw || null,
        statusKaryawan: statusKaryawanRaw || "AKTIF",
        lokasiDefault: lokasiDefaultRaw || "PJP",
        gajiPerHari: gajiPerHari ?? 0,
        gajiPerBulan: gajiPerBulan ?? null,
        bpjsKesehatan,
        alamat,
        tanggalMasuk,
      },
    };
  };

  const handleImportExcel = async () => {
    if (!selectedImportFile) {
      setImportError("Pilih file .xlsx terlebih dahulu.");
      return;
    }

    setIsImporting(true);
    setImportError("");
    setImportMessage("");
    setImportSummary(null);
    setImportErrors([]);

    try {
      const buffer = await selectedImportFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        setImportError("Sheet template tidak ditemukan.");
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: "",
      });

      const rows = rawRows.map((row) => {
        const normalized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          normalized[safeKey] = val;
        }
        return {
          nik: normalized.nik,
          namaLengkap: normalized.namalengkap || normalized.nama,
          departemen: normalized.departemen || normalized.divisi,
          jabatan: normalized.jabatan || normalized.role,
          statusKaryawan: normalized.statuskaryawan || normalized.status,
          lokasiDefault: normalized.lokasidefault || normalized.lokasidefaul || normalized.lokasi,
          gajiPerHari: normalized.gajiperhari,
          gajiPerBulan: normalized.gajiperbulan,
          bpjsKesehatan: normalized.bpjskesehatan || normalized.bpjs,
          alamat: normalized.alamat,
          tanggalMasuk: normalized.tanggalmasuk || normalized.tahunmasuk || normalized.tahun,
        };
      });

      const filteredRows = rows.filter((row) => {
        return Object.values(row).some((val) => val !== undefined && val !== null && String(val).trim() !== "");
      });

      if (filteredRows.length === 0) {
        setImportError("File Excel kosong. Isi minimal 1 baris data.");
        return;
      }

      const rowErrors: ImportErrorRow[] = [];
      const validPayloads: Array<{ payload: Record<string, unknown>; rowNum: number }> = [];

      filteredRows.forEach((row, idx) => {
        const result = parseAndValidateRow(row, idx + 2);
        if (result.ok) {
          validPayloads.push({ payload: result.data, rowNum: idx + 2 });
        } else {
          rowErrors.push(result.error);
        }
      });

      let imported = 0;
      let failed = 0;

      for (const item of validPayloads) {
        try {
          await employeeAPI.create(item.payload);
          imported += 1;
        } catch (e: any) {
          failed += 1;
          rowErrors.push({
            row: item.rowNum,
            nama: String(item.payload.namaLengkap || "-"),
            error: e?.response?.data?.message || e?.message || "Gagal menyimpan ke database (kemungkinan NIK sudah terdaftar)",
          });
        }
      }

      const summary: ImportSummary = {
        total: filteredRows.length,
        valid: validPayloads.length,
        invalid: rowErrors.length,
        imported,
        failed,
      };

      setImportSummary(summary);
      setImportErrors(rowErrors);

      if (summary.imported > 0) {
        setImportMessage(`Import selesai. Berhasil: ${summary.imported}, Gagal API: ${summary.failed}.`);
      }
      if (summary.imported === 0 && rowErrors.length > 0) {
        setImportError("Tidak ada data valid yang berhasil di-import. Periksa tabel error.");
      }
    } catch (e) {
      setImportError("Gagal membaca file Excel. Pastikan format .xlsx benar.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAllAbsensi = async () => {
    setError("");
    setMessage("");

    const confirmStep1 = window.confirm(
      "PERINGATAN: Ini akan menghapus SELURUH data absensi. Lanjutkan?"
    );
    if (!confirmStep1) return;

    const confirmText = window.prompt(
      "Ketik HAPUS ABSENSI untuk konfirmasi:"
    );
    if (confirmText !== "HAPUS ABSENSI") {
      setError("Konfirmasi gagal. Data absensi tidak dihapus.");
      return;
    }

    try {
      setDangerLoading("absensi");
      const result = await attendanceAPI.clearAll();
      setMessage(
        `Sukses clear absensi. Total terhapus: ${Number(result?.deletedCount || 0)}`
      );
    } catch (e) {
      setError("Gagal force clear seluruh absensi.");
    } finally {
      setDangerLoading(null);
    }
  };

  const handleForceDeleteAllKaryawan = async () => {
    setError("");
    setMessage("");

    const confirmStep1 = window.confirm(
      "PERINGATAN BERAT: Ini akan menghapus SELURUH data karyawan beserta absensi, gaji, cuti, pelanggaran, dan PKB. Lanjutkan?"
    );
    if (!confirmStep1) return;

    const confirmText = window.prompt(
      "Ketik HAPUS KARYAWAN SEMUA untuk konfirmasi:"
    );
    if (confirmText !== "HAPUS KARYAWAN SEMUA") {
      setError("Konfirmasi gagal. Data karyawan tidak dihapus.");
      return;
    }

    try {
      setDangerLoading("karyawan");
      const result = await employeeAPI.forceDeleteAll();
      const count = Number(result?.deletedKaryawanCount || 0);
      setMessage(`Sukses force delete seluruh karyawan. Total ID terhapus: ${count}`);
      await loadUsers();
    } catch (e) {
      setError("Gagal force delete seluruh karyawan.");
    } finally {
      setDangerLoading(null);
    }
  };

  const handleResetDraftGajiNonStaff = async () => {
    setError("");
    setMessage("");

    if (!resetDraftPeriodeAwal || !resetDraftPeriodeAkhir) {
      setError("Periode awal dan akhir wajib diisi.");
      return;
    }

    if (new Date(resetDraftPeriodeAkhir) < new Date(resetDraftPeriodeAwal)) {
      setError("Periode akhir tidak boleh lebih kecil dari periode awal.");
      return;
    }

    const targetLabel = resetDraftKaryawanId.trim()
      ? `ID Karyawan ${resetDraftKaryawanId.trim()}`
      : "seluruh karyawan non-staff";

    const confirmStep1 = window.confirm(
      `PERINGATAN: Ini akan MENGHAPUS draft gaji non-staff (${targetLabel}) dengan status Belum Dibayar pada periode ${resetDraftPeriodeAwal} s/d ${resetDraftPeriodeAkhir}. Data absensi tidak ikut dihapus. Lanjutkan?`
    );
    if (!confirmStep1) return;

    const confirmText = window.prompt("Ketik RESET DRAFT GAJI untuk konfirmasi:");
    if (confirmText !== "RESET DRAFT GAJI") {
      setError("Konfirmasi gagal. Draft gaji tidak direset.");
      return;
    }

    try {
      setDangerLoading("gaji");
      const result = await salaryAPI.resetDraftNonStaff({
        periodeAwal: resetDraftPeriodeAwal,
        periodeAkhir: resetDraftPeriodeAkhir,
        karyawanId: resetDraftKaryawanId.trim() || undefined,
      });
      setMessage(
        `Sukses reset draft gaji non-staff. Ditemukan: ${Number(result?.matched || 0)}, Dihapus: ${Number(
          (result as any)?.deleted ?? result?.updated ?? 0
        )}. Absensi tidak dihapus.`
      );
    } catch (e) {
      setError("Gagal reset draft gaji non-staff.");
    } finally {
      setDangerLoading(null);
    }
  };

  const handleResetJatahTahunan = async () => {
    const isConfirmed = window.confirm(
      "Reset jatah cuti tahunan untuk tahun berjalan? Proses ini akan membuat jatah default untuk karyawan yang belum punya jatah tahun ini."
    );
    if (!isConfirmed) return;

    setError("");
    setMessage("");
    setIsResettingLeaveQuota(true);

    try {
      const result = await leaveAPI.resetAnnualQuota();
      setMessage(
        `Reset jatah cuti tahunan tahun ${result?.tahun}. Ditambahkan: ${Number(result?.created || 0)}, sudah ada: ${Number(
          result?.skipped || 0
        )}.`
      );
    } catch (e) {
      setError("Gagal reset jatah cuti tahunan.");
    } finally {
      setIsResettingLeaveQuota(false);
    }
  };

  if (!isHRD) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Memuat akses manajemen user...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan · Manajemen User</h1>
        <p className="text-sm text-muted-foreground">
          HRD dapat membuat akun baru, edit akun, dan nonaktifkan akun user.
        </p>
      </div>

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

      <UserFormCard
        form={form}
        setForm={setForm}
        editingId={editingId}
        saving={saving}
        title={title}
        onSubmit={handleSubmit}
        onResetForm={resetForm}
      />

      <UserTable
        users={users}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      <ImportExcelCard
        isImporting={isImporting}
        importError={importError}
        importMessage={importMessage}
        importSummary={importSummary}
        importErrors={importErrors}
        selectedImportFile={selectedImportFile}
        onFileChange={(e) => {
          const file = e.target.files?.[0] || null;
          setSelectedImportFile(file);
          setImportError("");
          setImportMessage("");
        }}
        onDownloadTemplate={downloadTemplateExcel}
        onImport={handleImportExcel}
      />

      <DangerZoneCard
        dangerLoading={dangerLoading}
        resetDraftPeriodeAwal={resetDraftPeriodeAwal}
        resetDraftPeriodeAkhir={resetDraftPeriodeAkhir}
        resetDraftKaryawanId={resetDraftKaryawanId}
        onSetResetDraftPeriodeAwal={setResetDraftPeriodeAwal}
        onSetResetDraftPeriodeAkhir={setResetDraftPeriodeAkhir}
        onSetResetDraftKaryawanId={setResetDraftKaryawanId}
        onClearAllAbsensi={handleClearAllAbsensi}
        onForceDeleteAllKaryawan={handleForceDeleteAllKaryawan}
        onResetDraftGajiNonStaff={handleResetDraftGajiNonStaff}
      />

      {isNewYearWindow && (
        <LeaveQuotaCard
          isResettingLeaveQuota={isResettingLeaveQuota}
          onReset={handleResetJatahTahunan}
        />
      )}

      {/* Pop up loading import */}
      <ImportLoadingDialog isImporting={isImporting} />
    </div>
  );
}
