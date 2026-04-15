"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { ArrowLeft, Save, Clock, Download, Search, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { attendanceAPI, employeeAPI } from "@/lib/api";
import { NAMA_PT } from "@/lib/constants/perusahaan";

type AbsensiStatus = "HADIR" | "SETENGAH_HARI" | "IZIN" | "TIDAK_HADIR";

type EmployeeOption = {
  id: number;
  nik: string;
  namaLengkap: string;
  departemen: string;
  lokasiDefault: "PJP" | "SP" | "PRIMA";
};

type AbsensiDraft = {
  status: AbsensiStatus;
  lembur: boolean;
  keterangan: string;
  lokasi: "PJP" | "SP" | "PRIMA";
};

type SaveToast = {
  type: "success" | "error";
  message: string;
} | null;

const LOKASI_OPTIONS: Array<{ value: "PJP" | "SP" | "PRIMA"; label: string }> = [
  { value: "PJP", label: NAMA_PT.PJP },
  { value: "SP", label: NAMA_PT.SP },
  { value: "PRIMA", label: NAMA_PT.PRIMA },
];

const ABSENSI_STATUS_OPTIONS: Array<{ value: AbsensiStatus; label: string }> = [
  { value: "HADIR", label: "Hadir" },
  { value: "SETENGAH_HARI", label: "Setengah Hari" },
  { value: "IZIN", label: "Izin" },
  { value: "TIDAK_HADIR", label: "Tidak Hadir" },
];

const getTodayDate = () => new Date().toLocaleDateString("en-CA");

const formatStatusLabel = (status: AbsensiStatus) => {
  if (status === "HADIR") return "Hadir";
  if (status === "SETENGAH_HARI") return "Setengah Hari";
  if (status === "IZIN") return "Tidak Hadir (Izin)";
  return "Tidak Hadir";
};

const hitungHariEfektif = (status: AbsensiStatus, isLembur: boolean) => {
  let hari = 0;
  if (status === "HADIR") hari = 1;
  if (status === "SETENGAH_HARI") hari = 0.5;
  if (isLembur) hari += 1;
  return hari;
};

