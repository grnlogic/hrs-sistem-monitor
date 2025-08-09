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
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
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
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

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
  weeklyAttendance: any[];
  departmentStats: any[];
  monthlyTrends: any[];
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
            (a: any) =>
              a.status === "Hadir" ||
              a.status === "Present" ||
              a.status === "HADIR"
          ).length,
          late: todayAttendanceData.filter(
            (a: any) =>
              a.status === "Terlambat" ||
              a.status === "Late" ||
              a.status === "TERLAMBAT"
          ).length,
          absent: todayAttendanceData.filter((a: any) =>
            [
              "Sakit",
              "Alpha",
              "Cuti",
              "Absent",
              "Sick",
              "Leave",
              "SAKIT",
              "ALPHA",
              "CUTI",
              "TIDAK HADIR",
              "OFF",
            ].includes(a.status)
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

        // Prepare weekly attendance data for chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        }).reverse();

        const weeklyAttendance = last7Days.map((date) => {
          const dayData = attendanceData.filter(
            (a: any) => a.tanggal === date || a.date === date
          );
          return {
            date: new Date(date).toLocaleDateString("id-ID", {
              weekday: "short",
            }),
            hadir: dayData.filter(
              (a: any) =>
                a.status === "Hadir" ||
                a.status === "Present" ||
                a.status === "HADIR"
            ).length,
            terlambat: dayData.filter(
              (a: any) =>
                a.status === "Terlambat" ||
                a.status === "Late" ||
                a.status === "TERLAMBAT"
            ).length,
            tidak_hadir: dayData.filter((a: any) =>
              [
                "Sakit",
                "Alpha",
                "Cuti",
                "Absent",
                "Sick",
                "Leave",
                "SAKIT",
                "ALPHA",
                "CUTI",
                "TIDAK HADIR",
                "OFF",
              ].includes(a.status)
            ).length,
          };
        });

        // Department statistics
        const departmentStats = Object.entries(
          employeesData.reduce((acc: any, emp: any) => {
            const dept = emp.department || emp.departemen || "Tidak Ada";
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, value]) => ({
          name,
          value,
          fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
        }));

        // Monthly trends (last 6 months)
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return {
            month: date.toLocaleDateString("id-ID", { month: "short" }),
            year: date.getFullYear(),
            monthIndex: date.getMonth() + 1,
          };
        }).reverse();

        const monthlyTrends = last6Months.map((month) => {
          const monthSalaries = salaryData.filter((salary: any) => {
            const salaryDate = new Date(
              salary.date || salary.tanggal || salary.createdAt
            );
            return (
              salaryDate.getMonth() + 1 === month.monthIndex &&
              salaryDate.getFullYear() === month.year
            );
          });

          const monthAttendance = attendanceData.filter((att: any) => {
            const attDate = new Date(att.tanggal || att.date);
            return (
              attDate.getMonth() + 1 === month.monthIndex &&
              attDate.getFullYear() === month.year
            );
          });

          return {
            month: month.month,
            gaji: monthSalaries.reduce(
              (total: number, salary: any) =>
                total +
                (salary.totalSalary || salary.total || salary.gaji || 0),
              0
            ),
            kehadiran: monthAttendance.filter(
              (a: any) =>
                a.status === "Hadir" ||
                a.status === "Present" ||
                a.status === "HADIR"
            ).length,
          };
        });

        setStats({
          totalEmployees: employeesData.length,
          todayAttendance,
          pendingLeaves,
          totalViolations: violationData.length,
          monthlyPayroll,
          weeklyAttendance,
          departmentStats,
          monthlyTrends,
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
  const getEmployeeName = (id: string | number) => {
    if (!id) return "-";
    const emp = employees.find((e) => String(e.id) === String(id));
    return emp ? emp.namaLengkap || emp.name || emp.nik || emp.nip || "-" : "-";
  };

  // Helper untuk ambil data karyawan dari id
  const getEmployeeData = (id: string) => {
    return employees.find((e) => String(e.id) === String(id));
  };

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Custom chart colors
  const chartColors = {
    primary: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#06B6D4",
    purple: "#8B5CF6",
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
    <div className="flex flex-1 flex-col gap-6 p-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard HRD
          </h1>
          <p className="text-gray-600 mt-2">
            Selamat datang di sistem monitoring karyawan PT. PADUD - Pantau
            performa tim Anda secara real-time
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Update terakhir: {new Date().toLocaleTimeString("id-ID")}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Karyawan */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Total Karyawan
            </CardTitle>
            <Users className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalEmployees || 0}
            </div>
            <p className="text-xs opacity-80 mt-1">Karyawan aktif</p>
          </CardContent>
        </Card>

        {/* Kehadiran Hari Ini */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Hadir Hari Ini
            </CardTitle>
            <Clock className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.todayAttendance.present || 0}
            </div>
            <div className="flex gap-3 text-xs opacity-80 mt-1">
              <span>Terlambat: {stats?.todayAttendance.late || 0}</span>
              <span>Absent: {stats?.todayAttendance.absent || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Bulan Ini */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Payroll Bulan Ini
            </CardTitle>
            <DollarSign className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.monthlyPayroll || 0)}
            </div>
            <p className="text-xs opacity-80 mt-1">Total gaji bulan ini</p>
          </CardContent>
        </Card>

        {/* Cuti Pending */}
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Cuti Pending
            </CardTitle>
            <Calendar className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.pendingLeaves || 0}
            </div>
            <p className="text-xs opacity-80 mt-1">Menunggu persetujuan</p>
          </CardContent>
        </Card>

        {/* Total Pelanggaran */}
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Pelanggaran
            </CardTitle>
            <AlertTriangle className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalViolations || 0}
            </div>
            <p className="text-xs opacity-80 mt-1">Total pelanggaran</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Weekly Attendance Chart */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Kehadiran 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.weeklyAttendance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar
                  dataKey="hadir"
                  fill={chartColors.success}
                  name="Hadir"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="terlambat"
                  fill={chartColors.warning}
                  name="Terlambat"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="tidak_hadir"
                  fill={chartColors.danger}
                  name="Tidak Hadir"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Distribusi Departemen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={stats?.departmentStats || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(stats?.departmentStats || []).map(
                    (entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Trend Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  labelFormatter={(value) => `Bulan: ${value}`}
                  formatter={(value: any, name: string) => [
                    name === "gaji" ? formatCurrency(value) : value,
                    name === "gaji" ? "Total Gaji" : "Kehadiran",
                  ]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="gaji"
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="kehadiran"
                  stroke={chartColors.success}
                  strokeWidth={3}
                  dot={{ fill: chartColors.success, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Employees */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Karyawan Terbaru</span>
              <Badge variant="outline" className="text-xs">
                {employees.length} Total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.slice(0, 5).map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={emp.avatar || emp.fotoProfil} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {emp.name?.[0] || emp.namaLengkap?.[0] || "-"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {emp.name || emp.namaLengkap || "-"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {emp.position || emp.jabatan || "-"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setShowDetail(true);
                    }}
                  >
                    Detail
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Absensi Hari Ini</span>
              <Badge variant="outline" className="text-xs">
                {
                  attendance.filter((a) => {
                    const today = new Date().toISOString().split("T")[0];
                    return a.tanggal === today || a.date === today;
                  }).length
                }{" "}
                Hadir
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendance
                .filter((a) => {
                  const today = new Date().toISOString().split("T")[0];
                  return a.tanggal === today || a.date === today;
                })
                .slice(0, 5)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          a.status === "Hadir" ||
                          a.status === "Present" ||
                          a.status === "HADIR"
                            ? "bg-green-500"
                            : a.status === "Terlambat" ||
                              a.status === "Late" ||
                              a.status === "TERLAMBAT"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <div className="font-medium text-sm">
                          {getEmployeeName(a.karyawanId || a.karyawan?.id)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {a.waktuMasuk || a.checkIn || "-"} -{" "}
                          {a.waktuPulang || a.checkOut || "-"}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        a.status === "Hadir" ||
                        a.status === "Present" ||
                        a.status === "HADIR"
                          ? "default"
                          : a.status === "Terlambat" ||
                            a.status === "Late" ||
                            a.status === "TERLAMBAT"
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-xs"
                    >
                      {a.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Leave Requests */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Cuti Terbaru</span>
              <Badge
                variant={stats?.pendingLeaves ? "destructive" : "secondary"}
                className="text-xs"
              >
                {stats?.pendingLeaves || 0} Pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaves.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {getEmployeeName(c.karyawanId || c.karyawan?.id)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.jenisCuti || c.type || "-"} •{" "}
                      {c.tanggalMulai || c.startDate || "-"}
                    </div>
                  </div>
                  <Badge
                    variant={
                      c.status === "Approved" || c.status === "approved"
                        ? "default"
                        : c.status === "Pending" || c.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Violations */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Pelanggaran Terbaru</span>
              <Badge variant="destructive" className="text-xs">
                {violations.length} Total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {violations.slice(0, 4).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {getEmployeeName(v.karyawanId || v.karyawan?.id)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {v.type || v.jenisPelanggaran || "-"} •{" "}
                      {v.date || v.tanggalKejadian || "-"}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {v.sanction || v.jenisSanksi || "-"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary Summary */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Ringkasan Gaji</span>
              <Badge variant="outline" className="text-xs">
                {salaries.length} Records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salaries.slice(0, 4).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {getEmployeeName(g.karyawanId || g.karyawan?.id)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {g.periodeAwal || g.periode || "-"} •{" "}
                      {formatCurrency(g.totalGajiBersih || g.totalSalary || 0)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      g.statusPembayaran === "Lunas" || g.status === "Paid"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {g.statusPembayaran || g.status || "-"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Detail Karyawan */}
      {showDetail && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Detail Karyawan
                </h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => setShowDetail(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-6 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
                  <AvatarImage
                    src={selectedEmployee.avatar || selectedEmployee.fotoProfil}
                  />
                  <AvatarFallback className="bg-blue-500 text-white text-xl">
                    {selectedEmployee.name?.[0] ||
                      selectedEmployee.namaLengkap?.[0] ||
                      "-"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedEmployee.name ||
                      selectedEmployee.namaLengkap ||
                      "-"}
                  </h3>
                  <div className="text-gray-600 mb-1">
                    {selectedEmployee.position ||
                      selectedEmployee.jabatan ||
                      "-"}
                  </div>
                  <div className="text-sm text-gray-500">
                    NIK: {selectedEmployee.nip || selectedEmployee.nik || "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </div>
                    <div className="text-sm font-medium">
                      {selectedEmployee.status ||
                        selectedEmployee.statusKaryawan ||
                        "-"}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Email
                    </div>
                    <div className="text-sm font-medium">
                      {selectedEmployee.email || "-"}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Tanggal Masuk
                    </div>
                    <div className="text-sm font-medium">
                      {selectedEmployee.joinDate ||
                        selectedEmployee.tanggalMasuk ||
                        "-"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Departemen
                    </div>
                    <div className="text-sm font-medium">
                      {selectedEmployee.department ||
                        selectedEmployee.departemen ||
                        "-"}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      No. HP
                    </div>
                    <div className="text-sm font-medium">
                      {selectedEmployee.phone || selectedEmployee.noHp || "-"}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Alamat
                    </div>
                    <div className="text-sm font-medium">
                      {selectedEmployee.address ||
                        selectedEmployee.alamat ||
                        "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
