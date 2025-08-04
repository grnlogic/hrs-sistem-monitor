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
  Eye,
  Filter,
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
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [attendanceData, searchTerm, statusFilter, dateFilter, departmentFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Ambil semua karyawan
      const employeesResponse = await employeeAPI.getAll();
      // Mapping agar FE konsisten pakai namaLengkap dan nik
      const mappedEmployees = employeesResponse.map((emp: any) => ({
        ...emp,
        namaLengkap: emp.namaLengkap || emp.name || "",
        nik: emp.nik || emp.nip || "",
      }));
      setEmployees(mappedEmployees);
      // Ambil absensi per karyawan, lalu gabungkan
      const allAttendance: any[] = [];
      for (const emp of mappedEmployees) {
        const absensiList = await attendanceAPI.getByEmployee(emp.id);
        for (const absensi of absensiList) {
          allAttendance.push({
            id: absensi.id,
            karyawanId: absensi.karyawan.id,
            tanggal: absensi.tanggal,
            status: absensi.status, // gunakan status dari backend!
            hadir: absensi.hadir,
            checkIn: absensi.waktuMasuk || "-",
            checkOut: absensi.waktuPulang || "-",
            notes: absensi.keterangan || "-",
          });
        }
      }
      setAttendanceData(allAttendance);
    } catch (err) {
      setError("Gagal memuat data absensi");
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = attendanceData;

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
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((item) => {
        const employee = employees.find((emp) => emp.id === item.karyawanId);
        return employee?.departemen === departmentFilter;
      });
    }

    if (dateFilter) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.tanggal).toISOString().split("T")[0];
        return itemDate === dateFilter;
      });
    }

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

  const attendanceStats = {
    total: attendanceData.length,
    hadir: attendanceData.filter((item) => item.status === "HADIR").length,
    alpha: attendanceData.filter((item) => item.status === "ALPA").length,
    sakit: attendanceData.filter((item) => item.status === "SAKIT").length,
    izin: attendanceData.filter((item) => item.status === "IZIN").length,
    off: attendanceData.filter((item) => item.status === "OFF").length,
  };

  // Get unique departments for filter
  const departments = Array.from(
    new Set(employees.map((emp) => emp.departemen).filter(Boolean))
  );

  const handleEdit = (attendance: any) => {
    const employee = employees.find((emp) => emp.id === attendance.karyawanId);
    setEditingItem({
      ...attendance,
      employee: employee,
      setengahHari: attendance.setengahHari || false,
      hadir: attendance.hadir,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      setIsLoading(true);
      // Gunakan endpoint PUT yang baru
      await attendanceAPI.update(editingItem.id, {
        hadir: editingItem.hadir,
        status: editingItem.status,
        setengahHari: editingItem.setengahHari || false,
        keterangan: editingItem.notes,
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
          <Button variant="outline" asChild>
            <a href="/dashboard/attendance/public-form">
              <Plus className="w-4 h-4 mr-2" />
              Form Absensi Publik
            </a>
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
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">🤒 Sakit</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {attendanceStats.sakit}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📝 Izin</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {attendanceStats.izin}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">❌ Alpha</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {attendanceStats.alpha}
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
                  <SelectItem value="SAKIT">🤒 Sakit</SelectItem>
                  <SelectItem value="IZIN">📝 Izin</SelectItem>
                  <SelectItem value="ALPA">❌ Alpha</SelectItem>
                  <SelectItem value="OFF">🚫 Off</SelectItem>
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
                📊 Menampilkan {filteredData.length} dari{" "}
                {attendanceData.length} data
                {searchTerm && ` • Pencarian: "${searchTerm}"`}
                {dateFilter &&
                  ` • Tanggal: ${new Date(dateFilter).toLocaleDateString(
                    "id-ID"
                  )}`}
                {statusFilter !== "all" && ` • Status: ${statusFilter}`}
                {departmentFilter !== "all" &&
                  ` • Departemen: ${departmentFilter}`}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">👤 Karyawan</TableHead>
                  <TableHead>📅 Tanggal</TableHead>
                  <TableHead>📊 Status</TableHead>
                  <TableHead>🏢 Departemen</TableHead>
                  <TableHead>📝 Keterangan</TableHead>
                  <TableHead className="text-center">⚙️ Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((attendance) => {
                  const employee = employees.find(
                    (emp) => emp.id === attendance.karyawanId
                  );
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
                            <div className="font-medium">
                              {employee?.namaLengkap}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.nik}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(
                          attendance.tanggal || attendance.date
                        ).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {/* Status badges with better styling */}
                        {attendance.status === "HADIR" && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            ✅ Hadir
                          </Badge>
                        )}
                        {attendance.status === "ALPA" && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            ❌ Alpha
                          </Badge>
                        )}
                        {attendance.status === "SAKIT" && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            🤒 Sakit
                          </Badge>
                        )}
                        {attendance.status === "IZIN" && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            📝 Izin
                          </Badge>
                        )}
                        {attendance.status === "OFF" && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            🚫 Off
                          </Badge>
                        )}
                        {!["HADIR", "ALPA", "SAKIT", "IZIN", "OFF"].includes(
                          attendance.status
                        ) && (
                          <Badge variant="outline">{attendance.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          🏢 {employee?.departemen || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {attendance.notes || "-"}
                        </span>
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
                  onValueChange={(value) =>
                    setEditingItem({ ...editingItem, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HADIR">✅ Hadir</SelectItem>
                    <SelectItem value="SAKIT">🤒 Sakit</SelectItem>
                    <SelectItem value="IZIN">📝 Izin</SelectItem>
                    <SelectItem value="ALPA">❌ Alpha</SelectItem>
                    <SelectItem value="OFF">🚫 Off</SelectItem>
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
                  checked={editingItem.setengahHari || false}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      setengahHari: e.target.checked,
                    })
                  }
                  disabled={!editingItem.hadir || editingItem.status === "OFF"}
                  id="edit-setengah-hari"
                  className="w-4 h-4"
                />
                <label
                  htmlFor="edit-setengah-hari"
                  className="text-sm text-gray-600"
                >
                  Setengah Hari (hanya dihitung setengah gaji)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingItem.hadir || false}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, hadir: e.target.checked })
                  }
                  disabled={editingItem.status === "OFF"}
                  id="edit-hadir"
                  className="w-4 h-4"
                />
                <label htmlFor="edit-hadir" className="text-sm text-gray-600">
                  Karyawan Hadir
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
    </div>
  );
}
