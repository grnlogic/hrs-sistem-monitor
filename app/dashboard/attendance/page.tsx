"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
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
import { Badge } from "@/components/ui/display/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import {
  Search,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Edit,
  Download,
  Filter,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { attendanceAPI, employeeAPI } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";

const normalizeStatus = (status?: string) => {
  const value = String(status || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (value === "SETENGAH_HARI") return "SETENGAH_HARI";
  if (value === "HADIR") return "HADIR";
  if (value === "IZIN") return "IZIN";
  if (value === "TIDAK_HADIR") return "TIDAK_HADIR";
  if (value === "LEMBUR") return "HADIR";
  if (value === "SAKIT" || value === "ALPA" || value === "ALPHA" || value === "OFF") return "TIDAK_HADIR";
  return value || "TIDAK_HADIR";
};

const isPresentStatus = (status?: string) => {
  const normalized = normalizeStatus(status);
  return normalized === "HADIR" || normalized === "SETENGAH_HARI";
};

const getStatusLabel = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === "HADIR") return "Hadir";
  if (normalized === "SETENGAH_HARI") return "Setengah Hari";
  if (normalized === "IZIN") return "Tidak Hadir (Izin)";
  if (status === "BELUM_ABSEN") return "Belum Absen";
  return "Tidak Hadir";
};

