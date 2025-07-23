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
import { Search, Plus, MoreHorizontal, Eye, Download, DollarSign, TrendingUp, Calculator } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select"

// Mock salary data
const salaryData = [
  {
    id: 1,
    employee: { name: "John Doe", nip: "EMP001", avatar: "/placeholder.svg?height=40&width=40" },
    period: "2024-01",
    basicSalary: 8500000,
    allowances: 1000000,
    bonus: 500000,
    overtime: 300000,
    deductions: 200000,
    tax: 850000,
    netSalary: 9250000,
    workDays: 22,
    attendanceDays: 22,
    status: "Dibayar",
    paymentDate: "2024-01-31",
  },
  {
    id: 2,
    employee: { name: "Sarah Wilson", nip: "EMP002", avatar: "/placeholder.svg?height=40&width=40" },
    period: "2024-01",
    basicSalary: 7500000,
    allowances: 800000,
    bonus: 0,
    overtime: 150000,
    deductions: 100000,
    tax: 750000,
    netSalary: 7600000,
    workDays: 22,
    attendanceDays: 21,
    status: "Pending",
    paymentDate: null,
  },
  {
    id: 3,
    employee: { name: "Mike Johnson", nip: "EMP003", avatar: "/placeholder.svg?height=40&width=40" },
    period: "2024-01",
    basicSalary: 6500000,
    allowances: 600000,
    bonus: 200000,
    overtime: 0,
    deductions: 50000,
    tax: 650000,
    netSalary: 6600000,
    workDays: 22,
    attendanceDays: 20,
    status: "Dibayar",
    paymentDate: "2024-01-31",
  },
]

export default function SalaryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [periodFilter, setPeriodFilter] = useState("2024-01")
  const [statusFilter, setStatusFilter] = useState("all")
  const [filteredData, setFilteredData] = useState(salaryData)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterData(term, periodFilter, statusFilter)
  }

  const filterData = (search: string, period: string, status: string) => {
    let filtered = salaryData

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.employee.name.toLowerCase().includes(search.toLowerCase()) ||
          item.employee.nip.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (period !== "all") {
      filtered = filtered.filter((item) => item.period === period)
    }

    if (status !== "all") {
      filtered = filtered.filter((item) => item.status.toLowerCase() === status.toLowerCase())
    }

    setFilteredData(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Dibayar":
        return <Badge className="bg-green-100 text-green-800">Dibayar</Badge>
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "Ditolak":
        return <Badge variant="destructive">Ditolak</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const salaryStats = {
    totalPayroll: salaryData.reduce((sum, item) => sum + item.netSalary, 0),
    totalEmployees: salaryData.length,
    paid: salaryData.filter((item) => item.status === "Dibayar").length,
    pending: salaryData.filter((item) => item.status === "Pending").length,
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Gaji</h1>
          <p className="text-muted-foreground">Kelola penggajian karyawan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/dashboard/salary/process">
              <Calculator className="h-4 w-4 mr-2" />
              Proses Gaji
            </a>
          </Button>
          <Button asChild>
            <a href="/dashboard/salary/bonus">
              <Plus className="h-4 w-4 mr-2" />
              Input Bonus
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salaryStats.totalPayroll)}</div>
            <p className="text-xs text-muted-foreground">Periode Januari 2024</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salaryStats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Karyawan aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sudah Dibayar</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{salaryStats.paid}</div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{salaryStats.pending}</div>
            <p className="text-xs text-muted-foreground">Karyawan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Rekap Gaji Karyawan</CardTitle>
          <CardDescription>Daftar penggajian karyawan per periode</CardDescription>
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
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                <SelectItem value="2024-01">Januari 2024</SelectItem>
                <SelectItem value="2023-12">Desember 2023</SelectItem>
                <SelectItem value="2023-11">November 2023</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="dibayar">Dibayar</SelectItem>
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
                  <TableHead>Periode</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Tunjangan</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Potongan</TableHead>
                  <TableHead>Gaji Bersih</TableHead>
                  <TableHead>Hari Kerja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={salary.employee.avatar || "/placeholder.svg"} alt={salary.employee.name} />
                          <AvatarFallback>
                            {salary.employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{salary.employee.name}</div>
                          <div className="text-sm text-muted-foreground">{salary.employee.nip}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{salary.period}</TableCell>
                    <TableCell>{formatCurrency(salary.basicSalary)}</TableCell>
                    <TableCell>{formatCurrency(salary.allowances)}</TableCell>
                    <TableCell>{formatCurrency(salary.bonus)}</TableCell>
                    <TableCell>{formatCurrency(salary.deductions)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(salary.netSalary)}</TableCell>
                    <TableCell>
                      {salary.attendanceDays}/{salary.workDays}
                    </TableCell>
                    <TableCell>{getStatusBadge(salary.status)}</TableCell>
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
                            <Download className="mr-2 h-4 w-4" />
                            Download Slip
                          </DropdownMenuItem>
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
              <p className="text-muted-foreground">Tidak ada data gaji yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
