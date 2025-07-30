"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Badge } from "@/components/ui/display/badge";
import {
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/display/avatar";
import { X } from "lucide-react";
import {
  employeeAPI,
  attendanceAPI,
  leaveAPI,
  getAllViolations,
  getAllSalaries,
} from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";

interface DashboardStats {
  totalEmployees: number;
  todayAttendance: {
    present: number;
    late: number;
    absent: number;
  };
  pendingLeaves: number;
  totalViolations: number;
  monthlyPayroll: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Ambil semua data secara paralel
        const [
          employeesData,
          attendanceData,
          salaryData,
          leaveData,
          violationData,
        ] = await Promise.all([
          employeeAPI.getAll().catch(() => []),
          attendanceAPI.getAll().catch(() => []),
          getAllSalaries().catch(() => []),
          leaveAPI.getAll().catch(() => []),
          getAllViolations().catch(() => []),
        ]);

        // Proses data kehadiran hari ini
        const today = new Date().toISOString().split("T")[0];
        const todayAttendanceData = attendanceData.filter(
          (a: any) => a.date === today || a.tanggal === today
        );

        const todayAttendance = {
          present: todayAttendanceData.filter(
            (a: any) => a.status === "Hadir" || a.status === "Present"
          ).length,
          late: todayAttendanceData.filter(
            (a: any) => a.status === "Terlambat" || a.status === "Late"
          ).length,
          absent: todayAttendanceData.filter((a: any) =>
            ["Sakit", "Alpha", "Cuti", "Absent", "Sick", "Leave"].includes(
              a.status
            )
          ).length,
        };

        // Hitung payroll bulan ini
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const monthlyPayroll = salaryData
          .filter((salary: any) => {
            const salaryDate = new Date(
              salary.date || salary.tanggal || salary.createdAt
            );
            return (
              salaryDate.getMonth() + 1 === currentMonth &&
              salaryDate.getFullYear() === currentYear
            );
          })
          .reduce(
            (total: number, salary: any) =>
              total + (salary.totalSalary || salary.total || salary.gaji || 0),
            0
          );

        // Hitung cuti pending
        const pendingLeaves = leaveData.filter(
          (leave: any) =>
            leave.status === "Pending" || leave.status === "pending"
        ).length;

        setStats({
          totalEmployees: employeesData.length,
          todayAttendance,
          pendingLeaves,
          totalViolations: violationData.length,
          monthlyPayroll,
        });
        setEmployees(employeesData);
        setAttendance(attendanceData);
        setLeaves(leaveData);
        setViolations(violationData);
        setSalaries(salaryData);
      } catch (err: any) {
        console.error("Dashboard error:", err);
        setError(err.message || "Gagal memuat data dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Helper untuk ambil nama karyawan dari id
  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => String(e.id) === String(id));
    return emp ? emp.name || emp.namaLengkap || emp.nik || emp.nip || "-" : "-";
  };

  // Helper untuk ambil data karyawan dari id
  const getEmployeeData = (id: string) => {
    return employees.find((e) => String(e.id) === String(id));
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang di sistem monitoring karyawan PT. PADUD
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Karyawan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Karyawan
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground">Karyawan aktif</p>
          </CardContent>
        </Card>

        {/* Kehadiran Hari Ini */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Kehadiran Hari Ini
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.todayAttendance.present || 0}
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-yellow-600">
                Terlambat: {stats?.todayAttendance.late || 0}
              </span>
              <span className="text-red-600">
                Tidak Hadir: {stats?.todayAttendance.absent || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Bulan Ini */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payroll Bulan Ini
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.monthlyPayroll || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total gaji bulan ini
            </p>
          </CardContent>
        </Card>

        {/* Cuti Pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuti Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pendingLeaves || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Menunggu persetujuan
            </p>
          </CardContent>
        </Card>

        {/* Total Pelanggaran */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggaran</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.totalViolations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total pelanggaran tercatat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Daftar Karyawan */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Daftar Karyawan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.slice(0, 5).map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={emp.avatar || emp.fotoProfil} />
                      <AvatarFallback>
                        {emp.name?.[0] || emp.namaLengkap?.[0] || "-"}
                      </AvatarFallback>
                    </Avatar>
                    {emp.name || emp.namaLengkap || "-"}
                  </TableCell>
                  <TableCell>{emp.nip || emp.nik || "-"}</TableCell>
                  <TableCell>{emp.position || emp.jabatan || "-"}</TableCell>
                  <TableCell>
                    {emp.status || emp.statusKaryawan || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowDetail(true);
                      }}
                    >
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel Absensi Hari Ini */}
      <Card>
        <CardHeader>
          <CardTitle>Absensi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead>Jam Pulang</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance
                .filter((a) => {
                  const today = new Date().toISOString().split("T")[0];
                  return a.tanggal === today || a.date === today;
                })
                .slice(0, 5)
                .map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {getEmployeeName(a.karyawanId || a.karyawan?.id)}
                    </TableCell>
                    <TableCell>{a.status}</TableCell>
                    <TableCell>{a.waktuMasuk || a.checkIn || "-"}</TableCell>
                    <TableCell>{a.waktuPulang || a.checkOut || "-"}</TableCell>
                    <TableCell>{a.keterangan || a.notes || "-"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel Cuti Terbaru */}
      <Card>
        <CardHeader>
          <CardTitle>Cuti Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.slice(0, 5).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {getEmployeeName(c.karyawanId || c.karyawan?.id)}
                  </TableCell>
                  <TableCell>{c.jenisCuti || c.type || "-"}</TableCell>
                  <TableCell>{c.tanggalMulai || c.startDate || "-"}</TableCell>
                  <TableCell>{c.tanggalSelesai || c.endDate || "-"}</TableCell>
                  <TableCell>{c.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel Pelanggaran Terbaru */}
      <Card>
        <CardHeader>
          <CardTitle>Pelanggaran Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Sanksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.slice(0, 5).map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {getEmployeeName(v.karyawanId || v.karyawan?.id)}
                  </TableCell>
                  <TableCell>{v.type || v.jenisPelanggaran || "-"}</TableCell>
                  <TableCell>{v.date || v.tanggalKejadian || "-"}</TableCell>
                  <TableCell>{v.sanction || v.jenisSanksi || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel Gaji Terbaru */}
      <Card>
        <CardHeader>
          <CardTitle>Gaji Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Gaji Bersih</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaries.slice(0, 5).map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    {getEmployeeName(g.karyawanId || g.karyawan?.id)}
                  </TableCell>
                  <TableCell>
                    {g.periodeAwal || g.periode || "-"} -{" "}
                    {g.periodeAkhir || g.periode || "-"}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(g.gajiPokok || g.basicSalary || 0)}
                  </TableCell>
                  <TableCell>{formatCurrency(g.bonus || 0)}</TableCell>
                  <TableCell>{formatCurrency(g.potongan || 0)}</TableCell>
                  <TableCell>
                    {formatCurrency(g.totalGajiBersih || g.totalSalary || 0)}
                  </TableCell>
                  <TableCell>{g.statusPembayaran || g.status || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Detail Karyawan */}
      {showDetail && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2"
              onClick={() => setShowDetail(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage
                  src={selectedEmployee.avatar || selectedEmployee.fotoProfil}
                />
                <AvatarFallback>
                  {selectedEmployee.name?.[0] ||
                    selectedEmployee.namaLengkap?.[0] ||
                    "-"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">
                  {selectedEmployee.name || selectedEmployee.namaLengkap || "-"}
                </h2>
                <div className="text-sm text-gray-500">
                  {selectedEmployee.position || selectedEmployee.jabatan || "-"}
                </div>
                <div className="text-xs text-gray-400">
                  NIK: {selectedEmployee.nip || selectedEmployee.nik || "-"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <b>Status:</b>{" "}
                {selectedEmployee.status ||
                  selectedEmployee.statusKaryawan ||
                  "-"}
              </div>
              <div>
                <b>Departemen:</b>{" "}
                {selectedEmployee.department ||
                  selectedEmployee.departemen ||
                  "-"}
              </div>
              <div>
                <b>Email:</b> {selectedEmployee.email || "-"}
              </div>
              <div>
                <b>No. HP:</b>{" "}
                {selectedEmployee.phone || selectedEmployee.noHp || "-"}
              </div>
              <div>
                <b>Tanggal Masuk:</b>{" "}
                {selectedEmployee.joinDate ||
                  selectedEmployee.tanggalMasuk ||
                  "-"}
              </div>
              <div>
                <b>Alamat:</b>{" "}
                {selectedEmployee.address || selectedEmployee.alamat || "-"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
