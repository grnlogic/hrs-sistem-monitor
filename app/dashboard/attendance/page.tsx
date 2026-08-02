"use client";

import { useState, useEffect } from "react";
import { useCompany } from "@/components/providers/company-provider";
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
  XCircle,
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

const getDetailedStatus = (rec: any) => {
  if (!rec) return "BELUM_ABSEN";
  const normStatus = String(rec.status || "").trim().toUpperCase();
  const ket = String(rec.notes || rec.keterangan || "").trim().toLowerCase();
  if (normStatus === "SETENGAH_HARI") return "SETENGAH_HARI";
  if (normStatus === "HADIR") return "HADIR";
  if (ket.includes("sakit")) return "SAKIT";
  if (ket.includes("libur")) return "LIBUR";
  if (ket.includes("alpa")) return "ALPA";
  if (ket.includes("izin")) return "IZIN";
  if (normStatus === "IZIN") return "IZIN";
  if (normStatus === "TIDAK_HADIR") return "ALPA";
  return "ALPA";
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

const getMonday = (d: Date) => {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getDatesInRange = (startStr: string, endStr: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(current.toLocaleDateString("en-CA"));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function AttendancePage() {
  const { company } = useCompany();
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const today = new Date();
  const mondayString = getMonday(new Date(today)).toLocaleDateString("en-CA");
  const todayString = today.toLocaleDateString("en-CA");

  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  useEffect(() => {
    filterData();
  }, [attendanceData, searchTerm, statusFilter, startDate, endDate, departmentFilter]);

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
    const rangeRecords = attendanceData.filter((rec) => {
      const itemDate = new Date(rec.tanggal || rec.date).toLocaleDateString("en-CA");
      return itemDate >= startDate && itemDate <= endDate;
    });

    let filteredEmployees = employees.filter((emp) => {
      const isNotNonactive = 
        emp.statusKaryawan !== "NONAKTIF" && 
        emp.statusKaryawan !== "TIDAK_AKTIF" && 
        emp.statusKaryawan !== "NON_AKTIF";
      return isNotNonactive;
    });

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredEmployees = filteredEmployees.filter((emp) =>
        emp.namaLengkap?.toLowerCase().includes(searchLower) ||
        emp.nik?.toLowerCase().includes(searchLower)
      );
    }

    if (departmentFilter !== "all") {
      filteredEmployees = filteredEmployees.filter((emp) => emp.departemen === departmentFilter);
    }

    let aggregated = filteredEmployees.map((emp) => {
      const empRecords = rangeRecords.filter((rec) => Number(rec.karyawanId) === Number(emp.id));
      
      let totalHadir = 0;
      let totalSetengahHari = 0;
      let totalIzin = 0;
      let totalSakit = 0;
      let totalAlpa = 0;
      let totalLibur = 0;
      const totalLembur = empRecords.filter((rec) => Boolean(rec.isLembur)).length;

      empRecords.forEach((rec) => {
        const sub = getDetailedStatus(rec);
        if (sub === "HADIR") totalHadir++;
        else if (sub === "SETENGAH_HARI") totalSetengahHari++;
        else if (sub === "IZIN") totalIzin++;
        else if (sub === "SAKIT") totalSakit++;
        else if (sub === "ALPA") totalAlpa++;
        else if (sub === "LIBUR") totalLibur++;
      });

      const totalHariEfektif = empRecords.reduce((sum, rec) => {
        return sum + (Number(rec.hariEfektif) || 0);
      }, 0);

      return {
        id: emp.id,
        employee: emp,
        records: empRecords,
        totalHadir,
        totalSetengahHari,
        totalIzin,
        totalSakit,
        totalAlpa,
        totalLibur,
        totalLembur,
        totalHariEfektif,
      };
    });

    if (statusFilter !== "all") {
      if (statusFilter === "LEMBUR") {
        aggregated = aggregated.filter((item) => item.totalLembur > 0);
      } else {
        aggregated = aggregated.filter((item) =>
          item.records.some((rec) => getDetailedStatus(rec) === statusFilter)
        );
      }
    }

    setFilteredData(aggregated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Hadir":
        return <Badge className="bg-zinc-100 text-zinc-900">Hadir</Badge>;
      case "Alpha":
        return <Badge variant="destructive">Alpha</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statsSource =
    statsTab === "today"
      ? attendanceData.filter(
          (item) =>
            new Date(item.tanggal || item.date).toLocaleDateString("en-CA") ===
            todayString
        )
      : attendanceData.filter((item) => {
          const itemDate = new Date(item.tanggal || item.date).toLocaleDateString("en-CA");
          return itemDate >= startDate && itemDate <= endDate;
        });

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

  const reportDate = startDate;
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

  const handleEdit = (item: any) => {
    const dates = getDatesInRange(startDate, endDate);
    const defaultDate = dates.includes(todayString) ? todayString : dates[0];
    
    const existingRecord = item.records.find((rec: any) => {
      return new Date(rec.tanggal).toLocaleDateString("en-CA") === defaultDate;
    });

    setEditingItem({
      employee: item.employee,
      datesInRange: dates,
      selectedDate: defaultDate,
      id: existingRecord ? existingRecord.id : null,
      status: existingRecord ? getDetailedStatus(existingRecord) : "BELUM_ABSEN",
      hadir: existingRecord ? existingRecord.hadir : false,
      isLembur: existingRecord ? Boolean(existingRecord.isLembur) : false,
      notes: existingRecord ? (existingRecord.notes || existingRecord.keterangan || "") : "",
      lokasi: existingRecord ? (existingRecord.lokasi || "") : "",
      allEmployeeRecords: item.records
    });
    setShowEditModal(true);
  };

  const handleDateChangeInModal = (dateStr: string) => {
    if (!editingItem) return;
    
    const existingRecord = editingItem.allEmployeeRecords.find((rec: any) => {
      return new Date(rec.tanggal).toLocaleDateString("en-CA") === dateStr;
    });

    setEditingItem({
      ...editingItem,
      selectedDate: dateStr,
      id: existingRecord ? existingRecord.id : null,
      status: existingRecord ? getDetailedStatus(existingRecord) : "BELUM_ABSEN",
      hadir: existingRecord ? existingRecord.hadir : false,
      isLembur: existingRecord ? Boolean(existingRecord.isLembur) : false,
      notes: existingRecord ? (existingRecord.notes || existingRecord.keterangan || "") : "",
      lokasi: existingRecord ? (existingRecord.lokasi || "") : "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (!editingItem.lokasi) {
      setError("Lokasi absensi wajib dipilih sebelum menyimpan");
      return;
    }

    try {
      setIsLoading(true);

      let submitStatus = editingItem.status;
      let submitKeterangan = editingItem.notes?.trim() || "";

      if (editingItem.status === "SAKIT") {
        submitStatus = "TIDAK_HADIR";
        if (!submitKeterangan.toLowerCase().includes("sakit")) {
          submitKeterangan = "Sakit" + (submitKeterangan ? ` - ${submitKeterangan}` : "");
        }
      } else if (editingItem.status === "ALPA") {
        submitStatus = "TIDAK_HADIR";
        if (!submitKeterangan.toLowerCase().includes("alpa")) {
          submitKeterangan = "Alpa" + (submitKeterangan ? ` - ${submitKeterangan}` : "");
        }
      } else if (editingItem.status === "LIBUR") {
        submitStatus = "TIDAK_HADIR";
        if (!submitKeterangan.toLowerCase().includes("libur")) {
          submitKeterangan = "Libur" + (submitKeterangan ? ` - ${submitKeterangan}` : "");
        }
      } else if (editingItem.status === "IZIN") {
        submitStatus = "IZIN";
        if (!submitKeterangan.toLowerCase().includes("izin")) {
          submitKeterangan = "Izin" + (submitKeterangan ? ` - ${submitKeterangan}` : "");
        }
      }

      const isPresent = submitStatus === "HADIR" || submitStatus === "SETENGAH_HARI";

      if (editingItem.id) {
        if (editingItem.status === "BELUM_ABSEN") {
          await attendanceAPI.delete(editingItem.id);
        } else {
          await attendanceAPI.update(editingItem.id, {
            hadir: isPresent,
            status: submitStatus,
            setengahHari: submitStatus === "SETENGAH_HARI",
            isLembur: Boolean(editingItem.isLembur),
            keterangan: submitKeterangan,
            lokasi: editingItem.lokasi,
          });
        }
      } else {
        if (editingItem.status !== "BELUM_ABSEN") {
          await attendanceAPI.createJson({
            karyawanId: Number(editingItem.employee.id),
            tanggal: editingItem.selectedDate,
            hadir: isPresent,
            status: submitStatus,
            setengahHari: submitStatus === "SETENGAH_HARI",
            isLembur: Boolean(editingItem.isLembur),
            keterangan: submitKeterangan,
            lokasi: editingItem.lokasi,
          });
        }
      }

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
      await attendanceAPI.deleteToday();
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
    const rows = filteredData.map((item) => {
      const { employee, totalHadir, totalSetengahHari, totalIzin, totalSakit, totalAlpa, totalLibur, totalLembur } = item;
      const notesList = item.records
        .filter((rec: any) => rec.notes && rec.notes !== "-" && rec.notes !== "")
        .map((rec: any) => {
          const dateObj = new Date(rec.tanggal);
          const dateStr = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
          return `${dateStr}: ${rec.notes}`;
        })
        .join("; ");
      return {
        nama: employee?.namaLengkap || "(Tanpa Nama)",
        nik: employee?.nik || "-",
        departemen: employee?.departemen || "-",
        hadir: String(totalHadir),
        setengahHari: String(totalSetengahHari),
        lembur: String(totalLembur),
        izin: String(totalIzin),
        sakit: String(totalSakit),
        alpa: String(totalAlpa),
        libur: String(totalLibur),
        catatan: notesList || "-",
      };
    });

    if (rows.length === 0) {
      setError("Belum ada data absensi untuk diekspor");
      return;
    }

    try {
      setError("");
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(14);
      doc.text("Rekapan Periodik Absensi Karyawan", 14, 14);
      doc.setFontSize(10);
      doc.text(
        `Periode: ${new Date(startDate).toLocaleDateString("id-ID")} s/d ${new Date(endDate).toLocaleDateString("id-ID")}`,
        14,
        21
      );

      autoTable(doc, {
        startY: 28,
        head: [["Nama Karyawan", "NIK", "Departemen", "Hadir", "Setengah", "Lembur", "Izin", "Sakit", "Alpa", "Libur", "Catatan"]],
        body: rows.map((row) => [
          row.nama,
          row.nik,
          row.departemen,
          row.hadir,
          row.setengahHari,
          row.lembur,
          row.izin,
          row.sakit,
          row.alpa,
          row.libur,
          row.catatan,
        ]),
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });

      const blob = doc.output("blob");
      const nextPreviewUrl = URL.createObjectURL(blob);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      setPdfPreviewUrl(nextPreviewUrl);
      setPdfFileName(`laporan-periodik-absensi-${startDate}-to-${endDate}.pdf`);
    } catch (err) {
      setError("Gagal export PDF laporan");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            📋 Manajemen Absensi
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau kehadiran dan absensi karyawan harian
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportDailyReportPDF} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <Download className="w-4 h-4 mr-2 shrink-0" />
            Export PDF
          </Button>
          <Button variant="destructive" onClick={handleDeleteToday} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <Trash2 className="w-4 h-4 mr-2 shrink-0" />
            Hapus Absensi Hari Ini
          </Button>
          <Button asChild className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <a href="/dashboard/attendance/new">
              <Plus className="w-4 h-4 mr-2 shrink-0" />
              Tambah
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
                  : "Menampilkan statistik absensi dalam rentang tanggal terpilih"}
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
                Rentang Terpilih
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Absensi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.total}</div>
            <p className="text-xs text-muted-foreground">Data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-700">
              {attendanceStats.hadir}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🌓 Setengah Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-600">
              {attendanceStats.setengahHari}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🕒 Lembur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-600">
              {attendanceStats.lembur}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📝 Izin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-600">
              {attendanceStats.izin}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">❌ Tidak Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-700">
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
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-zinc-700" />
              <h3 className="font-semibold text-zinc-900">
                Filter & Pencarian Data
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Cari nama atau NIK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm"
                  title="Tanggal Mulai"
                />
                <span className="text-zinc-500 text-xs text-center">s/d</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm"
                  title="Tanggal Selesai"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="HADIR">✅ Hadir</SelectItem>
                  <SelectItem value="SETENGAH_HARI">🌓 Setengah Hari</SelectItem>
                  <SelectItem value="IZIN">📝 Izin</SelectItem>
                  <SelectItem value="SAKIT">🤒 Sakit</SelectItem>
                  <SelectItem value="ALPA">❌ Alpa</SelectItem>
                  <SelectItem value="LIBUR">🌴 Libur/Off</SelectItem>
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
              startDate ||
              endDate ||
              statusFilter !== "all" ||
              departmentFilter !== "all") && (
              <div className="mt-3 text-sm text-zinc-800">
                📊 Menampilkan {filteredData.length} Karyawan
                {searchTerm && ` • Pencarian: "${searchTerm}"`}
                {startDate && endDate &&
                  ` • Periode: ${new Date(startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} s/d ${new Date(endDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`}
                {statusFilter !== "all" && ` • Status: ${statusFilter}`}
                {departmentFilter !== "all" && ` • Departemen: ${departmentFilter}`}
              </div>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">👤 Karyawan</TableHead>
                  <TableHead>🏢 Departemen</TableHead>
                  <TableHead>📊 Rincian Kehadiran</TableHead>
                  <TableHead>🕒 Lembur</TableHead>
                  <TableHead className="w-[200px]">📝 Catatan Periode</TableHead>
                  <TableHead className="text-center">⚙️ Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const { employee, totalHadir, totalSetengahHari, totalIzin, totalSakit, totalAlpa, totalLibur, totalLembur, totalHariEfektif } = item;
                  return (
                    <TableRow key={employee.id}>
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
                        <span className="text-sm text-zinc-600">🏢 {employee?.departemen || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {totalHadir > 0 && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Hadir: {totalHadir}</Badge>
                          )}
                          {totalSetengahHari > 0 && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200">Setengah: {totalSetengahHari}</Badge>
                          )}
                          {totalIzin > 0 && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">Izin: {totalIzin}</Badge>
                          )}
                          {totalSakit > 0 && (
                            <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-medium">Sakit: {totalSakit}</Badge>
                          )}
                          {totalAlpa > 0 && (
                            <Badge className="bg-red-50 text-red-700 border-red-200">Alpa: {totalAlpa}</Badge>
                          )}
                          {totalLibur > 0 && (
                            <Badge className="bg-zinc-100 text-zinc-700 border-zinc-300 font-medium">Libur: {totalLibur}</Badge>
                          )}
                          {totalHadir === 0 && totalSetengahHari === 0 && totalIzin === 0 && totalSakit === 0 && totalAlpa === 0 && totalLibur === 0 && (
                            <span className="text-sm text-zinc-400 italic">Belum ada absensi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {totalLembur > 0 ? (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{totalLembur} Kali</Badge>
                        ) : (
                          <span className="text-sm text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {(() => {
                          const notesList = item.records
                            .filter((rec: any) => rec.notes && rec.notes !== "-" && rec.notes !== "")
                            .map((rec: any) => {
                              const dateObj = new Date(rec.tanggal);
                              const dateStr = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
                              return `${dateStr}: ${rec.notes}`;
                            });
                          if (notesList.length === 0) return <span className="text-zinc-400 text-xs">-</span>;
                          return (
                            <div className="text-xs text-zinc-700 max-h-[60px] overflow-y-auto space-y-0.5 leading-tight">
                              {notesList.map((note: string, idx: number) => (
                                <div key={idx} className="border-b last:border-0 pb-0.5 mb-0.5 text-ellipsis overflow-hidden whitespace-nowrap" title={note}>
                                  📌 {note}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-zinc-700 hover:text-zinc-900 p-2 rounded-md hover:bg-zinc-100 transition-colors flex items-center gap-1 border border-zinc-200"
                            title="Edit absensi periodik"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
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
              <div className="text-zinc-400 text-6xl mb-4">📭</div>
              <p className="text-lg font-semibold text-zinc-600 mb-2">
                Tidak ada data absensi ditemukan
              </p>
              <p className="text-sm text-zinc-500 mb-4">
                {searchTerm ||
                startDate ||
                endDate ||
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
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4 shadow-xl border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>✏️</span> Edit Absensi Karyawan
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">
                  Karyawan:
                </label>
                <div className="bg-zinc-50 border p-3 rounded-lg">
                  <div className="font-semibold text-zinc-900">{editingItem.employee?.namaLengkap}</div>
                  <div className="text-xs text-zinc-500">NIK: {editingItem.employee?.nik} • Departemen: {editingItem.employee?.departemen}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Pilih Tanggal Absensi:
                </label>
                <Select
                  value={editingItem.selectedDate}
                  onValueChange={handleDateChangeInModal}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editingItem.datesInRange.map((dateStr: string) => {
                      const hasRecord = editingItem.allEmployeeRecords.some(
                        (rec: any) => new Date(rec.tanggal).toLocaleDateString("en-CA") === dateStr
                      );
                      const dateObj = new Date(dateStr);
                      const formattedDate = dateObj.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      });
                      return (
                        <SelectItem key={dateStr} value={dateStr}>
                          {formattedDate} {hasRecord ? "📝" : "⚪ (Belum Absen)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Status Kehadiran:
                  </label>
                  <Select
                    value={editingItem.status}
                    onValueChange={(value) => setEditingItem({ ...editingItem, status: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BELUM_ABSEN">⚪ Belum Absen / Hapus Data Hari Ini</SelectItem>
                      <SelectItem value="HADIR">✅ Hadir</SelectItem>
                      <SelectItem value="SETENGAH_HARI">🌓 Setengah Hari</SelectItem>
                      <SelectItem value="IZIN">📝 Izin</SelectItem>
                      <SelectItem value="SAKIT">🤒 Sakit</SelectItem>
                      <SelectItem value="ALPA">❌ Alpa</SelectItem>
                      <SelectItem value="LIBUR">🌴 Libur/Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingItem.status !== "BELUM_ABSEN" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Lokasi:
                      </label>
                      <Select
                        value={editingItem.lokasi}
                        onValueChange={(value) => setEditingItem({ ...editingItem, lokasi: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih lokasi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PJP">🏢 PJP</SelectItem>
                          <SelectItem value="SP">🏢 SP</SelectItem>
                          <SelectItem value="PRIMA">🏢 PRIMA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
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

                    <div className="flex items-center gap-2 py-1">
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
                        className="w-4 h-4 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                      />
                      <label htmlFor="edit-lembur" className="text-sm font-medium text-zinc-700 cursor-pointer select-none">
                        Lembur (+1 hari efektif)
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 justify-end mt-6 border-t pt-4">
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
