"use client"

import { useState } from "react"
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
import { Search, Plus, MoreHorizontal, Eye, Check, X, Calendar, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select"

// Mock leave data
const leaveData = [
  {
    id: 1,
    employee: { name: "John Doe", nip: "EMP001", avatar: "/placeholder.svg?height=40&width=40" },
    type: "Cuti Tahunan",
    startDate: "2024-01-20",
    endDate: "2024-01-22",
    days: 3,
    reason: "Liburan keluarga ke Bali",
    status: "Disetujui",
    appliedDate: "2024-01-10",
    approvedBy: "HR Manager",
    approvedDate: "2024-01-12",
  },
  {
    id: 2,
    employee: { name: "Sarah Wilson", nip: "EMP002", avatar: "/placeholder.svg?height=40&width=40" },
    type: "Cuti Sakit",
    startDate: "2024-01-15",
    endDate: "2024-01-16",
    days: 2,
    reason: "Demam tinggi dan flu",
    status: "Pending",
    appliedDate: "2024-01-15",
    approvedBy: null,
    approvedDate: null,
  },
  {
    id: 3,
    employee: { name: "Mike Johnson", nip: "EMP003", avatar: "/placeholder.svg?height=40&width=40" },
    type: "Cuti Melahirkan",
    startDate: "2024-02-01",
    endDate: "2024-04-30",
    days: 90,
    reason: "Cuti melahirkan anak pertama",
    status: "Disetujui",
    appliedDate: "2024-01-05",
    approvedBy: "HR Manager",
    approvedDate: "2024-01-08",
  },
  {
    id: 4,
    employee: { name: "Lisa Chen", nip: "EMP004", avatar: "/placeholder.svg?height=40&width=40" },
    type: "Cuti Tahunan",
    startDate: "2024-01-25",
    endDate: "2024-01-26",
    days: 2,
    reason: "Acara keluarga",
    status: "Ditolak",
    appliedDate: "2024-01-20",
    approvedBy: "HR Manager",
    approvedDate: "2024-01-22",
  },
]

export default function LeavePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [filteredData, setFilteredData] = useState(leaveData)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterData(term, typeFilter, statusFilter)
  }

  const filterData = (search: string, type: string, status: string) => {
    let filtered = leaveData

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.employee.name.toLowerCase().includes(search.toLowerCase()) ||
          item.employee.nip.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (type !== "all") {
      filtered = filtered.filter((item) => item.type.toLowerCase().includes(type.toLowerCase()))
    }

    if (status !== "all") {
      filtered = filtered.filter((item) => item.status.toLowerCase() === status.toLowerCase())
    }

    setFilteredData(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Disetujui":
        return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "Ditolak":
        return <Badge variant="destructive">Ditolak</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Cuti Tahunan":
        return <Badge className="bg-blue-100 text-blue-800">Cuti Tahunan</Badge>
      case "Cuti Sakit":
        return <Badge className="bg-red-100 text-red-800">Cuti Sakit</Badge>
      case "Cuti Melahirkan":
        return <Badge className="bg-purple-100 text-purple-800">Cuti Melahirkan</Badge>
      case "Cuti Khusus":
        return <Badge className="bg-orange-100 text-orange-800">Cuti Khusus</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const leaveStats = {
    total: leaveData.length,
    approved: leaveData.filter((item) => item.status === "Disetujui").length,
    pending: leaveData.filter((item) => item.status === "Pending").length,
    rejected: leaveData.filter((item) => item.status === "Ditolak").length,
    totalDays: leaveData.filter((item) => item.status === "Disetujui").reduce((sum, item) => sum + item.days, 0),
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Cuti</h1>
          <p className="text-muted-foreground">Kelola pengajuan cuti karyawan</p>
        </div>
        <Button asChild>
          <a href="/dashboard/leave/new">
            <Plus className="h-4 w-4 mr-2" />
            Ajukan Cuti
          </a>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengajuan</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveStats.total}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{leaveStats.approved}</div>
            <p className="text-xs text-muted-foreground">Pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{leaveStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{leaveStats.rejected}</div>
            <p className="text-xs text-muted-foreground">Pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hari Cuti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveStats.totalDays}</div>
            <p className="text-xs text-muted-foreground">Hari kerja</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Cuti</CardTitle>
          <CardDescription>Kelola dan approve pengajuan cuti karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama atau NIP..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Jenis Cuti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="tahunan">Cuti Tahunan</SelectItem>
                <SelectItem value="sakit">Cuti Sakit</SelectItem>
                <SelectItem value="melahirkan">Cuti Melahirkan</SelectItem>
                <SelectItem value="khusus">Cuti Khusus</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="disetujui">Disetujui</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jenis Cuti</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Tanggal Selesai</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Pengajuan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={leave.employee.avatar || "/placeholder.svg"} alt={leave.employee.name} />
                          <AvatarFallback>
                            {leave.employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{leave.employee.name}</div>
                          <div className="text-sm text-muted-foreground">{leave.employee.nip}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(leave.type)}</TableCell>
                    <TableCell>{new Date(leave.startDate).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>{new Date(leave.endDate).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>{leave.days} hari</TableCell>
                    <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell>{new Date(leave.appliedDate).toLocaleDateString("id-ID")}</TableCell>
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
                          {leave.status === "Pending" && (
                            <>
                              <DropdownMenuItem className="text-green-600">
                                <Check className="mr-2 h-4 w-4" />
                                Setujui
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <X className="mr-2 h-4 w-4" />
                                Tolak
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada data cuti yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