export default function NewAttendancePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AbsensiStatus>("all");
  const [showFilteredEmployees, setShowFilteredEmployees] = useState(false);
  const [appliedEmployeeIds, setAppliedEmployeeIds] = useState<number[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<number, AbsensiDraft>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [error, setError] = useState("");
  const [saveToast, setSaveToast] = useState<SaveToast>(null);
  const [submitStats, setSubmitStats] = useState<{
    successCount: number;
    failCount: number;
    hadirCount: number;
    setengahHariCount: number;
    lemburCount: number;
    izinCount: number;
    tidakHadirCount: number;
  } | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const buildInitialAbsensiMap = (employeeList: EmployeeOption[]) => {
    const initialMap: Record<number, AbsensiDraft> = {};
    employeeList.forEach((emp) => {
      initialMap[emp.id] = {
        status: "HADIR",
        lembur: false,
        keterangan: "",
        lokasi: emp.lokasiDefault,
      };
    });
    return initialMap;
  };

  const showSaveToast = (type: "success" | "error", message: string) => {
    setSaveToast({ type, message });
    window.setTimeout(() => {
      setSaveToast((current) => (current?.message === message ? null : current));
    }, 2500);
  };

  const resetAttendanceForm = () => {
    setSelectedDate(getTodayDate());
    setSelectedDept("all");
    setSearchName("");
    setStatusFilter("all");
    setAppliedEmployeeIds([]);
    setShowFilteredEmployees(false);
    setSubmitStats(null);
    setAbsensiMap(buildInitialAbsensiMap(employees));
  };

  const fetchEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const data = await employeeAPI.getAll();
      const mappedEmployees: EmployeeOption[] = data.map((emp: any) => ({
        id: Number(emp.id),
        namaLengkap: emp.namaLengkap || emp.name || "(Tanpa Nama)",
        nik: emp.nik || emp.nip || "(Tanpa NIK)",
        departemen: emp.departemen || "Lainnya",
        lokasiDefault: ["PJP", "SP", "PRIMA"].includes((emp.lokasiDefault || "").toUpperCase())
          ? (emp.lokasiDefault.toUpperCase() as "PJP" | "SP" | "PRIMA")
          : "PJP",
      }));

      setEmployees(mappedEmployees);
      setAbsensiMap(buildInitialAbsensiMap(mappedEmployees));
    } catch (err) {
      setError("Gagal memuat data karyawan");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const uniqueDepartments = Array.from(
    new Set(employees.map((emp) => emp.departemen).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filteredEmployees = employees.filter((emp) => {
    if (selectedDept !== "all" && emp.departemen !== selectedDept) return false;
    if (
      searchName &&
      !emp.namaLengkap.toLowerCase().includes(searchName.toLowerCase()) &&
      !emp.nik.toLowerCase().includes(searchName.toLowerCase())
    ) {
      return false;
    }
    if (statusFilter !== "all") {
      const status = absensiMap[emp.id]?.status || "HADIR";
      if (status !== statusFilter) return false;
    }
    return true;
  });

  const displayedEmployees = showFilteredEmployees
    ? employees.filter((emp) => appliedEmployeeIds.includes(emp.id))
    : [];

  const summary = displayedEmployees.reduce(
    (acc, emp) => {
      const currentStatus = absensiMap[emp.id]?.status || "HADIR";
      const isLembur = Boolean(absensiMap[emp.id]?.lembur);
      acc.total += 1;
      if (currentStatus === "HADIR") acc.hadir += 1;
      if (currentStatus === "SETENGAH_HARI") acc.setengahHari += 1;
      if (currentStatus === "IZIN") acc.izin += 1;
      if (currentStatus === "TIDAK_HADIR") acc.tidakHadir += 1;
      if (isLembur) acc.lembur += 1;
      return acc;
    },
    { total: 0, hadir: 0, setengahHari: 0, lembur: 0, izin: 0, tidakHadir: 0 }
  );

  const applyFilter = () => {
    setAppliedEmployeeIds(filteredEmployees.map((emp) => emp.id));
    setShowFilteredEmployees(true);
    setSubmitStats(null);
  };

  const resetFilter = () => {
    setSelectedDept("all");
    setSearchName("");
    setStatusFilter("all");
    setAppliedEmployeeIds([]);
    setShowFilteredEmployees(false);
  };

  const updateAbsensi = (employeeId: number, patch: Partial<AbsensiDraft>) => {
    setAbsensiMap((prev) => {
      const current = prev[employeeId] || {
        status: "HADIR" as AbsensiStatus,
        lembur: false,
        keterangan: "",
        lokasi: "PJP",
      };

      const next: AbsensiDraft = { ...current, ...patch };

      return {
        ...prev,
        [employeeId]: next,
      };
    });
  };

  const setAllStatusForDisplayed = (status: AbsensiStatus) => {
    setAbsensiMap((prev) => {
      const next = { ...prev };
      displayedEmployees.forEach((emp) => {
        const prevData = next[emp.id] || {
          status: "HADIR" as AbsensiStatus,
          lembur: false,
          keterangan: "",
          lokasi: emp.lokasiDefault,
        };
        next[emp.id] = {
          ...prevData,
          status,
        };
      });
      return next;
    });
  };

  const exportPDF = async () => {
    if (!showFilteredEmployees || displayedEmployees.length === 0) {
      setError("Tidak ada data terfilter untuk diekspor");
      return;
    }

    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(14);
      doc.text("Laporan Absensi Divisi", 14, 14);
      doc.setFontSize(10);
      doc.text(`Tanggal: ${selectedDate}`, 14, 21);
      doc.text(`Divisi: ${selectedDept === "all" ? "Semua Divisi" : selectedDept}`, 14, 27);

      autoTable(doc, {
        startY: 32,
        head: [["Ringkasan", "Jumlah"]],
        body: [
          ["Total Karyawan Diisi", String(summary.total)],
          ["Hadir", String(summary.hadir)],
          ["Setengah Hari", String(summary.setengahHari)],
          ["Lembur", String(summary.lembur)],
          ["Izin", String(summary.izin)],
          ["Tidak Hadir", String(summary.tidakHadir)],
        ],
        styles: { fontSize: 9 },
      });

      const rows = displayedEmployees
        .map((emp) => {
          const item = absensiMap[emp.id] || {
            status: "HADIR" as AbsensiStatus,
            lembur: false,
            keterangan: "",
            lokasi: emp.lokasiDefault,
          };

          return {
            tanggal: selectedDate,
            nama: emp.namaLengkap,
            status: formatStatusLabel(item.status),
            lembur: item.lembur ? "Lembur" : "-",
            hariEfektif: String(hitungHariEfektif(item.status, item.lembur)),
            keterangan: item.keterangan?.trim() || "-",
          };
        });

      if (rows.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 8,
          head: [["Tanggal", "Nama", "Status Kehadiran", "Lembur", "Hari Efektif", "Keterangan"]],
          body: rows.map((row) => [
            row.tanggal,
            row.nama,
            row.status,
            row.lembur,
            row.hariEfektif,
            row.keterangan,
          ]),
          styles: { fontSize: 9 },
        });
      }

      doc.save(`laporan-absensi-${selectedDate}.pdf`);
      setError("");
    } catch (err) {
      setError("Gagal mengekspor PDF");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!showFilteredEmployees || displayedEmployees.length === 0) {
      const message = "Terapkan filter dulu lalu pastikan ada karyawan yang ditampilkan";
      setError(message);
      showSaveToast("error", message);
      return;
    }

    setIsLoading(true);
    setError("");
    setSaveToast(null);
    setSubmitStats(null);

    try {
      await attendanceAPI.submitBulk({
        tanggal: selectedDate,
        data: displayedEmployees.map((emp) => ({
          karyawanId: emp.id,
          status: absensiMap[emp.id]?.status || "HADIR",
          isLembur: Boolean(absensiMap[emp.id]?.lembur),
          lokasi: absensiMap[emp.id]?.lokasi || emp.lokasiDefault,
          keterangan: absensiMap[emp.id]?.keterangan?.trim() || undefined,
        })),
      });

      const successCount = displayedEmployees.length;
      const failCount = 0;

      setSubmitStats({
        successCount,
        failCount,
        hadirCount: summary.hadir,
        setengahHariCount: summary.setengahHari,
        lemburCount: summary.lembur,
        izinCount: summary.izin,
        tidakHadirCount: summary.tidakHadir,
      });

      if (successCount > 0) {
        showSaveToast("success", "Absensi berhasil disimpan");
        resetAttendanceForm();
      }

    } catch (err) {
      const message = "Gagal mencatat absensi. Silakan coba lagi.";
      setError(message);
      showSaveToast("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingEmployees) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Input Absensi Massal</h1>
          <p className="text-muted-foreground">
            Optimasi absensi untuk jumlah karyawan besar
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {submitStats && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              Rekap kirim: Hadir {submitStats.hadirCount}, Setengah Hari {submitStats.setengahHariCount}, Lembur {submitStats.lemburCount},
              Izin {submitStats.izinCount}, Tidak Hadir {submitStats.tidakHadirCount}.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Informasi Absensi
            </CardTitle>
            <CardDescription>
              Filter dulu agar input lebih cepat, lalu kirim absensi dalam batch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal Absensi *</Label>
                <Input
                  id="tanggal"
                  name="tanggal"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Filter Divisi</Label>
                <Select
                  value={selectedDept}
                  onValueChange={(value) => {
                    setSelectedDept(value);
                    setAppliedEmployeeIds([]);
                    setShowFilteredEmployees(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Divisi</SelectItem>
                    {uniqueDepartments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-name">Cari Karyawan</Label>
                <Input
                  id="search-name"
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value);
                    setAppliedEmployeeIds([]);
                    setShowFilteredEmployees(false);
                  }}
                  placeholder="Nama atau NIK"
                />
              </div>

              <div className="space-y-2">
                <Label>Filter Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as "all" | AbsensiStatus);
                    setAppliedEmployeeIds([]);
                    setShowFilteredEmployees(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {ABSENSI_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" variant="outline" onClick={applyFilter}>
                <Search className="h-4 w-4 mr-2" />
                Terapkan Filter
              </Button>
              <Button type="button" variant="outline" onClick={resetFilter}>
                Reset Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAllStatusForDisplayed("HADIR")}
                disabled={displayedEmployees.length === 0}
              >
                Set Semua Hadir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAllStatusForDisplayed("TIDAK_HADIR")}
                disabled={displayedEmployees.length === 0}
              >
                Set Semua Tidak Hadir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportPDF}
                disabled={displayedEmployees.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="p-3 rounded border bg-indigo-50 border-indigo-200">
                <p className="text-xs text-indigo-800">Total Diisi</p>
                <p className="text-xl font-bold text-indigo-900">{summary.total}</p>
              </div>
              <div className="p-3 rounded border bg-green-50 border-green-200">
                <p className="text-xs text-green-800">Hadir</p>
                <p className="text-xl font-bold text-green-900">{summary.hadir}</p>
              </div>
              <div className="p-3 rounded border bg-orange-50 border-orange-200">
                <p className="text-xs text-orange-800">Setengah Hari</p>
                <p className="text-xl font-bold text-orange-900">{summary.setengahHari}</p>
              </div>
              <div className="p-3 rounded border bg-yellow-50 border-yellow-200">
                <p className="text-xs text-yellow-800">Lembur</p>
                <p className="text-xl font-bold text-yellow-900">{summary.lembur}</p>
              </div>
              <div className="p-3 rounded border bg-blue-50 border-blue-200">
                <p className="text-xs text-blue-800">Izin</p>
                <p className="text-xl font-bold text-blue-900">{summary.izin}</p>
              </div>
              <div className="p-3 rounded border bg-red-50 border-red-200">
                <p className="text-xs text-red-800">Tidak Hadir</p>
                <p className="text-xl font-bold text-red-900">{summary.tidakHadir}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-72">Karyawan</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-36">Lokasi</TableHead>
                    <TableHead className="w-24">Lembur</TableHead>
                    <TableHead className="w-28">Hari Efektif</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!showFilteredEmployees ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        Gunakan filter lalu klik Terapkan Filter untuk menampilkan daftar.
                      </TableCell>
                    </TableRow>
                  ) : displayedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                        Tidak ada karyawan sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedEmployees.map((employee) => {
                      const rowData = absensiMap[employee.id] || {
                        status: "HADIR" as AbsensiStatus,
                        lembur: false,
                        keterangan: "",
                        lokasi: employee.lokasiDefault,
                      };

                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="font-medium">{employee.namaLengkap}</div>
                            <div className="text-xs text-gray-500">
                              {employee.nik} • {employee.departemen}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={rowData.status}
                              onValueChange={(value) =>
                                updateAbsensi(employee.id, {
                                  status: value as AbsensiStatus,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ABSENSI_STATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={rowData.lokasi}
                              onValueChange={(value: "PJP" | "SP" | "PRIMA") =>
                                updateAbsensi(employee.id, {
                                  lokasi: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LOKASI_OPTIONS.map((lokasi) => (
                                  <SelectItem key={lokasi.value} value={lokasi.value}>
                                    {lokasi.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={Boolean(rowData.lembur)}
                              onChange={(e) =>
                                updateAbsensi(employee.id, {
                                  lembur: e.target.checked,
                                })
                              }
                              className="w-4 h-4"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex min-w-14 justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-700">
                              {hitungHariEfektif(rowData.status, rowData.lembur)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {rowData.status === "IZIN" || rowData.status === "TIDAK_HADIR" ? (
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Keterangan (opsional)</Label>
                                <Input
                                  value={rowData.keterangan}
                                  onChange={(e) =>
                                    updateAbsensi(employee.id, {
                                      keterangan: e.target.value,
                                    })
                                  }
                                  placeholder="Contoh: sakit, keperluan keluarga, dll"
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/attendance")}
          >
            Lihat Data Absensi
          </Button>
          <Button type="submit" disabled={isLoading || displayedEmployees.length === 0}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Mengirim...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Absensi Massal
              </>
            )}
          </Button>
        </div>
      </form>

      {saveToast && (
        <div className="pointer-events-none fixed right-5 top-5 z-50">
          <div
            style={{ animation: "toastPop 220ms ease-out" }}
            className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-lg animate-pulse ${
              saveToast.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            {saveToast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{saveToast.message}</span>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes toastPop {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
