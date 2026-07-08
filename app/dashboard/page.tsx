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
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import Link from "next/link";
import {
  employeeAPI,
  attendanceAPI,
  leaveAPI,
  getAllViolations,
  getAllSalaries,
} from "@/lib/api";

// ==================== Types ====================
interface Stats {
  totalEmployees: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  pendingLeaves: number;
  totalViolations: number;
  monthlyPayroll: number;
  unpaidSalaries: number;
}

// ==================== Helpers ====================
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const isStatus = (s: string, ...matches: string[]) =>
  matches.some((m) => s?.toUpperCase() === m.toUpperCase());

// ==================== Page ====================
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [emps, atts, sals, lvs, viols] = await Promise.all([
          employeeAPI.getAll().catch(() => []),
          attendanceAPI.getAll().catch(() => []),
          getAllSalaries().catch(() => []),
          leaveAPI.getAll().catch(() => []),
          getAllViolations().catch(() => []),
        ]);

        setEmployees(emps);
        setRecentEmployees((emps || []).slice(0, 5));
        setRecentLeaves((lvs || []).slice(0, 4));

        const sortedAttendance = (atts || [])
          .slice()
          .sort((a: any, b: any) => {
            const da = new Date(a.tanggal || a.date || a.createdAt || 0).getTime();
            const db = new Date(b.tanggal || b.date || b.createdAt || 0).getTime();
            return db - da;
          });
        setRecentAttendance(sortedAttendance.slice(0, 6));

        const present = (atts || []).filter((a: any) =>
          isStatus(a.status, "Hadir", "Present", "HADIR", "LEMBUR")
        ).length;
        const late = (atts || []).filter((a: any) =>
          isStatus(a.status, "Terlambat", "Late", "TERLAMBAT")
        ).length;
        const absent = (atts || []).filter((a: any) =>
          isStatus(a.status, "Sakit", "Alpha", "Cuti", "Absent", "SAKIT", "ALPA", "CUTI", "TIDAK HADIR", "OFF", "IZIN")
        ).length;

        const now = new Date();
        const monthPayroll = (sals || [])
          .filter((s: any) => {
            const d = new Date(s.periodeAkhir || s.tanggalGaji || s.createdAt);
            return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })
          .reduce((t: number, s: any) => t + (Number(s.totalGaji) || Number(s.totalGajiBersih) || 0), 0);

        const unpaid = (sals || []).filter(
          (s: any) => (s.statusPembayaran || "").toLowerCase() !== "dibayar"
        ).length;

        const pending = (lvs || []).filter(
          (l: any) => (l.status || "").toLowerCase() === "pending"
        ).length;

        setStats({
          totalEmployees: (emps || []).length,
          todayPresent: present,
          todayLate: late,
          todayAbsent: absent,
          pendingLeaves: pending,
          totalViolations: (viols || []).length,
          monthlyPayroll: monthPayroll,
          unpaidSalaries: unpaid,
        });
      } catch (err: any) {
        setError(err.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const empName = (id: any) => {
    const e = employees.find((emp) => String(emp.id) === String(id));
    return e?.namaLengkap || e?.name || "-";
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-slate-500 mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Ringkasan sistem HRD — {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* User-first Section */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mulai Kerja Hari Ini</p>
            <p className="text-sm text-slate-600 mt-1">Akses fitur yang paling sering dipakai dulu, lalu scroll ke bawah untuk summary analisis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/employees/new">
              <Button size="sm">+ Tambah Karyawan</Button>
            </Link>
            <Link href="/dashboard/attendance/new">
              <Button size="sm">+ Input Absensi Massal</Button>
            </Link>
            <Link href="/dashboard/attendance">
              <Button size="sm" variant="outline">Export Laporan Harian</Button>
            </Link>
            <Link href="/dashboard/salary">
              <Button size="sm" variant="outline">Proses Gaji</Button>
            </Link>
            <Link href="/dashboard/leave">
              <Button size="sm" variant="outline">Kelola Cuti</Button>
            </Link>
            <Link href="/dashboard/violations">
              <Button size="sm" variant="outline">Pelanggaran</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Summary Analisis</p>
        <p className="text-sm text-slate-600 mt-1">Gunakan data berikut untuk monitoring, analisis tren, dan bahan rapat.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Karyawan"
          value={stats?.totalEmployees || 0}
          sub="Karyawan aktif"
          icon={<Users className="h-5 w-5" />}
          color="blue"
          href="/dashboard/employees"
        />
        <StatCard
          title="Kehadiran Total"
          value={stats?.todayPresent || 0}
          sub={`Terlambat: ${stats?.todayLate || 0} · Tidak Hadir: ${stats?.todayAbsent || 0}`}
          icon={<Clock className="h-5 w-5" />}
          color="green"
          href="/dashboard/attendance"
        />
        <StatCard
          title="Payroll Bulan Ini"
          value={fmtCurrency(stats?.monthlyPayroll || 0)}
          sub={`${stats?.unpaidSalaries || 0} belum dibayar`}
          icon={<DollarSign className="h-5 w-5" />}
          color="purple"
          href="/dashboard/salary"
        />
        <StatCard
          title="Cuti Pending"
          value={stats?.pendingLeaves || 0}
          sub={`${stats?.totalViolations || 0} pelanggaran`}
          icon={<Calendar className="h-5 w-5" />}
          color="amber"
          href="/dashboard/leave"
        />
      </div>

      {/* Two Column: Recent Attendance + Recent Employees */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Absensi Terbaru</CardTitle>
              <Link href="/dashboard/attendance">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Lihat Semua <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAttendance.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Belum ada data absensi</p>
            ) : (
              recentAttendance.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${
                      isStatus(a.status, "Hadir", "Present", "HADIR", "LEMBUR") ? "bg-green-500" :
                      isStatus(a.status, "Terlambat", "Late", "TERLAMBAT") ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{empName(a.karyawanId || a.karyawan?.id)}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(a.tanggal || a.date || a.createdAt).toLocaleDateString("id-ID")} · {a.waktuMasuk || a.checkIn || "-"} — {a.waktuPulang || a.checkOut || "-"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      isStatus(a.status, "Hadir", "Present", "HADIR", "LEMBUR") ? "default" :
                      isStatus(a.status, "Terlambat", "Late", "TERLAMBAT") ? "secondary" : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {a.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Employees */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Karyawan Terbaru</CardTitle>
              <Link href="/dashboard/employees">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Lihat Semua <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEmployees.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Belum ada data karyawan</p>
            ) : (
              recentEmployees.map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="text-sm font-medium">{emp.namaLengkap || emp.name || "-"}</p>
                    <p className="text-[11px] text-slate-400">{emp.jabatan || emp.position || "-"} · {emp.departemen || emp.department || "-"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {emp.statusKaryawan || emp.status || "Aktif"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leaves */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Cuti Terbaru</CardTitle>
            <Link href="/dashboard/leave">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                Lihat Semua <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeaves.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada data cuti</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {recentLeaves.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="text-sm font-medium">{empName(c.karyawanId || c.karyawan?.id)}</p>
                    <p className="text-[11px] text-slate-400">
                      {c.jenisCuti || c.type || "-"} · {c.tanggalMulai || c.startDate || "-"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      (c.status || "").toLowerCase() === "approved" ? "default" :
                      (c.status || "").toLowerCase() === "pending" ? "secondary" : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {c.status || "-"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Stat Card Component ====================
function StatCard({
  title, value, sub, icon, color, href,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "amber";
  href: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">{title}</span>
            <div className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
