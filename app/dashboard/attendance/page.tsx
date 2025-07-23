"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/form/button"
import { Input } from "@/components/ui/form/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/display/table"
import { Badge } from "@/components/ui/display/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/display/avatar"
import { Search, Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select"
import { attendanceAPI, employeeAPI } from "@/lib/api"
import type { Employee } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterData()
  }, [attendanceData, searchTerm, statusFilter, dateFilter])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [attendanceResponse, employeesResponse] = await Promise.all([
        attendanceAPI.getAll(),
        employeeAPI.getAll(),
      ])
      setAttendanceData(attendanceResponse)
      setEmployees(employeesResponse)
    } catch (err) {
      setError("Gagal memuat data absensi")
    } finally {
      setIsLoading(false)
    }
  }

  const filterData = () => {
    let filtered = attendanceData

    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const employee = employees.find((emp) => emp.id === item.karyawanId)
        return (
          employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee?.nip.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    if (dateFilter) {
      filtered = filtered.filter((item) => item.date === dateFilter)
    }

    setFilteredData(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Hadir":
        return <Badge className="bg-green-100 text-green-800">Hadir</Badge>
      case "Terlambat":
        return <Badge className="bg-yellow-100 text-yellow-800">Terlambat</Badge>
      case "Alpha":
        return <Badge variant="destructive">Alpha</Badge>
      case "Izin":
        return <Badge className="bg-blue-100 text-blue-800">Izin</Badge>
      case "Sakit":
        return <Badge className="bg-purple-100 text-purple-800">Sakit</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const attendanceStats = {
    total: attendanceData.length,
    hadir: attendanceData.filter((item) => item.status === "Hadir").length,
    terlambat: attendanceData.filter((item) => item.status === "Terlambat").length,
    alpha: attendanceData.filter((item) => item.status === "Alpha").length,
    izin: attendanceData.filter((item) => item.status === "Izin").length,
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Absensi</h1>
          <p className="text-muted-foreground">Pantau kehadiran dan absensi karyawan</p>
        </div>
        <Button asChild>
          <a href="/dashboard/attendance/new">
            <Plus className="h-4 w-4 mr-2" />
            Input Absensi
          </a>
        </Button>
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
            <p className="text-xs text-muted-foreground">Hari ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hadir</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attendanceStats.hadir}</div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{attendanceStats.terlambat}</div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alpha</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attendanceStats.alpha}</div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Izin</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{attendanceStats.izin}</div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap Absensi Karyawan</CardTitle>
          <CardDescription>Data kehadiran dan absensi harian karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama atau NIP..."
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
                <SelectItem value="Terlambat">Terlambat</SelectItem>
                <SelectItem value="Alpha">Alpha</SelectItem>
                <SelectItem value="Izin">Izin</SelectItem>
                <SelectItem value="Sakit">Sakit</SelectItem>
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
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Keluar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((attendance) => {
                  const employee = employees.find((emp) => emp.id === attendance.karyawanId)
                  return (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={employee?.avatar || "/placeholder.svg"} alt={employee?.name} />
                            <AvatarFallback>
                              {employee?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee?.name}</div>
                            <div className="text-sm text-muted-foreground">{employee?.nip}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(attendance.date).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>{attendance.checkIn || "-"}</TableCell>
                      <TableCell>{attendance.checkOut || "-"}</TableCell>
                      <TableCell>{getStatusBadge(attendance.status)}</TableCell>
                      <TableCell>{attendance.notes || "-"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada data absensi yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
