"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/form/button"
import { Input } from "@/components/ui/form/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/display/table"
import { Badge } from "@/components/ui/display/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/display/avatar"
import { Search, Plus, MoreHorizontal, Eye, Edit, AlertTriangle, Clock, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"
import { employeeAPI, violationAPI } from "@/lib/api"
import type { Employee, Violation } from "@/lib/types"

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredData, setFilteredData] = useState<Violation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterData()
  }, [violations, searchTerm, typeFilter, severityFilter, statusFilter])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [violationsResponse, employeesResponse] = await Promise.all([violationAPI.getAll(), employeeAPI.getAll()])
      setViolations(violationsResponse)
      setEmployees(employeesResponse)
    } catch (err) {
      setError("Gagal memuat data pelanggaran")
    } finally {
      setIsLoading(false)
    }
  }

  const filterData = () => {
    let filtered = violations

    if (searchTerm) {
      filtered = filtered.filter((violation) => {
        const employee = employees.find((emp) => emp.id === violation.karyawanId)
        return (
          employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee?.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
          violation.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((violation) => violation.type.toLowerCase().includes(typeFilter.toLowerCase()))
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((violation) => violation.severity.toLowerCase() === severityFilter.toLowerCase())
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((violation) => violation.status.toLowerCase().includes(statusFilter.toLowerCase()))
    }

    setFilteredData(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Selesai":
        return <Badge className="bg-green-100 text-green-800">Selesai</Badge>
      case "Dalam Proses":
        return <Badge className="bg-yellow-100 text-yellow-800">Dalam Proses</Badge>
      case "Pending":
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Ringan":
        return <Badge className="bg-blue-100 text-blue-800">Ringan</Badge>
      case "Sedang":
        return <Badge className="bg-yellow-100 text-yellow-800">Sedang</Badge>
      case "Berat":
        return <Badge variant="destructive">Berat</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const violationStats = {
    total: violations.length,
    ringan: violations.filter((item) => item.severity === "Ringan").length,
    sedang: violations.filter((item) => item.severity === "Sedang").length,
    berat: violations.filter((item) => item.severity === "Berat").length,
    selesai: violations.filter((item) => item.status === "Selesai").length,
    proses: violations.filter((item) => item.status === "Dalam Proses").length,
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
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Pelanggaran</h1>
          <p className="text-muted-foreground">Kelola pelanggaran dan sanksi karyawan</p>
        </div>
        <Button asChild>
          <a href="/dashboard/violations/new">
            <Plus className="h-4 w-4 mr-2" />
            Catat Pelanggaran
          </a>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pelanggaran</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{violationStats.total}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ringan</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{violationStats.ringan}</div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang</CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{violationStats.sedang}</div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berat</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{violationStats.berat}</div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{violationStats.selesai}</div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{violationStats.proses}</div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggaran Karyawan</CardTitle>
          <CardDescription>Catatan pelanggaran dan tindak lanjut yang diberikan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama, NIP, atau jenis pelanggaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Jenis Pelanggaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="keterlambatan">Keterlambatan</SelectItem>
                <SelectItem value="dress code">Dress Code</SelectItem>
                <SelectItem value="alpha">Alpha</SelectItem>
                <SelectItem value="sop">Pelanggaran SOP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tingkat</SelectItem>
                <SelectItem value="ringan">Ringan</SelectItem>
                <SelectItem value="sedang">Sedang</SelectItem>
                <SelectItem value="berat">Berat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
                <SelectItem value="proses">Dalam Proses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
                  <TableHead>Jenis Pelanggaran</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Sanksi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dilaporkan Oleh</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((violation) => {
                  const employee = employees.find((emp) => emp.id === violation.karyawanId)
                  return (
                    <TableRow key={violation.id}>
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
                      <TableCell>{new Date(violation.date).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="font-medium">{violation.type}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{violation.description}</TableCell>
                      <TableCell>{getSeverityBadge(violation.severity)}</TableCell>
                      <TableCell>{violation.sanction}</TableCell>
                      <TableCell>{getStatusBadge(violation.status)}</TableCell>
                      <TableCell>{violation.reportedBy}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Pelanggaran
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              Lihat Bukti
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada data pelanggaran yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