const hitungHariEfektif = (status?: string, isLembur?: boolean) => {
  const normalized = normalizeStatus(status);
  let hari = 0;
  if (normalized === "HADIR") hari = 1;
  if (normalized === "SETENGAH_HARI") hari = 0.5;
  if (isLembur) hari += 1;
  return hari;
};

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsTab, setStatsTab] = useState<"today" | "all">("today");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [attendanceData, searchTerm, statusFilter, dateFilter, departmentFilter]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch employees and attendance in parallel (single request each)
      const [employeesResponse, allAttendance] = await Promise.all([
        employeeAPI.getAll(),
        attendanceAPI.getAll(),
      ]);
      const mappedEmployees = employeesResponse.map((emp: any) => ({
        ...emp,
        namaLengkap: emp.namaLengkap || emp.name || "",
        nik: emp.nik || emp.nip || "",
      }));
      setEmployees(mappedEmployees);
      setAttendanceData(
        allAttendance.map((a: any) => ({
          id: a.id,
          karyawanId: a.karyawanId,
          tanggal: a.tanggal,
          status: normalizeStatus(a.status),
          hadir: a.hadir,
          setengahHari: normalizeStatus(a.status) === "SETENGAH_HARI",
          isLembur: Boolean(a.isLembur),
          hariEfektif: Number(a.hariEfektif ?? hitungHariEfektif(a.status, a.isLembur)),
          lokasi: a.lokasi,
          checkIn: a.waktuMasuk || a.checkIn || "-",
          checkOut: a.waktuPulang || a.checkOut || "-",
          notes: a.keterangan || a.notes || "-",
        }))
      );
    } catch (err) {
      setError("Gagal memuat data absensi");
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = attendanceData;
    const todayString = new Date().toLocaleDateString("en-CA");

    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const employee = employees.find((emp) => emp.id === item.karyawanId);
        return (
          employee?.namaLengkap
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          employee?.nik?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (statusFilter !== "all") {
      if (statusFilter === "LEMBUR") {
        filtered = filtered.filter((item) => Boolean(item.isLembur));
      } else {
        filtered = filtered.filter((item) => normalizeStatus(item.status) === statusFilter);
      }
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((item) => {
        const employee = employees.find((emp) => emp.id === item.karyawanId);
        return employee?.departemen === departmentFilter;
      });
    }

    const activeDateFilter = dateFilter || todayString;
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.tanggal).toLocaleDateString("en-CA");
      return itemDate === activeDateFilter;
    });

    setFilteredData(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Hadir":
        return <Badge className="bg-green-100 text-green-800">Hadir</Badge>;
      case "Alpha":
        return <Badge variant="destructive">Alpha</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const todayString = new Date().toLocaleDateString("en-CA");
  const statsSource =
    statsTab === "today"
      ? attendanceData.filter(
          (item) =>
            new Date(item.tanggal || item.date).toLocaleDateString("en-CA") ===
            todayString
        )
      : attendanceData;

  const attendanceStats = {
    total: statsSource.length,
    hadir: statsSource.filter((item) => isPresentStatus(item.status)).length,
    lembur: statsSource.filter((item) => Boolean(item.isLembur)).length,
    setengahHari: statsSource.filter((item) => normalizeStatus(item.status) === "SETENGAH_HARI").length,
    tidakHadir: statsSource.filter((item) => normalizeStatus(item.status) === "TIDAK_HADIR").length,
    izin: statsSource.filter((item) => normalizeStatus(item.status) === "IZIN").length,
  };

  // Get unique departments for filter
  const departments = Array.from(
    new Set(employees.map((emp) => emp.departemen).filter(Boolean))
  );

  const reportDate = dateFilter || todayString;
  const attendanceTodayByEmployeeId = attendanceData
    .filter(
      (item) =>
        new Date(item.tanggal || item.date).toLocaleDateString("en-CA") === reportDate
    )
    .reduce((acc, item) => {
      acc.set(Number(item.karyawanId), item);
      return acc;
    }, new Map<number, any>());

  const dailyDepartmentReports = departments
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((departemen) => {
      const deptEmployees = employees.filter(
        (emp) => emp.departemen === departemen && 
                 emp.statusKaryawan !== "NONAKTIF" && 
                 emp.statusKaryawan !== "TIDAK_AKTIF" &&
                 emp.statusKaryawan !== "NON_AKTIF"
      );
      const exceptions = deptEmployees
        .map((emp) => {
          const attendance = attendanceTodayByEmployeeId.get(Number(emp.id));
          const status = attendance?.status || "BELUM_ABSEN";
          return {
            id: Number(emp.id),
            namaLengkap: emp.namaLengkap || "(Tanpa Nama)",
            nik: emp.nik || "-",
            status,
            notes: attendance?.notes || attendance?.keterangan || "-",
          };
        })
        .filter((item) => !isPresentStatus(item.status));

      const hadirCount = deptEmployees.reduce((count, emp) => {
        const attendance = attendanceTodayByEmployeeId.get(Number(emp.id));
        return isPresentStatus(attendance?.status) ? count + 1 : count;
      }, 0);

      return {
        departemen,
        totalKaryawan: deptEmployees.length,
        hadirCount,
        exceptions,
      };
    });

  const handleEdit = (attendance: any) => {
    const employee = employees.find((emp) => emp.id === attendance.karyawanId);
    setEditingItem({
      ...attendance,
      employee: employee,
      status: normalizeStatus(attendance.status),
      setengahHari: normalizeStatus(attendance.status) === "SETENGAH_HARI",
      isLembur: Boolean(attendance.isLembur),
      hadir: attendance.hadir,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      setIsLoading(true);
      const isPresent = isPresentStatus(editingItem.status);

      // Gunakan endpoint PUT yang baru
      await attendanceAPI.update(editingItem.id, {
        hadir: isPresent,
        status: editingItem.status,
        setengahHari: normalizeStatus(editingItem.status) === "SETENGAH_HARI",
        isLembur: Boolean(editingItem.isLembur),
        keterangan: editingItem.notes,
        lokasi: editingItem.lokasi,
      });

      await fetchData();
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err) {
      setError("Gagal mengupdate data absensi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      setIsLoading(true);
      await attendanceAPI.delete(id);
      await fetchData();
      setDeleteConfirm(null);
    } catch (err) {
      setError("Gagal menghapus data absensi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteToday = async () => {
    const todayString = new Date().toLocaleDateString("en-CA");
    const confirmDelete = window.confirm(
      "Yakin ingin menghapus semua data absensi hari ini?"
    );
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      await attendanceAPI.deleteToday(todayString);
      await fetchData();
    } catch (err) {
      setError("Gagal menghapus data absensi hari ini");
    } finally {
      setIsLoading(false);
    }
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl("");
    setPdfFileName("");
  };

  const handleDownloadPreviewedPdf = () => {
    if (!pdfPreviewUrl || !pdfFileName) return;
    const link = document.createElement("a");
    link.href = pdfPreviewUrl;
    link.download = pdfFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDailyReportPDF = async () => {
    const rows = attendanceData
      .filter(
        (item) =>
          new Date(item.tanggal || item.date).toLocaleDateString("en-CA") === reportDate
      )
      .map((item) => {
        const employee = employees.find((emp) => emp.id === item.karyawanId);
        return {
          tanggal: new Date(item.tanggal || item.date).toLocaleDateString("id-ID"),
          nama: employee?.namaLengkap || "(Tanpa Nama)",
          status: getStatusLabel(item.status),
          lembur: item.isLembur ? "Lembur" : "-",
          hariEfektif: String(Number(item.hariEfektif ?? hitungHariEfektif(item.status, item.isLembur))),
          keterangan: item.notes || "-",
        };
      });

    if (rows.length === 0) {
      setError("Belum ada data absensi harian untuk diekspor");
      return;
    }

    try {
      setError("");
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(14);
      doc.text("Rekapan Harian Absensi Karyawan", 14, 14);
      doc.setFontSize(10);
      doc.text(
        `Tanggal: ${new Date(reportDate).toLocaleDateString("id-ID")}`,
        14,
        21
      );

      autoTable(doc, {
        startY: 28,
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
        margin: { left: 14, right: 14 },
      });

      const blob = doc.output("blob");
      const nextPreviewUrl = URL.createObjectURL(blob);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      setPdfPreviewUrl(nextPreviewUrl);
      setPdfFileName(`laporan-harian-absensi-${reportDate}.pdf`);
    } catch (err) {
      setError("Gagal export PDF laporan harian");
    }
  };

  if (isLoading) {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            📋 Manajemen Absensi
          </h1>
          <p className="text-muted-foreground">
            Pantau kehadiran dan absensi karyawan harian
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportDailyReportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF Laporan Harian
          </Button>
          <Button variant="destructive" onClick={handleDeleteToday}>
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus Absensi Hari Ini
          </Button>
          <Button asChild>
            <a href="/dashboard/attendance/new">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Absensi
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold">Scope Statistik</p>
              <p className="text-xs text-muted-foreground">
                {statsTab === "today"
                  ? "Menampilkan statistik absensi hari ini"
                  : "Menampilkan statistik semua data absensi"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={statsTab === "today" ? "default" : "outline"}
                onClick={() => setStatsTab("today")}
              >
                Hari Ini
              </Button>
              <Button
                size="sm"
                variant={statsTab === "all" ? "default" : "outline"}
                onClick={() => setStatsTab("all")}
              >
                Keseluruhan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Absensi</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.total}</div>
            <p className="text-xs text-muted-foreground">Data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Hadir</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendanceStats.hadir}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🌓 Setengah Hari</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {attendanceStats.setengahHari}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🕒 Lembur</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {attendanceStats.lembur}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📝 Izin</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {attendanceStats.izin}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">❌ Tidak Hadir</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {attendanceStats.tidakHadir}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap Absensi Karyawan</CardTitle>
          <CardDescription>
            Data kehadiran dan absensi harian karyawan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-blue-800">
                Filter & Pencarian Data
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari nama atau NIK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
                title="Filter berdasarkan tanggal"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="HADIR">✅ Hadir</SelectItem>
                  <SelectItem value="SETENGAH_HARI">🌓 Setengah Hari</SelectItem>
                  <SelectItem value="IZIN">📝 Izin</SelectItem>
                  <SelectItem value="TIDAK_HADIR">❌ Tidak Hadir</SelectItem>
                  <SelectItem value="LEMBUR">🕒 Lembur</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      🏢 {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(searchTerm ||
              dateFilter ||
              statusFilter !== "all" ||
              departmentFilter !== "all") && (
              <div className="mt-3 text-sm text-blue-700">
                📊 Menampilkan {filteredData.length} dari {attendanceData.length} data
                {searchTerm && ` • Pencarian: "${searchTerm}"`}
                {dateFilter &&
                  ` • Tanggal: ${new Date(dateFilter).toLocaleDateString("id-ID")}`}
                {statusFilter !== "all" && ` • Status: ${statusFilter}`}
                {departmentFilter !== "all" && ` • Departemen: ${departmentFilter}`}
              </div>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">👤 Karyawan</TableHead>
                  <TableHead>📅 Tanggal</TableHead>
                  <TableHead>📊 Status</TableHead>
                  <TableHead>⏱️ Hari Efektif</TableHead>
                  <TableHead>🏢 Departemen</TableHead>
                  <TableHead>📝 Keterangan</TableHead>
                  <TableHead className="text-center">⚙️ Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((attendance) => {
                  const employee = employees.find((emp) => emp.id === attendance.karyawanId);
                  return (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={employee?.avatar || "/placeholder.svg"}
                              alt={employee?.namaLengkap}
                            />
                            <AvatarFallback>
                              {employee?.namaLengkap
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee?.namaLengkap}</div>
                            <div className="text-sm text-muted-foreground">{employee?.nik}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(attendance.tanggal || attendance.date).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {normalizeStatus(attendance.status) === "HADIR" && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">✅ Hadir</Badge>
                        )}
                        {normalizeStatus(attendance.status) === "SETENGAH_HARI" && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">🌓 Setengah Hari</Badge>
                        )}
                        {normalizeStatus(attendance.status) === "IZIN" && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">📝 Tidak Hadir (Izin)</Badge>
                        )}
                        {normalizeStatus(attendance.status) === "TIDAK_HADIR" && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">❌ Tidak Hadir</Badge>
                        )}
                        {attendance.isLembur && (
                          <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200">🕒 Lembur</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50">
                          {Number(attendance.hariEfektif ?? hitungHariEfektif(attendance.status, attendance.isLembur))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">🏢 {employee?.departemen || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{attendance.notes || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(attendance)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                            title="Edit absensi"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {deleteConfirm === attendance.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(attendance.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded text-xs bg-red-50 border border-red-200"
                                title="Konfirmasi hapus"
                              >
                                ✓ Ya
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-gray-600 hover:text-gray-800 p-1 rounded text-xs bg-gray-50 border border-gray-200"
                                title="Batal hapus"
                              >
                                ✗ Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDelete(attendance.id)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50 transition-colors"
                              title="Hapus absensi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <p className="text-lg font-semibold text-gray-600 mb-2">
                Tidak ada data absensi ditemukan
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm ||
                dateFilter ||
                statusFilter !== "all" ||
                departmentFilter !== "all"
                  ? "Coba ubah filter pencarian atau tambah data absensi baru"
                  : "Belum ada data absensi. Mulai dengan menambah data absensi"}
              </p>
              <Button asChild>
                <a href="/dashboard/attendance/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Absensi Baru
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">✏️ Edit Absensi</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Karyawan:
                </label>
                <p className="text-gray-700 bg-gray-50 p-2 rounded">
                  {editingItem.employee?.namaLengkap} (
                  {editingItem.employee?.nik})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tanggal:
                </label>
                <p className="text-gray-700 bg-gray-50 p-2 rounded">
                  {new Date(editingItem.tanggal).toLocaleDateString("id-ID")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Status:
                </label>
                <Select
                  value={editingItem.status}
                  onValueChange={(value) => setEditingItem({ ...editingItem, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HADIR">✅ Hadir</SelectItem>
                    <SelectItem value="SETENGAH_HARI">🌓 Setengah Hari</SelectItem>
                    <SelectItem value="IZIN">📝 Izin</SelectItem>
                    <SelectItem value="TIDAK_HADIR">❌ Tidak Hadir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Keterangan:
                </label>
                <Input
                  value={editingItem.notes || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, notes: e.target.value })
                  }
                  placeholder="Tambahkan keterangan..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(editingItem.isLembur)}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      isLembur: e.target.checked,
                    })
                  }
                  id="edit-lembur"
                  className="w-4 h-4"
                />
                <label htmlFor="edit-lembur" className="text-sm text-gray-600">
                  Lembur (+1 hari efektif)
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
              >
                Batal
              </Button>
              <Button onClick={handleSaveEdit}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Preview Laporan PDF</h2>
                <p className="text-xs text-muted-foreground">
                  Cek data dulu sebelum download file.
                </p>
              </div>
              <button
                onClick={closePdfPreview}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Tutup preview PDF"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 p-3">
              <iframe
                src={pdfPreviewUrl}
                title="Preview laporan absensi"
                className="h-full w-full rounded-md border"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button variant="outline" onClick={closePdfPreview}>
                Tutup
              </Button>
              <Button onClick={handleDownloadPreviewedPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
