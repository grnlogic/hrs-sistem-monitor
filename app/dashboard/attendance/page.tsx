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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [attendanceData, searchTerm, statusFilter, dateFilter]);

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

    if (dateFilter) {
      filtered = filtered.filter((item) => item.date === dateFilter);
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
    hadir: attendanceData.filter((item) => item.status === "Hadir").length,
    alpha: attendanceData.filter((item) => item.status === "Alpha").length,
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus data absensi ini?")) return;
    try {
      setIsLoading(true);
      await attendanceAPI.delete(id);
      await fetchData();
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
            Manajemen Absensi
          </h1>
          <p className="text-muted-foreground">
            Pantau kehadiran dan absensi karyawan
          </p>
        </div>
       
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Hadir</CardTitle>
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
            <CardTitle className="text-sm font-medium">Alpha</CardTitle>
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
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama atau NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[200px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Hadir">Hadir</SelectItem>
                <SelectItem value="Alpha">Alpha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
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
                        ).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        {/* Gunakan badge sesuai status */}
                        {attendance.status === "Hadir" && (
                          <Badge className="bg-green-100 text-green-800">
                            Hadir
                          </Badge>
                        )}
                        {attendance.status === "Alpha" && (
                          <Badge variant="destructive">Alpha</Badge>
                        )}
                        {attendance.status === "Terlambat" && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Terlambat
                          </Badge>
                        )}
                        {attendance.status === "Izin" && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Izin
                          </Badge>
                        )}
                        {attendance.status === "Sakit" && (
                          <Badge className="bg-purple-100 text-purple-800">
                            Sakit
                          </Badge>
                        )}
                        {/* Default jika status lain */}
                        {[
                          "Hadir",
                          "Alpha",
                          "Terlambat",
                          "Izin",
                          "Sakit",
                        ].indexOf(attendance.status) === -1 && (
                          <Badge variant="outline">{attendance.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDelete(attendance.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Hapus absensi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Tidak ada data absensi yang ditemukan
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
