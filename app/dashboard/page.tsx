"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card"
import { Badge } from "@/components/ui/display/badge"
import { Users, Clock, DollarSign, AlertTriangle, Calendar, TrendingUp } from "lucide-react"
import { employeeAPI, attendanceAPI, salaryAPI, leaveAPI, violationAPI } from "@/lib/api"

interface DashboardStats {
  totalEmployees: number
  todayAttendance: {
    present: number
    late: number
    absent: number
  }
  pendingLeaves: number
  totalViolations: number
  monthlyPayroll: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError("")

        // Fetch all data in parallel
        const [employeesData, attendanceData, salaryData, leaveData, violationData] = await Promise.all([
          employeeAPI.getAll().catch(() => []),
          attendanceAPI.getAll().catch(() => []),
          salaryAPI.getAll().catch(() => []),
          leaveAPI.getAll().catch(() => []),
          violationAPI.getAll().catch(() => []),
        ])

        // Process attendance data for today
        const today = new Date().toISOString().split("T")[0]
        const todayAttendanceData = attendanceData.filter((a: any) => a.date === today || a.tanggal === today)

        const todayAttendance = {
          present: todayAttendanceData.filter((a: any) => a.status === "Hadir" || a.status === "Present").length,
          late: todayAttendanceData.filter((a: any) => a.status === "Terlambat" || a.status === "Late").length,
          absent: todayAttendanceData.filter((a: any) =>
            ["Sakit", "Alpha", "Cuti", "Absent", "Sick", "Leave"].includes(a.status),
          ).length,
        }

        // Calculate monthly payroll
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        const monthlyPayroll = salaryData
          .filter((salary: any) => {
            const salaryDate = new Date(salary.date || salary.tanggal || salary.createdAt)
            return salaryDate.getMonth() + 1 === currentMonth && salaryDate.getFullYear() === currentYear
          })
          .reduce((total: number, salary: any) => total + (salary.totalSalary || salary.total || salary.gaji || 0), 0)

        // Count pending leaves
        const pendingLeaves = leaveData.filter(
          (leave: any) => leave.status === "Pending" || leave.status === "pending",
        ).length

        setStats({
          totalEmployees: employeesData.length,
          todayAttendance,
          pendingLeaves,
          totalViolations: violationData.length,
          monthlyPayroll,
        })
      } catch (err: any) {
        console.error("Dashboard error:", err)
        setError(err.message || "Gagal memuat data dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
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
    )
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
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di sistem monitoring karyawan PT. PADUD</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">Karyawan aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kehadiran Hari Ini</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.todayAttendance.present || 0}</div>
            <div className="flex gap-2 text-xs">
              <span className="text-yellow-600">Terlambat: {stats?.todayAttendance.late || 0}</span>
              <span className="text-red-600">Tidak Hadir: {stats?.todayAttendance.absent || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Bulan Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.monthlyPayroll || 0)}</div>
            <p className="text-xs text-muted-foreground">Total gaji bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuti Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingLeaves || 0}</div>
            <p className="text-xs text-muted-foreground">Menunggu persetujuan</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ringkasan Kehadiran
            </CardTitle>
            <CardDescription>Status kehadiran hari ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Hadir</span>
                <Badge className="bg-green-100 text-green-800">{stats?.todayAttendance.present || 0} orang</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Terlambat</span>
                <Badge className="bg-yellow-100 text-yellow-800">{stats?.todayAttendance.late || 0} orang</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tidak Hadir</span>
                <Badge variant="destructive">{stats?.todayAttendance.absent || 0} orang</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pelanggaran
            </CardTitle>
            <CardDescription>Total pelanggaran yang tercatat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats?.totalViolations || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">Pelanggaran yang perlu ditindaklanjuti</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
