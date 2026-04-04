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
import { ArrowLeft, Save, Clock, Download, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { attendanceAPI, employeeAPI, publicSetengahHariAPI } from "@/lib/api";

type AbsensiStatus = "HADIR" | "SAKIT" | "IZIN" | "ALPA" | "OFF";

type EmployeeOption = {
  id: number;
  nik: string;
  namaLengkap: string;
  departemen: string;
};

type AbsensiDraft = {
  status: AbsensiStatus;
  lembur: boolean;
  setengahHari: boolean;
  keterangan: string;
};

const ABSENSI_STATUS_OPTIONS: Array<{ value: AbsensiStatus; label: string }> = [
  { value: "HADIR", label: "Hadir" },
  { value: "SAKIT", label: "Sakit" },
  { value: "IZIN", label: "Izin" },
  { value: "ALPA", label: "Alpa" },
  { value: "OFF", label: "Off" },
];

const getTodayDate = () => new Date().toLocaleDateString("en-CA");

const isPresentStatus = (status: AbsensiStatus) => status === "HADIR";

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
  const [success, setSuccess] = useState("");
  const [submitStats, setSubmitStats] = useState<{
    successCount: number;
    failCount: number;
    hadirCount: number;
    lemburCount: number;
    izinCount: number;
    sakitCount: number;
    alpaCount: number;
    offCount: number;
  } | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const data = await employeeAPI.getAll();
      const mappedEmployees: EmployeeOption[] = data.map((emp: any) => ({
        id: Number(emp.id),
        namaLengkap: emp.namaLengkap || emp.name || "(Tanpa Nama)",
        nik: emp.nik || emp.nip || "(Tanpa NIK)",
        departemen: emp.departemen || "Lainnya",
      }));

      setEmployees(mappedEmployees);

      const initialMap: Record<number, AbsensiDraft> = {};
      mappedEmployees.forEach((emp) => {
        initialMap[emp.id] = {
          status: "HADIR",
          lembur: false,
          setengahHari: false,
          keterangan: "",
        };
      });
      setAbsensiMap(initialMap);
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
      if (currentStatus === "HADIR" && isLembur) acc.lembur += 1;
      if (currentStatus === "SAKIT") acc.sakit += 1;
      if (currentStatus === "IZIN") acc.izin += 1;
      if (currentStatus === "ALPA") acc.alpa += 1;
      if (currentStatus === "OFF") acc.off += 1;
      return acc;
    },
    { total: 0, hadir: 0, lembur: 0, sakit: 0, izin: 0, alpa: 0, off: 0 }
  );

  const applyFilter = () => {
    setAppliedEmployeeIds(filteredEmployees.map((emp) => emp.id));
    setShowFilteredEmployees(true);
    setSuccess("");
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
        setengahHari: false,
        keterangan: "",
      };

      const next: AbsensiDraft = { ...current, ...patch };
      if (!isPresentStatus(next.status)) {
        next.lembur = false;
        next.setengahHari = false;
      }

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
          setengahHari: false,
          keterangan: "",
        };
        next[emp.id] = {
          ...prevData,
          status,
          lembur: isPresentStatus(status) ? prevData.lembur : false,
          setengahHari: isPresentStatus(status) ? prevData.setengahHari : false,
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
          ["Hadir (termasuk lembur)", String(summary.hadir)],
          ["Lembur", String(summary.lembur)],
          ["Sakit", String(summary.sakit)],
          ["Izin", String(summary.izin)],
          ["Alpa", String(summary.alpa)],
          ["Off", String(summary.off)],
        ],
        styles: { fontSize: 9 },
      });

      const izinSakitRows = displayedEmployees
        .map((emp) => {
          const item = absensiMap[emp.id] || {
            status: "HADIR" as AbsensiStatus,
            lembur: false,
            setengahHari: false,
            keterangan: "",
          };
          return {
            nama: emp.namaLengkap,
            nik: emp.nik,
            status: item.status,
            keterangan: item.keterangan?.trim() || "-",
          };
        })
        .filter((row) => row.status === "IZIN" || row.status === "SAKIT");

      if (izinSakitRows.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 8,
          head: [["Nama", "NIK", "Status", "Keterangan"]],
          body: izinSakitRows.map((row) => [
            row.nama,
            row.nik,
            row.status,
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
      setError("Terapkan filter dulu lalu pastikan ada karyawan yang ditampilkan");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");
    setSubmitStats(null);

    try {
      await attendanceAPI.submitBulk({
        tanggal: selectedDate,
        data: displayedEmployees.map((emp) => ({
          // Lembur disimpan sebagai status LEMBUR agar terhitung +1 hari di modul gaji.
          karyawanId: emp.id,
          status:
            (absensiMap[emp.id]?.status || "HADIR") === "HADIR" && Boolean(absensiMap[emp.id]?.lembur)
              ? "LEMBUR"
              : absensiMap[emp.id]?.status || "HADIR",
        })),
      });

      const setengahHariRecords = displayedEmployees
        .filter((emp) => {
          const draft = absensiMap[emp.id];
          return (draft?.status || "HADIR") === "HADIR" && Boolean(draft?.setengahHari);
        })
        .map((emp) => ({
          karyawanId: emp.id,
          lembur: Boolean(absensiMap[emp.id]?.lembur),
          keterangan:
            absensiMap[emp.id]?.keterangan?.trim() || "Setengah hari via input absensi massal",
        }));

      if (setengahHariRecords.length > 0) {
        await publicSetengahHariAPI.submitBulk({
          tanggal: selectedDate,
          records: setengahHariRecords,
        });
      }

      const successCount = displayedEmployees.length;
      const failCount = 0;

      setSubmitStats({
        successCount,
        failCount,
        hadirCount: summary.hadir,
        lemburCount: summary.lembur,
        izinCount: summary.izin,
        sakitCount: summary.sakit,
        alpaCount: summary.alpa,
        offCount: summary.off,
      });

      if (successCount > 0) {
        setSuccess(
          `Absensi selesai dikirim. Berhasil ${successCount}, gagal ${failCount}.`
        );
      }

    } catch (err) {
      setError("Gagal mencatat absensi. Silakan coba lagi.");
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

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {submitStats && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              Rekap kirim: Hadir {submitStats.hadirCount} (termasuk lembur), Lembur {submitStats.lemburCount}, Sakit {submitStats.sakitCount},
              Izin {submitStats.izinCount}, Alpa {submitStats.alpaCount}, Off {submitStats.offCount}.
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
                onClick={() => setAllStatusForDisplayed("OFF")}
                disabled={displayedEmployees.length === 0}
              >
                Set Semua Off
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

            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <div className="p-3 rounded border bg-indigo-50 border-indigo-200">
                <p className="text-xs text-indigo-800">Total Diisi</p>
                <p className="text-xl font-bold text-indigo-900">{summary.total}</p>
              </div>
              <div className="p-3 rounded border bg-green-50 border-green-200">
                <p className="text-xs text-green-800">Hadir</p>
                <p className="text-xl font-bold text-green-900">{summary.hadir}</p>
              </div>
              <div className="p-3 rounded border bg-orange-50 border-orange-200">
                <p className="text-xs text-orange-800">Lembur</p>
                <p className="text-xl font-bold text-orange-900">{summary.lembur}</p>
              </div>
              <div className="p-3 rounded border bg-yellow-50 border-yellow-200">
                <p className="text-xs text-yellow-800">Sakit</p>
                <p className="text-xl font-bold text-yellow-900">{summary.sakit}</p>
              </div>
              <div className="p-3 rounded border bg-blue-50 border-blue-200">
                <p className="text-xs text-blue-800">Izin</p>
                <p className="text-xl font-bold text-blue-900">{summary.izin}</p>
              </div>
              <div className="p-3 rounded border bg-red-50 border-red-200">
                <p className="text-xs text-red-800">Alpa</p>
                <p className="text-xl font-bold text-red-900">{summary.alpa}</p>
              </div>
              <div className="p-3 rounded border bg-gray-100 border-gray-300">
                <p className="text-xs text-gray-700">Off</p>
                <p className="text-xl font-bold text-gray-900">{summary.off}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-72">Karyawan</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-28">Setengah Hari</TableHead>
                    <TableHead className="w-24">Lembur</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!showFilteredEmployees ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        Gunakan filter lalu klik Terapkan Filter untuk menampilkan daftar.
                      </TableCell>
                    </TableRow>
                  ) : displayedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        Tidak ada karyawan sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedEmployees.map((employee) => {
                      const rowData = absensiMap[employee.id] || {
                        status: "HADIR" as AbsensiStatus,
                        lembur: false,
                        setengahHari: false,
                        keterangan: "",
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
                            <input
                              type="checkbox"
                              checked={Boolean(rowData.setengahHari)}
                              onChange={(e) =>
                                updateAbsensi(employee.id, {
                                  setengahHari: e.target.checked,
                                })
                              }
                              disabled={!isPresentStatus(rowData.status)}
                              className="w-4 h-4"
                            />
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
                              disabled={!isPresentStatus(rowData.status)}
                              className="w-4 h-4"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={rowData.keterangan}
                              onChange={(e) =>
                                updateAbsensi(employee.id, {
                                  keterangan: e.target.value,
                                })
                              }
                              placeholder="Keterangan (opsional)"
                            />
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
    </div>
  );
}
